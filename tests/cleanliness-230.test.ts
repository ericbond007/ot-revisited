import { describe, it, expect } from 'vitest';
import {
  decayCleanliness,
  applyDirtyMorale,
  applyFilthDiseaseRisk,
  washAll,
  avgCleanliness,
  CLEANLINESS_DEFAULT,
  CLEANLINESS_DECAY_BASE
} from '../src/lib/game/systems/cleanliness';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { getLandmarkArrivalEvent } from '../src/lib/game/content/landmark-arrival-events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, PartyMember } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'cleanliness-test',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year: 1848, month: 7, day: 1 }
  });
  return { ...s, ...over };
}

function setEveryoneCleanliness(s: GameState, value: number): GameState {
  return { ...s, party: s.party.map((m) => ({ ...m, cleanliness: value })) };
}

describe('#230 cleanliness — initial + decay', () => {
  it('new game members start at 100 cleanliness', () => {
    const s = newGame();
    for (const m of s.party) {
      expect(m.cleanliness).toBe(CLEANLINESS_DEFAULT);
    }
  });

  it('decay drops cleanliness on a clear-weather travel day', () => {
    const s: GameState = { ...newGame(), weather: 'clear', pace: 'moderate' };
    const after = decayCleanliness(s);
    for (const m of after.party) {
      expect(m.cleanliness).toBeLessThan(100);
      expect(m.cleanliness).toBeGreaterThan(100 - CLEANLINESS_DECAY_BASE - 0.1);
    }
  });

  it('rain and storm days do NOT decay (got passively wet)', () => {
    const rain: GameState = { ...newGame(), weather: 'rain' };
    expect(decayCleanliness(rain)).toBe(rain);
    const storm: GameState = { ...newGame(), weather: 'storm' };
    expect(decayCleanliness(storm)).toBe(storm);
  });

  it('grueling pace decays faster than slow', () => {
    const slow = decayCleanliness({ ...newGame(), weather: 'clear', pace: 'slow' });
    const grueling = decayCleanliness({ ...newGame(), weather: 'clear', pace: 'grueling' });
    expect(slow.party[0].cleanliness!).toBeGreaterThan(grueling.party[0].cleanliness!);
  });

  it('heat decays faster than clear at same pace', () => {
    const clear = decayCleanliness({ ...newGame(), weather: 'clear', pace: 'moderate' });
    const heat = decayCleanliness({ ...newGame(), weather: 'heat', pace: 'moderate' });
    expect(clear.party[0].cleanliness!).toBeGreaterThan(heat.party[0].cleanliness!);
  });

  it('dead members do not decay', () => {
    const s: GameState = {
      ...newGame(),
      party: newGame().party.map((m, i) =>
        i === 0 ? { ...m, dead: true, cleanliness: 50 } : m
      )
    };
    const after = decayCleanliness(s);
    expect(after.party[0].cleanliness).toBe(50);
  });

  it('cleanliness clamps at 0', () => {
    const s = setEveryoneCleanliness({ ...newGame(), weather: 'heat', pace: 'grueling' }, 0.5);
    const after = decayCleanliness(s);
    for (const m of after.party) {
      expect(m.cleanliness).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('#230 cleanliness — threshold morale', () => {
  it('above 30 average → no morale penalty', () => {
    const s: GameState = setEveryoneCleanliness({ ...newGame(), morale: 50 }, 50);
    const after = applyDirtyMorale(s);
    expect(after.morale).toBe(50);
    expect(after.eventLog.length).toBe(s.eventLog.length);
  });

  it('between 10 and 30 average → morale −1', () => {
    const s: GameState = setEveryoneCleanliness({ ...newGame(), morale: 50 }, 25);
    const after = applyDirtyMorale(s);
    expect(after.morale).toBe(49);
    expect(after.eventLog[after.eventLog.length - 1].text).toMatch(/wash/i);
  });

  it('below 10 average → morale −2 and "filthy" log', () => {
    const s: GameState = setEveryoneCleanliness({ ...newGame(), morale: 50 }, 5);
    const after = applyDirtyMorale(s);
    expect(after.morale).toBe(48);
    expect(after.eventLog[after.eventLog.length - 1].text).toMatch(/filthy/i);
  });
});

describe('#230 cleanliness — filth disease risk', () => {
  it('clean party never rolls dysentery', () => {
    const s: GameState = setEveryoneCleanliness(newGame(), 80);
    let saw = false;
    for (let i = 0; i < 200 && !saw; i++) {
      const after = applyFilthDiseaseRisk(s, makeRng(`clean-${i}`));
      if (after.party.some((m) => m.conditions.some((c) => c.id === 'dysentery'))) saw = true;
    }
    expect(saw).toBe(false);
  });

  it('filthy party (< 10) eventually rolls dysentery', () => {
    const s: GameState = setEveryoneCleanliness(newGame(), 5);
    let count = 0;
    for (let i = 0; i < 500; i++) {
      const after = applyFilthDiseaseRisk(s, makeRng(`filth-${i}`));
      if (after.party.some((m) => m.conditions.some((c) => c.id === 'dysentery'))) count++;
    }
    // 2% per adult per day with 2 adults → ~20-30 hits in 500 trials.
    expect(count).toBeGreaterThan(5);
  });

  it('an adult who already has dysentery is not re-infected', () => {
    const base = setEveryoneCleanliness(newGame(), 5);
    const sick: PartyMember = {
      ...base.party[0],
      conditions: [{ id: 'dysentery', daysSinceOnset: 1 }]
    };
    const s: GameState = { ...base, party: [sick, base.party[1]] };
    // Force a hit — only the second adult can pick it up.
    let hit: GameState | null = null;
    for (let i = 0; i < 200 && !hit; i++) {
      const after = applyFilthDiseaseRisk(s, makeRng(`reinf-${i}`));
      if (after.party[1].conditions.some((c) => c.id === 'dysentery')) hit = after;
    }
    expect(hit).not.toBeNull();
    // First member should still have only the original infection.
    expect(hit!.party[0].conditions.length).toBe(1);
  });
});

describe('#230 wash_clothes camp action', () => {
  const action = getCampAction('wash_clothes');

  it('available at river terrain', () => {
    const s: GameState = { ...newGame(), location: { ...newGame().location, terrain: 'river' } };
    expect(action.availability(s).available).toBe(true);
  });

  it('NOT available off-river', () => {
    const s: GameState = { ...newGame(), location: { ...newGame().location, terrain: 'prairie' } };
    expect(action.availability(s).available).toBe(false);
  });

  it('restores +30 cleanliness across the alive party', () => {
    const before = setEveryoneCleanliness(
      { ...newGame(), location: { ...newGame().location, terrain: 'river' } },
      40
    );
    const after = action.apply(before, makeRng('wash-1'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(70);
    }
  });

  it('caps at 100', () => {
    const before = setEveryoneCleanliness(
      { ...newGame(), location: { ...newGame().location, terrain: 'river' } },
      90
    );
    const after = action.apply(before, makeRng('wash-cap-1'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(100);
    }
  });
});

describe('#230 Sweetwater first-crossing arrival event', () => {
  const ev = getLandmarkArrivalEvent('sweetwater_1')!;

  it('event is registered', () => {
    expect(ev).toBeDefined();
    expect(ev.id).toBe('arrival_sweetwater_washday');
  });

  it('full washday choice gives +50 cleanliness all', () => {
    const choice = ev.choices.find((c) => c.id === 'wash')!;
    const before = setEveryoneCleanliness(newGame(), 30);
    const after = choice.apply(before, makeRng('sw-wash-1'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(80);
    }
  });

  it('quick rinse gives +20', () => {
    const choice = ev.choices.find((c) => c.id === 'quick')!;
    const before = setEveryoneCleanliness(newGame(), 30);
    const after = choice.apply(before, makeRng('sw-quick-1'));
    for (const m of after.party) {
      expect(m.cleanliness).toBe(50);
    }
  });

  it('press-on changes nothing', () => {
    const choice = ev.choices.find((c) => c.id === 'press')!;
    const before = setEveryoneCleanliness({ ...newGame(), morale: 50 }, 30);
    const after = choice.apply(before, makeRng('sw-press-1'));
    expect(avgCleanliness(after)).toBe(30);
    expect(after.morale).toBe(50);
  });
});
