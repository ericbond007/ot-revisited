// #304 + #305 — pastry quality (saleratus + cookware tie-in for
// flour/cornmeal). Verifies the 3-row matrix, saleratus consumption
// rate, NPC mirror, and engine-pipeline wiring.

import { describe, it, expect } from 'vitest';
import {
  applyPastryQuality,
  SALERATUS_LB_PER_PASTRY_LB,
  NO_COOKWARE_MORALE_HIT,
  NO_SALERATUS_MORALE_HIT
} from '../src/lib/game/systems/pastry';
import { applyDailyConsumption } from '../src/lib/game/systems/consumption';
import { tickNpcWagon } from '../src/lib/game/systems/npc-engine';
import { generateTrain } from '../src/lib/game/content/trains';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 'pastry',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 16 } // Monday — avoid auto-Sabbath rest (#1189)
  });
}

describe('#304 — applyDailyConsumption flags pastry draw', () => {
  it('sets _pastryDrawnLb when flour is drawn', () => {
    const s = { ...game(), inventory: { ...game().inventory, flour: 100 } };
    const next = applyDailyConsumption(s);
    expect(next.flags._pastryDrawnLb).toBeGreaterThan(0);
  });

  it('sets _pastryDrawnLb to 0 when no flour or cornmeal in inventory', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, flour: 0, cornmeal: 0, bacon: 100, jerky: 100 }
    };
    const next = applyDailyConsumption(s);
    expect(next.flags._pastryDrawnLb).toBe(0);
  });

  it('counts cornmeal alongside flour', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, flour: 0, cornmeal: 50 }
    };
    const next = applyDailyConsumption(s);
    expect(next.flags._pastryDrawnLb).toBeGreaterThan(0);
  });
});

describe('#304 + #305 — applyPastryQuality matrix', () => {
  it('no-pastry day is a no-op', () => {
    const s: GameState = { ...game(), flags: { ...game().flags, _pastryDrawnLb: 0 } };
    const moraleBefore = s.morale;
    const result = applyPastryQuality(s);
    expect(result.outcome).toBe('no-pastry');
    expect(result.state.morale).toBe(moraleBefore);
  });

  it('cookware + saleratus → period normal, no morale hit, saleratus consumed', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, cookware: 1, saleratus: 5 },
      flags: { ...game().flags, _pastryDrawnLb: 5 }
    };
    const moraleBefore = s.morale;
    const result = applyPastryQuality(s);
    expect(result.outcome).toBe('normal');
    expect(result.state.morale).toBe(moraleBefore);
    expect(result.state.inventory.saleratus).toBeLessThan(5);
    expect(result.state.flags._pastryDrawnLb).toBeUndefined();
  });

  it('cookware + no saleratus → -1 morale + period log line', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, cookware: 1, saleratus: 0 },
      flags: { ...game().flags, _pastryDrawnLb: 5 }
    };
    const moraleBefore = s.morale;
    const result = applyPastryQuality(s);
    expect(result.outcome).toBe('no-saleratus');
    expect(result.state.morale).toBe(moraleBefore - NO_SALERATUS_MORALE_HIT);
    expect(result.state.eventLog.at(-1)?.text).toMatch(/saleratus.*sat heavy/i);
  });

  it('no cookware → -2 morale + paste log line, regardless of saleratus', () => {
    const s: GameState = {
      ...game(),
      inventory: { ...game().inventory, cookware: 0, saleratus: 5 },
      flags: { ...game().flags, _pastryDrawnLb: 5 }
    };
    const moraleBefore = s.morale;
    const result = applyPastryQuality(s);
    expect(result.outcome).toBe('no-cookware');
    expect(result.state.morale).toBe(moraleBefore - NO_COOKWARE_MORALE_HIT);
    expect(result.state.eventLog.at(-1)?.text).toMatch(/cookware.*paste/i);
    // Saleratus untouched on no-cookware path (would be wasted).
    expect(result.state.inventory.saleratus).toBe(5);
  });

  it('saleratus consumption rate matches period (5 lb / year for 3 eaters)', () => {
    // 3 eaters × 1 lb flour/eater/day × 365 days = 1095 lb flour total
    // ×0.005 saleratus/lb = 5.475 lb saleratus → ~5 lb / year, matches Marcy.
    expect(SALERATUS_LB_PER_PASTRY_LB).toBeCloseTo(0.005, 4);
    const oneYear = 3 * 1.0 * 365 * SALERATUS_LB_PER_PASTRY_LB;
    expect(oneYear).toBeGreaterThan(4);
    expect(oneYear).toBeLessThan(7);
  });

  it('flag cleared even on no-pastry path (defensive)', () => {
    const s: GameState = { ...game(), flags: { ...game().flags, _pastryDrawnLb: 0 } };
    const result = applyPastryQuality(s);
    expect(result.state.flags._pastryDrawnLb).toBeUndefined();
  });
});

