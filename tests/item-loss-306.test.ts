// #306 phase 1 — buffalo stampede item-loss tests. Verifies the
// stampede roller, player-side damage, NPC propagation, train-wide
// event apply, and one-shot-per-year gating.

import { describe, it, expect } from 'vitest';
import {
  rollStampedeLosses,
  applyStampedeToPlayer,
  applyStampedeToNpc,
  rollFordLoss,
  rollStormWindLoss,
  abandonHeavyLoad,
  rollDailyTheft,
  STAMPEDE_VICTIMS,
  STAMPEDE_LOSS_FRACTION
} from '../src/lib/game/systems/item-loss';
import { EVENTS } from '../src/lib/game/content/events';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { generateTrain } from '../src/lib/game/content/trains';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'stampede',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

describe('#306 — rollStampedeLosses', () => {
  it('crushes at least 1 of every present victim item', () => {
    const inv = { cookware: 1, butter_crock: 1, cheese_press: 1, flour: 100 };
    const { inventory, result } = rollStampedeLosses(inv, makeRng('s1'));
    expect(result.losses.cookware).toBeGreaterThan(0);
    expect(result.losses.butter_crock).toBeGreaterThan(0);
    expect(result.losses.cheese_press).toBeGreaterThan(0);
    // Non-victim untouched.
    expect(inventory.flour).toBe(100);
  });

  it('skips items not present', () => {
    const inv = { cookware: 1 };
    const { result } = rollStampedeLosses(inv, makeRng('s2'));
    expect(result.losses.cookware).toBeGreaterThan(0);
    expect(result.losses.butter_crock).toBeUndefined();
  });

  it('caps loss at the stack size (cant lose more than you have)', () => {
    const inv = { cookware: 1 };
    const { inventory } = rollStampedeLosses(inv, makeRng('s3'));
    expect(inventory.cookware).toBeGreaterThanOrEqual(0);
    expect(inventory.cookware).toBeLessThan(1);
  });

  it('returns empty losses when nothing vulnerable on hand', () => {
    const inv = { flour: 100 };
    const { result } = rollStampedeLosses(inv, makeRng('s4'));
    expect(Object.keys(result.losses).length).toBe(0);
  });

  it('roughly halves stacks of 2+ on a fixed seed', () => {
    // Stochastic but bounded: roll 100 trials, expected ~50% loss avg.
    let total = 0;
    let lost = 0;
    for (let i = 0; i < 100; i++) {
      const { result } = rollStampedeLosses({ cookware: 4 }, makeRng(`b${i}`));
      total += 4;
      lost += result.losses.cookware ?? 0;
    }
    const fraction = lost / total;
    expect(fraction).toBeGreaterThan(0.4);
    expect(fraction).toBeLessThan(0.7);
  });
});

describe('#306 — applyStampedeToPlayer', () => {
  it('on hit, crushes inventory + drops morale by 3 + logs (statistical)', () => {
    // 70% hit chance; out of 20 trials at least one should hit.
    let foundHit = false;
    for (let i = 0; i < 20; i++) {
      const s: GameState = {
        ...game(),
        inventory: { ...game().inventory, cookware: 1 }
      };
      const next = applyStampedeToPlayer(s, makeRng(`p${i}`));
      if (/stampede.*crushed/i.test(next.eventLog.at(-1)?.text ?? '')) {
        expect(next.morale).toBe(s.morale - 3);
        foundHit = true;
        break;
      }
    }
    expect(foundHit).toBe(true);
  });

  it('on near-miss, only −1 morale + close-call log (statistical)', () => {
    // 30% miss chance; out of 20 trials at least one should miss.
    let foundMiss = false;
    for (let i = 0; i < 20; i++) {
      const s: GameState = {
        ...game(),
        inventory: { ...game().inventory, cookware: 1 }
      };
      const next = applyStampedeToPlayer(s, makeRng(`m${i}`));
      if (/veered/i.test(next.eventLog.at(-1)?.text ?? '')) {
        expect(next.morale).toBe(s.morale - 1);
        foundMiss = true;
        break;
      }
    }
    expect(foundMiss).toBe(true);
  });
});

