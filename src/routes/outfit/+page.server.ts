import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { trade } from '$lib/game/actions/trade';
import { OUTFITTER_BUYABLES } from '$lib/game/content/outfitter';

export const load: PageServerLoad = async ({ url, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'Missing ?slot=<name>');

  const state = await locals.repo.load(locals.deviceId, slot);
  if (!state) throw error(404, `No save in slot "${slot}"`);

  // Once the journey is underway, outfitting is closed.
  if (state.day > 1 || state.location.milesTraveled > 0 || state.flags._outfitted) {
    throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
  }

  return { slot, state, buyables: [...OUTFITTER_BUYABLES] };
};

export const actions: Actions = {
  outfit: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');

    const fd = await request.formData();
    const buys: Array<{ item: string; qty: number }> = [];
    for (const [key, value] of fd.entries()) {
      if (!key.startsWith('buy_')) continue;
      const item = key.slice(4);
      const qty = parseInt(value.toString(), 10);
      if (qty > 0) buys.push({ item, qty });
    }

    let state = await locals.repo.load(locals.deviceId, slot);
    if (!state) throw error(404, `No save in slot "${slot}"`);

    if (buys.length > 0) {
      // trade() validates cash and applies profession discounts (Banker,
      // Merchant) — appropriate at Independence too. Throws on overspend.
      state = trade(state, { buys });
    }

    state = { ...state, flags: { ...state.flags, _outfitted: true } };
    await locals.repo.save(locals.deviceId, slot, state);
    throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
  }
};
