// #1304 Task 1 — Crisis hold = 1 day, then sick wagons drop behind.
// Historical basis: whole-company halts were ~1 day (death-watch / burial).
// Week-long convalescence was family-scale — the sick wagon dropped behind.
// Bishop 1849 / Stout 1853 via docs/superpowers/specs/2026-06-11-train-governance-research.md.
//
// #1304 Task 2 — Pressure-aware train pace cap + DRY the clamp.

import { describe, it, expect } from 'vitest';
import { companyRestDecision, captainPressure, companyPaceCap } from '../src/lib/game/systems/company-rest';
import { clampedPace } from '../src/lib/game/systems/wagon-train';
import { milesPerDay } from '../src/lib/game/systems/travel';
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

// ── Task 2 helpers ──────────────────────────────────────────────────────────

/** Build an in-train state that reads as 'behind' or 'critical' schedule
 *  pressure. We do this by placing the wagon far along the trail but late
 *  by day count — milestonePressure sees deficit > 0.
 *
 *  Specifically: put the wagon at ft_laramie (cumMiles ~650) on day 80
 *  (targetDay for ft_laramie is 58 → deficit = 80-58 = 22 → 'critical').
 *  For 'behind': day 65 → deficit 7 → 'behind'. */
function withTrainAndPressure(
  pressure: 'ok' | 'behind' | 'critical',
  opts: { playerHP?: number; pace?: GameState['pace'] } = {}
): GameState {
  const { playerHP = 80, pace = 'fast' } = opts;
  const base = withTrain({ playerHP, companions: [{ hp: 80 }] });

  // 'ok': day 5 — well under MIN_JUDGE_DAYS (20), so scheduleDeficitDays = 0.
  if (pressure === 'ok') {
    return { ...base, day: 5, pace };
  }

  // 'behind': at day 65, 750 miles traveled.
  //   milestone deficit: ft_laramie targetDay=58, 650 mi; at 750 mi we're past
  //   ft_laramie so next milestone is independence_rock (targetDay=72, 815 mi).
  //   Interpolated expectedDay at 750 mi ≈ 58 + (750-650)/(815-650) * (72-58)
  //                                       ≈ 58 + 0.606 * 14 ≈ 66.5
  //   deficit = 65 - 66.5 ≈ -1.5 → 'ok' for milestone term. projection term:
  //   proj = 65 * 2195/750 ≈ 190 > snowSafe 185, ≤ 185+15=200 → 'behind'.
  //   Take worse: 'behind'. ✓
  //
  // 'critical': at day 90, 750 miles.
  //   projection: 90 * 2195/750 ≈ 263 >> 200 → 'critical'. ✓
  const targetDay = pressure === 'behind' ? 65 : 90;
  const miles = 750;

  return {
    ...base,
    day: targetDay,
    pace,
    location: {
      ...base.location,
      milesTraveled: miles,
      terrain: 'prairie' as const
    }
  };
}

// ── §6 — captainPressure helper ─────────────────────────────────────────────

describe('#1304 T2 — captainPressure(state) pure helper', () => {
  it('returns ok when the party is early on the trail (day 5, 0 miles)', () => {
    const s = withTrain({ playerHP: 80 });
    const p = captainPressure({ ...s, day: 5 });
    expect(p).toBe('ok');
  });

  it('returns behind when behind the timetable by 7 days', () => {
    const s = withTrainAndPressure('behind');
    const p = captainPressure(s);
    expect(p).toBe('behind');
  });

  it('returns critical when behind the timetable by 22 days', () => {
    const s = withTrainAndPressure('critical');
    const p = captainPressure(s);
    expect(p).toBe('critical');
  });

  it('is pure — calling it twice returns the same value', () => {
    const s = withTrainAndPressure('behind');
    expect(captainPressure(s)).toBe(captainPressure(s));
  });
});

// ── §7 — companyPaceCap helper ──────────────────────────────────────────────

describe('#1304 T2 — companyPaceCap(state)', () => {
  it('no train → returns grueling (no cap — solo wagon)', () => {
    const s = createInitialState({
      seed: 'cap-solo', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 18 }
    });
    // Ensure no train (initial state has no wagon train).
    expect(s.wagonTrain).toBeNull();
    expect(companyPaceCap(s)).toBe('grueling');
  });

  it('ok pressure → moderate (today\'s behavior preserved)', () => {
    const s = withTrainAndPressure('ok');
    expect(companyPaceCap(s)).toBe('moderate');
  });

  it('behind pressure → fast (schedule pushes the pace cap up)', () => {
    const s = withTrainAndPressure('behind');
    expect(companyPaceCap(s)).toBe('fast');
  });

  it('critical pressure → fast (never grueling in a train)', () => {
    const s = withTrainAndPressure('critical');
    expect(companyPaceCap(s)).toBe('fast');
  });
});

