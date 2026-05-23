import { describe, it, expect } from 'vitest';
import type { WagonTrain } from '../src/lib/game/types';

describe('#1046B — companyDecisionBlock.dissentChoice', () => {
  it('the block carries an optional sticky dissentChoice', () => {
    const wt: WagonTrain = {
      id: 't', name: 'Co', joinedDay: 1, joinedAtLandmarkId: null,
      leaderId: 'player', companions: [], doctrine: 'prudent',
      companyDecisionBlock: { mode: 'maintenance_layby', blockStartDay: 3, dissentChoice: 'press_on' }
    };
    expect(wt.companyDecisionBlock?.dissentChoice).toBe('press_on');
  });
});

import { getPersona } from '../src/lib/game/ai/personas';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState, CompanyRestDecision } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/game/ai/types';

function g(): GameState {
  return createInitialState({
    seed: 'b', leader: { name: 'L', profession: 'farmer' },
    companions: [{ name: 'C', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}
const LAYBY: CompanyRestDecision = { mode: 'maintenance_layby', reason: 'test' };
const TRAVEL: CompanyRestDecision = { mode: 'travel', reason: 'test' };

describe('#1046B — shouldDissent persona surface', () => {
  const abiders: PersonaId[] = ['cautious', 'faithful', 'sunday_rester',
    'balanced', 'hoarder', 'generous', 'drinker'];
  it.each(abiders)('%s abides a lay-by', (id) => {
    expect(getPersona(id).shouldDissent(g(), LAYBY, makeRng('r'))).toBe('abide');
  });
  it.each(['aggressive', 'pace_pusher'] as PersonaId[])('%s presses on vs a lay-by', (id) => {
    expect(getPersona(id).shouldDissent(g(), LAYBY, makeRng('r'))).toBe('press_on');
  });
  it('nobody dissents a travel call', () => {
    for (const id of [...abiders, 'aggressive', 'pace_pusher', 'chaos'] as PersonaId[]) {
      expect(getPersona(id).shouldDissent(g(), TRAVEL, makeRng('r'))).toBe('abide');
    }
  });
  it('chaos rolls (abide-or-press) by rng', () => {
    const out = new Set(Array.from({ length: 30 },
      (_, i) => getPersona('chaos').shouldDissent(g(), LAYBY, makeRng(`c${i}`))));
    expect(out.has('press_on')).toBe(true);
    expect(out.has('abide')).toBe(true);
  });
});

import { dissentTrigger, resolveCompanyDissent } from '../src/lib/game/systems/company-rest';
import { generateTrain } from '../src/lib/game/content/trains';

function trainGame(doctrine: 'prudent' | 'hard_driver' | 'devout', leaderId = 'player'): GameState {
  const s = g();
  const t = generateTrain('bd', 1, null, makeRng('bd'), { fresh: true });
  return {
    ...s,
    wagonTrain: { ...t, doctrine, leaderId,
      companyDecisionBlock: { mode: 'maintenance_layby', blockStartDay: s.day } }
  };
}

describe('#1046B — dissentTrigger', () => {
  it('true only for captained train, *_layby, no recorded choice', () => {
    const s = trainGame('prudent');
    expect(dissentTrigger(s, 'maintenance_layby')).toBe(true);
    expect(dissentTrigger(s, 'travel')).toBe(false);
    expect(dissentTrigger(g(), 'maintenance_layby')).toBe(false);
    const decided = { ...s, wagonTrain: { ...s.wagonTrain!,
      companyDecisionBlock: { ...s.wagonTrain!.companyDecisionBlock!, dissentChoice: 'abide' as const } } };
    expect(dissentTrigger(decided, 'maintenance_layby')).toBe(false);
  });
});

describe('#1046B — resolveCompanyDissent', () => {
  it('abide records the choice, no other change', () => {
    const s = trainGame('prudent');
    const r = resolveCompanyDissent(s, 'abide', makeRng('x'));
    expect(r.wagonTrain!.companyDecisionBlock!.dissentChoice).toBe('abide');
    expect(r.morale).toBe(s.morale);
    expect(r.wagonTrain).not.toBeNull();
  });
  it('override (player captain) flips to travel, costs 5 morale', () => {
    const s = trainGame('prudent', 'player');
    const r = resolveCompanyDissent(s, 'override', makeRng('x'));
    expect(r.wagonTrain!.companyDecisionBlock!.dissentChoice).toBe('override');
    expect(r.morale).toBe(Math.max(0, s.morale - 5));
  });
  it('press_on splits the train + sets a re-join cooldown', () => {
    const s = trainGame('prudent');
    const r = resolveCompanyDissent(s, 'press_on', makeRng('x'));
    expect(r.wagonTrain ?? null).toBeNull();
    expect((r.flags._leftTrainCooldownUntilDay as number)).toBeGreaterThan(s.day);
  });
  it('lobby vs a devout captain on the Sabbath auto-fails', () => {
    const s0 = trainGame('devout', 'wagon-1');
    const s = { ...s0, date: { year: 1849, month: 6, day: 17 } }; // Sunday
    const r = resolveCompanyDissent(s, 'lobby', makeRng('x'));
    expect(r.wagonTrain!.companyDecisionBlock!.dissentChoice).toBe('lobby_fail');
    expect(r.morale).toBeLessThan(s.morale);
  });
  it('lobby can succeed (some seed flips it to lobby_ok)', () => {
    const s = trainGame('prudent', 'wagon-1');
    let ok = false;
    for (let i = 0; i < 60; i++) {
      const r = resolveCompanyDissent(s, 'lobby', makeRng(`ok${i}`));
      if (r.wagonTrain!.companyDecisionBlock!.dissentChoice === 'lobby_ok') { ok = true; break; }
    }
    expect(ok).toBe(true);
  });
});

import { tickDayPausable, applyCompanyDissent } from '../src/lib/game/engine-pausable';

describe('#1046B — crisis_layby is NOT dissent-eligible (C2 boundary)', () => {
  it('a crisis lay-by does not pause and the day advances in one tick', () => {
    const s0 = trainGame('prudent');
    const s: GameState = {
      ...s0,
      date: { year: 1849, month: 6, day: 18 }, // Monday
      party: s0.party.map((m, i) => (i === 0 ? { ...m, health: 15 } : m)), // < CRISIS_MIN_HP
      wagonTrain: { ...s0.wagonTrain!, companyDecisionBlock: undefined }
    };
    expect(dissentTrigger(s, 'crisis_layby')).toBe(false);
    const { state } = tickDayPausable(s);
    expect(state.flags._companyDissentPending).toBeFalsy();
    expect(state.day).toBe(s.day + 1); // C2 crisis contract: day still advances
  });
});

describe('#1046B — engine pause + applyCompanyDissent continuation', () => {
  function forcedLayby(): GameState {
    const s = trainGame('prudent');
    return {
      ...s,
      date: { year: 1849, month: 6, day: 18 },
      oxen: s.oxen.map((o) => ({ ...o, fatigue: 90 })),
      wagonTrain: { ...s.wagonTrain!, companyDecisionBlock: undefined,
        companions: s.wagonTrain!.companions.map((w) => ({ ...w, oxen: w.oxen.map((o) => ({ ...o, fatigue: 90 })) })) }
    };
  }
  function foodLb(s: GameState): number {
    const i = s.inventory;
    return (i.flour ?? 0) + (i.beans ?? 0) + (i.bacon ?? 0) + (i.hardtack ?? 0) + (i.jerky ?? 0) + (i.pemmican ?? 0);
  }
  it('first lay-by tick pauses; no miles; day NOT advanced', () => {
    const s = forcedLayby();
    const { state } = tickDayPausable(s);
    expect(state.flags._companyDissentPending).toBe(true);
    expect(state.location.milesTraveled).toBe(s.location.milesTraveled);
    expect(state.day).toBe(s.day);
  });
  it('applyCompanyDissent(override) → travels, day+1, no DECREASE in food (no double-drain)', () => {
    const paused = tickDayPausable(forcedLayby()).state;
    const f = foodLb(paused);
    const after = applyCompanyDissent(paused, 'override', makeRng('x'));
    expect(after.location.milesTraveled).toBeGreaterThan(paused.location.milesTraveled);
    expect(after.day).toBe(paused.day + 1);
    // #910 — generous NPC may share flour at layby/dissent → food can
    // INCREASE; what this test guards is "consumption not re-applied"
    // (no DECREASE in the continuation).
    expect(foodLb(after)).toBeGreaterThanOrEqual(f);
    expect(after.wagonTrain!.companyDecisionBlock!.dissentChoice).toBe('override');
  });
  it('applyCompanyDissent(abide) → no miles, day+1, no DECREASE in food (no double-drain)', () => {
    const paused = tickDayPausable(forcedLayby()).state;
    const f = foodLb(paused);
    const after = applyCompanyDissent(paused, 'abide', makeRng('x'));
    expect(after.location.milesTraveled).toBe(paused.location.milesTraveled);
    expect(after.day).toBe(paused.day + 1);
    // #910 — same as override: layby + generous NPC may add food via
    // train-share; the no-double-drain invariant is "no DECREASE."
    expect(foodLb(after)).toBeGreaterThanOrEqual(f);
  });
  it('applyCompanyDissent(press_on) → train left, travels solo, day+1, cooldown set', () => {
    const paused = tickDayPausable(forcedLayby()).state;
    const after = applyCompanyDissent(paused, 'press_on', makeRng('x'));
    expect(after.wagonTrain ?? null).toBeNull();
    expect(after.location.milesTraveled).toBeGreaterThan(paused.location.milesTraveled);
    expect(after.day).toBe(paused.day + 1);
    expect(after.flags._leftTrainCooldownUntilDay).toBeGreaterThan(paused.day);
  });
});

import { runBot } from '../src/lib/dev/bot/runner';

describe('#1046B — bot resolves the dissent pause (no spin/leak)', () => {
  // The pre-wiring bug: the bot loop spun on _companyDissentPending
  // without advancing the day. Correct behavior: shouldDissent →
  // applyCompanyDissent resolves it and the run progresses normally.
  // We assert the run COMPLETED its course with no errors and real
  // day progress — NOT that it arrived (a slow persona can legitimately
  // hit the 220-day cap; that is not a dissent failure).
  it('aggressive bot run progresses cleanly through dissent (no error, full run)', () => {
    const r = runBot({ seed: 'b-aggr-1', persona: 'aggressive',
      leaderProfession: 'farmer', partySize: 3, childCount: 0 });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(100); // real progress; a spin/leak on the pause would error or barely advance
  });
  it('balanced bot run progresses cleanly through dissent', () => {
    const r = runBot({ seed: 'b-bal-1', persona: 'balanced',
      leaderProfession: 'doctor', partySize: 4, childCount: 0 });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(100); // real progress; a spin/leak on the pause would error or barely advance
  });
});

describe('#1046B — left-train cooldown gates re-join', () => {
  it('press_on sets a future re-join cooldown on the flags', () => {
    const s = trainGame('prudent');
    const r = resolveCompanyDissent(s, 'press_on', makeRng('x'));
    expect(r.wagonTrain ?? null).toBeNull();
    expect((r.flags._leftTrainCooldownUntilDay as number)).toBeGreaterThan(s.day);
  });
});
