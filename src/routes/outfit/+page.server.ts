import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { trade } from '$lib/game/actions/trade';
import { OUTFITTER_BUYABLES } from '$lib/game/content/outfitter';
import { WAGONS, getWagon, DEFAULT_WAGON_MODEL, type WagonModelId } from '$lib/game/content/wagons';
import { recomputeWaterCap } from '$lib/game/systems/water-cap';
import { randomDogName } from '$lib/game/content/dog-names';
import { makeRng } from '$lib/game/rng';
import type { GameState, Ox } from '$lib/game/types';

const OX_PRICE = 20;
const MAX_EXTRA_OXEN = 8;

export const load: PageServerLoad = async ({ url, locals }) => {
  const slot = url.searchParams.get('slot');
  if (!slot) throw error(400, 'Missing ?slot=<name>');

  const state = await locals.repo.load(locals.deviceId, slot);
  if (!state) throw error(404, `No save in slot "${slot}"`);

  // Once the journey is underway, outfitting is closed.
  if (state.day > 1 || state.location.milesTraveled > 0 || state.flags._outfitted) {
    throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
  }

  // Suggest a dog name from the period list, seeded by the slot so the
  // name doesn't churn across renders but differs between saves.
  const suggestedDogName = randomDogName(makeRng(`dog-suggest:${slot}`));

  return {
    slot,
    state,
    buyables: [...OUTFITTER_BUYABLES],
    wagons: WAGONS,
    defaultWagon: DEFAULT_WAGON_MODEL,
    oxPrice: OX_PRICE,
    maxExtraOxen: MAX_EXTRA_OXEN,
    suggestedDogName
  };
};

function parseWagonId(raw: string | undefined): WagonModelId {
  if (raw === 'light' || raw === 'prairie_schooner' || raw === 'heavy') return raw;
  return DEFAULT_WAGON_MODEL;
}

/** Swap the wagon model: refund/charge the price diff vs prairie_schooner. */
function applyWagonSwap(state: GameState, newModelId: WagonModelId): GameState {
  const oldModel = getWagon(state.wagon.model);
  const newModel = getWagon(newModelId);
  if (oldModel.id === newModel.id) return state;
  const cashDiff = oldModel.price - newModel.price;
  return {
    ...state,
    cash: state.cash + cashDiff,
    wagon: {
      ...state.wagon,
      model: newModelId,
      carryCapacity: newModel.carryCapacity
    }
  };
}

function addOxen(state: GameState, count: number): GameState {
  if (count <= 0) return state;
  const next: Ox[] = [...state.oxen];
  for (let i = 0; i < count; i++) {
    next.push({ id: `ox-extra-${state.oxen.length + i}`, health: 100, fatigue: 0, shod: true });
  }
  return { ...state, oxen: next, cash: state.cash - count * OX_PRICE };
}

export const actions: Actions = {
  outfit: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');

    const fd = await request.formData();
    const wagonModel = parseWagonId(fd.get('wagonModel')?.toString());
    const extraOxenRaw = parseInt(fd.get('extraOxen')?.toString() ?? '0', 10);
    const extraOxen = Math.max(0, Math.min(MAX_EXTRA_OXEN, Number.isFinite(extraOxenRaw) ? extraOxenRaw : 0));

    // Dog — unchecked checkboxes don't submit, so presence of `bringDog`
    // in the form means "yes". Name falls back to the suggested one if
    // the player clears it.
    const bringDog = fd.get('bringDog') !== null;
    const dogNameRaw = fd.get('dogName')?.toString().trim() ?? '';
    const dogName = dogNameRaw.slice(0, 30);

    const buys: Array<{ item: string; qty: number }> = [];
    for (const [key, value] of fd.entries()) {
      if (!key.startsWith('buy_')) continue;
      const item = key.slice(4);
      const qty = parseInt(value.toString(), 10);
      if (qty > 0) buys.push({ item, qty });
    }

    let state = await locals.repo.load(locals.deviceId, slot);
    if (!state) throw error(404, `No save in slot "${slot}"`);

    // 1. Apply wagon swap (adjusts cash by model price diff).
    state = applyWagonSwap(state, wagonModel);
    // Wagon model sets the water-keg baseline; recompute waterCap so
    // swapping to a larger rig lifts the player's water ceiling right
    // away (trade() would do this too but only fires when there are
    // supplies to buy). Top water up to the new cap — at Independence
    // the quartermaster fills the kegs before the party rolls out.
    state = recomputeWaterCap(state);
    state = {
      ...state,
      resources: { ...state.resources, water: state.resources.waterCap }
    };

    // 2. Buy extra oxen before supplies so the capacity check reflects the
    //    final team. Cash gets deducted here too.
    if (state.cash - extraOxen * OX_PRICE < 0) {
      return fail(400, { error: `Not enough cash for ${extraOxen} extra oxen.` });
    }
    state = addOxen(state, extraOxen);

    // 3. Buy supplies via the trade action. Throws if overdrawn.
    if (buys.length > 0) {
      try {
        state = trade(state, { buys });
      } catch (e) {
        return fail(400, { error: (e as Error).message });
      }
    }

    // 4. Validate the min-team gate — can't depart with a wagon you can't pull.
    const wagon = getWagon(state.wagon.model);
    const aliveOxen = state.oxen.filter((o) => o.health > 0).length;
    if (aliveOxen < wagon.minTeam) {
      return fail(400, {
        error: `${wagon.name} needs at least ${wagon.minTeam} oxen to pull. You have ${aliveOxen}.`
      });
    }

    // 5. Attach or detach the dog based on the player's choice. Falls
    //    back to a reseeded random name if "bring" was checked but the
    //    field came through blank (unlikely — client defaults it).
    if (bringDog) {
      const finalName = dogName || randomDogName(makeRng(`dog-fallback:${slot}`));
      state = { ...state, dog: { name: finalName } };
    } else {
      const { dog: _drop, ...rest } = state;
      state = rest as typeof state;
    }

    state = { ...state, flags: { ...state.flags, _outfitted: true } };
    await locals.repo.save(locals.deviceId, slot, state);
    throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
  }
};