describe('#306 — applyStampedeToNpc', () => {
  it('crushes NPC tinware + drops NPC morale + bubbles player log on hit', () => {
    // Statistical: out of 20 trials, expect mostly hits (70%). At least
    // one trial should produce damage + bubble-up log.
    let foundHit = false;
    for (let i = 0; i < 20; i++) {
      const train = generateTrain(`stampede-npc-${i}`, 1, 'independence_mo', makeRng('npc'), { fresh: true });
      const wagon: NpcWagonState = {
        ...train.companions[0],
        inventory: { ...train.companions[0].inventory, cookware: 1 }
      };
      const result = applyStampedeToNpc(wagon, makeRng(`hit${i}`), 60);
      if (result.playerLog && /lost.*cookware/i.test(result.playerLog)) {
        expect(result.wagon.morale).toBe(wagon.morale - 3);
        foundHit = true;
        break;
      }
    }
    expect(foundHit).toBe(true);
  });

  it('70/30 hit/near-miss roll — most trials are hits but some are misses', () => {
    let hits = 0;
    let misses = 0;
    for (let i = 0; i < 100; i++) {
      const train = generateTrain(`hit-rate-${i}`, 1, 'independence_mo', makeRng('npc'), { fresh: true });
      const wagon: NpcWagonState = {
        ...train.companions[0],
        inventory: { ...train.companions[0].inventory, cookware: 5 }
      };
      const result = applyStampedeToNpc(wagon, makeRng(`r${i}`), 60);
      if (result.playerLog) hits++;
      else if (result.wagon.morale < wagon.morale) misses++;
    }
    // Bounded around 70/30 — wide tolerance for seed variance.
    expect(hits).toBeGreaterThan(50);
    expect(hits).toBeLessThan(85);
    expect(misses).toBeGreaterThan(10);
  });

  it('skips wiped/arrived/stranded companions', () => {
    const train = generateTrain('stampede-skip', 1, 'independence_mo', makeRng('npc'), { fresh: true });
    const wagon: NpcWagonState = {
      ...train.companions[0],
      outcome: 'wiped'
    };
    const result = applyStampedeToNpc(wagon, makeRng('n'), 60);
    expect(result.wagon).toBe(wagon);
    expect(result.playerLog).toBeNull();
  });

  it('returns null log when nothing crushable', () => {
    const train = generateTrain('stampede-empty', 1, 'independence_mo', makeRng('npc'), { fresh: true });
    const wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: { ...train.companions[0].inventory, cookware: 0, butter_crock: 0, cheese_press: 0 }
    };
    const result = applyStampedeToNpc(wagon, makeRng('n'), 60);
    expect(result.playerLog).toBeNull();
  });
});

describe('#306 — buffalo_stampede event registration + gating', () => {
  function findStampede() {
    return EVENTS.find((e) => e.id === 'buffalo_stampede');
  }

  it('event is registered in the catalog', () => {
    expect(findStampede()).toBeDefined();
  });

  it('gates on prairie + summer months + Platte miles + not-yet-fired this year', () => {
    const evt = findStampede()!;
    // Off-prairie: should not fire
    const inForest: GameState = {
      ...game(),
      location: { ...game().location, terrain: 'forest', milesTraveled: 400 }
    };
    expect(evt.gate?.(inForest)).toBe(false);
    // Wrong month: November (winter)
    const winter: GameState = {
      ...game(),
      date: { ...game().date, month: 11 },
      location: { ...game().location, terrain: 'prairie', milesTraveled: 400 }
    };
    expect(evt.gate?.(winter)).toBe(false);
    // Off-Platte: too early (mile 50)
    const earlyMile: GameState = {
      ...game(),
      location: { ...game().location, terrain: 'prairie', milesTraveled: 50 }
    };
    expect(evt.gate?.(earlyMile)).toBe(false);
    // All gates met
    const onPlatte: GameState = {
      ...game(),
      location: { ...game().location, terrain: 'prairie', milesTraveled: 400 }
    };
    expect(evt.gate?.(onPlatte)).toBe(true);
    // Already fired this year — gate fails
    const alreadyFired: GameState = {
      ...onPlatte,
      flags: { ...onPlatte.flags, [`_stampedeFiredYear_${onPlatte.date.year}`]: true }
    };
    expect(evt.gate?.(alreadyFired)).toBe(false);
  });

  it('apply marks the year-flag, damages player, propagates to in-train NPCs (statistical)', () => {
    // Statistical: with 70% hit on player + per-NPC, run multiple
    // seeds to ensure coverage of the train-wide propagation.
    let foundDamage = false;
    for (let trial = 0; trial < 10; trial++) {
      const baseGame = game();
      const inTrain = joinTrain(baseGame, makeRng('j')).state;
      let s: GameState = {
        ...inTrain,
        location: { ...inTrain.location, terrain: 'prairie', milesTraveled: 400 },
        inventory: { ...inTrain.inventory, cookware: 1 }
      };
      s = {
        ...s,
        wagonTrain: {
          ...s.wagonTrain!,
          companions: s.wagonTrain!.companions.map((c) => ({
            ...c,
            inventory: { ...c.inventory, cookware: 1 }
          }))
        }
      };
      const evt = findStampede()!;
      const next = evt.choices[0].apply(s, makeRng(`apply-${trial}`));
      // Year-flag always set.
      expect(next.flags[`_stampedeFiredYear_${next.date.year}`]).toBe(true);
      // Player always took at least −1 (near-miss morale debit).
      expect(next.morale).toBeLessThan(s.morale);
      // At least one NPC across the train took damage on hit trials.
      const someNpcLostCookware = next.wagonTrain!.companions.some((c) =>
        (c.inventory.cookware ?? 0) < 1
      );
      if (someNpcLostCookware) {
        foundDamage = true;
        break;
      }
    }
    expect(foundDamage).toBe(true);
  });
});

