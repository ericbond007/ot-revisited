// #300 — NPC wagon condition decay. Mirrors the player's tickWagon
// (pace × terrain × tar-bucket) on every NPC wagon every travel day,
// plus storm-day damage and the axle-grease consumption cycle.

import { describe, it, expect } from 'vitest';
import { applyNpcStormDamage } from '../src/lib/game/systems/wagon';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { advanceTrain } from '../src/lib/game/systems/wagon-train';
import { generateTrain } from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable, applyPendingChoice } from '../src/lib/game/engine-pausable';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function fakeWagon(over: Partial<NpcWagonState> & { id: string }): NpcWagonState {
  const base: NpcWagonState = {
    id: over.id,
    name: over.name ?? `the ${over.id} family`,
    leaderProfession: over.leaderProfession ?? 'farmer',
    hasChildren: false,
    seed: over.id,
    party: [
      {
        id: `${over.id}-p`,
        name: 'X',
        kind: 'adult',
        sex: 'male',
        age: 30,
        profession: 'farmer',
        isLeader: true,
        health: 100,
        dead: false,
        conditions: []
      }
    ],
    inventory: { flour: 100, bacon: 30 },
    oxen: [{ id: `${over.id}-o`, health: 100, fatigue: 0, shod: true }],
    morale: 70,
    cash: 100,
    wagon: { model: 'prairie_schooner', condition: 100, canvas: 100, carryCapacity: 1500, hasBranBarrel: false, impairment: null },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal',
    water: 20,
    dirtyWater: 0,
    waterCap: 20,
    dryDays: 0
  };
  return { ...base, ...over };
}

// #939h — applyNpcWagonDecay + applyNpcAxleGrease parallel describe
// blocks removed; NPC wagon decay + grease cycle now run through
// engine tickWagon + applyAxleGrease via wagon-synth (covered by the
// engine-side test suites + the tickNpcWagon integration block below).

describe('#300 — applyNpcStormDamage', () => {
  it('no-ops on non-storm weather', () => {
    const w = fakeWagon({ id: 'a' });
    const rng = makeRng('s');
    expect(applyNpcStormDamage(w, 'clear', rng).wagon.wagon.condition).toBe(100);
    expect(applyNpcStormDamage(w, 'rain', rng).wagon.wagon.condition).toBe(100);
    expect(applyNpcStormDamage(w, 'snow', rng).wagon.wagon.condition).toBe(100);
    expect(applyNpcStormDamage(w, 'frost', rng).wagon.wagon.condition).toBe(100);
  });

  it('takes 1-3 damage on storm days (matches player weather.ts)', () => {
    const w = fakeWagon({ id: 'a' });
    for (let i = 0; i < 50; i++) {
      const result = applyNpcStormDamage(w, 'storm', makeRng(`s${i}`));
      const dmg = 100 - result.wagon.wagon.condition;
      expect(dmg).toBeGreaterThanOrEqual(1);
      expect(dmg).toBeLessThanOrEqual(3);
      expect(result.playerLog).toMatch(/Thunderstorm/);
    }
  });
});

