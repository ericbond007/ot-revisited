import type { PageServerLoad, Actions } from './$types';
import { error } from '@sveltejs/kit';
import { tickDay } from '$lib/game/engine';
import { rest } from '$lib/game/actions/rest';
import { camp } from '$lib/game/actions/camp';

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
      state = tickDay(state);
    }
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
  }
};
