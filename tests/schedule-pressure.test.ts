import { describe, it, expect } from 'vitest';
import {
  projectedArrivalDay,
  schedulePressure,
  personaScheduleDoctrine,
  doctrineFor,
  TOTAL_TRAIL_MI,
  suppressCamp,
  allowsSabbathRest,
  tooFragileToPush
} from '../src/lib/game/ai/schedule';
import type { GameState } from '../src/lib/game/types';
import type { PersonaId } from '../src/lib/game/ai/types';

function stateAt(day: number, miles: number): GameState {
  return { day, location: { milesTraveled: miles } } as unknown as GameState;
}

describe('projectedArrivalDay', () => {
  it('returns null before the judge thresholds (too early)', () => {
    expect(projectedArrivalDay(stateAt(10, 200))).toBeNull();
    expect(projectedArrivalDay(stateAt(30, 50))).toBeNull();
  });
  it('projects linearly from average pace', () => {
    const halfway = TOTAL_TRAIL_MI / 2;
    expect(projectedArrivalDay(stateAt(100, halfway))).toBeCloseTo(200, 0);
  });
});

describe('schedulePressure', () => {
  it('is ok when too early to judge', () => {
    expect(schedulePressure(stateAt(10, 50), 185)).toBe('ok');
  });
  it('is ok when projected arrival beats the target', () => {
    expect(schedulePressure(stateAt(100, TOTAL_TRAIL_MI * 0.67), 185)).toBe('ok');
  });
  it('is behind when projected is past target but within the critical margin', () => {
    const miles = (TOTAL_TRAIL_MI * 100) / 195;
    expect(schedulePressure(stateAt(100, miles), 185)).toBe('behind');
  });
  it('is critical when projected is far past target', () => {
    const miles = (TOTAL_TRAIL_MI * 100) / 210;
    expect(schedulePressure(stateAt(100, miles), 185)).toBe('critical');
  });
  it('is always ok when the target is null (chaos ignores the clock)', () => {
    const miles = (TOTAL_TRAIL_MI * 100) / 260;
    expect(schedulePressure(stateAt(100, miles), null)).toBe('ok');
  });
});

describe('personaScheduleDoctrine', () => {
  const ids = [
    'cautious','balanced','aggressive','chaos','sunday_rester',
    'pace_pusher','hoarder','generous','faithful','drinker'
  ] as const;
  it('has an entry for every persona', () => {
    for (const id of ids) expect(personaScheduleDoctrine[id]).toBeDefined();
  });
  it('marks only faithful + sunday_rester sabbath-sacred', () => {
    for (const id of ids) {
      const sacred = personaScheduleDoctrine[id].sabbathSacred;
      expect(sacred).toBe(id === 'faithful' || id === 'sunday_rester');
    }
  });
  it('chaos ignores the clock (null target)', () => {
    expect(personaScheduleDoctrine.chaos.targetArrivalDay).toBeNull();
  });
  it('doctrineFor returns the entry for a known id', () => {
    expect(doctrineFor('pace_pusher')).toEqual(personaScheduleDoctrine.pace_pusher);
  });
  it('doctrineFor falls back to balanced for an unknown id', () => {
    // Deliberate invalid id to exercise the defensive `?? balanced` fallback
    // (a corrupt save / future persona could yield an id not in the map).
    expect(doctrineFor('nonexistent' as unknown as PersonaId))
      .toEqual(personaScheduleDoctrine.balanced);
  });
});

describe('suppressCamp', () => {
  const behindState = stateAt(100, (TOTAL_TRAIL_MI * 100) / 210);
  const onTimeState = stateAt(100, TOTAL_TRAIL_MI * 0.67);

  it('does not suppress when on schedule', () => {
    expect(suppressCamp(onTimeState, 'balanced', 'hunt', { foodOnHand: 100 })).toBe(false);
    expect(suppressCamp(onTimeState, 'balanced', 'pan')).toBe(false);
  });
  it('suppresses discretionary hunt/pan when behind', () => {
    expect(suppressCamp(behindState, 'balanced', 'hunt', { foodOnHand: 100 })).toBe(true);
    expect(suppressCamp(behindState, 'balanced', 'pan')).toBe(true);
  });
  it('never suppresses hunt when near starvation (critical override)', () => {
    expect(suppressCamp(behindState, 'balanced', 'hunt', { foodOnHand: 20 })).toBe(false);
  });
  it('suppresses opportunistic find-water but never a near-empty keg', () => {
    expect(suppressCamp(behindState, 'balanced', 'findWater', { waterRatio: 0.5 })).toBe(true);
    expect(suppressCamp(behindState, 'balanced', 'findWater', { waterRatio: 0.1 })).toBe(false);
  });
  it('never suppresses for chaos (ignores the clock)', () => {
    expect(suppressCamp(behindState, 'chaos', 'hunt', { foodOnHand: 100 })).toBe(false);
  });
});

describe('allowsSabbathRest', () => {
  const behindState = stateAt(100, (TOTAL_TRAIL_MI * 100) / 210);
  const onTimeState = stateAt(100, TOTAL_TRAIL_MI * 0.67);
  it('allows Sabbath when on schedule for everyone', () => {
    expect(allowsSabbathRest(onTimeState, 'balanced')).toBe(true);
  });
  it('cuts Sabbath for non-sacred personas when behind', () => {
    expect(allowsSabbathRest(behindState, 'balanced')).toBe(false);
  });
  it('keeps Sabbath sacred for faithful + sunday_rester even when behind', () => {
    expect(allowsSabbathRest(behindState, 'faithful')).toBe(true);
    expect(allowsSabbathRest(behindState, 'sunday_rester')).toBe(true);
  });
});

describe('tooFragileToPush', () => {
  const behind = (extra: Record<string, unknown>) => ({
    day: 100, location: { milesTraveled: (TOTAL_TRAIL_MI * 100) / 219 },
    morale: 90, party: [{ dead: false, kind: 'adult', health: 95 }], ...extra
  }) as unknown as GameState;

  it('is false for a robust adult-only party', () => {
    expect(tooFragileToPush(behind({}))).toBe(false);
  });
  it('is true when any living child is present (family wagons not pushed)', () => {
    expect(tooFragileToPush(behind({
      party: [{ dead: false, kind: 'adult', health: 95 }, { dead: false, kind: 'child', health: 95 }]
    }))).toBe(true);
  });
  it('morale alone no longer makes a party fragile (#1235b — keyed on HP)', () => {
    // Healthy but demoralised + behind schedule -> pushable (push on grumpy).
    expect(tooFragileToPush(behind({ morale: 20 }))).toBe(false);
  });
  it('is true when min HP is below the push floor', () => {
    expect(tooFragileToPush(behind({ party: [{ dead: false, kind: 'adult', health: 50 }] }))).toBe(true);
  });
  it('a behind family wagon does not suppress camping (gate stands down)', () => {
    const fam = behind({ party: [{ dead: false, kind: 'adult', health: 95 }, { dead: false, kind: 'child', health: 95 }] });
    expect(suppressCamp(fam, 'balanced', 'hunt', { foodOnHand: 100 })).toBe(false);
    expect(allowsSabbathRest(fam, 'balanced')).toBe(true);
  });
});
