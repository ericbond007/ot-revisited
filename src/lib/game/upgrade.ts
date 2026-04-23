import type { GameState, GameStateFlag, PartyMember, Sex } from './types';
import { MALE_NAMES, FEMALE_NAMES } from './content/historical-names';

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
  return { ...state, flags, party };
}
