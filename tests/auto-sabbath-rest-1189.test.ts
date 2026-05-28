import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { sundayLayBy, defaultSabbathActions } from '../src/lib/game/actions/sunday-lay-by';
import { getCampAction, hourCostFor } from '../src/lib/game/actions/camp-actions';
import { serialize, deserialize } from '../src/lib/game/saves';
import type { GameState } from '../src/lib/game/types';

// April 15, 1849 = Sunday (confirmed in existing sunday-layby-224 tests)
const SUNDAY = { year: 1849, month: 4, day: 15 };
// April 16, 1849 = Monday
const MONDAY = { year: 1849, month: 4, day: 16 };

function makeState(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'auto-sabbath-1189',
    leader: { name: 'Abigail', profession: 'farmer' },
    companions: [{ name: 'Thomas', profession: 'teacher' }],
    startDate: SUNDAY
  });
  return { ...s, ...over };
}

// -----------------------------------------------------------------------
// Engine auto-fire on Sunday with toggle ON
// -----------------------------------------------------------------------

describe('#1189 auto-Sabbath rest in tickDayPausable', () => {
  it('auto-rests on Sunday when _autoSabbathRest = true', () => {
    const before = makeState({ morale: 50 });
    expect(before.flags._autoSabbathRest).toBe(true);

    const result = tickDayPausable(before);

    // Day advanced by 1
    expect(result.state.day).toBe(before.day + 1);
    // Morale should have the Sabbath bump (at least +3 above base rest, which itself adds +10)
    // We just assert it's higher than the starting morale (rest+sabbath is net positive)
    expect(result.state.morale).toBeGreaterThan(50);
    // No pending event (auto path returns pendingEvent: undefined)
    expect(result.pendingEvent).toBeUndefined();
    // A Sabbath log line was written
    const sabbathLog = result.state.eventLog.find((l) => /Sabbath/i.test(l.text));
    expect(sabbathLog).toBeDefined();
    // Camp summary is populated (rest() sets _campSummary)
    expect(result.state.flags._campSummary).toBeDefined();
  });

  it('does NOT auto-rest on Sunday when _autoSabbathRest = false', () => {
    const before: GameState = {
      ...makeState({ morale: 50 }),
      flags: { ...makeState().flags, _autoSabbathRest: false }
    };

    const result = tickDayPausable(before);

    // No Sabbath log line — normal travel day
    const sabbathLog = result.state.eventLog.find((l) => /Sabbath lay-by/i.test(l.text));
    expect(sabbathLog).toBeUndefined();
    // Miles advanced (travel day)
    expect(result.state.location.milesTraveled).toBeGreaterThan(0);
  });

  it('does NOT auto-rest on a weekday (Monday) even when toggle ON', () => {
    const before: GameState = {
      ...makeState({ morale: 50 }),
      date: MONDAY
    };
    expect(before.flags._autoSabbathRest).toBe(true);

    const result = tickDayPausable(before);

    const sabbathLog = result.state.eventLog.find((l) => /Sabbath lay-by/i.test(l.text));
    expect(sabbathLog).toBeUndefined();
    expect(result.state.location.milesTraveled).toBeGreaterThan(0);
  });

  it('Preacher amplifies the bump to +5 on auto-Sabbath', () => {
    const withPreacher = createInitialState({
      seed: 'preacher-auto-1189',
      leader: { name: 'Reverend', profession: 'preacher' },
      companions: [{ name: 'Mary', profession: 'teacher' }],
      startDate: SUNDAY
    });
    const withoutPreacher = makeState({ morale: withPreacher.morale });

    const preacherResult = tickDayPausable(withPreacher);
    const normalResult = tickDayPausable(withoutPreacher);

    // Preacher path should end higher (they get +5 vs +3 Sabbath bump)
    expect(preacherResult.state.morale).toBeGreaterThan(normalResult.state.morale);
  });
});

// -----------------------------------------------------------------------
// defaultSabbathActions helper
// -----------------------------------------------------------------------

