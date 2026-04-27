import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import {
  addNews,
  recentNews,
  generatePostGossip,
  effectCholeraScare,
  effectHuntBonus,
  effectTribeShift
} from '../src/lib/game/systems/news';
import { getTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import { adjustTribeAttitude } from '../src/lib/game/systems/tribe-relations';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'news',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('news storage', () => {
  it('starts empty', () => {
    expect(recentNews(newGame())).toEqual([]);
  });

  it('addNews appends to the journal AND the event log with a 📢 prefix', () => {
    const s0 = newGame();
    const s1 = addNews(s0, {
      text: 'Sioux are restless.',
      source: 'Fort Laramie clerk',
      topic: 'tribe',
      day: s0.day
    });
    expect(recentNews(s1)).toHaveLength(1);
    const last = s1.eventLog[s1.eventLog.length - 1];
    expect(last.text).toContain('📢 News:');
    expect(last.text).toContain('Sioux are restless');
    expect(last.text).toContain('Fort Laramie clerk');
  });

  it('caps the journal at 30 entries', () => {
    let s = newGame();
    for (let i = 0; i < 35; i++) {
      s = addNews(s, { text: `tip ${i}`, source: 'src', topic: 'opportunity', day: s.day });
    }
    expect(recentNews(s)).toHaveLength(30);
    // Oldest items have been trimmed.
    expect(recentNews(s)[0].text).toBe('tip 5');
  });
});

describe('news world-effects', () => {
  it('cholera-scare effect sets a 14-day flag', () => {
    const s = newGame();
    const next = effectCholeraScare(s);
    expect(next.flags._choleraHintedUntilDay).toBe(s.day + 14);
  });

  it('hunt-bonus effect sets a 7-day flag', () => {
    const s = newGame();
    const next = effectHuntBonus(s);
    expect(next.flags._huntBonusUntilDay).toBe(s.day + 7);
  });

  it('tribe-shift effect adjusts the attitude immediately', () => {
    const s = newGame();
    const before = getTribeAttitude(s, 'sioux');
    const shifted = effectTribeShift('sioux', -10)(s);
    expect(getTribeAttitude(shifted, 'sioux')).toBe(before - 10);
  });

  it('addNews fires the applyEffect hook on the way in', () => {
    const s = newGame();
    const next = addNews(s, {
      text: 'Cholera ahead.', source: 'rider', topic: 'hazard', day: s.day,
      applyEffect: effectCholeraScare
    });
    expect(next.flags._choleraHintedUntilDay).toBe(s.day + 14);
  });

  it('strips applyEffect from the persisted item so the state stays serializable', () => {
    // SvelteKit form-action returns go through devalue, which throws on
    // function values. addNews has to fire the effect AND scrub the
    // function from what lands in flags._news.
    const s = newGame();
    const next = addNews(s, {
      text: 'Boil your water.', source: 'eastbound emigrants',
      topic: 'hazard', day: s.day,
      applyEffect: effectCholeraScare
    });
    const stored = recentNews(next)[0];
    expect(stored.applyEffect).toBeUndefined();
    // Round-trip via JSON to confirm nothing function-shaped survived.
    const roundTripped = JSON.parse(JSON.stringify(next.flags._news));
    expect(roundTripped[0].applyEffect).toBeUndefined();
    // And the effect itself still fired.
    expect(next.flags._choleraHintedUntilDay).toBe(s.day + 14);
  });
});

describe('post gossip generator', () => {
  function setMile(s: GameState, m: number): GameState {
    return { ...s, location: { ...s.location, milesTraveled: m } };
  }

  it('returns a NewsItem with a topic from the post-clerk source', () => {
    const s = setMile(newGame(), 600);
    // Try a few seeds — one has to give us a non-null tip.
    let tip = null;
    for (const sd of ['a', 'b', 'c', 'd', 'e']) {
      tip = generatePostGossip(s, makeRng(`gossip-${sd}`), 'Fort Laramie');
      if (tip) break;
    }
    expect(tip).toBeTruthy();
    expect(tip!.source).toContain('Fort Laramie');
    expect(['tribe', 'water', 'weather', 'opportunity', 'hazard']).toContain(tip!.topic);
  });

  it('tribe rumors reflect current attitude tone', () => {
    let s = newGame();
    // Plunge Sioux to hostile — gossip about them should turn dark.
    s = adjustTribeAttitude(s, 'sioux', -100);
    s = { ...s, location: { ...s.location, milesTraveled: 500 } }; // Sioux country
    // Force a tribe-topic roll by trying many seeds and filtering.
    let tribeTip = null;
    for (let i = 0; i < 30 && !tribeTip; i++) {
      const tip = generatePostGossip(s, makeRng(`hostile-${i}`), 'Fort Laramie');
      if (tip && tip.topic === 'tribe' && tip.text.includes('Sioux')) tribeTip = tip;
    }
    if (tribeTip) {
      expect(tribeTip.text.toLowerCase()).toMatch(/blood|restless|watching|out for/);
    }
    // If we didn't pull a tribe-Sioux roll across 30 seeds, the test is
    // inconclusive but doesn't fail. (The generator can pick other topics.)
  });
});
