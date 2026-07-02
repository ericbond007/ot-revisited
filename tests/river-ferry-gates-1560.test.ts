import { describe, it, expect } from 'vitest';
import { ferryAvailable, ford } from '../src/lib/game/actions/ford';
import { getLandmark } from '../src/lib/game/content/landmarks';
import { createInitialState } from '../src/lib/game/engine';
import type { GameDate, GameState } from '../src/lib/game/types';

// #1560 — period-accurate commercial-ferry gates (#1141-#1144). One
// shared ferryAvailable() feeds the server action, the FordModal option
// list, and every persona's pickFordMethod.

const d = (year: number, month: number, day = 1): GameDate => ({ year, month, day });
const riverOf = (id: string) => getLandmark(id)!.river!;

describe('#1141 Big Blue — Marshall\'s Ferry 1849-1853 only, $3', () => {
  const river = riverOf('big_blue_river');
  it('no ferry before 1849', () => {
    expect(ferryAvailable(river, d(1848, 6))).toBe(false);
    expect(ferryAvailable(river, d(1841, 5))).toBe(false);
  });
  it('operates 1849-1853', () => {
    expect(ferryAvailable(river, d(1849, 5))).toBe(true);
    expect(ferryAvailable(river, d(1853, 8))).toBe(true);
  });
  it('gone after 1853 (traffic shifted to Marysville)', () => {
    expect(ferryAvailable(river, d(1854, 6))).toBe(false);
  });
  it('fee raised to the attested $3', () => {
    expect(river.ferryPrice).toBe(3);
  });
});

describe('#1142 Green River — first commercial ferry July 1847', () => {
  const river = riverOf('green_river');
  it('ford-only before 1847', () => {
    expect(ferryAvailable(river, d(1846, 6))).toBe(false);
  });
  it('operates 1847 onward, fee unchanged', () => {
    expect(ferryAvailable(river, d(1847, 7))).toBe(true);
    expect(ferryAvailable(river, d(1852, 8))).toBe(true);
    expect(river.ferryPrice).toBe(8);
  });
});

describe('#1143 Sweetwater first crossing — never a commercial ferry', () => {
  const river = riverOf('sweetwater_1');
  it('no ferry in any year or season', () => {
    expect(river.ferryPrice).toBeUndefined();
    expect(ferryAvailable(river, d(1849, 6))).toBe(false);
    expect(ferryAvailable(river, d(1853, 5))).toBe(false);
  });
});

describe('#1144 Bear River — toll ferry only in May-June snowmelt', () => {
  const river = riverOf('bear_river');
  it('operates during spring high water', () => {
    expect(ferryAvailable(river, d(1849, 5, 20))).toBe(true);
    expect(ferryAvailable(river, d(1846, 6, 28))).toBe(true);
  });
  it('no ferry in the late-summer trickle', () => {
    expect(ferryAvailable(river, d(1849, 7))).toBe(false);
    expect(ferryAvailable(river, d(1849, 8))).toBe(false);
    expect(ferryAvailable(river, d(1849, 10))).toBe(false);
  });
});

describe('#1560 server-side backstop', () => {
  function stateAt(year: number, month: number): GameState {
    const s = createInitialState({
      seed: 'ferry-gate',
      leader: { name: 'L', profession: 'banker' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year, month, day: 1 }
    });
    return { ...s, cash: 500 };
  }
  it('ford() rejects a ferry that is not operating', () => {
    const s = stateAt(1846, 6); // pre-1849 Big Blue
    expect(() =>
      ford(s, { method: 'ferry', river: riverOf('big_blue_river') })
    ).toThrow(/no ferry operates/);
  });
  it('ford() still sells the ferry when it runs', () => {
    const s = stateAt(1850, 6);
    const out = ford(s, { method: 'ferry', river: riverOf('big_blue_river') });
    expect(out.cash).toBeLessThan(s.cash);
  });
});
