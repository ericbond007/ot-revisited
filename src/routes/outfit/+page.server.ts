import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { trade } from '$lib/game/actions/trade';
import { OUTFITTER_BUYABLES } from '$lib/game/content/outfitter';
import { WAGONS, getWagon, DEFAULT_WAGON_MODEL, BRAN_BARREL_UPGRADE_PRICE, type WagonModelId } from '$lib/game/content/wagons';
import { recomputeWaterCap } from '$lib/game/systems/water-cap';
import { randomDogName } from '$lib/game/content/dog-names';
import { makeRng } from '$lib/game/rng';
import type { DraftKind, GameState, Ox } from '$lib/game/types';

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

/** Parse buy_<id> form fields into purchase orders, deduped by item.
 *  The form should emit exactly one buy_<id> per item, but a duplicate
 *  hidden input (e.g. a named stepper + a top-level loop) would otherwise
 *  be applied twice and double-charge the player. Last write wins —
 *  duplicate inputs carry the same qty, so dedup-by-key is correct. */
export function parseBuyOrders(fd: FormData): Array<{ item: string; qty: number }> {
  const byItem = new Map<string, number>();
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith('buy_')) continue;
    const item = key.slice(4);
    const qty = parseInt(value.toString(), 10);
    if (qty > 0) byItem.set(item, qty);
  }
  return [...byItem].map(([item, qty]) => ({ item, qty }));
}

function parseWagonId(raw: string | undefined): WagonModelId {
  if (raw === 'light' || raw === 'prairie_schooner' || raw === 'heavy') return raw;
  return DEFAULT_WAGON_MODEL;
}

/** Swap the wagon model: refund/charge the price diff vs prairie_schooner.
 *  Also resets hasBranBarrel to match the new model's default — schooner
 *  + heavy ship with one, light doesn't. (#264) */
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
      carryCapacity: newModel.carryCapacity,
      hasBranBarrel: newModel.shipsWithBranBarrel === true
    }
  };
}

/** Add a bran barrel as a paid upgrade (#264). Only meaningful for the
 *  light wagon — schooner + heavy already include one. Returns fail()
 *  data when the player can't afford it; otherwise the upgraded state. */
function applyBranBarrelUpgrade(
  state: GameState,
  requested: boolean
): GameState | { error: string } {
  if (!requested || state.wagon.hasBranBarrel) return state;
  if (state.cash < BRAN_BARREL_UPGRADE_PRICE) {
    return { error: `Not enough cash for the bran barrel upgrade ($${BRAN_BARREL_UPGRADE_PRICE}).` };
  }
  return {
    ...state,
    cash: state.cash - BRAN_BARREL_UPGRADE_PRICE,
    wagon: { ...state.wagon, hasBranBarrel: true }
  };
}

const MULE_PRICE_SURCHARGE = 10; // matches the client-side constant

function addOxen(state: GameState, count: number, kind: DraftKind): GameState {
  if (count <= 0) return state;
  const next: Ox[] = [...state.oxen];
  for (let i = 0; i < count; i++) {
    next.push({
      id: `ox-extra-${state.oxen.length + i}`,
      health: 100,
      fatigue: 0,
      shod: true,
      kind
    });
  }
  const perHead = OX_PRICE + (kind === 'mule' ? MULE_PRICE_SURCHARGE : 0);
  return { ...state, oxen: next, cash: state.cash - count * perHead };
}

/** Convert every existing team animal to the given kind + charge the
 *  surcharge on swap. The starter team is all oxen by default; a mule
 *  party pays $10/head to outfit mules instead.
 */
function setTeamKind(state: GameState, kind: DraftKind): GameState {
  const currentKind: DraftKind = state.oxen[0]?.kind ?? 'ox';
  if (currentKind === kind) return state;
  const surcharge = kind === 'mule' ? state.oxen.length * MULE_PRICE_SURCHARGE : -state.oxen.length * MULE_PRICE_SURCHARGE;
  return {
    ...state,
    oxen: state.oxen.map((a) => ({ ...a, kind })),
    cash: state.cash - surcharge
  };
}

export const actions: Actions = {
  outfit: async ({ url, request, locals }) => {
    const slot = url.searchParams.get('slot');
    if (!slot) throw error(400, 'slot required');

    const fd = await request.formData();
    const wagonModel = parseWagonId(fd.get('wagonModel')?.toString());
    const extraOxenRaw = parseInt(fd.get('extraOxen')?.toString() ?? '0', 10);
    const extraOxen = Math.max(0, Math.min(MAX_EXTRA_OXEN, Number.isFinite(extraOxenRaw) ? extraOxenRaw : 0));
    const rawKind = fd.get('teamKind')?.toString();
    const teamKind: DraftKind = rawKind === 'mule' ? 'mule' : 'ox';

    // Dog — unchecked checkboxes don't submit, so presence of `bringDog`
    // in the form means "yes". Name falls back to the suggested one if
    // the player clears it.
    const branBarrelUpgrade = fd.get('branBarrelUpgrade') !== null;
    const bringDog = fd.get('bringDog') !== null;
    const dogNameRaw = fd.get('dogName')?.toString().trim() ?? '';
    const dogName = dogNameRaw.slice(0, 30);

    const buys = parseBuyOrders(fd);

    let state = await locals.repo.load(locals.deviceId, slot);
    if (!state) throw error(404, `No save in slot "${slot}"`);

    // 1. Apply wagon swap (adjusts cash by model price diff). Also
    //    applies the bran-barrel upgrade if requested (#264).
    state = applyWagonSwap(state, wagonModel);
    const upgradeResult = applyBranBarrelUpgrade(state, branBarrelUpgrade);
    if ('error' in upgradeResult) return fail(400, { error: upgradeResult.error });
    state = upgradeResult;
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

    // 2. Set team kind (applies surcharge for mule team) then buy
    //    extras at the per-head rate. Cash deducted here.
    state = setTeamKind(state, teamKind);
    const perHead = OX_PRICE + (teamKind === 'mule' ? MULE_PRICE_SURCHARGE : 0);
    if (state.cash - extraOxen * perHead < 0) {
      return fail(400, {
        error: `Not enough cash for ${extraOxen} extra ${teamKind === 'mule' ? 'mules' : 'oxen'}.`
      });
    }
    state = addOxen(state, extraOxen, teamKind);

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
