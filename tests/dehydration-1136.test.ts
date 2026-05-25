import { describe, it, expect } from 'vitest';
import { applyDehydration } from '../src/lib/game/systems/dehydration';
import { applyDailyConsumption } from '../src/lib/game/systems/consumption';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

// #1136 — Pre-fix bug: applyDehydration only checked state.resources.water,
// missing dirtyWater. A party using find_water (which adds to dirtyWater)
// without canBoilWater (pre-1854 + no doctor) would refill the keg with
// dirty water, drink it via applyDailyConsumption's dirty-fallback path,
// and STILL accumulate dry days because the clean-water field stayed at 0.
// Result: party "died of dehydration" with a wagon full of (dirty) water.

function gameWithWater(over: { clean?: number; dirty?: number }): GameState {
  const s = createInitialState({
    seed: '1136',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return {
    ...s,
    resources: {
      ...s.resources,
      water: over.clean ?? 0,
      dirtyWater: over.dirty ?? 0,
    }
  };
}

describe('#1136 applyDehydration treats dirty water as not-dry', () => {
  it('clean=0, dirty=15 → NOT dry, no counter, no log', () => {
    const s = gameWithWater({ clean: 0, dirty: 15 });
    const out = applyDehydration(s);
    expect(out.flags._dehydrationDays).toBeUndefined();
    // No "dying" log line on a not-dry day.
    expect(out.eventLog.length).toBe(s.eventLog.length);
  });

  it('clean=0, dirty=0 → dry, counter increments, log appended', () => {
    const s = gameWithWater({ clean: 0, dirty: 0 });
    const out = applyDehydration(s);
    expect(out.flags._dehydrationDays).toBe(1);
    expect(out.eventLog.length).toBe(s.eventLog.length + 1);
  });

  it('clean=5, dirty=0 → not dry, no counter', () => {
    const s = gameWithWater({ clean: 5, dirty: 0 });
    const out = applyDehydration(s);
    expect(out.flags._dehydrationDays).toBeUndefined();
  });

  it('refilling dirtyWater after a dry streak clears the counter', () => {
    // Day N: had 2 dry days; now found dirty water.
    const s = gameWithWater({ clean: 0, dirty: 12 });
    const sWithStreak: GameState = {
      ...s,
      flags: { ...s.flags, _dehydrationDays: 2 }
    };
    const out = applyDehydration(sWithStreak);
    expect(out.flags._dehydrationDays).toBeUndefined();
    expect(out.eventLog.at(-1)?.text).toMatch(/drank|color returns/i);
  });

  it('repro of the pre-fix bug scenario: consumption draws dirty water but dehydration would have ticked anyway', () => {
    // Pre-1854 party with no doctor, no clean water, only dirty.
    // applyDailyConsumption drains dirty (party drinks).
    // applyDehydration should NOT increment the counter.
    const s = gameWithWater({ clean: 0, dirty: 10 });
    const afterConsumption = applyDailyConsumption(s);
    // Some dirty water was drunk; some remains.
    expect((afterConsumption.resources.dirtyWater ?? 0)).toBeLessThan(10);
    // Now dehydration check: should remain not-dry because dirty water exists.
    const afterDehydration = applyDehydration(afterConsumption);
    expect(afterDehydration.flags._dehydrationDays).toBeUndefined();
  });
});