// --- Phase 2: ford / wind / mud / theft ---

describe('#306 phase 2 — rollFordLoss', () => {
  it('skips on calm fords (danger ≤ 2)', () => {
    const s = { ...game(), inventory: { ...game().inventory, cookware: 1 } };
    const result = rollFordLoss(s, 1, makeRng('calm'));
    expect(result.lossLine).toBeNull();
  });

  it('rolls on dangerous fords — finds at least one loss across trials', () => {
    let foundLoss = false;
    for (let i = 0; i < 30; i++) {
      const s = {
        ...game(),
        inventory: { ...game().inventory, cookware: 1, china_tea_set: 1 }
      };
      const result = rollFordLoss(s, 8, makeRng(`f${i}`));
      if (result.lossLine) {
        foundLoss = true;
        break;
      }
    }
    expect(foundLoss).toBe(true);
  });

  it('skips when no FORD_VICTIMS in inventory', () => {
    const s = { ...game(), inventory: { rifle: 1 } };
    // Run several trials — even forced rolls find nothing.
    for (let i = 0; i < 5; i++) {
      const result = rollFordLoss(s, 10, makeRng(`empty${i}`));
      expect(result.lossLine).toBeNull();
    }
  });
});

describe('#306 phase 2 — rollStormWindLoss', () => {
  it('rolls per the chance — finds losses across trials when items present', () => {
    let foundLoss = false;
    for (let i = 0; i < 50; i++) {
      const s = {
        ...game(),
        inventory: { ...game().inventory, tent: 1, rope: 5, tar_bucket: 1 }
      };
      const result = rollStormWindLoss(s, makeRng(`w${i}`));
      if (result.lossLine) {
        foundLoss = true;
        break;
      }
    }
    expect(foundLoss).toBe(true);
  });

  it('returns null when no WIND_VICTIMS present', () => {
    const s = { ...game(), inventory: { flour: 100, rifle: 1 } };
    const result = rollStormWindLoss(s, makeRng('wnone'));
    expect(result.lossLine).toBeNull();
  });
});

describe('#306 phase 2 — abandonHeavyLoad', () => {
  it('drops heaviest items first to hit ~80 lb shed', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, anvil: 1, china_tea_set: 1 }
    };
    const result = abandonHeavyLoad(s);
    // Anvil = 100 lb — alone clears the 80 lb threshold; china_tea_set
    // shouldn't be dropped (priority order respected).
    expect(result.state.inventory.anvil).toBe(0);
    expect(result.state.inventory.china_tea_set).toBe(1);
    expect(result.lostItems.find((l) => l.id === 'anvil')).toBeDefined();
  });

  it('drops multiple lighter items when no single heavy item available', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, china_tea_set: 1, shelf_clock: 1, feather_mattress: 1 }
    };
    const result = abandonHeavyLoad(s);
    // Total = 15+8+25 = 48 lb < 80 → drops all three trying to hit target
    expect(result.lostItems.length).toBeGreaterThan(0);
  });

  it('logs nothing-to-drop case when inventory has no abandonable items', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, flour: 0, beans: 0, cornmeal: 0, anvil: 0 }
    };
    const result = abandonHeavyLoad(s);
    expect(result.state.eventLog.at(-1)?.text).toMatch(/nothing heavy/i);
  });
});

