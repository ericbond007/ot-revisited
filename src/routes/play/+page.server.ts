import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { rest } from '$lib/game/actions/rest';
import { sundayLayBy } from '$lib/game/actions/sunday-lay-by';
import { isSunday } from '$lib/game/utils/calendar';
import { CAMP_ACTIONS_BY_ID, type CampActionId } from '$lib/game/actions/camp-actions';
import { getLandmark } from '$lib/game/content/landmarks';
import { tickDayPausable, applyPendingChoice, applyCompanyDissent } from '$lib/game/engine-pausable';
import { EVENTS } from '$lib/game/content/events';
import { LANDMARK_ARRIVAL_EVENTS } from '$lib/game/content/landmark-arrival-events';
import { applyWhoreTradingPostEarnings } from '$lib/game/professions/bonuses';
import { restockPostIfDue, recordPostPurchases } from '$lib/game/systems/post-stock';
import { addNews, generatePostGossip, generateNewspaper, applyNewspaper } from '$lib/game/systems/news';
import { maybeDeliverLetter } from '$lib/game/systems/letters';
import { repairWagon, stayAtInn, gamble, visitBrothel, hireGuide, forgeOxShoes, useBathHouse } from '$lib/game/systems/town-services';
import { joinTrain, leaveTrain } from '$lib/game/systems/wagon-train';
import { tradeWithCompanion } from '$lib/game/actions/trade-companion';
import { transferBetweenCompanions, doctorVisit, isCaptain } from '$lib/game/systems/wagon-train-leader';
import { makeRng } from '$lib/game/rng';
import { hunt, type HuntTarget, type AmmoBand } from '$lib/game/actions/hunt';
import { ford, type FordMethod } from '$lib/game/actions/ford';
import { trade } from '$lib/game/actions/trade';
import { applyBarter } from '$lib/game/systems/barter';
import { settleTrade as _settleTrade, type TradeBasket } from '$lib/game/systems/settle-trade';
import { abandonSelected, droppableHeavyItems } from '$lib/game/systems/item-loss';

import { isWaterRation, setWaterRationOnState } from './water-ration-action';
export const load: PageServerLoad = async ({ url, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'Missing ?slot=<name>');

  const state = await locals.repo.load(locals.deviceId, slot);
  if (!state) throw error(404, `No save in slot "${slot}"`);

  return { slot, state };
};

async function loadState(locals: App.Locals, slot: string) {
  const s = await locals.repo.load(locals.deviceId, slot);
  if (!s) throw error(404, `Save "${slot}" not found`);
  return s;
}

