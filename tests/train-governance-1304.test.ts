// #1304 Task 1 — Crisis hold = 1 day, then sick wagons drop behind.
// Historical basis: whole-company halts were ~1 day (death-watch / burial).
// Week-long convalescence was family-scale — the sick wagon dropped behind.
// Bishop 1849 / Stout 1853 via docs/superpowers/specs/2026-06-11-train-governance-research.md.

import { describe, it, expect } from 'vitest';
import { companyRestDecision } from '../src/lib/game/systems/company-rest';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState, NpcWagonState } from '../src/lib/game/types';

// ── Shared factory ─────────────────────────────────────────────────────────

/** Build a GameState in a wagon train with configurable party + companion HP. */
function withTrain(opts: {
  playerHP?: number;
  companions?: { hp: number; id?: string }[];
}): GameState {
  const { playerHP = 80, companions = [{ hp: 80 }] } = opts;
  const s = createInitialState({
    seed: 'gov1304', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 18 } // Monday — no Sabbath
  });
  const companionWagons: NpcWagonState[] = companions.map((c, i) => ({
    id: c.id ?? `w${i}`,
    name: `the ${['Sager', 'Brown', 'Miller', 'Davis'][i] ?? 'Smith'} family`,
    leaderProfession: 'farmer' as const,
    hasChildren: false,
    seed: `w${i}seed`,
    eventLog: [],
    outcome: 'in-progress' as const,
    rations: 'normal' as const,
    water: 10,
    dirtyWater: 0,
    waterCap: 20,
    dryDays: 0,
    morale: 70,
    cash: 100,
    inventory: {},
    wagon: s.wagon,
    oxen: s.oxen,
    party: [{
      id: `p${i}`,
      name: `M${i}`,
      health: c.hp,
      dead: false,
      conditions: [],
      age: 30,
      sex: 'male' as const,
      kind: 'adult' as const,
      isLeader: true
    }]
  }));
  return {
    ...s,
    party: s.party.map((m) => ({ ...m, health: playerHP })),
    wagonTrain: {
      id: 'train-gov1304',
      name: 'Test Company',
      joinedDay: 1,
      joinedAtLandmarkId: null,
      leaderId: 'npc',
      doctrine: 'prudent' as const,
      companions: companionWagons,
      companyDecisionBlock: undefined
    }
  };
}

// ── §1 — Day 1 of NPC-wagon crisis: crisis_layby ───────────────────────────

describe('#1304 T1 — day 1 NPC-wagon crisis → crisis_layby', () => {
  it('first tick with an NPC companion member at 10 HP → crisis_layby', () => {
    const s = withTrain({ playerHP: 80, companions: [{ hp: 10, id: 'sick-w' }] });
    // no existing block → fresh crisis fires
    const d = companyRestDecision(s);
    expect(d.mode).toBe('crisis_layby');
  });

  it('crisis reason names the HP', () => {
    const s = withTrain({ companions: [{ hp: 10 }] });
    const d = companyRestDecision(s);
    expect(d.reason).toMatch(/10/);
  });
});

// ── §2 — Second tick with persisting NPC crisis → travel + dropWagonIds ───

describe('#1304 T1 — after 1-day hold, sick NPC wagons drop behind', () => {
  it('crisis block held ≥ CRISIS_HOLD_DAYS (1) with NPC in crisis → travel + dropWagonIds', () => {
    // Stamp a crisis block that started yesterday (day 10, current day 11 → held = 1).
    const base = withTrain({ playerHP: 80, companions: [{ hp: 10, id: 'sick-w' }] });
    const held = {
      ...base,
      day: 11,
      wagonTrain: {
        ...base.wagonTrain!,
        companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 }
      }
    };
    const d = companyRestDecision(held);
    expect(d.mode).toBe('travel');
    expect(d.dropWagonIds).toBeDefined();
    expect(d.dropWagonIds).toContain('sick-w');
  });

  it('healthy companion wagons are NOT in dropWagonIds', () => {
    const base = withTrain({
      playerHP: 80,
      companions: [
        { hp: 10, id: 'sick-w' },
        { hp: 80, id: 'healthy-w' }
      ]
    });
    const held = {
      ...base,
      day: 11,
      wagonTrain: {
        ...base.wagonTrain!,
        companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 }
      }
    };
    const d = companyRestDecision(held);
    expect(d.mode).toBe('travel');
    expect(d.dropWagonIds).toContain('sick-w');
    expect(d.dropWagonIds).not.toContain('healthy-w');
  });
});