describe('#1189 defaultSabbathActions', () => {
  it('includes read_bible when Bible is in inventory', () => {
    const s = makeState();
    const withBible: GameState = {
      ...s,
      inventory: { ...s.inventory, bible: 1 }
    };
    const actions = defaultSabbathActions(withBible);
    expect(actions).toContain('read_bible');
  });

  it('omits read_bible when no Bible', () => {
    const s = makeState();
    const noBible: GameState = {
      ...s,
      inventory: { ...s.inventory, bible: 0 }
    };
    const actions = defaultSabbathActions(noBible);
    expect(actions).not.toContain('read_bible');
  });

  it('includes sing_along when harmonica or fiddle is available', () => {
    const s = makeState();
    const withHarmonica: GameState = {
      ...s,
      inventory: { ...s.inventory, harmonica: 1, bible: 0 }
    };
    const actions = defaultSabbathActions(withHarmonica);
    expect(actions).toContain('sing_along');
  });

  it('omits sing_along when no instrument', () => {
    const s = makeState();
    const noInstrument: GameState = {
      ...s,
      inventory: { ...s.inventory, harmonica: 0, fiddle: 0 }
    };
    const actions = defaultSabbathActions(noInstrument);
    expect(actions).not.toContain('sing_along');
  });

  it('omits wash_clothes when not at river terrain', () => {
    const s = makeState();
    // Default terrain is prairie — not river
    expect(s.location.terrain).not.toBe('river');
    const actions = defaultSabbathActions(s);
    expect(actions).not.toContain('wash_clothes');
  });

  it('includes wash_clothes when at river terrain', () => {
    const s = makeState();
    const atRiver: GameState = {
      ...s,
      inventory: { ...s.inventory, bible: 0, harmonica: 0, fiddle: 0 },
      location: { ...s.location, terrain: 'river' }
    };
    const actions = defaultSabbathActions(atRiver);
    expect(actions).toContain('wash_clothes');
  });

  it('total hour cost never exceeds 12', () => {
    // Give inventory of everything to maximize chosen actions
    const s = makeState();
    const rich: GameState = {
      ...s,
      inventory: { ...s.inventory, bible: 1, harmonica: 1, fiddle: 1 }
    };
    const actions = defaultSabbathActions(rich);
    // read_bible = 1h, sing_along = 2h => total 3 — well under 12
    const total = actions.reduce((sum: number, id: string) => {
      const action = getCampAction(id as Parameters<typeof getCampAction>[0]);
      return sum + hourCostFor(action, rich);
    }, 0);
    expect(total).toBeLessThanOrEqual(12);
  });

  it('returns empty array when no Sabbath actions are available', () => {
    const s = makeState();
    const nothing: GameState = {
      ...s,
      inventory: { ...s.inventory, bible: 0, harmonica: 0, fiddle: 0 }
    };
    // prairie terrain = no wash_clothes either
    const actions = defaultSabbathActions(nothing);
    expect(actions).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// sundayLayBy campActions pass-through
// -----------------------------------------------------------------------

describe('#1189 sundayLayBy with campActions', () => {
  it('populates _campSummary with activities when campActions passed', () => {
    const s = makeState();
    const withBible: GameState = {
      ...s,
      inventory: { ...s.inventory, bible: 1 }
    };
    const after = sundayLayBy(withBible, ['read_bible']);
    const summary = after.flags._campSummary as { activities?: Array<{ id: string }> } | undefined;
    expect(summary?.activities?.some((a) => a.id === 'read_bible')).toBe(true);
  });

  it('works with no campActions (backward-compatible)', () => {
    const s = makeState({ morale: 50 });
    const after = sundayLayBy(s);
    expect(after.day).toBe(s.day + 1);
    expect(after.morale).toBeGreaterThan(50);
  });

  it('works with empty campActions array', () => {
    const s = makeState({ morale: 50 });
    const after = sundayLayBy(s, []);
    expect(after.day).toBe(s.day + 1);
    expect(after.morale).toBeGreaterThan(50);
  });
});

// -----------------------------------------------------------------------
// Save round-trip
// -----------------------------------------------------------------------

describe('#1189 save round-trip for _autoSabbathRest', () => {
  it('serializes and preserves explicit false', () => {
    const s = makeState();
    const withFalse: GameState = {
      ...s,
      flags: { ...s.flags, _autoSabbathRest: false }
    };
    const json = serialize(withFalse);
    const loaded = deserialize(json);
    expect(loaded.flags._autoSabbathRest).toBe(false);
  });

  it('serializes and preserves explicit true', () => {
    const s = makeState();
    const json = serialize(s);
    const loaded = deserialize(json);
    expect(loaded.flags._autoSabbathRest).toBe(true);
  });

  it('defaults missing _autoSabbathRest to true on old saves', () => {
    const s = makeState();
    // Manually strip the flag to simulate an old save
    const flags = { ...s.flags };
    delete (flags as Record<string, unknown>)._autoSabbathRest;
    const oldState: GameState = { ...s, flags };

    const json = serialize(oldState);
    // Patch out the flag from the JSON string to simulate an older save format
    const patched = json.replace('"_autoSabbathRest":true,', '').replace(',"_autoSabbathRest":true', '');
    const loaded = deserialize(patched);
    expect(loaded.flags._autoSabbathRest).toBe(true);
  });
});
