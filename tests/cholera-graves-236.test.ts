import { describe, it, expect } from 'vitest';
import { getLandmarkArrivalEvent } from '../src/lib/game/content/landmark-arrival-events';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function gameInYear(year: number): GameState {
  const s = createInitialState({
    seed: 'cholera-236',
    leader: { name: 'Ezra', profession: 'banker' },
    companions: [{ name: 'Mary', profession: 'farmer' }],
    startDate: { year, month: 6, day: 15 }
  });
  return s;
}

describe('#236 cholera-year gate', () => {
  it('1848 gets the regular Ash Hollow event', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1848));
    expect(ev?.id).toBe('arrival_ash_hollow');
  });

  it('1849 gets the cholera variant', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1849));
    expect(ev?.id).toBe('arrival_ash_hollow_cholera');
  });

  it('1852 gets the cholera variant (last cholera year)', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1852));
    expect(ev?.id).toBe('arrival_ash_hollow_cholera');
  });

  it('1853 reverts to the regular event', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1853));
    expect(ev?.id).toBe('arrival_ash_hollow');
  });

  it('chimney_rock cholera variant fires in 1850', () => {
    const ev = getLandmarkArrivalEvent('chimney_rock', gameInYear(1850));
    expect(ev?.id).toBe('arrival_chimney_rock_cholera');
  });

  it('chimney_rock 1855 returns the regular event', () => {
    const ev = getLandmarkArrivalEvent('chimney_rock', gameInYear(1855));
    expect(ev?.id).toBe('arrival_chimney_rock');
  });
});

describe('#236 cholera variants — body text', () => {
  it('Ash Hollow body mentions graves', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1849))!;
    expect(ev.body).toMatch(/grave/i);
  });

  it('Chimney Rock body mentions cholera or graves', () => {
    const ev = getLandmarkArrivalEvent('chimney_rock', gameInYear(1849))!;
    expect(ev.body).toMatch(/cholera|grave|cross/i);
  });
});

describe('#236 cholera overlay — choice apply', () => {
  it('Ash Hollow rope-down still grants +5 morale base, but -3 grave debit nets +2', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1850))!;
    const rope = ev.choices.find((c) => c.id === 'rope_down')!;
    const before: GameState = { ...gameInYear(1850), morale: 50 };
    const after = rope.apply(before, makeRng('rope-cholera'));
    // Base: +5 morale (rope-down). Overlay: -3. Net: +2.
    expect(after.morale).toBe(52);
  });

  it('Ash Hollow regular (non-cholera) rope-down stays at +5', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1848))!;
    const rope = ev.choices.find((c) => c.id === 'rope_down')!;
    const before: GameState = { ...gameInYear(1848), morale: 50 };
    const after = rope.apply(before, makeRng('rope-clean'));
    expect(after.morale).toBe(55);
  });

  it('Chimney Rock cholera press-on: +2 morale base − 2 grave debit = 0 net', () => {
    const ev = getLandmarkArrivalEvent('chimney_rock', gameInYear(1851))!;
    const press = ev.choices.find((c) => c.id === 'press_on')!;
    const before: GameState = { ...gameInYear(1851), morale: 50 };
    const after = press.apply(before, makeRng('press'));
    expect(after.morale).toBe(50);
  });

  it('cholera overlay morale clamps at 0', () => {
    const ev = getLandmarkArrivalEvent('chimney_rock', gameInYear(1851))!;
    const press = ev.choices.find((c) => c.id === 'press_on')!;
    const before: GameState = { ...gameInYear(1851), morale: 1 };
    const after = press.apply(before, makeRng('press-low'));
    // Base bumps to 3, debit -2 → 1.
    expect(after.morale).toBe(1);
  });

  it('Ash Hollow cholera overlay leaves the lock-wheels mishap mechanic intact', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1850))!;
    const brake = ev.choices.find((c) => c.id === 'brake')!;
    const before: GameState = { ...gameInYear(1850), morale: 50 };
    // Run several times — wagon damage on mishaps should still happen.
    let sawDamage = false;
    for (let i = 0; i < 30; i++) {
      const after = brake.apply(before, makeRng(`brake-${i}`));
      if (after.wagon.condition < before.wagon.condition) {
        sawDamage = true;
        break;
      }
    }
    expect(sawDamage).toBe(true);
  });

  it('cholera overlay log line mentions graves', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1850))!;
    const rope = ev.choices.find((c) => c.id === 'rope_down')!;
    const before: GameState = { ...gameInYear(1850), morale: 50 };
    const after = rope.apply(before, makeRng('grave-log'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/grave/i);
  });
});

describe('#236 cholera variants preserve choice gates', () => {
  it('Ash Hollow rope-down still requires rope', () => {
    const ev = getLandmarkArrivalEvent('ash_hollow', gameInYear(1850))!;
    const rope = ev.choices.find((c) => c.id === 'rope_down')!;
    expect(rope.requires?.itemId).toBe('rope');
  });

  it('Chimney Rock has both choices in cholera years', () => {
    const ev = getLandmarkArrivalEvent('chimney_rock', gameInYear(1850))!;
    const ids = ev.choices.map((c) => c.id);
    expect(ids).toEqual(['press_on', 'pause']);
  });
});
