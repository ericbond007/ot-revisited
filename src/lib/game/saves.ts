import type { GameState } from './types';

// v1 → v2 (#280a): wagonTrain.members[] (flat TrainMember records) was
// replaced by wagonTrain.companions[] (full NpcWagonState). Old saves
// that carried a v1 train are incompatible — the migration drops the
// wagonTrain (the player just resumes solo). Acceptable since #176
// phase 1 was the only release with the old shape and saves are
// per-device development builds.
const SAVE_VERSION = 2;

const REQUIRED_KEYS: readonly (keyof GameState)[] = [
  'seed', 'day', 'date', 'location', 'party', 'wagon', 'oxen',
  'inventory', 'cash', 'resources', 'morale', 'pace', 'rations',
  'eventLog', 'flags', 'completed', 'outcome'
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface VersionedSave {
  version: number;
  state: GameState;
}

export function serialize(state: GameState): string {
  const wrapped: VersionedSave = { version: SAVE_VERSION, state };
  return JSON.stringify(wrapped);
}

export function deserialize(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse save JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid save: not an object');
  }

  const obj = parsed as Record<string, unknown>;
  const version = typeof obj.version === 'number' ? obj.version : 1;
  const stateObj = 'version' in obj && 'state' in obj
    ? (obj.state as Record<string, unknown>)
    : obj;

  for (const key of REQUIRED_KEYS) {
    if (!(key in stateObj)) {
      throw new Error(`Invalid save: missing field "${key}"`);
    }
  }

  // v1 → v2 (#280a): wagonTrain.members[] is gone. If a v1 save still
  // carries the old shape, clear the train (player resumes solo).
  if (version < 2) {
    const wt = stateObj.wagonTrain as { members?: unknown } | null | undefined;
    if (wt && 'members' in wt) {
      stateObj.wagonTrain = null;
    }
  }
  return stateObj as unknown as GameState;
}

export function buildSummary(state: GameState): string {
  const leader = state.party.find((m) => m.isLeader);
  const leaderName = leader?.name ?? 'Unknown';
  const { year, month, day } = state.date;
  const monthName = MONTH_NAMES[month - 1] ?? `M${month}`;
  return `${leaderName}'s party · Day ${state.day} · ${monthName} ${day}, ${year}`;
}
