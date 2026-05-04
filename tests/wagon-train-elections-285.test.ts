// #285 — wagon-train captain elections + charisma. Phase 1: elections
// fire when the player arrives at a major post (Kearny / Laramie /
// Bridger / Hall / Boise). Charisma weights the random draw; the
// incumbent gets a +1.0 bonus so leaders aren't churned out by every
// roll. Period grounding: Joel Palmer 1845, Bryant 1846 — Russell
// elected at Independence then ousted on the trail.

import { describe, it, expect } from 'vitest';
import {
  maybeElectCaptain,
  playerIsCaptain,
  forceElection,
  ELECTION_LANDMARKS,
  MORALE_VOTE_THRESHOLD
} from '../src/lib/game/systems/wagon-train-elections';
import { joinTrain } from '../src/lib/game/systems/wagon-train';
import { buildStarvationCrisisEvent } from '../src/lib/game/systems/npc-crisis-events';
import { createInitialState } from '../src/lib/game/engine';
import { tickDayPausable } from '../src/lib/game/engine-pausable';
import { runningMilesTo } from '../src/lib/game/systems/travel';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, NpcWagonState, ProfessionId } from '../src/lib/game/types';

function game(leaderProf: ProfessionId = 'farmer'): GameState {
  return createInitialState({
    seed: 'el',
    leader: { name: 'L', profession: leaderProf },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 4, day: 15 }
  });
}

function atLandmark(s: GameState, id: string): GameState {
  return { ...s, location: { ...s.location, atLandmarkId: id } };
}

/** Drag every train morale (player + companions) below the vote
 *  threshold so a vote actually fires. */
function makeGrumpy(s: GameState, target = 30): GameState {
  if (!s.wagonTrain) return { ...s, morale: target };
  return {
    ...s,
    morale: target,
    wagonTrain: {
      ...s.wagonTrain,
      companions: s.wagonTrain.companions.map((c) => ({ ...c, morale: target }))
    }
  };
}

function withCompanion(
  s: GameState,
  id: string,
  prof: ProfessionId,
  morale = 70
): GameState {
  if (!s.wagonTrain) throw new Error('not in train');
  const npc: NpcWagonState = {
    id,
    name: `the ${id} family`,
    leaderProfession: prof,
    hasChildren: false,
    seed: id,
    party: [
      { id: `${id}-p`, name: 'X', kind: 'adult', sex: 'male', age: 30, profession: prof,
        isLeader: true, health: 100, dead: false, conditions: [] }
    ],
    inventory: {},
    oxen: [{ id: `${id}-o`, health: 100, fatigue: 0, shod: true }],
    morale,
    cash: 100,
    wagon: { ...s.wagon },
    eventLog: [],
    outcome: 'in-progress',
    rations: 'normal'
  };
  return {
    ...s,
    wagonTrain: { ...s.wagonTrain, companions: [...s.wagonTrain.companions, npc] }
  };
}

describe('ELECTION_LANDMARKS', () => {
  it('covers the five canonical re-election posts', () => {
    expect(ELECTION_LANDMARKS.has('ft_kearny')).toBe(true);
    expect(ELECTION_LANDMARKS.has('ft_laramie')).toBe(true);
    expect(ELECTION_LANDMARKS.has('ft_bridger')).toBe(true);
    expect(ELECTION_LANDMARKS.has('ft_hall')).toBe(true);
    expect(ELECTION_LANDMARKS.has('ft_boise')).toBe(true);
  });

  it('does not include scenic / non-fort landmarks', () => {
    expect(ELECTION_LANDMARKS.has('chimney_rock')).toBe(false);
    expect(ELECTION_LANDMARKS.has('independence_mo')).toBe(false);
    expect(ELECTION_LANDMARKS.has('soda_springs')).toBe(false);
  });
});