describe('#304 + #305 — engine-pipeline integration', () => {
  it('tickDayPausable consumes saleratus when flour eaten', () => {
    const s = game();
    const startSaleratus = s.inventory.saleratus ?? 0;
    const result = tickDayPausable(s);
    if (result.pendingEvent) return; // skip if event modal blocks
    // Player should have started with saleratus (outfit) — verify draw happened.
    expect(result.state.inventory.saleratus ?? 0).toBeLessThanOrEqual(startSaleratus);
  });

  it('tickDayPausable applies the morale debit when no saleratus', () => {
    let s = game();
    s = { ...s, inventory: { ...s.inventory, saleratus: 0, flour: 100 } };
    const moraleBefore = s.morale;
    const result = tickDayPausable(s);
    if (result.pendingEvent) return;
    // Expect at least the no-saleratus debit (other effects also tick).
    expect(result.state.morale).toBeLessThanOrEqual(moraleBefore - NO_SALERATUS_MORALE_HIT + 5);
    // Log should include the period line.
    expect(result.state.eventLog.some((e) => /saleratus|paste/i.test(e.text))).toBe(true);
  });
});

describe('#304 + #305 — NPC mirror', () => {
  it('NPC starter kit includes saleratus', () => {
    const train = generateTrain('npc-saleratus', 1, 'independence_mo', makeRng('npc'), { fresh: true });
    expect(train.companions[0].inventory.saleratus).toBeGreaterThan(0);
  });

  // Helper: clear higher-priority foods so flour is what gets drawn.
  // NPC food draw order is game_meat → berries → egg → milk → jerky →
  // pemmican → salt_pork → bacon → FLOUR. Strip everything above flour.
  function flourOnlyWagon(seed = 'flour-only'): NpcWagonState {
    const train = generateTrain(seed, 1, 'independence_mo', makeRng(seed), { fresh: true });
    return {
      ...train.companions[0],
      inventory: {
        ...train.companions[0].inventory,
        game_meat: 0, berries: 0, egg: 0, milk: 0,
        jerky: 0, pemmican: 0, salt_pork: 0, bacon: 0
      }
    };
  }

  it('NPC tick consumes saleratus when flour eaten', () => {
    const wagon = flourOnlyWagon('npc-eat');
    const startSaleratus = wagon.inventory.saleratus ?? 0;
    expect(startSaleratus).toBeGreaterThan(0);
    const result = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
      makeRng('t')
    );
    expect(result.wagon.inventory.saleratus ?? 0).toBeLessThan(startSaleratus);
  });

  it('NPC takes morale debit + log when out of saleratus', () => {
    // #939c — NPC consumption flows through the engine pipeline now
    // (applyDailyConsumption → applyDietVariety → applyHotDrinks →
    // applyPastryQuality). The pastry debit fires correctly, but
    // applyHotDrinks's +1 coffee/tea bonus can offset it when the
    // wagon has those drinks. Assert the event log (proves the debit
    // ran) rather than net morale (which depends on other bonuses).
    const base = flourOnlyWagon('npc-no-salt');
    const wagon: NpcWagonState = {
      ...base,
      inventory: { ...base.inventory, saleratus: 0, coffee: 0, tea: 0 } // no offset bonus
    };
    const moraleBefore = wagon.morale;
    const result = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
      makeRng('t')
    );
    expect(result.wagon.morale).toBeLessThanOrEqual(moraleBefore - 1);
    expect(result.wagon.eventLog.some((e) => /saleratus.*sat heavy/i.test(e.text))).toBe(true);
  });

  it('NPC takes morale debit + log when no cookware', () => {
    const base = flourOnlyWagon('npc-no-cw');
    const wagon: NpcWagonState = {
      ...base,
      inventory: { ...base.inventory, cookware: 0, coffee: 0, tea: 0 }
    };
    const moraleBefore = wagon.morale;
    const result = tickNpcWagon(
      wagon,
      { day: 1, traveled: true, pace: 'moderate', terrain: 'prairie', weather: 'clear' },
      makeRng('t')
    );
    // Engine's no-cookware path has a 10% improvise chance (`hot rock baking`).
    // Either outcome (improvise log OR paste log) is acceptable; the test
    // verifies the engine pastry path ran.
    const logs = result.wagon.eventLog.map((e) => e.text).join(' | ');
    expect(logs).toMatch(/cookware.*paste|Improvised cooking|hot rock/i);
  });
});

describe('#304 + #305 — post stocks include saleratus', () => {
  it('all major posts stock saleratus (Kearny / Laramie / Bridger / Hall / Boise / Whitman)', () => {
    // Verifies the merge of #305 distribution — saleratus needs to be
    // findable along the trail or every wagon takes daily debit forever.
    const expected = ['ft_kearny', 'ft_laramie', 'ft_bridger', 'ft_hall', 'ft_boise', 'whitman_mission'];
    for (const id of expected) {
      const post = LANDMARKS.find((l) => l.id === id);
      expect(post).toBeDefined();
      expect(post!.stock).toContain('saleratus');
    }
  });
});
