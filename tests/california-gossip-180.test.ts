import { describe, it, expect } from 'vitest';
import { generatePostGossip } from '../src/lib/game/systems/news';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGameAtYear(year: number, californiaUnlocked: boolean): GameState {
  const s = createInitialState({
    seed: 'cal-gossip-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year, month: 6, day: 15 }
  });
  return { ...s, flags: { ...s.flags, _californiaUnlocked: californiaUnlocked } };
}

const CAL_KEYWORDS = /diggings|gold field|forty[- ]niner|Hangtown|Hudspeth|Sierra|Marysville|Mokelumne|California|gold[- ]traffic|San Francisco/i;

describe('#180 year-sensitive California-flavor gossip', () => {
  it('pre-1849 (no unlock flag) never surfaces California chatter', () => {
    const s = newGameAtYear(1846, false);
    let saw = false;
    for (let i = 0; i < 500; i++) {
      const g = generatePostGossip(s, makeRng(`pre-${i}`), 'Fort Laramie');
      if (g && CAL_KEYWORDS.test(g.text)) saw = true;
    }
    expect(saw).toBe(false);
  });

  it('post-1849 (unlock flag set) does surface California chatter', () => {
    const s = newGameAtYear(1850, true);
    let count = 0;
    for (let i = 0; i < 500; i++) {
      const g = generatePostGossip(s, makeRng(`post-${i}`), 'Fort Laramie');
      if (g && CAL_KEYWORDS.test(g.text)) count++;
    }
    // 25% target rate — comfortable margin around 125/500.
    expect(count).toBeGreaterThan(60);
    expect(count).toBeLessThan(220);
  });

  it('a California gossip item carries opportunity topic + clerk source', () => {
    const s = newGameAtYear(1850, true);
    // Bisect to a seed that picks the Cal branch.
    let g = null;
    for (let i = 0; i < 100; i++) {
      const tryG = generatePostGossip(s, makeRng(`cal-${i}`), 'Fort Laramie');
      if (tryG && CAL_KEYWORDS.test(tryG.text)) {
        g = tryG;
        break;
      }
    }
    expect(g).not.toBeNull();
    expect(g!.source).toBe('Fort Laramie clerk');
    expect(g!.topic).toBe('opportunity');
  });

  it('regular topics still fire post-1849 (Cal does not dominate)', () => {
    const s = newGameAtYear(1850, true);
    let nonCal = 0;
    for (let i = 0; i < 500; i++) {
      const g = generatePostGossip(s, makeRng(`mix-${i}`), 'Fort Laramie');
      if (g && !CAL_KEYWORDS.test(g.text)) nonCal++;
    }
    // ~75% of post-1849 gossip should still be regular topics.
    expect(nonCal).toBeGreaterThan(300);
  });
});