describe('maybeElectCaptain — guards', () => {
  it('no-ops when the player is not in a train', () => {
    const s = atLandmark(game(), 'ft_kearny');
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(false);
    expect(r.skipReason).toBe('not_in_train');
    expect(r.state).toBe(s);
  });

  it('no-ops when the player is in a train but not at a landmark', () => {
    const s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(false);
    expect(r.skipReason).toBe('not_at_election_landmark');
  });

  it('no-ops when the player is at a non-election landmark', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    s = atLandmark(s, 'chimney_rock');
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(false);
    expect(r.skipReason).toBe('not_at_election_landmark');
  });

  it('no-ops at an election landmark when morale is content (above threshold)', () => {
    // Default morale is high — no vote called.
    let s = joinTrain(game(), makeRng('j')).state;
    s = atLandmark(s, 'ft_kearny');
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(false);
    expect(r.skipReason).toBe('morale_ok');
    // Flag was set anyway so we don't re-check today.
    expect(r.state.flags._electionFiredAt_ft_kearny).toBe(true);
  });

  it('runs at an election landmark when avg morale is below threshold', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    s = atLandmark(s, 'ft_kearny');
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(true);
    expect(r.newLeader).toBeDefined();
    const last = r.state.eventLog[r.state.eventLog.length - 1];
    expect(last.text).toMatch(/Fort Kearny/);
    expect(last.text).toMatch(/captain|captaincy/i);
    expect(last.text).toMatch(/discontent|vote/i);
  });

  it('per-(landmark, day) flag prevents a second election same day', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    s = atLandmark(s, 'ft_kearny');
    const r1 = maybeElectCaptain(s, makeRng('a'));
    expect(r1.ran).toBe(true);
    const r2 = maybeElectCaptain(r1.state, makeRng('a'));
    expect(r2.ran).toBe(false);
    expect(r2.skipReason).toBe('already_fired_today');
  });

  it('flag is per-landmark — Laramie still elects after Kearny fired', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    s = atLandmark(s, 'ft_kearny');
    s = maybeElectCaptain(s, makeRng('a')).state;
    s = atLandmark(s, 'ft_laramie');
    const r = maybeElectCaptain(s, makeRng('b'));
    expect(r.ran).toBe(true);
  });

  it('MORALE_VOTE_THRESHOLD is exported and sits in a sensible band', () => {
    expect(MORALE_VOTE_THRESHOLD).toBeGreaterThan(30);
    expect(MORALE_VOTE_THRESHOLD).toBeLessThan(80);
  });

  it('single-candidate case (companion-less train) is a no-op but flags', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    // Wipe the companions so only the player is eligible.
    s = { ...s, wagonTrain: { ...s.wagonTrain!, companions: [] } };
    s = atLandmark(s, 'ft_kearny');
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(false);
    expect(r.skipReason).toBe('single_candidate');
    expect(r.state.flags._electionFiredAt_ft_kearny).toBe(true);
  });
});

describe('maybeElectCaptain — weighting', () => {
  it('a charisma-5 preacher beats a charisma-1 farmer over many seeds', () => {
    let preacherWins = 0;
    let votesHeld = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      // Player is the farmer; companion is the preacher. Strip the
      // train down to a clean two-candidate race.
      let s = joinTrain(game('farmer'), makeRng('seed-' + i)).state;
      s = { ...s, wagonTrain: { ...s.wagonTrain!, companions: [] } };
      s = withCompanion(s, 'preacher_wagon', 'preacher', 30);
      s = makeGrumpy(s);
      s = atLandmark(s, 'ft_kearny');
      // Force a non-incumbent race so charisma alone decides — clear
      // the default 'player' incumbency.
      s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: 'neutral' } };
      const r = maybeElectCaptain(s, makeRng('roll-' + i));
      if (r.ran) votesHeld += 1;
      if (r.newLeader === 'preacher_wagon') preacherWins += 1;
    }
    expect(votesHeld).toBe(trials);
    // Charisma 5 vs 1: weights ~3.5 vs ~1.5 (plus rng nudge). Preacher
    // should win the strong majority. Allow slack for variance.
    expect(preacherWins / trials).toBeGreaterThan(0.6);
  });

  it('incumbent bonus +1.0 keeps the same captain re-elected most of the time among equals', () => {
    let incumbentKept = 0;
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      // Two charisma-2 candidates: player (carpenter) is incumbent,
      // companion (blacksmith) is challenger.
      let s = joinTrain(game('carpenter'), makeRng('seed-' + i)).state;
      s = { ...s, wagonTrain: { ...s.wagonTrain!, companions: [] } };
      s = withCompanion(s, 'smith_wagon', 'blacksmith', 30);
      s = makeGrumpy(s);
      s = atLandmark(s, 'ft_kearny');
      // Player is already incumbent (default leaderId === 'player').
      const r = maybeElectCaptain(s, makeRng('roll-' + i));
      if (r.newLeader === 'player') incumbentKept += 1;
    }
    // Equal charisma, incumbent +1.0 vs challenger 0: weights ~3.0 vs
    // ~2.0. Incumbent should keep it the strong majority of the time.
    expect(incumbentKept / trials).toBeGreaterThan(0.6);
  });
});