// ── §3 — Player-party-only crisis → travel, no dropWagonIds ───────────────

describe('#1304 T1 — player-only crisis after 1-day hold → travel, no dropWagonIds', () => {
  it('player HP 10, all NPC wagons healthy → after hold, travel with no dropWagonIds', () => {
    const base = withTrain({ playerHP: 10, companions: [{ hp: 80 }] });
    const held = {
      ...base,
      day: 11,
      wagonTrain: {
        ...base.wagonTrain!,
        companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 }
      }
    };
    const d = companyRestDecision(held);
    expect(d.mode).toBe('travel');
    // The company will not wait — player's own persona rest logic handles this.
    // dropWagonIds must be absent or empty (no NPC wagons in crisis).
    expect(!d.dropWagonIds || d.dropWagonIds.length === 0).toBe(true);
  });
});

// ── §4 — Engine apply-site: dropped wagon removed from companions + logged ─

describe('#1304 T1 — engine apply: drop removes wagon + logs it', () => {
  it('after the 1-day hold, tickDayPausable removes the sick wagon from companions', () => {
    // Build a state where the crisis block is already 1 day old (held = 1),
    // so this tick will fire the "drop wagons" travel decision.
    const base = withTrain({ playerHP: 80, companions: [{ hp: 10, id: 'sick-w' }] });
    const held: GameState = {
      ...base,
      day: 11,
      // Advance date to match day 11 (not just a day counter mismatch).
      date: { year: 1849, month: 6, day: 29 },
      wagonTrain: {
        ...base.wagonTrain!,
        companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 }
      }
    };
    const { state } = tickDayPausable(held);
    const companionIds = state.wagonTrain?.companions.map((w) => w.id) ?? [];
    expect(companionIds).not.toContain('sick-w');
  });

  it('the drop emits a period-voiced log line naming the wagon', () => {
    const base = withTrain({ playerHP: 80, companions: [{ hp: 10, id: 'sick-w' }] });
    const held: GameState = {
      ...base,
      day: 11,
      date: { year: 1849, month: 6, day: 29 },
      wagonTrain: {
        ...base.wagonTrain!,
        companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 }
      }
    };
    const { state } = tickDayPausable(held);
    const dropLog = state.eventLog.find((e) =>
      e.text.toLowerCase().includes('drops behind') || e.text.toLowerCase().includes('drop behind')
    );
    expect(dropLog).toBeDefined();
    // The log line should mention the wagon name.
    expect(dropLog?.text).toMatch(/Sager/);
  });

  it('a healthy-companion-only train does NOT drop any wagon', () => {
    const base = withTrain({ playerHP: 80, companions: [{ hp: 80, id: 'healthy-w' }] });
    // Healthy train — no crisis at all; just confirm no drop fires.
    const { state } = tickDayPausable(base);
    const companionIds = state.wagonTrain?.companions.map((w) => w.id) ?? [];
    expect(companionIds).toContain('healthy-w');
  });
});

// ── §5 — New crisis weeks later fires a fresh 1-day hold (no suppression) ─

describe('#1304 T1 — new crisis weeks later fires a fresh 1-day hold', () => {
  it('a train that is now in travel mode can enter crisis_layby again when a new NPC member gets sick', () => {
    const base = withTrain({ playerHP: 80, companions: [{ hp: 10, id: 'new-sick' }] });
    // Simulate: the previous crisis resolved (block is now 'travel'), so this
    // is a completely new crisis encounter.
    const fresh = {
      ...base,
      day: 40,
      wagonTrain: {
        ...base.wagonTrain!,
        companyDecisionBlock: { mode: 'travel' as const, blockStartDay: 35 }
      }
    };
    const d = companyRestDecision(fresh);
    expect(d.mode).toBe('crisis_layby');
  });
});