describe('#306 phase 2 — rollDailyTheft', () => {
  it('rare per day but fires across many days', () => {
    let foundTheft = false;
    for (let i = 0; i < 1000; i++) {
      const s = {
        ...game(),
        inventory: { ...game().inventory, coffee: 5, sugar: 5, tobacco: 5 }
      };
      const result = rollDailyTheft(s, makeRng(`t${i}`));
      if (result.lossLine) {
        foundTheft = true;
        break;
      }
    }
    expect(foundTheft).toBe(true);
  });

  it('train share-watch halves the rate', () => {
    // Statistical comparison: same item set, with/without train.
    const baseInv = { coffee: 100, sugar: 100, tobacco: 100 };
    let soloThefts = 0;
    let trainThefts = 0;
    for (let i = 0; i < 5000; i++) {
      const solo: GameState = { ...game(), inventory: { ...game().inventory, ...baseInv } };
      const result1 = rollDailyTheft(solo, makeRng(`s${i}`));
      if (result1.lossLine) soloThefts++;
    }
    for (let i = 0; i < 5000; i++) {
      let train: GameState = { ...game(), inventory: { ...game().inventory, ...baseInv } };
      train = joinTrain(train, makeRng('jt')).state;
      train = { ...train, inventory: { ...train.inventory, ...baseInv } };
      const result2 = rollDailyTheft(train, makeRng(`tt${i}`));
      if (result2.lossLine) trainThefts++;
    }
    // Train rate should be roughly half (with statistical wiggle).
    expect(trainThefts).toBeLessThan(soloThefts);
    expect(trainThefts * 2).toBeGreaterThan(soloThefts * 0.5);
  });

  it('returns null when no THEFT_VICTIMS present', () => {
    const s = { ...game(), inventory: { rifle: 1 } };
    for (let i = 0; i < 100; i++) {
      const result = rollDailyTheft(s, makeRng(`empty${i}`));
      expect(result.lossLine).toBeNull();
    }
  });

  it('NPC theft mirror — fires across many trials, bubbles player log', async () => {
    const { rollNpcTheft } = await import('../src/lib/game/systems/item-loss');
    const { generateTrain } = await import('../src/lib/game/content/trains');
    const train = generateTrain('npc-theft', 1, 'independence_mo', makeRng('npc'), { fresh: true });
    let foundTheft = false;
    for (let i = 0; i < 2000; i++) {
      const result = rollNpcTheft(train.companions[0], makeRng(`nt${i}`), 30);
      if (result.playerLog) {
        expect(result.playerLog).toMatch(/lost.*overnight theft/i);
        foundTheft = true;
        break;
      }
    }
    expect(foundTheft).toBe(true);
  });

  it('NPC theft skips wiped/arrived/stranded wagons', async () => {
    const { rollNpcTheft } = await import('../src/lib/game/systems/item-loss');
    const { generateTrain } = await import('../src/lib/game/content/trains');
    const train = generateTrain('npc-theft-skip', 1, 'independence_mo', makeRng('npc'), { fresh: true });
    const wagon = { ...train.companions[0], outcome: 'wiped' as const };
    const result = rollNpcTheft(wagon, makeRng('skip'), 30);
    expect(result.wagon).toBe(wagon);
    expect(result.playerLog).toBeNull();
  });
});

describe('#306 — invariants', () => {
  it('STAMPEDE_VICTIMS is a non-empty list', () => {
    expect(STAMPEDE_VICTIMS.length).toBeGreaterThan(0);
  });

  it('STAMPEDE_LOSS_FRACTION is a sensible fraction', () => {
    expect(STAMPEDE_LOSS_FRACTION).toBeGreaterThan(0);
    expect(STAMPEDE_LOSS_FRACTION).toBeLessThanOrEqual(1);
  });
});
