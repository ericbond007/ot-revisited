import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { rest } from '$lib/game/actions/rest';
import { CAMP_ACTIONS_BY_ID, type CampActionId } from '$lib/game/actions/camp-actions';
import { getLandmark } from '$lib/game/content/landmarks';
import { tickDayPausable, applyPendingChoice } from '$lib/game/engine-pausable';
import { EVENTS } from '$lib/game/content/events';
import { LANDMARK_ARRIVAL_EVENTS } from '$lib/game/content/landmark-arrival-events';
import { applyWhoreTradingPostEarnings } from '$lib/game/professions/bonuses';
import { restockPostIfDue, recordPostPurchases } from '$lib/game/systems/post-stock';
import { addNews, generatePostGossip, generateNewspaper, applyNewspaper } from '$lib/game/systems/news';
import { maybeDeliverLetter } from '$lib/game/systems/letters';
import { repairWagon, stayAtInn, gamble, visitBrothel, hireGuide } from '$lib/game/systems/town-services';
import { makeRng } from '$lib/game/rng';
import { hunt, type HuntTarget, type AmmoBand } from '$lib/game/actions/hunt';
import { ford, type FordMethod } from '$lib/game/actions/ford';
import { trade } from '$lib/game/actions/trade';

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

  rest: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(7, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    const rawCamp = fd.getAll('campAction').map((v) => v.toString());
    // Whitelist against the registry — unknown ids become 400 rather
    // than bubbling up as a generic runtime error from rest().
    const campActions: CampActionId[] = [];
    for (const id of rawCamp) {
      if (id in CAMP_ACTIONS_BY_ID) campActions.push(id as CampActionId);
      else throw error(400, `unknown camp action: ${id}`);
    }
    let state = await loadState(locals, slot);
    state = rest(state, days, campActions.length > 0 ? { campActions } : {});
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
    if (!target || !ammo) throw error(400, 'target and ammo required');
    let state = await loadState(locals, slot);
    state = hunt(state, { target, ammo, hunters });
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

  ackTrade: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const state = await loadState(locals, slot);
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._tradeResult;
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
    // Lightening is gated to landmarks — diaries record this happening
    // at the rocks (Independence, Devil's Gate) and at the forts; on
    // the open trail you'd usually push through, not pull out of formation.
    if (!state.location.atLandmarkId) throw error(409, 'must be at a landmark to lighten the wagon');
    const have = state.inventory[itemId] ?? 0;
    if (have <= 0) throw error(409, `no ${itemId} in inventory`);
    const drop = Math.min(qty, have);
    const inventory = { ...state.inventory };
    if (have - drop <= 0) delete inventory[itemId];
    else inventory[itemId] = have - drop;
    const here = getLandmark(state.location.atLandmarkId);
    const next = {
      ...state,
      inventory,
      eventLog: [
        ...state.eventLog,
        {
          day: state.day,
          text: `Lightened the wagon at ${here.name}: dropped ${drop} ${itemId.replace(/_/g, ' ')}.`
        }
      ]
    };
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

  trade: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const buys: Array<{ item: string; qty: number }> = [];
    const sells: Array<{ item: string; qty: number }> = [];
    for (const [key, value] of fd.entries()) {
      if (key.startsWith('buy_')) {
        const item = key.slice(4);
        const qty = parseInt(value.toString(), 10);
        if (qty > 0) buys.push({ item, qty });
      } else if (key.startsWith('sell_')) {
        const item = key.slice(5);
        const qty = parseInt(value.toString(), 10);
        if (qty > 0) sells.push({ item, qty });
      }
    }
    let state = await loadState(locals, slot);
    state = trade(state, { buys, sells });
    // Decrement post stock for each purchase so future visits see the
    // shelves emptier. Only applies at trading posts (skipped silently
    // for any other trade context).
    if (state.location.atLandmarkId) {
      const here = getLandmark(state.location.atLandmarkId);
      if (here.kind === 'trading_post') {
        const purchaseMap: Record<string, number> = {};
        for (const b of buys) purchaseMap[b.item] = (purchaseMap[b.item] ?? 0) + b.qty;
        state = recordPostPurchases(state, here, purchaseMap);
      }
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

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
  }
};