// Runs up to `days` day-ticks. Halts early on:
//   - event fire (remaining days discarded; player re-clicks Travel after resolving)
//   - reaching a stop-worthy landmark (user must decide whether to trade/ford/etc)
async function runTravelLoop(
  initialState: Awaited<ReturnType<typeof loadState>>,
  days: number,
  locals: App.Locals,
  slot: string
) {
  const startDay = initialState.day;
  const startMiles = initialState.location.milesTraveled;
  let state = initialState;
  for (let i = 0; i < days && !state.completed; i++) {
    const result = tickDayPausable(state);
    if (result.pendingEvent) {
      const daysTraveled = result.state.day - startDay;
      const milesTraveled = Math.round(result.state.location.milesTraveled - startMiles);
      const summary =
        daysTraveled > 0
          ? `Traveled ${daysTraveled} day${daysTraveled === 1 ? '' : 's'} (${milesTraveled} mi) before being stopped.`
          : `Barely started out before being stopped.`;
      // Defer the travel summary into a flag; resolveEvent appends it AFTER
      // the event's own resolution entries so the log reads chronologically:
      //   1) event resolution lines
      //   2) "Traveled N days (M mi) before being stopped."
      state = {
        ...result.state,
        flags: {
          ...result.state.flags,
          _pendingEventId: result.pendingEvent.id,
          _pendingTravelSummary: summary,
          _pendingTravelSummaryDay: result.state.day
        }
      };
      await locals.repo.save(locals.deviceId, slot, state);
      return state;
    }
    state = result.state;
    // Halt at stop-worthy landmarks (trading post, river, end). Remaining days
    // are discarded — landmarks are decision points, not drive-throughs. The
    // arrival log is deferred from travel.ts so we can combine it with the
    // travel summary into a single entry here.
    if (state.location.atLandmarkId) {
      const here = getLandmark(state.location.atLandmarkId);
      const daysTraveled = state.day - startDay;
      const milesTraveled = Math.round(state.location.milesTraveled - startMiles);
      const summary =
        daysTraveled > 0
          ? `Traveled ${daysTraveled} day${daysTraveled === 1 ? '' : 's'} (${milesTraveled} mi) to arrive at ${here.name}.`
          : `Arrived at ${here.name}.`;
      state = {
        ...state,
        eventLog: [...state.eventLog, { day: state.day, text: summary }]
      };
      // Whore earnings fire on arrival at trading posts.
      if (here.kind === 'trading_post') {
        const whoreRng = makeRng(`${state.seed}:whore:${here.id}:${state.day}`);
        state = applyWhoreTradingPostEarnings(state, whoreRng, here.name);
        // Monthly restock: if we haven't seen this post in 30 days (or
        // ever), freight has come through and the shelves are full again.
        state = restockPostIfDue(state, here);
        // Trail gossip — 60% chance the clerk has something to say.
        const newsRng = makeRng(`${state.seed}:news:${here.id}:${state.day}`);
        if (newsRng.chance(0.6)) {
          const item = generatePostGossip(state, newsRng, here.name);
          if (item) state = addNews(state, item);
        }
        // Letter from home — rare delivery on first arrival at a post
        // with mail service. No-op on repeat visits.
        const letterRng = makeRng(`${state.seed}:letter:${here.id}:${state.day}`);
        state = maybeDeliverLetter(state, here, letterRng);
      }
      break;
    }
  }
  await locals.repo.save(locals.deviceId, slot, state);
  return state;
}


export function _parseTradeBasket(fd: FormData): TradeBasket {
  const mode = fd.get('mode')?.toString() === 'barter' ? 'barter' : 'cash';
  const get: Record<string, number> = {};
  const give: Record<string, number> = {};
  for (const [key, value] of fd.entries()) {
    const qty = parseInt(value.toString(), 10);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (key.startsWith('get_')) get[key.slice(4)] = qty;
    else if (key.startsWith('give_')) give[key.slice(5)] = qty;
  }
  const cashOffer = Math.max(0, parseInt(fd.get('cashOffer')?.toString() ?? '0', 10) || 0);
  return { mode, get, give, cashOffer };
}

