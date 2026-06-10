// #290 — wagon-train morale + departures.

import { describe, it, expect } from 'vitest';
import {
  processDepartures,
  DEPARTURE_MORALE_THRESHOLD,
  MAX_DEPARTURE_CHANCE
} from '../src/lib/game/systems/npc-departures';
import { joinTrain, advanceTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { rest } from '../src/lib/game/actions/rest';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 't290',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function inTrain(): GameState {
  return joinTrain(game(), makeRng('j290')).state;
}

describe('#290 wagon-train morale + departures', () => {
  it('exports DEPARTURE_MORALE_THRESHOLD and MAX_DEPARTURE_CHANCE', () => {
    expect(DEPARTURE_MORALE_THRESHOLD).toBeGreaterThan(0);
    expect(MAX_DEPARTURE_CHANCE).toBeGreaterThan(0);
    expect(MAX_DEPARTURE_CHANCE).toBeLessThan(1);
  });

  it('no-op when not in a train', () => {
    const s = game();
    const r = processDepartures(s, makeRng('d'));
    expect(r.state).toBe(s);
    expect(r.playerLogs).toEqual([]);
  });

  it('no departures when all wagons have morale above threshold', () => {
    let s = inTrain();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({ ...c, morale: 80 }))
      }
    };
    const r = processDepartures(s, makeRng('hi'));
    expect(r.state.wagonTrain!.companions.length).toBe(s.wagonTrain!.companions.length);
    expect(r.playerLogs).toEqual([]);
  });

  it('a miserable wagon (morale 0) departs over many seeds', () => {
    let departed = 0;
    for (let seed = 0; seed < 200; seed++) {
      let s = inTrain();
      s = {
        ...s,
        wagonTrain: {
          ...s.wagonTrain!,
          companions: s.wagonTrain!.companions.map((c, i) =>
            i === 0 ? { ...c, morale: 0 } : c
          )
        }
      };
      const r = processDepartures(s, makeRng('mis-' + seed));
      if (r.state.wagonTrain!.companions.length < s.wagonTrain!.companions.length) {
        departed += 1;
      }
    }
    // At ~10%/day for morale=0 we expect ~20 departures across 200
    // seeds. Wide assertion because RNG variance.
    expect(departed).toBeGreaterThan(5);
    expect(departed).toBeLessThan(60);
  });

  it('departure log entry mentions the family name', () => {
    let s = inTrain();
    const targetName = s.wagonTrain!.companions[0].name;
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, morale: 0 } : { ...c, morale: 80 }
        )
      }
    };
    // Try seeds until a departure fires.
    for (let seed = 0; seed < 100; seed++) {
      const r = processDepartures(s, makeRng('log-' + seed));
      if (r.playerLogs.length > 0) {
        expect(r.playerLogs[0]).toContain(targetName);
        return;
      }
    }
    throw new Error('No departure fired across 100 seeds — tune MAX_DEPARTURE_CHANCE');
  });

  it('faction split takes additional malcontent wagons along', () => {
    let s = inTrain();
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        // Three malcontent wagons + the rest happy.
        companions: s.wagonTrain!.companions.map((c, i) =>
          i < 3 ? { ...c, morale: 5 } : { ...c, morale: 80 }
        )
      }
    };
    // Try seeds to find a faction departure.
    let bestRemoved = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = processDepartures(s, makeRng('fac-' + seed));
      const removed = s.wagonTrain!.companions.length - (r.state.wagonTrain?.companions.length ?? 0);
      if (removed > bestRemoved) bestRemoved = removed;
      if (removed > 1) break;
    }
    expect(bestRemoved).toBeGreaterThan(1);
  });

  it('dissolves the train if every companion leaves', () => {
    let s = inTrain();
    // Reduce roster to 1, set morale 0.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: [{ ...s.wagonTrain!.companions[0], morale: 0 }]
      }
    };
    for (let seed = 0; seed < 100; seed++) {
      const r = processDepartures(s, makeRng('dis-' + seed));
      if (r.state.wagonTrain === null) {
        expect(r.playerLogs.some((l) => /train has dissolved/i.test(l))).toBe(true);
        return;
      }
    }
    // Defensive: at 10%/day across 100 seeds we should hit it.
    throw new Error('Train never dissolved across 100 seeds');
  });

  it('preacher-led train (player) damps the departure rate', () => {
    function rate(seed: string, leaderProf: 'farmer' | 'preacher'): number {
      let depCount = 0;
      for (let i = 0; i < 200; i++) {
        let s = createInitialState({
          seed: seed + i,
          leader: { name: 'L', profession: leaderProf },
          companions: [{ name: 'C', profession: 'doctor' }],
          startDate: { year: 1849, month: 4, day: 15 }
        });
        s = joinTrain(s, makeRng(seed + i + ':j')).state;
        s = {
          ...s,
          wagonTrain: {
            ...s.wagonTrain!,
            companions: s.wagonTrain!.companions.map((c) => ({ ...c, morale: 5 }))
          }
        };
        const r = processDepartures(s, makeRng(seed + i + ':d'));
        if (r.playerLogs.length > 0) depCount += 1;
      }
      return depCount;
    }
    const farmerRate = rate('farmer-', 'farmer');
    const preacherRate = rate('preacher-', 'preacher');
    expect(preacherRate).toBeLessThan(farmerRate);
  });

  it('integration — advanceTrain triggers departures over many days of low food', () => {
    let s = inTrain();
    // Strip food from all companions so they starve, lose morale,
    // and start departing. Player isn't preacher → no damper.
    // Re-baseline (T2 #1281 + #1279): the #1279 level-trigger fires
    // immediately on inventory:{} wagons (wasFood was never >0), emitting
    // npc_starvation_wagon-0 every tick and permanently blocking the
    // departure check.  Mark crisisAskedDay=day-1 on every companion so
    // the level-trigger treats the crisis as already presented; the wagons
    // remain starving → morale collapses → departures fire normally.
    s = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c) => ({
          ...c,
          inventory: {} as Record<string, number>,
          morale: 20,
          crisisAskedDay: s.day - 1
        }))
      }
    };
    const startCount = s.wagonTrain!.companions.length;
    s = rest(s, 90);
    // After 90 days of starvation morale-grinding, at least one
    // wagon should have left or wiped (which also removes from view
    // ... actually wiped wagons stay in companions[]; only departures
    // remove). Use companion count < start.
    const endCount = s.wagonTrain?.companions.length ?? 0;
    expect(endCount).toBeLessThan(startCount);
  });
});
