import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { rest, type ShovelAction } from '$lib/game/actions/rest';
import { getLandmark } from '$lib/game/content/landmarks';
import { tickDayPausable, applyPendingChoice } from '$lib/game/engine-pausable';
import { EVENTS } from '$lib/game/content/events';
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
      state = {
        ...result.state,
        flags: { ...result.state.flags, _pendingEventId: result.pendingEvent.id },
        eventLog: [
          ...result.state.eventLog,
          { day: result.state.day, text: summary }
        ]
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
    const event = EVENTS.find((e) => e.id === eventId);
    if (!event) throw error(400, `Unknown event ${eventId}`);
    state = applyPendingChoice(state, event, choiceId);

    // Every event resolution ends travel — the player must explicitly click
    // Travel again to continue. This gives them a chance to react (check
    // party, trade, rest) before pushing on.
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._pendingEventId;
    delete (flags as Record<string, unknown>)._travelRemaining;
    state = { ...state, flags };

    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  rest: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(7, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    const shovelActions = fd.getAll('shovelAction').map((v) => v.toString() as ShovelAction);
    let state = await loadState(locals, slot);
    state = rest(state, days, shovelActions.length > 0 ? { shovelActions } : {});
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
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  }
};