describe('engine wire-up — integration through tickDayPausable', () => {
  // The unit tests above inject `atLandmarkId` directly. These tests
  // catch the regression class where the engine constants drift from
  // the actual landmark registry IDs (`fort_kearny` vs `ft_kearny`).
  function trainAtKearnyDoorstep(): GameState {
    let s = joinTrain(game(), makeRng('jt')).state;
    s = makeGrumpy(s, 30);
    // Park one mile out from Fort Kearny so a single travel tick lands
    // at the post.
    const target = runningMilesTo('ft_kearny');
    return {
      ...s,
      location: {
        ...s.location,
        milesTraveled: target - 1,
        nextLandmarkId: 'ft_kearny'
      }
    };
  }

  it('elections fire when the player travels into Fort Kearny in a low-morale train', () => {
    const s = trainAtKearnyDoorstep();
    const result = tickDayPausable(s);
    // Either the day ticked clean or it paused on an arrival event —
    // either way, the election flag should be set on the resulting
    // state because maybeElectCaptain runs before the arrival-event
    // early-return.
    expect(result.state.flags._electionFiredAt_ft_kearny).toBe(true);
  });

  it('solo player (no train) at Fort Kearny is not affected by elections', () => {
    let s = createInitialState({
      seed: 'solo',
      leader: { name: 'L', profession: 'farmer' },
      companions: [{ name: 'C', profession: 'doctor' }],
      startDate: { year: 1849, month: 4, day: 15 }
    });
    const target = runningMilesTo('ft_kearny');
    s = {
      ...s,
      location: { ...s.location, milesTraveled: target - 1, nextLandmarkId: 'ft_kearny' }
    };
    const result = tickDayPausable(s);
    expect(result.state.flags._electionFiredAt_ft_kearny).toBeUndefined();
  });
});

describe('#285 phase 2 — stand-aside preference', () => {
  it('player is excluded from candidates when wagonTrain.playerStandsAside is true', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    s = atLandmark(s, 'ft_kearny');
    // Player flips the flag; they're currently the captain.
    s = { ...s, wagonTrain: { ...s.wagonTrain!, playerStandsAside: true } };
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(true);
    // The new leader cannot be the player.
    expect(r.newLeader).not.toBe('player');
    // Captaincy actually changed (player was incumbent, now isn't).
    expect(r.changed).toBe(true);
  });

  it('stand-aside with no companions left yields a single-candidate no-op', () => {
    let s = makeGrumpy(joinTrain(game(), makeRng('j')).state);
    s = {
      ...s,
      wagonTrain: { ...s.wagonTrain!, companions: [], playerStandsAside: true }
    };
    s = atLandmark(s, 'ft_kearny');
    const r = maybeElectCaptain(s, makeRng('a'));
    expect(r.ran).toBe(false);
    expect(r.skipReason).toBe('single_candidate');
  });
});

describe('#285 phase 2 — forceElection (crisis-triggered)', () => {
  it('runs an election ignoring the morale gate', () => {
    // High morale — landmark path would skip with skip='morale_ok'.
    let s = joinTrain(game(), makeRng('j')).state;
    expect(s.morale).toBeGreaterThan(MORALE_VOTE_THRESHOLD);
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    expect(r.ran).toBe(true);
    expect(r.newLeader).toBeDefined();
  });

  it('runs an election ignoring the landmark gate (no landmark required)', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    expect(s.location.atLandmarkId).toBeUndefined();
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    expect(r.ran).toBe(true);
  });

  it('writes a crisis-flavored log line', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    const last = r.state.eventLog[r.state.eventLog.length - 1];
    expect(last.text).toMatch(/refused to share food/i);
  });

  it('uses second-person ("you refused") when the incumbent is the player', () => {
    // Player is incumbent (default after joinTrain).
    const s = joinTrain(game(), makeRng('j')).state;
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    const last = r.state.eventLog[r.state.eventLog.length - 1];
    expect(last.text).toMatch(/After you refused/);
    expect(last.text).not.toMatch(/After the captain refused/);
  });

  it('uses third-person ("the captain refused") when incumbent is a companion', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: s.wagonTrain!.companions[0].id } };
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    const last = r.state.eventLog[r.state.eventLog.length - 1];
    expect(last.text).toMatch(/After the captain refused/);
    expect(last.text).not.toMatch(/After you refused/);
  });

  it('clears the _pendingCaptaincyVote flag from state', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    s = { ...s, flags: { ...s.flags, _pendingCaptaincyVote: { reason: 'refused-starvation-share' } } };
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    expect(r.state.flags._pendingCaptaincyVote).toBeUndefined();
  });

  it('honors stand-aside in crisis votes too', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    s = { ...s, wagonTrain: { ...s.wagonTrain!, playerStandsAside: true } };
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    expect(r.ran).toBe(true);
    expect(r.newLeader).not.toBe('player');
  });

  it('no-op + flag cleared when companion-less train', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    s = { ...s, wagonTrain: { ...s.wagonTrain!, companions: [] } };
    s = { ...s, flags: { ...s.flags, _pendingCaptaincyVote: { reason: 'refused-starvation-share' } } };
    const r = forceElection(s, makeRng('crisis'), 'refused-starvation-share');
    expect(r.ran).toBe(false);
    expect(r.state.flags._pendingCaptaincyVote).toBeUndefined();
  });
});

