// #306 phase 1 — buffalo stampede item-loss tests. Verifies the
// stampede roller, player-side damage, NPC propagation, train-wide
// event apply, and one-shot-per-year gating.

import { describe, it, expect } from 'vitest';
import {
  rollStampedeLosses,
  applyStampedeToPlayer,
  applyStampedeToNpc,
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
  it('crushes inventory, drops morale by 3, logs', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, cookware: 1 }
    };
    const moraleBefore = s.morale;
    const next = applyStampedeToPlayer(s, makeRng('p'));
    expect(next.morale).toBe(moraleBefore - 3);
    expect(next.eventLog.at(-1)?.text).toMatch(/stampede.*crushed/i);
  });

  it('logs the no-loss case when nothing vulnerable', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, cookware: 0, butter_crock: 0, cheese_press: 0 }
    };
    const next = applyStampedeToPlayer(s, makeRng('p2'));
    expect(next.eventLog.at(-1)?.text).toMatch(/nothing crushed/i);
    // Still takes the morale hit — period: the herd was terrifying.
    expect(next.morale).toBeLessThan(s.morale);
  });
});

describe('#306 — applyStampedeToNpc', () => {
  it('crushes NPC tinware + drops NPC morale + bubbles player log', () => {
    const train = generateTrain('stampede-npc', 1, 'independence_mo', makeRng('npc'), { fresh: true });
    const wagon: NpcWagonState = {
      ...train.companions[0],
      inventory: { ...train.companions[0].inventory, cookware: 1 }
    };
    const moraleBefore = wagon.morale;
    const result = applyStampedeToNpc(wagon, makeRng('n'), 60);
    expect(result.wagon.morale).toBe(moraleBefore - 3);
    expect(result.playerLog).toMatch(/lost.*cookware/i);
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

  it('apply marks the year-flag, damages player, propagates to in-train NPCs', () => {
    const baseGame = game();
    const inTrain = joinTrain(baseGame, makeRng('j')).state;
    let s: GameState = {
      ...inTrain,
      location: { ...inTrain.location, terrain: 'prairie', milesTraveled: 400 },
      inventory: { ...inTrain.inventory, cookware: 1 }
    };
    // Seed NPCs with cookware to ensure they have something to lose.
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
    const next = evt.choices[0].apply(s, makeRng('apply'));
    // Year-flag set (one-shot guard).
    expect(next.flags[`_stampedeFiredYear_${next.date.year}`]).toBe(true);
    // Player took damage.
    expect(next.morale).toBeLessThan(s.morale);
    // At least one NPC took damage (cookware lost).
    const someNpcLostCookware = next.wagonTrain!.companions.some((c) =>
      (c.inventory.cookware ?? 0) < 1
    );
    expect(someNpcLostCookware).toBe(true);
    // Player log includes train-wide bubble-up entries.
    expect(next.eventLog.some((e) => /stampede/i.test(e.text))).toBe(true);
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
