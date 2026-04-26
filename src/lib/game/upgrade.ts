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
  // Already migrated: both fields present.
  if (m.sex && m.kind) return m;
  return {
    ...m,
    sex: m.sex ?? inferSex(m.name),
    kind: m.kind ?? 'adult'
  };
}

export function upgradeState(state: GameState): GameState {
  const flags = { ...DEFAULT_FLAGS, ...state.flags };
  const party = state.party.map(upgradeMember);

  // Pre-wagon-model saves don't have wagon.model. Default → prairie schooner
  // (matches the pre-migration carryCapacity of 2500 lb). If a save somehow
  // has a nonsense model id, snap back to the default too.
  const modelId =
    state.wagon.model && getWagonOrNull(state.wagon.model) ? state.wagon.model : DEFAULT_WAGON_MODEL;
  const wagon = { ...state.wagon, model: modelId };

  // Pre-#153 saves have no weather field. Default to 'clear' so tickWeather's
  // stickiness math has something to lerp from on day 1.
  const weather = state.weather ?? 'clear';

  return { ...state, flags, party, wagon, weather };
}

function getWagonOrNull(id: string): ReturnType<typeof getWagon> | null {
  try {
    return getWagon(id as never);
  } catch {
    return null;
  }
}
