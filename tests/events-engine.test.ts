import { describe, it, expect } from 'vitest';
import { fireEvent, rollEvent, resolveEvent } from '../src/lib/game/systems/events';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { EVENTS } from '../src/lib/game/content/events';
import type { GameEvent } from '../src/lib/game/content/events';

function newGame() {
  return createInitialState({
    seed: 'events',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

// A fake event we can register manually for isolated testing.
const TEST_EVENT: GameEvent = {
  id: 'test_noop',
  category: 'finds',
  title: 'Test',
  body: 'Nothing happens.',
  weight: 1,
  choices: [{ id: 'ok', label: 'Acknowledge', apply: (s) => s, isDefault: true }]
};

describe('rollEvent', () => {
  it('returns null when no events match gate or when roll fails', () => {
    const s = newGame();
    // Roll with a seed where the 30% fire chance will fail — very low p.
    // Force failure by explicitly passing only a gated-out event pool.
    const gated: GameEvent[] = [{ ...TEST_EVENT, gate: () => false }];
    const picked = rollEvent(s, makeRng('never'), { pool: gated });
    expect(picked).toBeNull();
  });

  it('picks an event from an eligible pool when fire chance hits', () => {
    const s = newGame();
    // Deterministic: use a seed we know fires. Try a few until one hits.
    for (let d = 0; d < 20; d++) {
      const r = makeRng(`seed-${d}`);
      const picked = rollEvent(s, r, { pool: [TEST_EVENT] });
      if (picked) {
        expect(picked.id).toBe('test_noop');
        return;
      }
    }
    throw new Error('Expected a fire in 20 seeds');
  });
});

describe('resolveEvent', () => {
  it('applies the chosen choice', () => {
    const s = newGame();
    const evt: GameEvent = {
      id: 'test_cash',
      category: 'finds',
      title: 'Test',
      body: '',
      weight: 1,
      choices: [
        { id: 'take', label: 'Take the cash', apply: (st) => ({ ...st, cash: st.cash + 50 }), isDefault: true },
        { id: 'leave', label: 'Leave it', apply: (st) => st }
      ]
    };
    const result = resolveEvent(s, evt, 'take', makeRng('r'));
    expect(result.cash).toBe(s.cash + 50);
    expect(result.eventLog[result.eventLog.length - 1].text).toMatch(/test/i);
  });

  it('throws on unknown choice id', () => {
    const s = newGame();
    expect(() => resolveEvent(s, TEST_EVENT, 'not-a-choice', makeRng('r'))).toThrow();
  });
});

describe('fireEvent (tick step)', () => {
  it('is a no-op when no event fires', () => {
    const s = newGame();
    // We can't force null without internal seed knowledge, but with an empty pool
    // the function is guaranteed to return state unchanged.
    const next = fireEvent(s, makeRng('t:1'), { pool: [] });
    expect(next).toEqual(s);
  });

  it('applies the default choice when an event fires', () => {
    const s = newGame();
    const evt: GameEvent = {
      id: 'test_default',
      category: 'finds',
      title: 'Test',
      body: '',
      weight: 1,
      choices: [
        { id: 'chosen', label: 'Gain $1', apply: (st) => ({ ...st, cash: st.cash + 1 }), isDefault: true }
      ]
    };
    for (let d = 0; d < 20; d++) {
      const next = fireEvent(s, makeRng(`t:${d}`), { pool: [evt] });
      if (next.cash !== s.cash) {
        expect(next.cash).toBe(s.cash + 1);
        return;
      }
    }
    throw new Error('Expected at least one fire in 20 seeds');
  });

  it('cooldown: does not fire again if _lastEventDay is the current day', () => {
    const s = { ...newGame(), flags: { ...newGame().flags, _lastEventDay: 1 } };
    // Current day is 1; lastEventDay is 1 → cooldown blocks firing.
    const next = fireEvent(s, makeRng('t:cool'), { pool: [TEST_EVENT] });
    expect(next).toEqual(s);
  });
});

describe('EVENTS catalog', () => {
  it('has at least 10 entries in the initial registry', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(10);
  });
});
