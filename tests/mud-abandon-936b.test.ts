// #936b — stuck-in-mud two-step abandonment.
//
//   - Engine: `abandonSelected` (player path), `abandonHeavyLoad` with a
//     custom persona priority (NPC/bot auto path), `droppableHeavyItems`.
//   - Event: the `abandon_load` choice sets `_mudAbandonPending` and does
//     NOT mutate inventory (the modal / NPC handler resolves it).
//   - Persona: per-character `mudAbandonmentPriority()` drop orders.
//   - NPC/bot wiring: resolving the flag via the persona's order keeps
//     a lighter-priority item when a heavier drop already breaks free.

import { describe, it, expect } from 'vitest';
import {
  abandonHeavyLoad,
  abandonSelected,
  droppableHeavyItems,
  MUD_SHED_TARGET
} from '../src/lib/game/systems/item-loss';
import { EVENTS } from '../src/lib/game/content/events';
import { resolveEvent } from '../src/lib/game/systems/events';
import {
  drinkerPersona,
  faithfulPersona,
  generousPersona,
  hoarderPersona,
  cautiousPersona,
  balancedPersona
} from '../src/lib/game/ai/personas';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'mud-936b',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

describe('#936b — abandonSelected (player path)', () => {
  it('drops exactly the chosen stacks, full-stack each, and logs a summary', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, anvil: 1, china_tea_set: 2, flour: 100 }
    };
    const result = abandonSelected(s, ['anvil', 'china_tea_set']);
    expect(result.state.inventory.anvil).toBe(0);
    expect(result.state.inventory.china_tea_set).toBe(0);
    // Untouched — not in the chosen list.
    expect(result.state.inventory.flour).toBe(100);
    expect(result.lostItems.map((l) => l.id).sort()).toEqual(['anvil', 'china_tea_set']);
    expect(result.state.eventLog.at(-1)?.text).toMatch(/Abandoned .* broke free/i);
  });

  it('logs the nothing-dropped case when given items not in inventory', () => {
    const s: GameState = { ...game(), inventory: { ...game().inventory, anvil: 0 } };
    const result = abandonSelected(s, ['anvil']);
    expect(result.lostItems).toHaveLength(0);
    expect(result.state.eventLog.at(-1)?.text).toMatch(/nothing dropped/i);
  });
});

describe('#936b — abandonHeavyLoad honors a custom priority', () => {
  it('drops in the supplied order, not the const order', () => {
    const s: GameState = {
      ...game(),
      // Both clear 80 lb alone; const order would take anvil first.
      inventory: { ...game().inventory, anvil: 1, grandfather_clock: 1 }
    };
    const custom = abandonHeavyLoad(s, ['grandfather_clock', 'anvil']);
    expect(custom.state.inventory.grandfather_clock).toBe(0);
    // Clock (100 lb) alone cleared the target — anvil stays.
    expect(custom.state.inventory.anvil).toBe(1);

    const def = abandonHeavyLoad(s);
    // Default const order leads with anvil.
    expect(def.state.inventory.anvil).toBe(0);
    expect(def.state.inventory.grandfather_clock).toBe(1);
  });

  it('falls back to the const tail for items the custom list omits', () => {
    const s: GameState = {
      ...game(),
      // Custom list only mentions a light item; engine must still drain
      // the const tail to break free.
      inventory: { ...game().inventory, anvil: 1, shelf_clock: 1 }
    };
    const result = abandonHeavyLoad(s, ['shelf_clock']);
    // shelf_clock (25 lb) < 80 → const tail kicks in → anvil dropped too.
    expect(result.state.inventory.shelf_clock).toBe(0);
    expect(result.state.inventory.anvil).toBe(0);
  });
});

describe('#936b — droppableHeavyItems', () => {
  it('excludes essential survival gear and sorts heaviest-first', () => {
    const s: GameState = {
      ...game(),
      inventory: {
        ...game().inventory,
        anvil: 1,            // 80 lb
        china_tea_set: 1,    // 25 lb
        whiskey: 2,          // comfort extra, 4 lb each = 8 lb
        lead_balls: 200,     // essential ammo — must NOT appear
        quinine: 5           // essential medicine — must NOT appear
      }
    };
    const rows = droppableHeavyItems(s);
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('anvil');
    expect(ids).toContain('china_tea_set');
    expect(ids).toContain('whiskey');
    expect(ids).not.toContain('lead_balls');
    expect(ids).not.toContain('quinine');
    // Heaviest-first.
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].weightLb).toBeGreaterThanOrEqual(rows[i].weightLb);
    }
    // Canonical catalog weight (anvil = 80 lb/unit × 1).
    expect(rows.find((r) => r.id === 'anvil')?.weightLb).toBe(80);
  });

  it('omits zero-qty stacks', () => {
    const s: GameState = { ...game(), inventory: { ...game().inventory, anvil: 0 } };
    expect(droppableHeavyItems(s).map((r) => r.id)).not.toContain('anvil');
  });
});