describe('#285 phase 2 — starvation refuse arms the crisis trigger', () => {
  it('refuse choice sets _pendingCaptaincyVote when player is in a train + captain', () => {
    let s = joinTrain(game(), makeRng('jt')).state;
    expect(s.wagonTrain?.leaderId).toBe('player');
    const target = s.wagonTrain!.companions[0];
    const event = buildStarvationCrisisEvent(target);
    const refuseChoice = event.choices.find((c) => c.id === 'starvation_refuse')!;
    const after = refuseChoice.apply(s, makeRng('refuse'));
    expect(after.flags._pendingCaptaincyVote).toEqual({ reason: 'refused-starvation-share' });
  });

  it('refuse choice does NOT arm trigger when player is not the captain', () => {
    let s = joinTrain(game(), makeRng('jt')).state;
    s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: s.wagonTrain!.companions[0].id } };
    const target = s.wagonTrain!.companions[0];
    const event = buildStarvationCrisisEvent(target);
    const refuseChoice = event.choices.find((c) => c.id === 'starvation_refuse')!;
    const after = refuseChoice.apply(s, makeRng('refuse'));
    expect(after.flags._pendingCaptaincyVote).toBeUndefined();
  });
});

describe('#285 phase 2 — tickDayPausable consumes _pendingCaptaincyVote', () => {
  // The crisis trigger is set by the starvation-refuse choice apply
  // (see npc-crisis-events.ts). On the next tick, the engine should
  // see the flag, run forceElection, and clear it. Catches the same
  // bug class that bit #285 phase 1 (wired in isolation but never
  // invoked through the engine path).
  it('consumes the flag and runs an election on the next tick', () => {
    let s = joinTrain(game(), makeRng('jt')).state;
    s = {
      ...s,
      flags: { ...s.flags, _pendingCaptaincyVote: { reason: 'refused-starvation-share' } }
    };
    const r = tickDayPausable(s);
    // Flag is gone — the engine consumed it.
    expect(r.state.flags._pendingCaptaincyVote).toBeUndefined();
    // A vote-result log line landed.
    const voteLine = r.state.eventLog.find((l) =>
      /refused to share food/i.test(l.text)
    );
    expect(voteLine).toBeDefined();
  });

  it('drops a stale flag when the player is no longer in a train', () => {
    const s: GameState = {
      ...game(),
      flags: { _pendingCaptaincyVote: { reason: 'refused-starvation-share' } }
    };
    const r = tickDayPausable(s);
    expect(r.state.flags._pendingCaptaincyVote).toBeUndefined();
  });
});

describe('playerIsCaptain', () => {
  it('returns true when the train leader is the player', () => {
    const s = joinTrain(game(), makeRng('j')).state;
    expect(playerIsCaptain(s)).toBe(true);
  });

  it('returns false when leadership has passed to a companion', () => {
    let s = joinTrain(game(), makeRng('j')).state;
    s = { ...s, wagonTrain: { ...s.wagonTrain!, leaderId: s.wagonTrain!.companions[0].id } };
    expect(playerIsCaptain(s)).toBe(false);
  });

  it('returns false when not in a train', () => {
    expect(playerIsCaptain(game())).toBe(false);
  });
});
