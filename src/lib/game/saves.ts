import type { GameState } from './types';

const SAVE_VERSION = 1;

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
  const stateObj = 'version' in obj && 'state' in obj
    ? (obj.state as Record<string, unknown>)
    : obj;

  for (const key of REQUIRED_KEYS) {
    if (!(key in stateObj)) {
      throw new Error(`Invalid save: missing field "${key}"`);
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