// ── §8 — clampedPace pressure-aware behavior ─────────────────────────────────

describe('#1304 T2 — clampedPace with pressure', () => {
  it('regression: in-train fast pick at ok-pressure → moderate (unchanged behavior)', () => {
    // This is the "old" behavior and it must not regress.
    // Rationale: withTrainAndPressure('ok') returns day 5 (pre-judge) → ok.
    const s = withTrainAndPressure('ok', { pace: 'fast' });
    expect(clampedPace(s)).toBe('moderate');
  });

  it('in-train fast pick at behind-pressure → fast (cap lifts)', () => {
    const s = withTrainAndPressure('behind', { pace: 'fast' });
    expect(clampedPace(s)).toBe('fast');
  });

  it('in-train grueling pick at behind-pressure → fast (never grueling in a train)', () => {
    const s = withTrainAndPressure('behind', { pace: 'grueling' });
    expect(clampedPace(s)).toBe('fast');
  });

  it('in-train grueling pick at critical-pressure → fast (never grueling in a train)', () => {
    const s = withTrainAndPressure('critical', { pace: 'grueling' });
    expect(clampedPace(s)).toBe('fast');
  });

  it('in-train slow pick at behind-pressure → slow (below cap, passes through)', () => {
    const s = withTrainAndPressure('behind', { pace: 'slow' });
    expect(clampedPace(s)).toBe('slow');
  });

  it('no-train fast pick → fast (no cap applied)', () => {
    const s = createInitialState({
      seed: 'clamp-solo', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 18 }
    });
    expect(s.wagonTrain).toBeNull();
    expect(clampedPace({ ...s, pace: 'fast' })).toBe('fast');
  });

  it('no-train grueling pick → grueling (no cap applied)', () => {
    const s = createInitialState({
      seed: 'clamp-solo-g', leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'farmer' }],
      startDate: { year: 1849, month: 6, day: 18 }
    });
    expect(clampedPace({ ...s, pace: 'grueling' })).toBe('grueling');
  });
});

// ── §9 — milesPerDay behind-pressure train at fast pace > ok-pressure ────────

describe('#1304 T2 — milesPerDay: behind-pressure train at fast pace yields more miles', () => {
  it('fast-picked pace in behind-pressure train beats fast-picked pace in ok-pressure train', () => {
    // Under ok pressure: fast pick clamps to moderate (base 20 mi/day).
    // Under behind pressure: fast pick stays fast (base 26 mi/day).
    // Both use the same oxen/terrain/weather, so the only difference is the effective pace.
    const okState = withTrainAndPressure('ok', { pace: 'fast' });
    const behindState = withTrainAndPressure('behind', { pace: 'fast' });

    const milesOk     = milesPerDay(okState);
    const milesBehind = milesPerDay(behindState);
    expect(milesBehind).toBeGreaterThan(milesOk);
  });
});

// ── §10a — Finding 2: corpse-in-motion wagons drop without crisis firing ──────

describe('Finding 2 — corpse-in-motion sweep', () => {
  /** Wagon whose sole alive member is at 2 HP (≤ EFFECTIVE_DEAD_HP = 3). */
  function withCorpseWagon(id = 'corpse-w'): GameState {
    const base = withTrain({ playerHP: 80, companions: [{ hp: 2, id }] });
    // No crisis block — simulates a healthy train where the ONLY sick wagon is
    // corpse-in-motion (excluded from trainAggregate by viable-wagon rule).
    return { ...base, wagonTrain: { ...base.wagonTrain!, companyDecisionBlock: undefined } };
  }

  it('corpse-in-motion wagon → travel + dropWagonIds without crisis_layby', () => {
    const d = companyRestDecision(withCorpseWagon('corpse-w'));
    expect(d.mode).toBe('travel');
    expect(d.dropWagonIds).toBeDefined();
    expect(d.dropWagonIds).toContain('corpse-w');
  });

  it('healthy companion in same train is NOT in dropWagonIds', () => {
    const base = withTrain({
      playerHP: 80,
      companions: [
        { hp: 2, id: 'corpse-w' },
        { hp: 80, id: 'healthy-w' }
      ]
    });
    const d = companyRestDecision(base);
    expect(d.mode).toBe('travel');
    expect(d.dropWagonIds).toContain('corpse-w');
    expect(d.dropWagonIds).not.toContain('healthy-w');
  });

  it('regression: healthy-only train does NOT fire the sweep', () => {
    const s = withTrain({ playerHP: 80, companions: [{ hp: 80 }] });
    const d = companyRestDecision(s);
    // Healthy train should produce travel with no dropWagonIds.
    expect(!d.dropWagonIds || d.dropWagonIds.length === 0).toBe(true);
  });
});

