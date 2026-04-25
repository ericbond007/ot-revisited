import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../src/lib/game/engine';
import { rest } from '../src/lib/game/actions/rest';
import type { GameState } from '../src/lib/game/types';

function newGame(seed = 'events-integration'): GameState {
  const s = createInitialState({
    seed,
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' },
      { name: 'Sarah', profession: 'teamster' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  // Big water + firewood cushions so dehydration (#135) and fire (#15)
  // don't kill the party across a 100-day no-interaction simulation.
  return { ...s, resources: { water: 1000, waterCap: 1000, firewood: 1000 } };
}

describe('100-day run with events', () => {
  it('fires multiple distinct events across a long journey', () => {
    let s = newGame();
    for (let cycle = 0; cycle < 20 && !s.completed; cycle++) {
      for (let d = 0; d < 4; d++) s = tickDay(s);
      s = rest(s, 1);
      s = rest(s, 1);
    }
    const eventLines = s.eventLog.filter((e) =>
      /thunderstorm|heat wave|fog|snowfall|wheel|lame|shoe|tongue|canvas|wander|berries|cache|spring|wagon train|abandoned wagon|lost child|quarrel|prayer|Donner|gold|handcart|Pony|flood/i.test(e.text)
    );
    expect(eventLines.length).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic across runs', () => {
    function run() {
      let s = newGame();
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let d = 0; d < 4; d++) s = tickDay(s);
        s = rest(s, 1);
        s = rest(s, 1);
      }
      return s;
    }
    expect(run()).toEqual(run());
  });

  it('1852 game sees the cholera-peak event at higher rates than 1848', () => {
    function runYear(year: number, seedSuffix: string): number {
      let s = createInitialState({
        seed: `year-${year}-${seedSuffix}`,
        leader: { name: 'A', profession: 'farmer' },
        companions: [{ name: 'B', profession: 'doctor' }],
        startDate: { year, month: 4, day: 15 }
      });
      // Oversize water + firewood for a 120-day no-interaction simulation.
      s = { ...s, resources: { water: 1000, waterCap: 1000, firewood: 1000 } };
      for (let d = 0; d < 120; d++) s = tickDay(s);
      return s.eventLog.filter((e) => e.text.includes('1852')).length;
    }
    // Sample several seeds — the cholera-peak event has weight 6 in a
    // pool of ~50 weight, so over 120 days at least one seed should hit
    // it at least once. The 1848 run must never fire it (year-gated).
    let any1852 = 0;
    for (const suffix of ['a', 'b', 'c']) any1852 += runYear(1852, suffix);
    expect(any1852).toBeGreaterThan(0);
    expect(runYear(1848, 'a')).toBe(0);
  });
});
