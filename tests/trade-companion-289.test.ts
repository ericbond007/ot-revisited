// #289 — inter-wagon trading at rest stops.

import { describe, it, expect } from 'vitest';
import { tradeWithCompanion } from '../src/lib/game/actions/trade-companion';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function game(): GameState {
  return createInitialState({
    seed: 't289',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function inTrain(): GameState {
  return joinTrain(game(), makeRng('j289')).state;
}

describe('tradeWithCompanion (#289)', () => {
  it('throws when player is not in a train', () => {
    expect(() =>
      tradeWithCompanion(game(), 'wagon-0', { give: [{ item: 'flour', qty: 10 }] })
    ).toThrow(/not in a wagon train/);
  });

  it('throws when wagonId is unknown', () => {
    expect(() =>
      tradeWithCompanion(inTrain(), 'wagon-9999', { give: [{ item: 'flour', qty: 1 }] })
    ).toThrow(/no wagon/);
  });

  it('throws when player lacks offered items', () => {
    const s = { ...inTrain(), inventory: { ...inTrain().inventory, flour: 0 } };
    expect(() =>
      tradeWithCompanion(s, s.wagonTrain!.companions[0].id, { give: [{ item: 'flour', qty: 50 }] })
    ).toThrow(/lacks offered items/);
  });

  it('player lacking cash throws', () => {
    const s = { ...inTrain(), cash: 0 };
    expect(() =>
      tradeWithCompanion(s, s.wagonTrain!.companions[0].id, { giveCash: 50, take: [{ item: 'flour', qty: 10 }] })
    ).toThrow(/lacks offered cash/);
  });

  it('declines (not throws) when wagon lacks the take items', () => {
    const s0 = inTrain();
    const wagonId = s0.wagonTrain!.companions[0].id;
    const s: GameState = {
      ...s0,
      wagonTrain: {
        ...s0.wagonTrain!,
        companions: s0.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: {} as Record<string, number> } : c
        )
      }
    };
    const r = tradeWithCompanion(s, wagonId, {
      take: [{ item: 'flour', qty: 5 }]
    });
    expect(r.accepted).toBe(false);
    expect(r.declineReason).toMatch(/doesn't have/i);
  });

  it('accepts a fair barter and atomically swaps items', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    // Fair barter: 50 lb flour ($0.20/lb = $10) for 2 quinine ($4 buy = $8).
    // Player gives $10, NPC gives $8 → ratio 1.25, well within tolerance.
    const s0: GameState = {
      ...s,
      inventory: { ...s.inventory, flour: 200 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, quinine: 10 }, morale: 75 } : c
        )
      }
    };
    const playerQuinineBefore = s0.inventory.quinine ?? 0;
    const wagonFlourBefore = s0.wagonTrain!.companions[0].inventory.flour ?? 0;
    const r = tradeWithCompanion(s0, wagonId, {
      give: [{ item: 'flour', qty: 50 }],
      take: [{ item: 'quinine', qty: 2 }]
    });
    expect(r.accepted).toBe(true);
    expect(r.state.inventory.flour).toBe(150);
    expect(r.state.inventory.quinine).toBe(playerQuinineBefore + 2);
    expect(r.state.wagonTrain!.companions[0].inventory.flour).toBe(wagonFlourBefore + 50);
    expect(r.state.wagonTrain!.companions[0].inventory.quinine).toBe(8);
  });

  it('accepts a pure gift and lifts wagon morale', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    const baselineMorale = s.wagonTrain!.companions[0].morale;
    const r = tradeWithCompanion(s, wagonId, {
      give: [{ item: 'flour', qty: 20 }]
    });
    expect(r.accepted).toBe(true);
    expect(r.state.wagonTrain!.companions[0].morale).toBeGreaterThan(baselineMorale);
    expect(r.state.wagonTrain!.companions[0].inventory.flour).toBeGreaterThan(0);
  });

  it('declines a heavily lopsided barter', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    const s0: GameState = {
      ...s,
      inventory: { ...s.inventory, flour: 200 },
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, quinine: 20 }, morale: 60 } : c
        )
      }
    };
    // 1 lb flour ($0.20) for 10 quinine ($20) — comically lopsided.
    const r = tradeWithCompanion(s0, wagonId, {
      give: [{ item: 'flour', qty: 1 }],
      take: [{ item: 'quinine', qty: 10 }]
    });
    expect(r.accepted).toBe(false);
    expect(r.declineReason).toBeDefined();
  });

  it('hostile-morale wagon refuses everything except food gifts to hungry mouths', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    // Mark companion as hostile (morale 10) and well-fed.
    const s0: GameState = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, morale: 10, inventory: { flour: 200 } as Record<string, number> } : c
        )
      }
    };
    const r = tradeWithCompanion(s0, wagonId, {
      give: [{ item: 'flour', qty: 10 }]
    });
    expect(r.accepted).toBe(false);
    expect(r.declineReason).toMatch(/want nothing/i);
  });

  it('hostile-but-hungry wagon accepts food gifts', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    const s0: GameState = {
      ...s,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, morale: 10, inventory: {} as Record<string, number> } : c
        )
      }
    };
    const r = tradeWithCompanion(s0, wagonId, {
      give: [{ item: 'flour', qty: 30 }]
    });
    expect(r.accepted).toBe(true);
  });

  it('logs trade summary on both player and wagon eventLogs when accepted', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    const r = tradeWithCompanion(s, wagonId, {
      give: [{ item: 'flour', qty: 20 }]
    });
    expect(r.accepted).toBe(true);
    const playerLogTail = r.state.eventLog.at(-1)!;
    const wagonLogTail = r.state.wagonTrain!.companions[0].eventLog.at(-1)!;
    expect(playerLogTail.text).toMatch(/traded/i);
    expect(wagonLogTail.text).toMatch(/traded/i);
  });

  it('cash flows correctly in both directions', () => {
    const s = inTrain();
    const wagonId = s.wagonTrain!.companions[0].id;
    // Player pays $5 for 20 lb flour from companion — fair (flour = $0.20/lb × 20 = $4).
    const s0: GameState = {
      ...s,
      cash: 50,
      wagonTrain: {
        ...s.wagonTrain!,
        companions: s.wagonTrain!.companions.map((c, i) =>
          i === 0 ? { ...c, inventory: { ...c.inventory, flour: 100 }, cash: 100, morale: 75 } : c
        )
      }
    };
    const r = tradeWithCompanion(s0, wagonId, {
      giveCash: 5,
      take: [{ item: 'flour', qty: 20 }]
    });
    expect(r.accepted).toBe(true);
    expect(r.state.cash).toBe(45);
    expect(r.state.wagonTrain!.companions[0].cash).toBe(105);
  });
});
