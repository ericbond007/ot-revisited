// #1403 — grief mechanics: deeper immediate morale hits at death + 14-day
// mourning-window cap (MOURNING_MORALE_CAP = 70).
//
// Design rationale in death.ts header. Verify:
//   1. Immediate morale hits (adult −10, child −16) applied by reapDead.
//   2. _mourningUntilDay stamped = day + 14; successive deaths extend it.
//   3. During mourning, no recovery source can push morale above 70.
//   4. Below-cap gains still apply during mourning.
//   5. After the window, morale can reach 100 again.
//   6. applyMourningCap is wired in POST_BRANCH_STEPS after all morale sources.
//   7. NPC_PERSISTENT_FLAG_KEYS contains '_mourningUntilDay'.
import { describe, it, expect } from 'vitest';
import { reapDead } from '../src/lib/game/systems/death';
import { ADULT_DEATH_MORALE, CHILD_DEATH_MORALE, MOURNING_DAYS } from '../src/lib/game/systems/death';
import { applyMourningCap, MOURNING_MORALE_CAP } from '../src/lib/game/systems/morale';
import { POST_BRANCH_STEPS, runSteps, type TickCtx } from '../src/lib/game/daily-steps';
import { NPC_PERSISTENT_FLAG_KEYS } from '../src/lib/game/systems/wagon-synth';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newGame(): GameState {
  return createInitialState({
    seed: 'grief1403',
    leader: { name: 'Ada', profession: 'farmer' },
    companions: [{ name: 'Bob', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

function newGameWithChild(): GameState {
  return createInitialState({
    seed: 'grief1403c',
    leader: { name: 'Ada', profession: 'farmer' },
    companions: [
      { name: 'Bob', profession: 'doctor' },
      { name: 'Kit', kind: 'child', age: 9 }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

const ctx: TickCtx = { traveled: false, driver: 'player' };

// ---------------------------------------------------------------------------
// 1. Immediate morale hits
// ---------------------------------------------------------------------------

describe('#1403 — immediate morale hits', () => {
  it('adult death applies ADULT_DEATH_MORALE (−10) immediately', () => {
    const s = { ...newGame(), day: 10, morale: 100 };
    s.party[1].health = 0;
    const after = reapDead(s, makeRng('g:adult'));
    // Hit: −10, then capped to MOURNING_MORALE_CAP (70).
    // morale 100 − 10 = 90 → capped to 70.
    expect(after.morale).toBe(Math.min(MOURNING_MORALE_CAP, Math.max(0, 100 + ADULT_DEATH_MORALE)));
  });

  it('adult death at low morale (30) clamps to 0 before cap, then cap wins', () => {
    const s = { ...newGame(), day: 10, morale: 5 };
    s.party[1].health = 0;
    const after = reapDead(s, makeRng('g:low'));
    // 5 + (−10) = −5 → clamped to 0 by Math.max(0, ...) → then min(0, 70) = 0
    expect(after.morale).toBe(0);
  });

  it('child death applies CHILD_DEATH_MORALE (−16) immediately', () => {
    const s = { ...newGameWithChild(), day: 10, morale: 100 };
    const childIdx = s.party.findIndex((m) => m.kind === 'child');
    s.party[childIdx].health = 0;
    const after = reapDead(s, makeRng('g:child'));
    // 100 − 16 = 84 → capped to 70
    expect(after.morale).toBe(Math.min(MOURNING_MORALE_CAP, Math.max(0, 100 + CHILD_DEATH_MORALE)));
  });

  it('ADULT_DEATH_MORALE is −10 (was 0 before #1403)', () => {
    // #1403 re-baseline: adults used to have no immediate hit ("burial event
    // covers it"). Now −10 per the flat-happy probe + grief-diary anchor.
    expect(ADULT_DEATH_MORALE).toBe(-10);
  });

  it('CHILD_DEATH_MORALE is −16 (was −8 before #1403)', () => {
    // #1403 re-baseline: child was −8; raised to −16 to match the
    // disproportionate grief children's deaths draw in period diaries.
    expect(CHILD_DEATH_MORALE).toBe(-16);
  });

  it('already-dead members do not re-apply the hit', () => {
    // Member 1 already dead before this tick — should not contribute to hit.
    let s = { ...newGame(), day: 10, morale: 80 };
    s.party[1].health = 0;
    s = reapDead(s, makeRng('g:r1'));          // first reap: adult dies, morale drops
    const moraleAfterFirst = s.morale;
    const s2 = reapDead(s, makeRng('g:r2'));   // second reap: idempotent, no new deaths
    expect(s2.morale).toBe(moraleAfterFirst);
  });
});

// ---------------------------------------------------------------------------
// 2. Mourning window stamping and extension
// ---------------------------------------------------------------------------

describe('#1403 — mourning window: _mourningUntilDay', () => {
  it('stamps _mourningUntilDay = day + MOURNING_DAYS on first death', () => {
    const s = { ...newGame(), day: 20, morale: 80 };
    s.party[1].health = 0;
    const after = reapDead(s, makeRng('g:stamp'));
    expect(after.flags._mourningUntilDay).toBe(20 + MOURNING_DAYS);
  });

  it('MOURNING_DAYS is 14', () => {
    expect(MOURNING_DAYS).toBe(14);
  });

  it('second death later extends the window (takes max)', () => {
    // First death at day 10 → mourning until day 24.
    let s = { ...newGameWithChild(), day: 10, morale: 90 };
    s.party[1].health = 0;
    s = reapDead(s, makeRng('g:ext1'));
    expect(s.flags._mourningUntilDay).toBe(24);

    // Second death at day 15 → new stamp = 15 + 14 = 29 > 24 → extended.
    s = { ...s, day: 15 };
    const childIdx = s.party.findIndex((m) => m.kind === 'child');
    s.party[childIdx].health = 0;
    const s2 = reapDead(s, makeRng('g:ext2'));
    expect(s2.flags._mourningUntilDay).toBe(29);
  });

  it('second death that would shorten the window does NOT shorten it', () => {
    // First death at day 10 → mourning until day 24.
    // Second death at day 5 (hypothetically earlier day) → 5 + 14 = 19 < 24 → keep 24.
    // Simulate by manually setting a future _mourningUntilDay then reaping on an earlier day.
    const base = { ...newGame(), day: 5, morale: 90 };
    base.flags = { ...base.flags, _mourningUntilDay: 24 };  // prior window
    base.party[1].health = 0;
    const after = reapDead(base, makeRng('g:noShorten'));
    expect(after.flags._mourningUntilDay).toBe(24);          // not overwritten to 19
  });
});

// ---------------------------------------------------------------------------
// 3. applyMourningCap helper directly
// ---------------------------------------------------------------------------

describe('#1403 — applyMourningCap helper', () => {
  it('caps morale at MOURNING_MORALE_CAP (70) during window', () => {
    const s: GameState = {
      ...newGame(),
      day: 5,
      morale: 85,
      flags: { _mourningUntilDay: 20 }
    };
    const after = applyMourningCap(s);
    expect(after.morale).toBe(MOURNING_MORALE_CAP);
  });

  it('does not raise morale below the cap (gains below cap still work)', () => {
    const s: GameState = {
      ...newGame(),
      day: 5,
      morale: 40,    // below cap — should be unchanged
      flags: { _mourningUntilDay: 20 }
    };
    const after = applyMourningCap(s);
    expect(after.morale).toBe(40);    // untouched — not clamped up
  });

  it('does nothing outside the mourning window (day >= _mourningUntilDay)', () => {
    const s: GameState = {
      ...newGame(),
      day: 25,
      morale: 95,
      flags: { _mourningUntilDay: 20 }
    };
    const after = applyMourningCap(s);
    expect(after.morale).toBe(95);    // window expired — cap doesn't apply
  });

  it('does nothing when _mourningUntilDay is not set', () => {
    const s: GameState = { ...newGame(), day: 5, morale: 95, flags: {} };
    const after = applyMourningCap(s);
    expect(after.morale).toBe(95);
  });

  it('MOURNING_MORALE_CAP is 70', () => {
    expect(MOURNING_MORALE_CAP).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// 4. Spine registration and order
// ---------------------------------------------------------------------------

describe('#1403 — applyMourningCap is last in POST_BRANCH_STEPS (NPC parity)', () => {
  it('applyMourningCap appears in POST_BRANCH_STEPS', () => {
    const ids = POST_BRANCH_STEPS.map((s) => s.id);
    expect(ids).toContain('applyMourningCap');
  });

  it('applyMourningCap is the LAST step in POST_BRANCH_STEPS', () => {
    const ids = POST_BRANCH_STEPS.map((s) => s.id);
    expect(ids[ids.length - 1]).toBe('applyMourningCap');
  });

  it('applyMourningCap runs after adjustMorale in POST_BRANCH_STEPS', () => {
    const ids = POST_BRANCH_STEPS.map((s) => s.id);
    expect(ids.indexOf('applyMourningCap')).toBeGreaterThan(ids.indexOf('adjustMorale'));
  });

  it('applyMourningCap has no scope restriction (scope undefined = all)', () => {
    const step = POST_BRANCH_STEPS.find((s) => s.id === 'applyMourningCap')!;
    // scope 'all' or undefined both mean all drivers. NPC parity requires it
    // is NOT playerOnly or npcOnly.
    expect(step.scope).not.toBe('playerOnly');
    expect(step.scope).not.toBe('npcOnly');
  });

  it('during mourning: a morale-raising day via POST_BRANCH_STEPS is bounded at cap', () => {
    // Construct state with mourning active, morale at cap (70), filling rations
    // + healthy party (would give +2 from adjustMorale). Cap should keep it at 70.
    const base = newGame();
    const s: GameState = {
      ...base,
      day: 10,
      morale: 70,
      rations: 'filling',
      flags: { ...base.flags, _mourningUntilDay: 20 }
    };
    // Ensure all-above-70-health wellness bonus fires:
    for (const m of s.party) m.health = 80;
    const after = runSteps(POST_BRANCH_STEPS, s, makeRng('cap:spine'), ctx);
    // adjustMorale sees +1 (filling) + +1 (wellness) = +2 → morale would be 72.
    // applyMourningCap clamps it back to 70.
    expect(after.morale).toBe(MOURNING_MORALE_CAP);
  });
});

// ---------------------------------------------------------------------------
// 5. Below-cap recovery still works during mourning
// ---------------------------------------------------------------------------

describe('#1403 — below-cap recovery during mourning', () => {
  it('morale 40 can still recover toward 70 during mourning via POST_BRANCH_STEPS', () => {
    const base = newGame();
    const s: GameState = {
      ...base,
      day: 10,
      morale: 40,
      rations: 'filling',
      flags: { ...base.flags, _mourningUntilDay: 20 }
    };
    for (const m of s.party) m.health = 80;
    const after = runSteps(POST_BRANCH_STEPS, s, makeRng('cap:below'), ctx);
    // Gains applied (+2 from filling + wellness) → morale rises to 42,
    // which is below 70 → cap doesn't clamp → stays at 42.
    expect(after.morale).toBeGreaterThan(40);
    expect(after.morale).toBeLessThanOrEqual(MOURNING_MORALE_CAP);
  });
});

// ---------------------------------------------------------------------------
// 6. After window expires: full recovery possible
// ---------------------------------------------------------------------------

describe('#1403 — mourning window expiry', () => {
  it('after window expires, morale can reach above 70 again', () => {
    const base = newGame();
    // day=25 >= _mourningUntilDay=20 → window expired.
    const s: GameState = {
      ...base,
      day: 25,
      morale: 95,
      rations: 'filling',
      flags: { ...base.flags, _mourningUntilDay: 20 }
    };
    for (const m of s.party) m.health = 80;
    const after = runSteps(POST_BRANCH_STEPS, s, makeRng('cap:expired'), ctx);
    // Cap is inactive; morale 97+ is fine.
    expect(after.morale).toBeGreaterThan(MOURNING_MORALE_CAP);
  });
});

// ---------------------------------------------------------------------------
// 7. NPC parity: _mourningUntilDay in NPC_PERSISTENT_FLAG_KEYS
// ---------------------------------------------------------------------------

describe('#1403 — NPC_PERSISTENT_FLAG_KEYS contains _mourningUntilDay', () => {
  it('NPC_PERSISTENT_FLAG_KEYS includes _mourningUntilDay (NPC wagons mourn too)', () => {
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_mourningUntilDay');
  });

  it('also contains the existing _lastOxDeathDay (regression check)', () => {
    expect(NPC_PERSISTENT_FLAG_KEYS).toContain('_lastOxDeathDay');
  });
});
