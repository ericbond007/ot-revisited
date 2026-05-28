import type { GameState, NpcWagonState } from './types';
import { computeWaterCap } from './systems/water-cap';
import { DEFAULT_WAGON_MODEL } from './content/wagons';

// v1 → v2 (#280a): wagonTrain.members[] (flat TrainMember records) was
// replaced by wagonTrain.companions[] (full NpcWagonState). Old saves
// that carried a v1 train are incompatible — the migration drops the
// wagonTrain (the player just resumes solo).
//
// v2 → v3 (#303e): NpcWagonState gained required `water`, `dirtyWater`,
// `waterCap`, `dryDays` fields. v2 saves with a wagonTrain get the
// fields filled in on load — full kegs, no dirty water, no dry days.
//
// #939 umbrella (unify NPC tick): added optional `spoilDays`,
// `greaseMiles`, `starvationDays` on NpcWagonState. Optional ⇒ no
// version bump: pre-#939 v3 saves load fine and engine systems treat
// missing fields as "no state yet" (see wagon-synth bridges +
// `tests/wagon-train-save-migration-939n`).
const SAVE_VERSION = 3;

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

  // v2 → v3 (#303e): NpcWagonState gained water tracking. Fill in
  // sensible defaults — full keg, no dirty water, no dry days — on
  // each companion in any v2 wagonTrain.
  if (version < 3) {
    const wt = stateObj.wagonTrain as { companions?: unknown[] } | null | undefined;
    if (wt && Array.isArray(wt.companions)) {
      wt.companions = wt.companions.map((raw) => {
        const wagon = raw as Partial<NpcWagonState> & Record<string, unknown>;
        if (typeof wagon.water === 'number') return wagon;
        const inv = (wagon.inventory as Record<string, number>) ?? {};
        const cap = computeWaterCap(DEFAULT_WAGON_MODEL, inv);
        return { ...wagon, water: cap, dirtyWater: 0, waterCap: cap, dryDays: 0 };
      });
    }
  }
  // #929: wagon.impairment added. Old saves that lack the field default to null.
  {
    const w = stateObj.wagon as Record<string, unknown> | null | undefined;
    if (w && !('impairment' in w)) {
      w.impairment = null;
    }
  }
  // #929: also patch NPC companion wagons in any active wagonTrain.
  {
    const wt = stateObj.wagonTrain as { companions?: unknown[] } | null | undefined;
    if (wt && Array.isArray(wt.companions)) {
      for (const raw of wt.companions) {
        const npc = raw as Record<string, unknown>;
        const w = npc.wagon as Record<string, unknown> | null | undefined;
        if (w && !('impairment' in w)) {
          w.impairment = null;
        }
      }
    }
  }
  // #1189 — auto-Sabbath rest flag. Default true for old saves that
  // predate the toggle. Saves with an explicit false keep it false.
  {
    const flags = stateObj.flags as Record<string, unknown> | undefined;
    if (flags && !('_autoSabbathRest' in flags)) {
      flags._autoSabbathRest = true;
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
