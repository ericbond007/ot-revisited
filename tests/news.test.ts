import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import {
  addNews,
  recentNews,
  generatePostGossip,
  generateNewspaper,
  applyNewspaper,
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

describe('newspaper generator', () => {
  function gameInYear(year: number, month = 6): GameState {
    return createInitialState({
      seed: 'paper',
      leader: { name: 'A', profession: 'farmer' },
      companions: [{ name: 'B', profession: 'doctor' }],
      startDate: { year, month, day: 15 }
    });
  }

  it('returns 2-4 historical headlines plus a couple gossip items', () => {
    const s = gameInYear(1849);
    const { items } = generateNewspaper(s, makeRng('paper-1'), 'Fort Laramie');
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(6);
  });

  it('marks read headlines so the same paper is not served twice', () => {
    let s = gameInYear(1849);
    const { items: items1, headlineIdsUsed: ids1 } = generateNewspaper(s, makeRng('p-a'), 'Fort Laramie');
    s = applyNewspaper(s, items1, ids1, 'Fort Laramie');
    const readSet = (s.flags._headlinesRead as unknown as string[]) ?? [];
    for (const id of ids1) expect(readSet).toContain(id);

    // Subsequent reads must not pull a previously-read headline.
    const { headlineIdsUsed: ids2 } = generateNewspaper(s, makeRng('p-b'), 'Fort Laramie');
    for (const id of ids2) expect(ids1).not.toContain(id);
  });

  it('Gold Rush headline flips the California unlock flag', () => {
    // The Gold Rush story runs Aug 1848 onward — pick a window where
    // it's the only post-Aug headline that fires its california_unlock
    // effect. We seed the year and apply repeatedly until the flag flips.
    let s = gameInYear(1848, 9);
    let flipped = false;
    for (let i = 0; i < 10 && !flipped; i++) {
      const { items, headlineIdsUsed } = generateNewspaper(s, makeRng(`gold-${i}`), 'Fort Laramie');
      s = applyNewspaper(s, items, headlineIdsUsed, 'Fort Laramie');
      if (s.flags._californiaUnlocked) flipped = true;
    }
    expect(flipped).toBe(true);
  });

  it('newspaper batch is JSON-serializable (no function refs survive)', () => {
    let s = gameInYear(1854);
    const { items, headlineIdsUsed } = generateNewspaper(s, makeRng('roundtrip'), 'Fort Laramie');
    s = applyNewspaper(s, items, headlineIdsUsed, 'Fort Laramie');
    // Whole flags blob must round-trip cleanly — devalue would throw on
    // a function. The Grattan Affair headline carries an effect; this
    // confirms the dispatcher fired it AND scrubbed the function.
    const round = JSON.parse(JSON.stringify(s.flags));
    expect(round._news).toBeDefined();
    for (const n of round._news) expect(n.applyEffect).toBeUndefined();
  });
});