describe('#300 — tickNpcWagon integration', () => {
  it('drops wagon condition over a multi-day travel run', () => {
    const w0 = fakeWagon({ id: 'a' });
    let w = w0;
    for (let day = 1; day <= 30; day++) {
      const r = tickNpcWagon(w, {
        day,
        traveled: true,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 14
      }, makeRng(`d${day}`));
      w = r.wagon;
    }
    expect(w.wagon.condition).toBeLessThan(95);
  });

  it('rest days do not decay condition', () => {
    const w0 = fakeWagon({ id: 'a' });
    let w = w0;
    for (let day = 1; day <= 30; day++) {
      const r = tickNpcWagon(w, {
        day,
        traveled: false,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 0
      }, makeRng(`r${day}`));
      w = r.wagon;
    }
    expect(w.wagon.condition).toBe(100);
  });

  it('bot tar_bucket gets consumed across a long run', () => {
    // #939c — engine draws flour BEFORE bacon (period-correct order),
    // so cookware + saleratus must be present or every flour-day fires
    // pastry-quality morale debits that eventually trip shouldRest
    // and skip travel days.
    const w0 = fakeWagon({ id: 'a', inventory: { flour: 1000, bacon: 100, tar_bucket: 1, cookware: 1, saleratus: 10 } });
    let w = w0;
    for (let day = 1; day <= 40; day++) {
      // Refill water + reset ox fatigue each iteration so the wagon
      // doesn't dehydrate AND the persona's #937 voluntary-rest path
      // doesn't fire on worn oxen — this test is about tar
      // consumption, not water or fatigue dynamics.
      w = { ...w, water: w.waterCap, oxen: w.oxen.map((o) => ({ ...o, fatigue: 0 })) };
      const r = tickNpcWagon(w, {
        day,
        traveled: true,
        pace: 'moderate',
        terrain: 'prairie',
        weather: 'clear',
        traveledMiles: 14
      }, makeRng(`t${day}`));
      w = r.wagon;
    }
    // 40 days × 14 mi = 560 mi → consumed 1 bucket at the 500-mi mark.
    expect(w.inventory.tar_bucket).toBe(0);
    expect(w.greaseMiles).toBeGreaterThan(0);
  });

  it('storm-day weather hits wagon condition', () => {
    const w0 = fakeWagon({ id: 'a' });
    const r = tickNpcWagon(w0, {
      day: 1,
      traveled: true,
      pace: 'moderate',
      terrain: 'prairie',
      weather: 'storm',
      traveledMiles: 14
    }, makeRng('storm'));
    // moderate prairie decay ≈ 0.6, storm dmg 1-3, total range ≈ 1.6 to 3.6.
    const lost = 100 - r.wagon.wagon.condition;
    expect(lost).toBeGreaterThan(1);
    expect(lost).toBeLessThan(5);
  });
});

describe('#300 — engine-pausable + advanceTrain wiring', () => {
  function trainGame(): GameState {
    const s = createInitialState({
      seed: 'decay',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 6, day: 15 }
    });
    const train = generateTrain('decay-train', 1, null, makeRng('decay-train-seed'));
    return { ...s, wagonTrain: train };
  }

  it('NPC wagons decay over a multi-day run through tickDayPausable', () => {
    let s = trainGame();
    const before = s.wagonTrain!.companions.map((c) => c.wagon.condition);
    // Run 30 days. When events pause, resolve them via applyPendingChoice
    // (default-marked choice) so advanceTrain runs and NPCs decay.
    for (let i = 0; i < 30; i++) {
      const r = tickDayPausable(s);
      s = r.state;
      if (r.pendingEvent) {
        const def = r.pendingEvent.choices.find((c) => c.isDefault) ?? r.pendingEvent.choices[0];
        s = applyPendingChoice(s, r.pendingEvent, def.id);
      }
    }
    const after = s.wagonTrain!.companions.map((c) => c.wagon.condition);
    const someDropped = after.some((c, i) => c < before[i]);
    expect(someDropped).toBe(true);
  });

  it('advanceTrain forwards traveledMiles into the NPC tick', () => {
    const s = trainGame();
    const result = advanceTrain(s, true, 14);
    // Companions should have accumulated greaseMiles from the call.
    const greaseSum = result.state.wagonTrain!.companions.reduce(
      (acc, c) => acc + (c.greaseMiles ?? 0),
      0
    );
    expect(greaseSum).toBeGreaterThan(0);
  });

  it('advanceTrain default 0 miles preserves greaseMiles unchanged', () => {
    const s = trainGame();
    const result = advanceTrain(s, true); // no traveledMiles arg
    const greaseSum = result.state.wagonTrain!.companions.reduce(
      (acc, c) => acc + (c.greaseMiles ?? 0),
      0
    );
    expect(greaseSum).toBe(0);
  });
});