describe('#936b — abandon_load event choice defers (no inventory mutation)', () => {
  it('sets _mudAbandonPending and leaves inventory untouched', () => {
    const ev = EVENTS.find((e) => e.id === 'wagon_stuck')!;
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, anvil: 1, grandfather_clock: 1 }
    };
    const before = { ...s.inventory };
    const after = resolveEvent(s, ev, 'abandon_load', makeRng('x'));
    expect(after.flags._mudAbandonPending).toBe(true);
    expect(after.inventory).toEqual(before);
  });
});

describe('#936b — persona mudAbandonmentPriority character', () => {
  it('drinker keeps whiskey AFTER bible (bottle dumped last)', () => {
    const order = drinkerPersona.mudAbandonmentPriority!();
    expect(order.indexOf('bible')).toBeLessThan(order.indexOf('whiskey'));
  });

  it('faithful drops whiskey BEFORE bible (drink first, Word last)', () => {
    const order = faithfulPersona.mudAbandonmentPriority!();
    expect(order.indexOf('whiskey')).toBeLessThan(order.indexOf('bible'));
  });

  it('generous keeps china_tea_set later than anvil (hospitality)', () => {
    const order = generousPersona.mudAbandonmentPriority!();
    expect(order.indexOf('anvil')).toBeLessThan(order.indexOf('china_tea_set'));
  });

  it('hoarder keeps spare parts + food after the luxuries', () => {
    const order = hoarderPersona.mudAbandonmentPriority!();
    expect(order.indexOf('china_tea_set')).toBeLessThan(order.indexOf('wheel'));
    expect(order.indexOf('china_tea_set')).toBeLessThan(order.indexOf('flour'));
  });

  it('cautious keeps wagon-integrity spares for last (Tabitha Brown)', () => {
    const order = cautiousPersona.mudAbandonmentPriority!();
    expect(order.indexOf('china_tea_set')).toBeLessThan(order.indexOf('wheel'));
    expect(order.indexOf('flour')).toBeLessThan(order.indexOf('axle'));
  });

  it('balanced has no override (engine const fallback)', () => {
    expect(balancedPersona.mudAbandonmentPriority).toBeUndefined();
  });
});

describe('#936b — NPC/bot auto path uses persona drop order', () => {
  // Mirrors the npc-engine / bot-runner wiring: resolve the event flag,
  // then run abandonHeavyLoad with the persona's order.
  function resolveStuckWithPersona(
    s: GameState,
    order: readonly string[] | undefined
  ): GameState {
    const ev = EVENTS.find((e) => e.id === 'wagon_stuck')!;
    let ticked = resolveEvent(s, ev, 'abandon_load', makeRng('npc'));
    expect(ticked.flags._mudAbandonPending).toBe(true);
    ticked = abandonHeavyLoad(ticked, order).state;
    const flags = { ...ticked.flags };
    delete (flags as Record<string, unknown>)._mudAbandonPending;
    return { ...ticked, flags };
  }

  it('drinker wagon keeps whiskey when a lighter drop already frees it', () => {
    const s: GameState = {
      ...game(),
      // anvil (80 lb) alone meets the 80 lb target; drinker's order
      // leads with bible — drinker keeps the bottle.
      inventory: { ...game().inventory, bible: 1, anvil: 1, whiskey: 3 }
    };
    const out = resolveStuckWithPersona(s, drinkerPersona.mudAbandonmentPriority!());
    expect(out.inventory.whiskey).toBe(3);
    expect(out.inventory.bible).toBe(0);
    expect(out.flags._mudAbandonPending).toBeUndefined();
  });

  it('default (no persona override) uses the engine const order', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, anvil: 1, grandfather_clock: 1 }
    };
    const out = resolveStuckWithPersona(s, balancedPersona.mudAbandonmentPriority?.());
    // Const order leads with anvil.
    expect(out.inventory.anvil).toBe(0);
    expect(out.inventory.grandfather_clock).toBe(1);
  });

  it('shed total meets the mud target', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, anvil: 1 }
    };
    const out = resolveStuckWithPersona(s, undefined);
    // anvil = 80 lb, exactly MUD_SHED_TARGET — breaks free.
    expect(MUD_SHED_TARGET).toBe(80);
    expect(out.inventory.anvil).toBe(0);
  });
});