export const actions: Actions = {
  travel: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(10, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);

    // Block continuing from a river without fording — river crossings require
    // an explicit choice (ford / caulk / ferry / wait).
    if (state.location.atLandmarkId) {
      const here = getLandmark(state.location.atLandmarkId);
      if (here.kind === 'river') {
        throw error(409, 'The river must be crossed before you can continue. Open the Ford action.');
      }
    }

    state = await runTravelLoop(state, days, locals, slot);
    return { state, pendingEventId: (state.flags._pendingEventId as string | undefined) };
  },

  resolveEvent: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const eventId = fd.get('eventId')?.toString();
    const choiceId = fd.get('choiceId')?.toString();
    if (!eventId || !choiceId) throw error(400, 'eventId and choiceId required');

    let state = await loadState(locals, slot);
    // Look in both registries — trail events and landmark arrival events.
    const event = EVENTS.find((e) => e.id === eventId)
      ?? Object.values(LANDMARK_ARRIVAL_EVENTS).find((e) => e.id === eventId);
    if (!event) throw error(400, `Unknown event ${eventId}`);
    state = applyPendingChoice(state, event, choiceId);

    // Every event resolution ends travel — the player must explicitly click
    // Travel again to continue.
    const flags = { ...state.flags };
    const pendingSummary = flags._pendingTravelSummary;
    const pendingSummaryDay = flags._pendingTravelSummaryDay;
    delete (flags as Record<string, unknown>)._pendingEventId;
    delete (flags as Record<string, unknown>)._pendingEventBody;
    delete (flags as Record<string, unknown>)._pendingTradeOffer;
    delete (flags as Record<string, unknown>)._travelRemaining;
    delete (flags as Record<string, unknown>)._pendingTravelSummary;
    delete (flags as Record<string, unknown>)._pendingTravelSummaryDay;

    // Append the travel summary AFTER the event's own log entries so the order
    // reads: [event resolution lines] → "Traveled N days (M mi) before being stopped."
    const appendedLog = typeof pendingSummary === 'string'
      ? [
          ...state.eventLog,
          {
            day: typeof pendingSummaryDay === 'number' ? pendingSummaryDay : state.day,
            text: pendingSummary
          }
        ]
      : state.eventLog;

    state = { ...state, flags, eventLog: appendedLog };

    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #224 — Sunday lay-by. Only callable when state.date is a Sunday.
  // Runs a single rest day with a Sabbath morale bonus on top of the
  // standard rest mechanics. Live Preacher amplifies (+5 vs +3).
  sundayLayBy: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!isSunday(state.date)) {
      throw error(409, 'Sunday lay-by is only available on Sundays.');
    }
    state = sundayLayBy(state);
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #1189 — toggle auto-Sabbath rest. Flips state.flags._autoSabbathRest
  // between true and false. When ON, the engine auto-fires sundayLayBy on
  // every Sunday during travel; when OFF the manual Lay by button is shown.
  toggleAutoSabbath: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    const current = state.flags._autoSabbathRest === true;
    state = {
      ...state,
      flags: { ...state.flags, _autoSabbathRest: !current }
    };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  rest: async ({ url, request, locals }) => {
    // Multi-day camp (#187): each ?/rest call advances exactly ONE day.
    // The first call sets `_campPlannedDays` from the form's
    // `plannedDays` field; subsequent days reuse that flag and increment
    // `_campDaysSoFar`. When sofar >= planned we clear both flags so the
    // page returns to play. The player can also abort the stay early
    // via ?/breakCamp.
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const rawCamp = fd.getAll('campAction').map((v) => v.toString());
    const campActions: CampActionId[] = [];
    for (const id of rawCamp) {
      if (id in CAMP_ACTIONS_BY_ID) campActions.push(id as CampActionId);
      else throw error(400, `unknown camp action: ${id}`);
    }
    let state = await loadState(locals, slot);
    const plannedFromFlag = state.flags._campPlannedDays as number | undefined;
    const plannedFromForm = Math.max(1, Math.min(7, parseInt(fd.get('plannedDays')?.toString() ?? '1', 10)));
    const planned = plannedFromFlag ?? plannedFromForm;
    const sofarBefore = (state.flags._campDaysSoFar as number | undefined) ?? 0;
    // Defensive filter — drop camp actions that aren't available against
    // the CURRENT state. Otherwise rest() throws (rest.ts:213-215) and the
    // POST returns 500. Race conditions where the user checked an action
    // when it was available, then state changed before submit (auto-spoilage,
    // a prior action consuming the input, etc.), would otherwise kill the
    // request. Log the drop for observability; the dropped action's effect
    // simply doesn't fire.
    const droppedCampActions: CampActionId[] = [];
    const filteredCampActions = campActions.filter((id) => {
      const available = CAMP_ACTIONS_BY_ID[id].availability(state).available;
      if (!available) droppedCampActions.push(id);
      return available;
    });
    if (droppedCampActions.length > 0) {
      console.warn(`[rest] dropped unavailable camp actions: ${droppedCampActions.join(', ')}`);
    }
    state = rest(state, 1, filteredCampActions.length > 0 ? { campActions: filteredCampActions } : {});
    const sofarAfter = sofarBefore + 1;
    const flags: typeof state.flags = { ...state.flags };
    if (sofarAfter >= planned) {
      delete flags._campPlannedDays;
      delete flags._campDaysSoFar;
    } else {
      flags._campPlannedDays = planned;
      flags._campDaysSoFar = sofarAfter;
      // Mid-stay days: suppress the CampSummary modal — the dawn fade
      // carries the day transition. The final day's summary still fires
      // when the stay ends (sofarAfter >= planned branch above).
      delete flags._campSummary;
    }
    state = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  breakCamp: async ({ url, locals }) => {
    // Early-exit a multi-day stay (#187). Clears the camp-session flags
    // without advancing a day. Idempotent — fine to call when no stay
    // is active.
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    const flags: typeof state.flags = { ...state.flags };
    delete flags._campPlannedDays;
    delete flags._campDaysSoFar;
    state = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  hunt: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const target = fd.get('target')?.toString() as HuntTarget;
    const ammo = fd.get('ammo')?.toString() as AmmoBand;
    const hunters = parseInt(fd.get('hunters')?.toString() ?? '1', 10);
    const styleRaw = fd.get('style')?.toString();
    const style: 'full' | 'prize_only' = styleRaw === 'prize_only' ? 'prize_only' : 'full';
    const renderTallow = fd.get('render_tallow')?.toString() !== 'no';
    const modeRaw = fd.get('mode')?.toString();
    const mode: 'solo' | 'company' = modeRaw === 'company' ? 'company' : 'solo';
    if (!target || !ammo) throw error(400, 'target and ammo required');
    let state = await loadState(locals, slot);
    state = hunt(state, { target, ammo, hunters, style, renderTallow, mode });
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // Acknowledge the post-hunt haul modal — clears the flag so the modal
  // doesn't re-open on the next page load. The haul itself is already
  // applied by hunt(); this is purely a UI dismiss.
  ackHunt: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._huntHaul;
    const next = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  // Same shape as ackHunt — clears the post-rest CampSummary flag.
  ackCamp: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._campSummary;
    const next = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  ackFord: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._fordResult;
    const next = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  ackPaper: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._paperBatch;
    const next = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  discardItem: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const itemId = fd.get('itemId')?.toString();
    const qty = Math.max(1, parseInt(fd.get('qty')?.toString() ?? '0', 10));
    if (!itemId) throw error(400, 'itemId required');
    const state = await loadState(locals, slot);
    // Lightening is allowed any time (#200). Diaries do mostly record
    // this at the rocks and forts, but desperate parties dumped on the
    // open trail too — and forcing the player to a landmark just to
    // pitch a busted wheel is fiddly UX.
    const have = state.inventory[itemId] ?? 0;
    if (have <= 0) throw error(409, `no ${itemId} in inventory`);
    const drop = Math.min(qty, have);
    const inventory = { ...state.inventory };
    if (have - drop <= 0) delete inventory[itemId];
    else inventory[itemId] = have - drop;
    const where = state.location.atLandmarkId
      ? `at ${getLandmark(state.location.atLandmarkId).name}`
      : 'on the trail';
    const next = {
      ...state,
      inventory,
      eventLog: [
        ...state.eventLog,
        {
          day: state.day,
          text: `Lightened the wagon ${where}: dropped ${drop} ${itemId.replace(/_/g, ' ')}.`
        }
      ]
    };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  // #936b — player resolution of the stuck-in-mud abandon_load choice.
  // The wagon_stuck event set `_mudAbandonPending`; MudAbandonModal
  // posts here with the checked itemIds. Drops exactly those stacks
  // (full-stack each) and clears the flag.
  mudAbandon: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const itemIds = fd.getAll('itemId').map((v) => v.toString()).filter(Boolean);
    const state = await loadState(locals, slot);
    // Never trust the POST: clamp to the server-computed droppable set
    // so a crafted request can't jettison essentials (medicine, ammo,
    // required tools). The modal only ever submits droppable ids; this
    // is the boundary guard.
    const allowed = new Set(droppableHeavyItems(state).map((r) => r.id));
    const safeIds = itemIds.filter((id) => allowed.has(id));
    const { state: dropped } = abandonSelected(state, safeIds);
    const flags = { ...dropped.flags };
    delete (flags as Record<string, unknown>)._mudAbandonPending;
    const next = { ...dropped, flags };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  // #936b — the modal's "Force through instead" escape. Applies the
  // same outcome as the wagon_stuck `force` choice (oxen fatigue, no
  // drops) so the player is never soft-locked if they refuse to shed
  // enough weight.
  mudForceThrough: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const rng = makeRng(`${state.seed}:mud-force:${state.day}`);
    const fatigueHit = rng.int(12, 25);
    const oxen = state.oxen.map((o) => ({
      ...o,
      fatigue: Math.min(100, o.fatigue + fatigueHit)
    }));
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._mudAbandonPending;
    const next = {
      ...state,
      oxen,
      flags,
      eventLog: [
        ...state.eventLog,
        { day: state.day, text: `Forced through the mud. The oxen are wrecked (+${fatigueHit} fatigue each).` }
      ]
    };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  // #1046b — player resolution of the company lay-by dissent choice.
  // tickDayPausable set `_companyDissentPending` when the chartered company
  // called a maintenance or Sabbath halt. CompanyDissentModal posts here;
  // applyCompanyDissent is a tail-only continuation that resolves the choice
  // AND finishes the day — do NOT re-tick (that would double-drain food/conditions).
  companyDissent: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const choice = (await request.formData()).get('choice')?.toString();
    if (choice !== 'abide' && choice !== 'override' && choice !== 'lobby' && choice !== 'press_on') {
      throw error(400, 'bad choice');
    }
    const state = await loadState(locals, slot);
    if (!state.flags._companyDissentPending) throw error(400, 'no dissent pending');
    const rng = makeRng(`${state.seed}:dissent:${state.day}`);
    const next = applyCompanyDissent(state, choice, rng);
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  ackLetter: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._pendingLetter;
    const next = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  ford: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const method = fd.get('method')?.toString() as FordMethod;
    const waitDays = parseInt(fd.get('waitDays')?.toString() ?? '1', 10);
    if (!method) throw error(400, 'method required');

    let state = await loadState(locals, slot);
    // Pull per-river stats from the landmark we're parked at. Falls back to
    // a modest default if somehow invoked away from a river (shouldn't happen;
    // the Ford action is gated by UI to river stops only).
    const hereId = state.location.atLandmarkId;
    const here = hereId ? getLandmark(hereId) : null;
    const river = here?.river ?? { depthFt: 3, currentMph: 3, ferryPrice: 5 };
    // RiverState includes the optional nativeFerry config (#238); it
    // flows through as-is since RiverStats is the same shape on both
    // sides of the boundary.
    state = ford(state, { method, river, waitDays });
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  setPace: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const raw = fd.get('pace')?.toString();
    const ALLOWED_PACES = ['slow', 'moderate', 'fast', 'grueling'] as const;
    type Pace = typeof ALLOWED_PACES[number];
    if (!raw || !ALLOWED_PACES.includes(raw as Pace)) {
      throw error(400, 'invalid pace');
    }
    const pace: Pace = raw as Pace;
    const state = await loadState(locals, slot);
    const next = { ...state, pace };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  setRations: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const raw = fd.get('rations')?.toString();
    const ALLOWED_RATIONS = ['meager', 'normal', 'filling'] as const;
    type Rations = typeof ALLOWED_RATIONS[number];
    if (!raw || !ALLOWED_RATIONS.includes(raw as Rations)) {
      throw error(400, 'invalid rations');
    }
    const rations: Rations = raw as Rations;
    const state = await loadState(locals, slot);
    const next = { ...state, rations };
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  // #1245 — Player water ration control. Mirrors setRations exactly.
  setWaterRation: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const raw = fd.get('waterRation')?.toString() ?? '';
    if (!isWaterRation(raw)) throw error(400, 'invalid waterRation');
    const state = await loadState(locals, slot);
    const next = setWaterRationOnState(state, raw);
    await locals.repo.save(locals.deviceId, slot, next);
    return { state: next };
  },

  // #1001 — Item-for-item barter at a trading post. The engine surface
  // (systems/barter.ts) validates fairness + inventory; this action is
  // a thin wrapper that loads state, calls applyBarter, persists.
  // --- Town services (#152) ---

  townRepair: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const dollars = parseInt(fd.get('dollars')?.toString() ?? '0', 10);
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('blacksmith')) {
      throw error(409, 'no blacksmith here');
    }
    const result = repairWagon(state, dollars);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townForgeOxShoes: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const pairs = parseInt(fd.get('pairs')?.toString() ?? '1', 10);
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('blacksmith')) {
      throw error(409, 'no blacksmith here');
    }
    const result = forgeOxShoes(state, pairs);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #270 — Bath-house: $1/person, +50 cleanliness, +4 morale.
  townBathHouse: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('bath_house')) {
      throw error(409, 'no bath-house here');
    }
    const result = useBathHouse(state);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townInn: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const nights = parseInt(fd.get('nights')?.toString() ?? '1', 10);
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('inn')) throw error(409, 'no inn here');
    const result = stayAtInn(state, nights, here.innNightlyRate);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townGamble: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const stake = parseInt(fd.get('stake')?.toString() ?? '5', 10);
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('gambling')) {
      throw error(409, 'no gambling here');
    }
    const rng = makeRng(`${state.seed}:gamble:${here.id}:${state.day}:${state.cash}`);
    const result = gamble(state, rng, stake);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townGuide: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const dollars = parseInt(fd.get('dollars')?.toString() ?? '0', 10);
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('guide')) throw error(409, 'no guide here');
    const result = hireGuide(state, dollars);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #176 — Wagon-train services. Join at any trading post; leave at
  // any landmark (the leave action runs from the in-train info panel).
  townJoinTrain: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (here.kind !== 'trading_post') throw error(409, 'must be at a trading post');
    if (state.wagonTrain) throw error(409, 'already in a wagon train');
    const rng = makeRng(`${state.seed}:wagon-train:${here.id}:${state.day}`);
    const result = joinTrain(state, rng);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townLeaveTrain: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.wagonTrain) throw error(409, 'not in a wagon train');
    state = leaveTrain(state);
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #286 — captain-only doctor visit. Body: { wagonId }. Uses 1 charge
  // of medicine_chest (logical — chest is not consumed; player must
  // own it). Treats the lowest-HP party member of the target wagon,
  // bumps wagon morale +5.
  townDoctorVisit: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const wagonId = fd.get('wagonId')?.toString() ?? '';
    let state = await loadState(locals, slot);
    if (!isCaptain(state)) throw error(403, 'Only the captain can call a doctor visit.');
    if ((state.inventory.medicine_chest ?? 0) <= 0) {
      throw error(409, 'No medicine chest in your wagon.');
    }
    const result = doctorVisit(state, wagonId);
    if (!result.treated) {
      throw error(409, "Nobody in that wagon needs treatment right now.");
    }
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #286 — captain-only inter-companion item transfer. Body:
  // { fromWagonId, toWagonId, item, qty }. Tightly scoped form: a
  // single line transfer; future UI extension could send multiple
  // lines as JSON. Hostile-morale destination refuses (409).
  townHandToCompanion: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const fromWagonId = fd.get('fromWagonId')?.toString() ?? '';
    const toWagonId = fd.get('toWagonId')?.toString() ?? '';
    const item = fd.get('item')?.toString() ?? '';
    const qty = parseInt(fd.get('qty')?.toString() ?? '0', 10);
    let state = await loadState(locals, slot);
    if (!isCaptain(state)) throw error(403, 'Only the captain can move items between companions.');
    if (!item || qty <= 0) throw error(400, 'item and positive qty required');
    const result = transferBetweenCompanions(state, fromWagonId, toWagonId, [{ item, qty }]);
    if (!result.accepted) {
      throw error(409, result.declineReason ?? 'They declined.');
    }
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #285 phase 2 — toggle the player's stand-aside preference. When
  // set, the player's wagon is excluded from candidate lists at vote
  // time so the captaincy goes to the highest-charisma companion.
  townToggleStandAside: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.wagonTrain) throw error(409, 'not in a wagon train');
    const next = !state.wagonTrain.playerStandsAside;
    state = {
      ...state,
      wagonTrain: { ...state.wagonTrain, playerStandsAside: next },
      eventLog: [
        ...state.eventLog,
        {
          day: state.day,
          text: next
            ? "You let the company know you'll stand aside at the next vote."
            : "You let the company know you'll stand for captaincy at the next vote."
        }
      ]
    };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  // #289 — phase-1 quick-give. Body: { wagonId, item, qty }. Builds
  // a gift-only offer (player gives, gets nothing) and runs through
  // tradeWithCompanion. Future phases (#289 phase 2) extend with
  // barter and buy/sell flows; the engine action already supports
  // them — only the UI is incremental.
  townGiveToCompanion: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const wagonId = fd.get('wagonId')?.toString() ?? '';
    const item = fd.get('item')?.toString() ?? 'flour';
    const qty = parseInt(fd.get('qty')?.toString() ?? '20', 10);
    let state = await loadState(locals, slot);
    if (!state.wagonTrain) throw error(409, 'not in a wagon train');
    if (qty <= 0) throw error(400, 'qty must be positive');
    if ((state.inventory[item] ?? 0) < qty) {
      throw error(409, `not enough ${item} (have ${state.inventory[item] ?? 0})`);
    }
    const result = tradeWithCompanion(state, wagonId, {
      give: [{ item, qty }]
    });
    if (!result.accepted) {
      throw error(409, result.declineReason ?? 'They declined.');
    }
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townGossip: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('gossip')) throw error(409, 'no gossip here');
    const COST = 1;
    if (state.cash < COST) throw error(409, "need $1 for a round of drinks");
    // Charge cash, then pull a fresh news item via the existing generator.
    state = { ...state, cash: state.cash - COST };
    const rng = makeRng(`${state.seed}:gossip:${here.id}:${state.day}:${state.cash}`);
    const item = generatePostGossip(state, rng, here.name);
    if (item) state = addNews(state, item);
    else state = {
      ...state,
      eventLog: [...state.eventLog, { day: state.day, text: `Bought a round at ${here.name} but heard nothing new.` }]
    };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townNewspaper: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    // Newspapers ride mail with the same clerks who hand out gossip.
    if (!(here.services ?? []).includes('gossip')) throw error(409, 'no paper here');
    const COST = 1;
    if (state.cash < COST) throw error(409, "need $1 for the newspaper");
    state = { ...state, cash: state.cash - COST };
    const rng = makeRng(`${state.seed}:paper:${here.id}:${state.day}:${state.cash}`);
    const { items, headlineIdsUsed } = generateNewspaper(state, rng, here.name);
    if (items.length === 0) {
      state = {
        ...state,
        eventLog: [...state.eventLog, { day: state.day, text: `Bought a paper at ${here.name}, but the news was old.` }]
      };
    } else {
      state = applyNewspaper(state, items, headlineIdsUsed, here.name);
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  townBrothel: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    if (!state.location.atLandmarkId) throw error(409, 'not at a landmark');
    const here = getLandmark(state.location.atLandmarkId);
    if (!(here.services ?? []).includes('brothel')) {
      throw error(409, 'no brothel here');
    }
    const rng = makeRng(`${state.seed}:brothel:${here.id}:${state.day}:${state.cash}`);
    const result = visitBrothel(state, rng);
    state = result.state;
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },
  // #<settle-trade-task> — unified trade basket settlement. Accepts
  // mode (cash|barter), get_*/give_* item quantities, and optional
  // cashOffer. Calls the engine's settleTrade, persists state, returns.
  settleTrade: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const basket = _parseTradeBasket(fd);
    let state = await loadState(locals, slot);
    try {
      state = _settleTrade(state, basket).state;
    } catch (e) {
      throw error(409, (e as Error).message);
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },
};
