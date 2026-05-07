// #287a — Bot profile registry. 10 named historical profiles + the
// roster-allocation helper. Slice A scope: registry shape, the
// roster picker's freshBias filter, and the train-gen integration
// (named slots ship with the dossier party verbatim).

import { describe, it, expect } from 'vitest';
import {
  LAUNCH_PROFILES,
  getBotProfile,
  pickProfilesForRoster
} from '../src/lib/game/content/bot-profiles';
import { generateTrain } from '../src/lib/game/content/trains';
import { makeRng } from '../src/lib/game/rng';

describe('#287a — registry shape', () => {
  it('has 10 launch profiles', () => {
    expect(LAUNCH_PROFILES).toHaveLength(10);
  });

  it('every profile has a unique id', () => {
    const ids = LAUNCH_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every profile has a leader (exactly one party member with role=leader)', () => {
    for (const p of LAUNCH_PROFILES) {
      const leaders = p.party.filter((m) => m.role === 'leader');
      expect(leaders.length, `${p.id} leader count`).toBe(1);
    }
  });

  it('every leader is an adult (no child leaders)', () => {
    for (const p of LAUNCH_PROFILES) {
      const leader = p.party.find((m) => m.role === 'leader')!;
      expect(leader.age, `${p.id} leader age`).toBeGreaterThanOrEqual(15);
    }
  });

  it('solo profiles have exactly 1 party member', () => {
    for (const p of LAUNCH_PROFILES) {
      if (p.composition === 'solo') {
        expect(p.party.length, `${p.id}`).toBe(1);
      }
    }
  });

  it('family profiles have at least one child member', () => {
    for (const p of LAUNCH_PROFILES) {
      if (p.composition === 'family') {
        const childCount = p.party.filter((m) => m.role === 'child').length;
        expect(childCount, `${p.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('the Sager family has 2 adults + 7 children', () => {
    const sager = getBotProfile('sager-family');
    expect(sager.party.filter((m) => m.role === 'leader' || m.role === 'spouse')).toHaveLength(2);
    expect(sager.party.filter((m) => m.role === 'child')).toHaveLength(7);
  });

  it('Joe Meek is solo with hunter profession', () => {
    const meek = getBotProfile('joe-meek');
    expect(meek.composition).toBe('solo');
    expect(meek.leaderProfession).toBe('hunter');
    expect(meek.party).toHaveLength(1);
  });

  it('every profile cites a Wikipedia source', () => {
    for (const p of LAUNCH_PROFILES) {
      expect(p.source, `${p.id}`).toMatch(/^https:\/\/(en\.)?wikipedia\.org\//);
    }
  });
});

describe('#287a — pickProfilesForRoster', () => {
  it('returns an array of length slotCount', () => {
    const picks = pickProfilesForRoster(makeRng('x'), 8);
    expect(picks).toHaveLength(8);
  });

  it('default 50/50 named-vs-random — half the slots get profiles', () => {
    const picks = pickProfilesForRoster(makeRng('x'), 10);
    const named = picks.filter((p) => p !== null).length;
    expect(named).toBe(5);
  });

  it('namedFraction = 0 → all random (no named)', () => {
    const picks = pickProfilesForRoster(makeRng('x'), 10, { namedFraction: 0 });
    expect(picks.every((p) => p === null)).toBe(true);
  });

  it('namedFraction = 1 → as many named as the pool allows', () => {
    const picks = pickProfilesForRoster(makeRng('x'), 12, { namedFraction: 1 });
    const named = picks.filter((p) => p !== null);
    expect(named.length).toBe(LAUNCH_PROFILES.length); // 10 — pool exhausted
  });

  it('no profile id repeats within a roster', () => {
    const picks = pickProfilesForRoster(makeRng('x'), 12, { namedFraction: 1 });
    const ids = picks.filter((p): p is NonNullable<typeof p> => p !== null).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('freshBias=true excludes solo profiles from the named pool', () => {
    // Drive 200 trials with freshBias and verify NO solo profile shows up.
    for (let i = 0; i < 200; i++) {
      const picks = pickProfilesForRoster(makeRng(`f${i}`), 10, { freshBias: true });
      for (const p of picks) {
        if (p) expect(p.composition, `${p.id} should not be solo at fresh-start`).not.toBe('solo');
      }
    }
  });

  it('freshBias=false includes solo profiles eventually (Joe Meek, Brown, Palmer, Hastings)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const picks = pickProfilesForRoster(makeRng(`m${i}`), 10);
      for (const p of picks) {
        if (p && p.composition === 'solo') seen.add(p.id);
      }
    }
    expect(seen.size, 'expected to see ≥3 of the 4 solo profiles across 200 trials').toBeGreaterThanOrEqual(3);
  });
});

describe('#287a — train integration', () => {
  it('named slots ship with the dossier surname + leader profession', () => {
    // With freshBias=false (mid-trail join), all 10 named profiles can appear.
    let foundSager = false;
    let foundMeek = false;
    for (let i = 0; i < 50; i++) {
      const train = generateTrain(`s${i}`, 30, 'fort_kearny', makeRng(`s${i}`), { fresh: false });
      for (const c of train.companions) {
        if (c.name === 'the Sager family') {
          foundSager = true;
          // Sagers are exactly 2 adults + 7 children
          expect(c.party.filter((m) => m.kind === 'adult')).toHaveLength(2);
          expect(c.party.filter((m) => m.kind === 'child')).toHaveLength(7);
          expect(c.leaderProfession).toBe('farmer');
        }
        if (c.name === 'Joe Meek') {
          foundMeek = true;
          expect(c.party).toHaveLength(1);
          expect(c.leaderProfession).toBe('hunter');
        }
      }
    }
    expect(foundSager).toBe(true);
    expect(foundMeek).toBe(true);
  });

  it('Independence-start trains use freshBias — Joe Meek/Brown/Palmer/Hastings absent', () => {
    const SOLO_IDS = ['Joe Meek', 'Tabitha Brown', 'Joel Palmer', 'Lansford Hastings'];
    for (let i = 0; i < 50; i++) {
      const train = generateTrain(`f${i}`, 1, 'independence_mo', makeRng(`f${i}`), { fresh: true });
      for (const c of train.companions) {
        expect(SOLO_IDS, `${c.name} should not appear at Independence`).not.toContain(c.name);
      }
    }
  });

  it('roster gen still produces some random fillers (not 100% named)', () => {
    let anyRandom = false;
    for (let i = 0; i < 20; i++) {
      const train = generateTrain(`r${i}`, 30, 'fort_kearny', makeRng(`r${i}`));
      for (const c of train.companions) {
        // Random filler wagons get pattern names like "the Williams family"
        // — stranger surnames not in the named-profile pool.
        const namedSet = new Set(LAUNCH_PROFILES.map((p) => p.displayName));
        if (!namedSet.has(c.name)) {
          anyRandom = true;
          break;
        }
      }
      if (anyRandom) break;
    }
    expect(anyRandom).toBe(true);
  });
});
