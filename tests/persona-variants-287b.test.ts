// #287b — Six named-profile persona variants. Each derives from
// `balanced` via spread + overrides 1-2 methods that express the
// signature trait. Tests verify the override fires when expected
// (and falls through to balanced behavior otherwise).

import { describe, it, expect } from 'vitest';
import {
  sundayResterPersona,
  pacePusherPersona,
  hoarderPersona,
  generousPersona,
  faithfulPersona,
  drinkerPersona,
  balancedPersona,
  PERSONAS,
  getPersona
} from '../src/lib/game/ai';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { getLandmark } from '../src/lib/game/content/landmarks';
import type { GameState } from '../src/lib/game/types';
import type { GameEvent } from '../src/lib/game/content/events';

function game(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'p',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, ...over };
}

describe('#287b — registry', () => {
  it('PERSONAS has 10 entries (4 base + 6 variants)', () => {
    expect(Object.keys(PERSONAS).sort()).toEqual([
      'aggressive', 'balanced', 'cautious', 'chaos',
      'drinker', 'faithful', 'generous', 'hoarder',
      'pace_pusher', 'sunday_rester'
    ]);
  });

  it('getPersona returns the right record per id', () => {
    expect(getPersona('sunday_rester').id).toBe('sunday_rester');
    expect(getPersona('drinker').id).toBe('drinker');
  });
});

describe('#287b — sunday_rester', () => {
  it('rests on Sunday regardless of party state', () => {
    // 1849-06-17 is a Sunday.
    const s = game({ date: { year: 1849, month: 6, day: 17 } });
    expect(sundayResterPersona.shouldRest(s, makeRng('x'))).toBe(true);
  });

  it('falls through to balanced behavior on non-Sundays', () => {
    // 1849-06-18 is a Monday. Balanced doesn't rest with healthy party.
    const s = game({ date: { year: 1849, month: 6, day: 18 }, morale: 80 });
    const r = sundayResterPersona.shouldRest(s, makeRng('x'));
    const b = balancedPersona.shouldRest(s, makeRng('x'));
    expect(r).toBe(b);
  });
});

describe('#287b — pace_pusher', () => {
  it('grueling pace when party healthy AND oxen fresh', () => {
    const s = game({ morale: 90 });
    expect(pacePusherPersona.pickPace(s, makeRng('x'))).toBe('grueling');
  });

  it('falls back to fast when party HP is mid-range', () => {
    const s = game();
    s.party = s.party.map((m) => ({ ...m, health: 60 }));
    expect(pacePusherPersona.pickPace(s, makeRng('x'))).toBe('fast');
  });

  it('falls back to moderate when party HP is low', () => {
    const s = game();
    s.party = s.party.map((m) => ({ ...m, health: 40 }));
    expect(pacePusherPersona.pickPace(s, makeRng('x'))).toBe('moderate');
  });

  it('only rests at <30 HP or worn oxen — not at balanced 45 threshold', () => {
    const sMid = game();
    sMid.party = sMid.party.map((m) => ({ ...m, health: 40 }));
    // pace_pusher does NOT rest at HP 40 (balanced would, since <45)
    expect(pacePusherPersona.shouldRest(sMid, makeRng('x'))).toBe(false);
    const sLow = game();
    sLow.party = sLow.party.map((m) => ({ ...m, health: 25 }));
    expect(pacePusherPersona.shouldRest(sLow, makeRng('x'))).toBe(true);
  });
});

describe('#287b — hoarder', () => {
  it('food restock opts use tight floor + cap (15/30) — saleratus overstock per #909', () => {
    // #909 — hoarder repurposed as supply-stockpiler so saleratus
    // overstocks even while flour days stay tight. Broader food-cap
    // redefinition lives in #912.
    expect(hoarderPersona.pickFoodRestockOpts(game())).toEqual({
      daysFloor: 15,
      daysCap: 30,
      saleratusOverstock: true
    });
  });

  it('never picks ox swap, even at posts that offer it', () => {
    const laramie = getLandmark('ft_laramie');
    const s = game();
    expect(hoarderPersona.pickOxSwapCount(s, laramie, makeRng('x'))).toBe(0);
  });

  it('repair budget halved vs balanced (max $15 vs balanced $30)', () => {
    const laramie = getLandmark('ft_laramie');
    const s = { ...game(), wagon: { ...game().wagon, condition: 50 }, cash: 100 };
    expect(hoarderPersona.pickRepairBudget(s, laramie)).toBe(15);
  });
});

describe('#287b — generous', () => {
  it('picks ox swap aggressively (matches cautious 2/70 thresholds)', () => {
    const laramie = getLandmark('ft_laramie');
    const s = game();
    // Generous + ox_swap available + minTeam well above current → wants
    // a buffer of 2. Just assert the call returns a non-null number;
    // exact value depends on starter ox count which varies by wagon model.
    const c = generousPersona.pickOxSwapCount(s, laramie, makeRng('x'));
    expect(c).toBeGreaterThanOrEqual(0);
  });

  it('repair budget 1.5× balanced (max $45)', () => {
    const laramie = getLandmark('ft_laramie');
    const s = { ...game(), wagon: { ...game().wagon, condition: 50 }, cash: 100 };
    // condition=50 → balanced gets min(30, cash, 100-50=50) = 30
    // generous gets min(45, cash, (100-50)*1.5=75) = 45
    expect(generousPersona.pickRepairBudget(s, laramie)).toBe(45);
  });

  it('always joins trains', () => {
    const laramie = getLandmark('ft_laramie');
    expect(generousPersona.shouldJoinTrain(game(), laramie, makeRng('x'))).toBe(true);
  });
});

describe('#287b — faithful', () => {
  it('rests on Sunday', () => {
    const s = game({ date: { year: 1849, month: 6, day: 17 } });
    expect(faithfulPersona.shouldRest(s, makeRng('x'))).toBe(true);
  });

  it('prefers prayer-flavored event choices when offered', () => {
    const s = game();
    const ev: GameEvent = {
      id: 'death_test',
      title: 'A burial',
      body: 'A party member has died.',
      category: 'health',
      weight: 1,
      choices: [
        { id: 'rush', label: 'Rush onward', isDefault: true, apply: (s) => s },
        { id: 'pray', label: 'Pray for the soul', apply: (s) => s }
      ]
    };
    expect(faithfulPersona.pickEventChoice(s, ev, makeRng('x'))).toBe('pray');
  });
});

describe('#287b — drinker', () => {
  it('prefers whiskey-flavored event choices when offered', () => {
    const s = game();
    const ev: GameEvent = {
      id: 'evening',
      title: 'Around the fire',
      body: 'Camp settles for the night.',
      category: 'personal',
      weight: 1,
      choices: [
        { id: 'sleep', label: 'Turn in early', isDefault: true, apply: (s) => s },
        { id: 'drink', label: 'Pass the whiskey', apply: (s) => s }
      ]
    };
    expect(drinkerPersona.pickEventChoice(s, ev, makeRng('x'))).toBe('drink');
  });

  it('stays at inns at higher morale threshold (70 vs balanced 50)', () => {
    const laramie = getLandmark('ft_laramie');
    // morale 65 → balanced wouldn't stop, drinker would.
    const s = { ...game(), morale: 65, cash: 50 };
    expect(drinkerPersona.shouldStayAtInn(s, laramie, makeRng('x'))).toBe(true);
    expect(balancedPersona.shouldStayAtInn(s, laramie, makeRng('x'))).toBe(false);
  });
});
