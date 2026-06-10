import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable, applyPendingChoice } from '../src/lib/game/engine-pausable';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

// #1266 stage3 — NPC-crisis double-tail guard.
//
// Bug: When advanceTrain (called from the no-event path in tickDayPausable)
// returns a pendingEvent (starvation crisis), tickDayPausable returns early
// with that pause. applyPendingChoice then re-runs POST_EVENT_TAIL_STEPS
// AND calls advanceTrain again. Net: on a crisis day, both the tail
// (dehydration/fire/reap) and advanceTrain run TWICE for the player.
//
// Fix: stamp `_tailRanDay` when advanceTrain triggers the early return.
// applyPendingChoice checks the flag and skips both the tail and
// advanceTrain when they already ran.

const FOOD_KEYS = [
  'game_meat', 'berries', 'egg', 'milk',
  'jerky', 'pemmican', 'salt_pork', 'bacon',
  'flour', 'cornmeal', 'beans', 'hardtack',
  'dried_fruit', 'cheese', 'butter'
];

function totalFood(inv: Record<string, number>): number {
  return FOOD_KEYS.reduce((sum, k) => sum + (inv[k] ?? 0), 0);
}

/** Build a GameState in a train where:
 *  - companion[0] has 1 lb flour (triggers starvation crisis on first tick)
 *  - ALL other companions are empty (so they can't silently resolve it)
 *  - _lastEventDay = current day (prevents rollEvent/arrival/approach from
 *    pausing before we reach the advanceTrain call — this is a test fixture
 *    device; in real play the crisis always arrives via the no-event path)
 *  - player has water = 0 so applyDehydration will increment _dehydrationDays
 *    on each POST_EVENT_TAIL_STEPS run — making double-application detectable
 *  - player party has full health so death doesn't obscure the signal
 */
function crisisState(): GameState {
  const s = createInitialState({
    seed: 'crisis-tail',
    leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'A', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 18 }  // Monday – no Sabbath
  });
  const withTrain = joinTrain(s, makeRng('crt')).state;
  return {
    ...withTrain,
    // No water → applyDehydration fires and is a visible once-per-tail signal.
    resources: { ...withTrain.resources, water: 0, dirtyWater: 0 },
    // Full health so party doesn't die from the first dehydration hit.
    party: withTrain.party.map((m) => ({ ...m, health: 100 })),
    // Suppress rollEvent / arrival / approach so tickDayPausable reaches the
    // no-event path and calls advanceTrain before pausing.
    flags: { ...withTrain.flags, _lastEventDay: withTrain.day },
    // Re-baseline (T2 #1281): pin to an unflagged leg (willow_springs —
    // prairie, no corridor) so the corridor branch in MORNING_STEPS does
    // NOT refill water before applyDehydration runs.  The default location
    // (kansas_river, now clean corridor) would add +5 gal and prevent the
    // dehydration signal this test relies on.
    location: { ...withTrain.location, nextLandmarkId: 'willow_springs' },
    wagonTrain: {
      ...withTrain.wagonTrain!,
      companions: withTrain.wagonTrain!.companions.map((c, i) =>
        i === 0
          ? { ...c, inventory: { flour: 1 } as Record<string, number> }
          : { ...c, inventory: {} as Record<string, number> }
      )
    }
  };
}

describe('#1266 stage3 — NPC-crisis double-tail guard', () => {
  it('precondition: tickDayPausable triggers a starvation-crisis pendingEvent', () => {
    const s = crisisState();
    const r = tickDayPausable(s);
    // Must pause at a crisis — if this fails the fixture is wrong,
    // not the fix.
    expect(r.pendingEvent).toBeDefined();
    expect(r.pendingEvent!.choices.some((c) =>
      c.id.startsWith('starvation_share_') || c.id === 'starvation_refuse'
    )).toBe(true);
  });

  it('precondition: companion food is 0 at pause (advanceTrain ran once)', () => {
    const s = crisisState();
    const r = tickDayPausable(s);
    expect(r.pendingEvent).toBeDefined();
    // companion[0] had 1 lb flour, advanceTrain consumed it this tick → 0.
    const foodAtPause = totalFood(r.state.wagonTrain!.companions[0].inventory);
    expect(foodAtPause).toBe(0);
  });

  it('dehydration counter is 1 at pause (tail ran once — the key once-per-day signal)', () => {
    const s = crisisState();
    const r = tickDayPausable(s);
    expect(r.pendingEvent).toBeDefined();

    // POST_EVENT_TAIL_STEPS runs before advanceTrain in tickDayPausable.
    // With water=0, applyDehydration increments _dehydrationDays from 0 to 1.
    const dehAtPause = typeof r.state.flags._dehydrationDays === 'number'
      ? (r.state.flags._dehydrationDays as number)
      : 0;
    expect(dehAtPause).toBe(1);
  });

  it('dehydration does NOT increment again on resume (tail must not re-run)', () => {
    const s = crisisState();
    const r = tickDayPausable(s);
    expect(r.pendingEvent).toBeDefined();

    const dehAtPause = typeof r.state.flags._dehydrationDays === 'number'
      ? (r.state.flags._dehydrationDays as number)
      : 0;
    // Verify the precondition above holds before the main assertion.
    expect(dehAtPause).toBe(1);

    const done = applyPendingChoice(
      r.state,
      r.pendingEvent!,
      r.pendingEvent!.choices[0].id  // first choice (share/refuse — irrelevant)
    );

    const dehAfterResume = typeof done.flags._dehydrationDays === 'number'
      ? (done.flags._dehydrationDays as number)
      : 0;

    // FAILS today (bug): applyPendingChoice re-runs POST_EVENT_TAIL_STEPS
    // so _dehydrationDays goes 1 → 2.
    // PASSES with fix: tail is skipped, _dehydrationDays stays 1.
    expect(dehAfterResume).toBe(1);
  });

  it('day advances exactly once across pause+resume', () => {
    const s = crisisState();
    const r = tickDayPausable(s);
    expect(r.pendingEvent).toBeDefined();

    const done = applyPendingChoice(
      r.state,
      r.pendingEvent!,
      r.pendingEvent!.choices[0].id
    );

    expect(done.day).toBe(s.day + 1);
  });

  it('_tailRanDay flag is cleared after resume (must not leak into next day)', () => {
    const s = crisisState();
    const r = tickDayPausable(s);
    expect(r.pendingEvent).toBeDefined();

    const done = applyPendingChoice(
      r.state,
      r.pendingEvent!,
      r.pendingEvent!.choices[0].id
    );

    // The flag must be absent on the resumed state so tomorrow's tick
    // doesn't incorrectly skip the tail.
    expect(done.flags._tailRanDay).toBeUndefined();
  });
});
