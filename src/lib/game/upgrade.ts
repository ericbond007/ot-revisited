import type { GameState, GameStateFlag, PartyMember, Sex } from './types';
import { MALE_NAMES, FEMALE_NAMES } from './content/historical-names';
import { DEFAULT_WAGON_MODEL, getWagon } from './content/wagons';

const DEFAULT_FLAGS: Record<GameStateFlag, boolean> = {
  hasBoilingKnowledge: false,
  hadFireLastNight: false
};

const MALE_SET = new Set(MALE_NAMES);
const FEMALE_SET = new Set(FEMALE_NAMES);

// Older saves predate the `sex` / `kind` fields on PartyMember. Infer sex by
// matching the name against the historical name lists; unknown names default
// to male. Everyone in a pre-migration save is an adult by definition (there
// was no way to add children before).
function inferSex(name: string): Sex {
  if (FEMALE_SET.has(name)) return 'female';
  if (MALE_SET.has(name)) return 'male';
  return 'male';
}

function upgradeMember(m: PartyMember): PartyMember {
  // Pre-#230 saves don't have cleanliness; default to 100 (don't punish
  // existing parties retroactively for a mechanic they couldn't see).
  const cleanliness = typeof m.cleanliness === 'number' ? m.cleanliness : 100;
  if (m.sex && m.kind && typeof m.cleanliness === 'number') return m;
  return {
    ...m,
    sex: m.sex ?? inferSex(m.name),
    kind: m.kind ?? 'adult',
    cleanliness
  };
}

/** Pre-rename: `independence` was the LANDMARKS id for Independence,
 *  Missouri (the trail-start city). Renamed to `independence_mo` to
 *  disambiguate from `independence_rock` (the Wyoming granite
 *  landmark). Saves carry the old id in any of three location fields;
 *  rewrite each to the new id on load. */
function rewriteIndependenceId(id: string | null | undefined): string | null {
  if (id === 'independence') return 'independence_mo';
  return id ?? null;
}

export function upgradeState(state: GameState): GameState {
  const flags = { ...DEFAULT_FLAGS, ...state.flags };
  const party = state.party.map(upgradeMember);

  const location = {
    ...state.location,
    nextLandmarkId: rewriteIndependenceId(state.location.nextLandmarkId) ?? state.location.nextLandmarkId,
    previousLandmarkId: rewriteIndependenceId(state.location.previousLandmarkId),
    atLandmarkId: rewriteIndependenceId(state.location.atLandmarkId)
  };

  // Pre-wagon-model saves don't have wagon.model. Default → prairie schooner
  // (matches the pre-migration carryCapacity of 2500 lb). If a save somehow
  // has a nonsense model id, snap back to the default too.
  const modelId =
    state.wagon.model && getWagonOrNull(state.wagon.model) ? state.wagon.model : DEFAULT_WAGON_MODEL;
  // Pre-#201 saves don't have wagon.canvas. Default to 100 (intact)
  // rather than mirroring `condition` — most lost canvas comes from
  // weather and the player just played a long stretch with no canvas
  // damage system, so they shouldn't be punished retroactively.
  // Pre-#264 saves don't have hasBranBarrel. Default per wagon model:
  // schooner + heavy ship with one, light doesn't. Matches engine.ts.
  const branBarrelDefault = getWagon(modelId).shipsWithBranBarrel === true;
  const wagon = {
    ...state.wagon,
    model: modelId,
    canvas: state.wagon.canvas ?? 100,
    hasBranBarrel: state.wagon.hasBranBarrel ?? branBarrelDefault
  };

  // Pre-#153 saves have no weather field. Default to 'clear' so tickWeather's
  // stickiness math has something to lerp from on day 1.
  const weather = state.weather ?? 'clear';

  // Pre-#107 saves only carried 1 yoke regardless of wagon. Bring them
  // up to the wagon's required count so the new yoke-gating doesn't
  // immediately strand half the team. One-time top-up: only fires
  // when the inventory falls short of the wagon's needs.
  const wagonModel = getWagon(modelId);
  const haveYokes = state.inventory.yoke ?? 0;
  let inventory = haveYokes < wagonModel.requiredYokes
    ? { ...state.inventory, yoke: wagonModel.requiredYokes }
    : state.inventory;

  // #174 — bullets split into gunpowder + lead_balls + percussion_caps
  // (each 1:1 with a shot) plus a bullet_mold so the player can keep
  // making more balls with cast_balls camp action. Each old `bullets`
  // unit represented one fully-loaded round; convert 1:1:1.
  const oldBullets = inventory.bullets ?? 0;
  if (oldBullets > 0 || inventory.bullets !== undefined) {
    const next: Record<string, number> = { ...inventory };
    delete next.bullets;
    next.gunpowder = (next.gunpowder ?? 0) + oldBullets;
    next.lead_balls = (next.lead_balls ?? 0) + oldBullets;
    next.percussion_caps = (next.percussion_caps ?? 0) + oldBullets;
    next.bullet_mold = Math.max(next.bullet_mold ?? 0, 1);
    inventory = next;
  }

  // #1021 — `water_skin` renamed to `water_bag` (period-correct: rubber
  // bags, Goodyear 1849+ — mountain-man "water skin" was 1820s-30s
  // terminology). Save migration: roll old water_skin count into
  // water_bag count and drop the old key.
  const oldSkins = inventory.water_skin ?? 0;
  if (oldSkins > 0 || inventory.water_skin !== undefined) {
    const next: Record<string, number> = { ...inventory };
    delete next.water_skin;
    next.water_bag = (next.water_bag ?? 0) + oldSkins;
    inventory = next;
  }

  return { ...state, flags, party, wagon, weather, inventory, location };
}

function getWagonOrNull(id: string): ReturnType<typeof getWagon> | null {
  try {
    return getWagon(id as never);
  } catch {
    return null;
  }
}
