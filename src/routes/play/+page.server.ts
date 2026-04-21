import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { rest } from '$lib/game/actions/rest';
import { camp } from '$lib/game/actions/camp';
import { tickDayPausable, applyPendingChoice } from '$lib/game/engine-pausable';
import { EVENTS } from '$lib/game/content/events';
import { hunt, type HuntTarget, type AmmoBand } from '$lib/game/actions/hunt';

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

export const actions: Actions = {
  travel: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(10, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);
    for (let i = 0; i < days && !state.completed; i++) {
      const result = tickDayPausable(state);
      if (result.pendingEvent) {
        await locals.repo.save(locals.deviceId, slot, result.state);
        // Persist pending event in a side-channel flag on state:
        state = {
          ...result.state,
          flags: { ...result.state.flags, _pendingEventId: result.pendingEvent.id }
        };
        await locals.repo.save(locals.deviceId, slot, state);
        return { state, pendingEventId: result.pendingEvent.id };
      }
      state = result.state;
    }
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
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
    // Clear the side-channel flag
    const flags = { ...state.flags };
    delete (flags as Record<string, unknown>)._pendingEventId;
    state = { ...state, flags };
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  rest: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    const fd = await request.formData();
    const days = Math.max(1, Math.min(7, parseInt(fd.get('days')?.toString() ?? '1', 10)));
    let state = await loadState(locals, slot);
    state = rest(state, days);
    await locals.repo.save(locals.deviceId, slot, state);
    return { state };
  },

  camp: async ({ url, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');
    let state = await loadState(locals, slot);
    state = camp(state, {});
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
  }
};
