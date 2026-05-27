// #1162 — NPCs must skip post-restock when the landmark is abandoned for
// the current year, same as the player UI. Without this gate NPC trains
// trade at Fort Hall in 1857 (gated abandonedAfterYear: 1856) or at
// Rock Creek Station in 1850 (gated abandonedBeforeYear: 1857). Fixed by
// adding `isLandmarkAbandoned(here, state.date.year)` early-return to
// `applyNpcPostRestock` in wagon-train.ts.

import { describe, it, expect } from 'vitest';
import { applyNpcPostRestock, joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(year: number): GameState {
  return createInitialState({
    seed: 'r1162',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year, month: 6, day: 15 }
  });
}

function arriveAt(s: GameState, landmarkId: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: landmarkId } };
}

/** Put the first NPC at `landmarkId` with flour=0 and $1000 cash, then
 *  run applyNpcPostRestock and return that NPC's resulting flour count.
 *  Non-zero = the NPC traded at the post; 0 = the gate kicked in. */
function flourAfterRestock(year: number, landmarkId: string): number {
  let s = joinTrain(game(year), makeRng('r1162')).state;
  s = arriveAt(s, landmarkId);
  s = {
    ...s,
    wagonTrain: {
      ...s.wagonTrain!,
      companions: s.wagonTrain!.companions.map((c, i) =>
        i === 0
          ? { ...c, inventory: { ...c.inventory, flour: 0 }, cash: 1000 }
          : c
      )
    }
  };
  const result = applyNpcPostRestock(s);
  return result.wagonTrain!.companions[0].inventory.flour ?? 0;
}

describe('#1162 — applyNpcPostRestock gates on isLandmarkAbandoned', () => {
  it('Fort Hall in 1857 is abandoned (>1856) — NPC does not restock', () => {
    expect(flourAfterRestock(1857, 'ft_hall')).toBe(0);
  });

  it('Fort Hall in 1850 is open — NPC does restock (regression gate)', () => {
    expect(flourAfterRestock(1850, 'ft_hall')).toBeGreaterThan(0);
  });

  it('Rock Creek Station in 1850 has not opened yet (<1857) — NPC does not restock', () => {
    expect(flourAfterRestock(1850, 'rock_creek_station')).toBe(0);
  });

  it('Rock Creek Station in 1860 is open — NPC does restock (regression gate)', () => {
    expect(flourAfterRestock(1860, 'rock_creek_station')).toBeGreaterThan(0);
  });

  it('Fort Boise in 1857 is abandoned (>1855) — NPC does not restock', () => {
    expect(flourAfterRestock(1857, 'ft_boise')).toBe(0);
  });
});