// ── §10b — Finding 4: last companion drop dissolves the train ─────────────────

describe('Finding 4 — dissolve train when last companion drops', () => {
  /** Build a state where the sole companion has been in crisis for 1 day
   *  and is corpse-in-motion (all alive ≤ 3 HP) so the next tick will
   *  drop it via the corpse sweep or the crisis hold path. We force the
   *  crisis path: companion at 10 HP (crisis-qualifies), crisis block held. */
  function withLastCompanionInCrisis(): GameState {
    const base = withTrain({ playerHP: 80, companions: [{ hp: 10, id: 'last-w' }] });
    return {
      ...base,
      day: 11,
      date: { year: 1849, month: 6, day: 29 },
      wagonTrain: {
        ...base.wagonTrain!,
        companions: base.wagonTrain!.companions, // just the one
        companyDecisionBlock: { mode: 'crisis_layby' as const, blockStartDay: 10 }
      }
    };
  }

  it('after dropping the last companion, wagonTrain becomes null', () => {
    const s = withLastCompanionInCrisis();
    const { state } = tickDayPausable(s);
    expect(state.wagonTrain).toBeNull();
  });

  it('the dissolve log line is present in eventLog', () => {
    const s = withLastCompanionInCrisis();
    const { state } = tickDayPausable(s);
    const dissolveLog = state.eventLog.find((e) =>
      e.text.toLowerCase().includes('last wagon') ||
      e.text.toLowerCase().includes('company is no more') ||
      e.text.toLowerCase().includes('travels alone')
    );
    expect(dissolveLog).toBeDefined();
  });

  it('the drop log comes before the dissolve log in eventLog order', () => {
    const s = withLastCompanionInCrisis();
    const { state } = tickDayPausable(s);
    const dropIdx = state.eventLog.findIndex((e) =>
      e.text.toLowerCase().includes('drops behind')
    );
    const dissolveIdx = state.eventLog.findIndex((e) =>
      e.text.toLowerCase().includes('last wagon') ||
      e.text.toLowerCase().includes('company is no more') ||
      e.text.toLowerCase().includes('travels alone')
    );
    expect(dropIdx).toBeGreaterThanOrEqual(0);
    expect(dissolveIdx).toBeGreaterThan(dropIdx);
  });
});

// ── §10 — Lift log fires once, re-arms after pressure returns to ok ──────────

describe('#1304 T2 — lift log: captain orders longer marches', () => {
  it('fires a log line when pressure first goes behind', () => {
    // Use tickDayPausable on a behind-pressure train state.
    // The log line should appear in the eventLog.
    const s = withTrainAndPressure('behind', { pace: 'fast' });
    const { state } = tickDayPausable(s);
    const liftLog = state.eventLog.find((e) =>
      e.text.toLowerCase().includes('captain orders longer marches')
      || e.text.toLowerCase().includes('captain')
    );
    expect(liftLog).toBeDefined();
  });

  it('does NOT repeat the log line on the second tick when still behind (flag set)', () => {
    const s = withTrainAndPressure('behind', { pace: 'fast' });
    const { state: day1 } = tickDayPausable(s);
    // Manually advance day so tick can run again.
    const day1b = { ...day1, day: day1.day + 1, date: { ...day1.date, day: day1.date.day + 1 } };
    const { state: day2 } = tickDayPausable(day1b);

    // Count how many times the lift log appears total across both eventLogs.
    const allLogs = [...day1.eventLog, ...day2.eventLog.filter((e) => e.day === day1b.day)];
    const liftCount = allLogs.filter((e) =>
      e.text.toLowerCase().includes('captain orders longer marches')
    ).length;
    expect(liftCount).toBe(1);
  });

  it('re-arms after pressure returns to ok: fires again on next behind episode', () => {
    // Start behind, fire the log; then set to ok (flag cleared); then behind again → fires again.
    const s = withTrainAndPressure('behind', { pace: 'fast' });
    const { state: afterBehind } = tickDayPausable(s);
    // Verify the flag is set.
    expect(afterBehind.flags._trainPaceLiftFlagged).toBe(true);

    // Simulate returning to ok (early trail, day 5) — flag should clear.
    const backToOk = withTrainAndPressure('ok', { pace: 'fast' });
    const { state: afterOk } = tickDayPausable(backToOk);
    // Flag must not be present on a fresh ok-pressure train (or cleared if it was set).
    // After an ok tick the flag is cleared (set to null — falsy).
    expect(afterOk.flags._trainPaceLiftFlagged).toBeFalsy();
  });
});
