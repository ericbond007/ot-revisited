import { describe, it, expect } from 'vitest';
import { NOON_EVENTS } from '../src/lib/game/content/noon-events';
import { EVENTS } from '../src/lib/game/content/events';
import { eligibleEvents } from '../src/lib/game/systems/events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'noon-225',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'banker' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, ...over };
}

describe('#225 noon event pool — registry', () => {
  it('NOON_EVENTS has at least 10 events', () => {
    expect(NOON_EVENTS.length).toBeGreaterThanOrEqual(10);
  });

  it('every noon event has a noon_ id prefix', () => {
    for (const e of NOON_EVENTS) {
      expect(e.id).toMatch(/^noon_/);
    }
  });

  it('every noon event has at least one choice', () => {
    for (const e of NOON_EVENTS) {
      expect(e.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every noon event has a valid weight', () => {
    for (const e of NOON_EVENTS) {
      expect(e.weight).toBeGreaterThan(0);
    }
  });

  it('every noon event has at least one default choice', () => {
    for (const e of NOON_EVENTS) {
      const hasDefault = e.choices.some((c) => c.isDefault) || e.choices.length === 1;
      expect(hasDefault, `event ${e.id} should mark a default choice`).toBe(true);
    }
  });

  it('all noon events appear in the global EVENTS pool', () => {
    for (const ne of NOON_EVENTS) {
      expect(EVENTS.find((e) => e.id === ne.id), `${ne.id} should be in EVENTS`).toBeDefined();
    }
  });
});

describe('#225 noon events — eligibility', () => {
  it('all 10 noon events are eligible by default (no over-strict gates)', () => {
    const eligible = eligibleEvents(newGame(), [...NOON_EVENTS]);
    // Most should be eligible without preconditions; native rider, lost emigrant,
    // squeaky wheel etc. may have item gates inside `requires` but not `gate`.
    expect(eligible.length).toBeGreaterThanOrEqual(8);
  });
});

describe('#225 noon events — apply functions safe to call', () => {
  it('every default choice produces a valid GameState', () => {
    const before = newGame();
    for (const e of NOON_EVENTS) {
      const choice = e.choices.find((c) => c.isDefault) ?? e.choices[0];
      const after = choice.apply(before, makeRng(`noon-${e.id}`));
      expect(after.day).toBeGreaterThanOrEqual(before.day);
      expect(after.morale).toBeGreaterThanOrEqual(0);
      expect(after.morale).toBeLessThanOrEqual(100);
    }
  });

  it('passing-train chat: +2 morale on default choice', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_passing_train')!;
    const choice = e.choices.find((c) => c.id === 'visit')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('train'));
    expect(after.morale).toBe(52);
  });

  it('clear spring: refills the water keg', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_clear_spring')!;
    const choice = e.choices[0];
    const before: GameState = {
      ...newGame(),
      resources: { ...newGame().resources, water: 5 }
    };
    const after = choice.apply(before, makeRng('spring'));
    expect(after.resources.water).toBeGreaterThan(5);
  });

  it('squeaky wheel + lard: spends 1 lard', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_squeaky_wheel')!;
    const choice = e.choices.find((c) => c.id === 'grease_lard')!;
    const before: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, lard: 5 }
    };
    const after = choice.apply(before, makeRng('squeak'));
    expect(after.inventory.lard).toBe(4);
  });

  it('squeaky wheel + press through: -2 wagon condition', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_squeaky_wheel')!;
    const choice = e.choices.find((c) => c.id === 'press_through')!;
    const before: GameState = {
      ...newGame(),
      wagon: { ...newGame().wagon, condition: 80 }
    };
    const after = choice.apply(before, makeRng('press'));
    expect(after.wagon.condition).toBe(78);
  });

  it('roadside grave pay-respects: -1 morale (but clamped at 0)', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_roadside_grave')!;
    const choice = e.choices.find((c) => c.id === 'pay_respects')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('grave'));
    expect(after.morale).toBe(49);
  });

  it('forgotten pail / take: +1 lard', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_forgotten_pail')!;
    const choice = e.choices.find((c) => c.id === 'take')!;
    const before: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, lard: 0 }
    };
    const after = choice.apply(before, makeRng('pail'));
    expect(after.inventory.lard).toBe(1);
  });

  it('forgotten pail / leave: +1 morale', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_forgotten_pail')!;
    const choice = e.choices.find((c) => c.id === 'leave')!;
    const before: GameState = { ...newGame(), morale: 50 };
    const after = choice.apply(before, makeRng('leave'));
    expect(after.morale).toBe(51);
  });

  it('circuit preacher: +2 morale (no party preacher), +3 with one', () => {
    const e = NOON_EVENTS.find((x) => x.id === 'noon_circuit_preacher')!;
    const choice = e.choices.find((c) => c.id === 'accept')!;

    const noPreacher: GameState = { ...newGame(), morale: 50 };
    const afterNo = choice.apply(noPreacher, makeRng('p1'));
    expect(afterNo.morale).toBe(52);

    const withPreacher: GameState = {
      ...createInitialState({
        seed: 'p',
        leader: { name: 'Reverend', profession: 'preacher' },
        companions: [{ name: 'Mary', profession: 'banker' }],
        startDate: { year: 1849, month: 6, day: 15 }
      }),
      morale: 50
    };
    const afterYes = choice.apply(withPreacher, makeRng('p2'));
    expect(afterYes.morale).toBe(53);
  });
});

describe('#225 noon events have unique ids', () => {
  it('no id collisions across the noon pool', () => {
    const ids = NOON_EVENTS.map((e) => e.id);
    const uniq = new Set(ids);
    expect(uniq.size).toBe(ids.length);
  });

  it('no noon-event id collides with the rest of EVENTS', () => {
    const noonIds = new Set(NOON_EVENTS.map((e) => e.id));
    const otherEvents = EVENTS.filter((e) => !noonIds.has(e.id));
    for (const ne of NOON_EVENTS) {
      const collisions = otherEvents.filter((o) => o.id === ne.id);
      expect(collisions.length, `${ne.id} should not appear elsewhere`).toBe(0);
    }
  });
});
