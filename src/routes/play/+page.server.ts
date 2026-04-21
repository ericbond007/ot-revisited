import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { rest, type ShovelAction } from '$lib/game/actions/rest';
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

// Runs up to `days` day-ticks. If an event fires mid-loop, persists the remaining
// days as `_travelRemaining` so the resolveEvent action can pick up where we left off.
async function runTravelLoop(
  initialState: Awaited<ReturnType<typeof loadState>>,
  days: number,
  locals: App.Locals,
  slot: string
) {
  let state = initialState;
  for (let i = 0; i < days && !state.completed; i++) {
    const result = tickDayPausable(state);
    if (result.pendingEvent) {
      const newRemaining = days - (i + 1);
      state = {
        ...result.state,
        flags: {
          ...result.state.flags,
          _pendingEventId: result.pendingEvent.id,
          ...(newRemaining > 0 ? { _travelRemaining: newRemaining } : {})
        }
      };
      await locals.repo.save(locals.deviceId, slot, state);
      return state;
    }
    state = result.state;
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

    // Extract how many travel days were queued before the event paused us.
    const remaining = typeof state.flags._travelRemaining === 'number' ? state.flags._travelRemaining : 0;

    // Clear both pause-related flags; if the loop below re-pauses it'll set them again.
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._pendingEventId;
    delete (flags as Record<string, unknown>)._travelRemaining;
    state = { ...state, flags };

    if (remaining > 0) {
      state = await runTravelLoop(state, remaining, locals, slot);
    } else {
      await locals.repo.save(locals.deviceId, slot, state);
    }

    return { state, pendingEventId: (state.flags._pendingEventId as string | undefined) };
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
    // Use a hardcoded RiverState for now; Plan 5 can make rivers contextual per-landmark.
    const river = { depthFt: 3, currentMph: 3, ferryPrice: 5 };
    state = ford(state, { method, river, waitDays });
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
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
