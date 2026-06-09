import { describe, it, expect } from 'vitest';
import type { NpcWagonState, GameState } from '../src/lib/game/types';
import {
  synthesizeWagonState,
  projectWagonDeltas,
  NPC_PERSISTENT_FLAG_KEYS
} from '../src/lib/game/systems/wagon-synth';

// Minimal NPC wagon for bridge tests. Only the fields the bridge touches matter.
function wagon(over: Partial<NpcWagonState> = {}): NpcWagonState {
  return {
    id: 'w1', name: 'Test', leaderProfession: 'farmer', hasChildren: false,
    seed: 's', eventLog: [], outcome: 'in-progress', rations: 'normal',
    party: [], inventory: {}, oxen: [], cash: 0,
    morale: 50, water: 10, dirtyWater: 0, waterCap: 20,
    dryDays: 0,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100 } as NpcWagonState['wagon'],
    ...over
  } as NpcWagonState;
}

const env = {
  day: 5,
  date: { year: 1849, month: 5, day: 10 },
  location: { terrain: 'prairie', atLandmarkId: null } as any,
  pace: 'moderate' as const,
  weather: 'clear' as const
};

describe('#1266 — synth bridge packs persistent flags', () => {
  it('NPC_PERSISTENT_FLAG_KEYS includes hot-drink clock + holiday markers + cannibalism', () => {
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_hotDrinkClock');
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_july4Year');
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_christmasYear');
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_cannibalismCount');
  });

  it('packs persistentFlags into the synthesized GameState flags', () => {
    const w = wagon({ persistentFlags: { _hotDrinkClock: 8, _july4Year: 1849 } });
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.flags._hotDrinkClock).toBe(8);
    expect(synth.flags._july4Year).toBe(1849);
  });

  it('does not pack a key the wagon has not set', () => {
    const w = wagon({ persistentFlags: { _hotDrinkClock: 3 } });
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.flags._christmasYear).toBeUndefined();
  });
});


describe('#1266 — synth bridge unpacks persistent flags on projection', () => {
  it('projects present persistent flags back onto the wagon', () => {
    const original = wagon();
    const ticked = synthesizeWagonState(original, env as any);
    const tickedWithFlag: GameState = {
      ...ticked,
      flags: { ...ticked.flags, _hotDrinkClock: 12, _july4Year: 1849 }
    };
    const out = projectWagonDeltas(tickedWithFlag, original);
    expect(out.persistentFlags?._hotDrinkClock).toBe(12);
    expect(out.persistentFlags?._july4Year).toBe(1849);
  });

  it('omits a persistent flag the engine deleted (absent = cleared)', () => {
    const original = wagon({ persistentFlags: { _hotDrinkClock: 9 } });
    const ticked = synthesizeWagonState(original, env as any);
    const tickedNoFlag: GameState = { ...ticked, flags: {} };
    const out = projectWagonDeltas(tickedNoFlag, original);
    expect(out.persistentFlags?._hotDrinkClock).toBeUndefined();
  });

  it('round-trips a persistent flag across two synth cycles', () => {
    let w = wagon();
    let synth = synthesizeWagonState(w, env as any);
    w = projectWagonDeltas({ ...synth, flags: { ...synth.flags, _hotDrinkClock: 8 } }, w);
    expect(w.persistentFlags?._hotDrinkClock).toBe(8);
    synth = synthesizeWagonState(w, env as any);
    expect(synth.flags._hotDrinkClock).toBe(8);
    w = projectWagonDeltas({ ...synth, flags: { ...synth.flags, _hotDrinkClock: 14 } }, w);
    expect(w.persistentFlags?._hotDrinkClock).toBe(14);
  });

  it('leaves persistentFlags undefined when no persistent flag is set', () => {
    const original = wagon();
    const ticked = synthesizeWagonState(original, env as any);
    const out = projectWagonDeltas({ ...ticked, flags: {} }, original);
    expect(out.persistentFlags).toBeUndefined();
  });
});

describe('#1266 stage2 — synth carries the wagon waterRation', () => {
  it('a drycamp wagon synthesizes with waterRation drycamp (not hardcoded normal)', () => {
    const w = wagon({ waterRation: 'drycamp' } as Partial<NpcWagonState>);
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.waterRation).toBe('drycamp');
  });
  it('a wagon without the field defaults to normal (legacy)', () => {
    const w = wagon();
    const synth = synthesizeWagonState(w, env as any);
    expect(synth.waterRation).toBe('normal');
  });
});
