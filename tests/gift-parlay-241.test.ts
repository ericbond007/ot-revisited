import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';
import {
  hasGiftedTribe,
  markGiftedTribe,
  getTribeAttitude
} from '../src/lib/game/systems/tribe-relations';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'gift-241',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor', sex: 'female' }],
    startDate: { year: 1849, month: 6, day: 1 }
  });
  return { ...s, ...over };
}

/** Park the party squarely in Shoshone country (mile 800-1200). */
function inShoshoneRegion(s: GameState): GameState {
  return { ...s, location: { ...s.location, milesTraveled: 1000 } };
}

const tradeEvent = () => EVENTS.find((e) => e.id === 'encounter_native_trade')!;
const giftChoice = () => tradeEvent().choices.find((c) => c.id === 'gift_smoke_first')!;

describe('#241 gift flag helpers', () => {
  it('hasGiftedTribe is false by default', () => {
    expect(hasGiftedTribe(newGame(), 'shoshone')).toBe(false);
  });

  it('markGiftedTribe sets a per-tribe flag', () => {
    const after = markGiftedTribe(newGame(), 'shoshone');
    expect(hasGiftedTribe(after, 'shoshone')).toBe(true);
    expect(hasGiftedTribe(after, 'cheyenne')).toBe(false);
  });

  it('marking is idempotent', () => {
    const a = markGiftedTribe(newGame(), 'shoshone');
    const b = markGiftedTribe(a, 'shoshone');
    expect(hasGiftedTribe(b, 'shoshone')).toBe(true);
  });
});

describe('#241 gift_smoke_first choice — registration', () => {
  it('the gift choice is on the trade encounter', () => {
    expect(giftChoice()).toBeDefined();
    expect(giftChoice().label).toMatch(/smoke/i);
  });
});

describe('#241 gift_smoke_first — hidden gating', () => {
  it('hidden when below 3 tobacco', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 2 }
    });
    expect(giftChoice().hidden!(s)).toBe(true);
  });

  it('shown with 3+ tobacco in Shoshone country', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 3 }
    });
    expect(giftChoice().hidden!(s)).toBe(false);
  });

  it('hidden when the only tribe at this mile has already been gifted', () => {
    let s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 }
    });
    s = markGiftedTribe(s, 'shoshone');
    expect(giftChoice().hidden!(s)).toBe(true);
  });

  it('hidden outside any friendly tribe region', () => {
    const s: GameState = {
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 },
      location: { ...newGame().location, milesTraveled: 50 }  // No tribes at mile 50
    };
    expect(giftChoice().hidden!(s)).toBe(true);
  });
});

describe('#241 gift_smoke_first — apply', () => {
  it('deducts 3 tobacco total (2 gift + 1 trade)', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 }
    });
    const after = giftChoice().apply(s, makeRng('gift-tobacco'));
    expect(after.inventory.tobacco).toBe(2);
  });

  it('grants 12 lb pemmican (gift-first base rate)', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5, pemmican: 0 }
    });
    const after = giftChoice().apply(s, makeRng('gift-pemmican'));
    expect(after.inventory.pemmican).toBe(12);
  });

  it('Indian Trader stacks to 16 lb pemmican', () => {
    let s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 }
    });
    s = { ...s, party: s.party.map((m, i) => i === 0 ? { ...m, profession: 'indian_trader' } : m) };
    const after = giftChoice().apply(s, makeRng('gift-trader'));
    expect(after.inventory.pemmican).toBe(16);
  });

  it('bumps tribe attitude by +6', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 }
    });
    const before = getTribeAttitude(s, 'shoshone');
    const after = giftChoice().apply(s, makeRng('gift-att'));
    expect(getTribeAttitude(after, 'shoshone')).toBe(before + 6);
  });

  it('sets the per-tribe gift flag', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 }
    });
    expect(hasGiftedTribe(s, 'shoshone')).toBe(false);
    const after = giftChoice().apply(s, makeRng('gift-flag'));
    expect(hasGiftedTribe(after, 'shoshone')).toBe(true);
  });

  it('logs the smoke-and-trade line', () => {
    const s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 5 }
    });
    const after = giftChoice().apply(s, makeRng('gift-log'));
    // Two new log entries land: the trade line, then a news entry.
    const allText = after.eventLog.map((e) => e.text).join('\n');
    expect(allText).toMatch(/pipe/i);
    expect(allText).toMatch(/Shoshone/i);
  });

  it('one-shot — re-applying picks a different tribe or no-ops', () => {
    let s = inShoshoneRegion({
      ...newGame(),
      inventory: { ...newGame().inventory, tobacco: 10 }
    });
    s = giftChoice().apply(s, makeRng('gift-once'));
    expect(hasGiftedTribe(s, 'shoshone')).toBe(true);
    // Second apply at the same mile (only Shoshone here) should bail
    // because the only candidate tribe is already gifted.
    const tobaccoBefore = s.inventory.tobacco ?? 0;
    const again = giftChoice().apply(s, makeRng('gift-once-2'));
    expect(again.inventory.tobacco).toBe(tobaccoBefore);
    const last = again.eventLog[again.eventLog.length - 1].text;
    expect(last).toMatch(/no new tribe/i);
  });
});
