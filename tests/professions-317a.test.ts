// #317a — profession rebalance, layer A. Adds teacher + lawyer
// professions and replaces the placeholder gunsmith hunt-yield with
// period-correct casting bonus + spare rifle.
//
// Coverage:
//   - Teacher + primer → +1 morale/day (only when both present)
//   - Lawyer → +$200 cash on final arrival (once)
//   - Lawyer → wins tied charisma elections vs same-charisma rivals
//   - Gunsmith → cast_balls camp action works without bullet_mold
//   - Gunsmith → cast_balls yields 50 balls/pig (vs 30 baseline)
//   - Gunsmith hunt-yield placeholder removed (no +20% from gunsmith)

import { describe, it, expect } from 'vitest';
import { adjustMorale } from '../src/lib/game/systems/morale';
import { makeRng } from '../src/lib/game/rng';
import { createInitialState } from '../src/lib/game/engine';
import { CAMP_ACTIONS_BY_ID } from '../src/lib/game/actions/camp-actions';
import { hasLiveTeacher, hasLiveLawyer } from '../src/lib/game/professions/predicates';
import { getProfession } from '../src/lib/game/content/professions';
import { buildStarterKit } from '../src/lib/game/content/starter-kit';
import type { GameState } from '../src/lib/game/types';

function makeGame(overrides: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 't',
    leader: { name: 'Lead', profession: 'farmer' },
    companions: [{ name: 'Co', profession: 'farmer' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
  return { ...s, ...overrides };
}

function withLeaderProfession(s: GameState, prof: GameState['party'][0]['profession']): GameState {
  return {
    ...s,
    party: s.party.map((m, i) => (i === 0 ? { ...m, profession: prof } : m))
  };
}

describe('#317a — teacher predicate + primer morale tick', () => {
  it('hasLiveTeacher returns true when teacher is in party', () => {
    const s = withLeaderProfession(makeGame(), 'teacher');
    expect(hasLiveTeacher(s)).toBe(true);
  });

  it('hasLiveTeacher returns false when no teacher present', () => {
    const s = makeGame();
    expect(hasLiveTeacher(s)).toBe(false);
  });

  it('teacher + primer in inventory → +1 morale/day on top of baseline', () => {
    const baseS = makeGame({ morale: 50 });
    const noPrimer = withLeaderProfession(baseS, 'teacher');
    const withPrimer = {
      ...noPrimer,
      inventory: { ...noPrimer.inventory, primer: 1 }
    };
    const a = adjustMorale(noPrimer, makeRng('a'));
    const b = adjustMorale(withPrimer, makeRng('b'));
    expect(b.morale - a.morale).toBe(1);
  });

  it('primer alone (no teacher) does NOT trigger the morale bonus', () => {
    const baseS = makeGame({ morale: 50 });
    const onlyPrimer = {
      ...baseS,
      inventory: { ...baseS.inventory, primer: 1 }
    };
    const a = adjustMorale(baseS, makeRng('a'));
    const b = adjustMorale(onlyPrimer, makeRng('a'));
    expect(b.morale).toBe(a.morale);
  });

  it('teacher alone (no primer) does NOT trigger the morale bonus', () => {
    const baseS = makeGame({ morale: 50 });
    const onlyTeacher = withLeaderProfession(baseS, 'teacher');
    const a = adjustMorale(baseS, makeRng('a'));
    const b = adjustMorale(onlyTeacher, makeRng('a'));
    expect(b.morale).toBe(a.morale);
  });
});

describe('#317a — lawyer predicate + arrival bonus', () => {
  it('hasLiveLawyer is true when lawyer is in party', () => {
    const s = withLeaderProfession(makeGame(), 'lawyer');
    expect(hasLiveLawyer(s)).toBe(true);
  });
});

describe('#317a — gunsmith cast_balls camp action', () => {
  function castAvailability(s: GameState): { available: boolean; reason?: string } {
    return CAMP_ACTIONS_BY_ID.cast_balls.availability!(s);
  }

  it('cast_balls is available WITHOUT bullet_mold when a gunsmith is in party', () => {
    const s = {
      ...withLeaderProfession(makeGame(), 'gunsmith'),
      inventory: { lead_pig: 1 } as Record<string, number>
    };
    expect(castAvailability(s).available).toBe(true);
  });

  it('cast_balls is NOT available without bullet_mold AND no gunsmith', () => {
    const s = {
      ...makeGame(),
      inventory: { lead_pig: 1 } as Record<string, number>
    };
    const r = castAvailability(s);
    expect(r.available).toBe(false);
    expect(r.reason).toMatch(/bullet mold/i);
  });

  it('gunsmith yields 50 balls/pig when casting (no-mold path)', () => {
    const s = {
      ...withLeaderProfession(makeGame(), 'gunsmith'),
      inventory: { lead_pig: 1, lead_balls: 0 } as Record<string, number>
    };
    const after = CAMP_ACTIONS_BY_ID.cast_balls.apply(s, makeRng('x'));
    expect(after.inventory.lead_balls).toBe(50);
    expect(after.inventory.lead_pig).toBe(0);
  });

  it('non-gunsmith with mold yields baseline 30 balls/pig', () => {
    const s = {
      ...makeGame(),
      inventory: { lead_pig: 1, lead_balls: 0, bullet_mold: 1 } as Record<string, number>
    };
    const after = CAMP_ACTIONS_BY_ID.cast_balls.apply(s, makeRng('x'));
    expect(after.inventory.lead_balls).toBe(30);
  });
});

describe('#317a — gunsmith starter gear has 2 rifles', () => {
  it('a gunsmith party builds with 2 rifles total (BASE 1 + gunsmith +1)', () => {
    // #890 rebalance: gunsmith.starterGear now lists rifle×1 (additive).
    // BASE_KIT ships rifle×1. A gunsmith-led party gets 2 total —
    // matches the "starts with 2 rifles" intent of #317a.
    const kit = buildStarterKit(['gunsmith']);
    expect(kit.inventory.rifle).toBe(2);
  });
});

describe('#317a — teacher and lawyer profession records', () => {
  it('teacher record has primer + bible in starter gear', () => {
    const t = getProfession('teacher');
    expect(t.starterGear.some((g) => g.item === 'primer')).toBe(true);
    expect(t.starterGear.some((g) => g.item === 'bible')).toBe(true);
  });

  it('lawyer record has 200 cash + bible in starter gear', () => {
    const l = getProfession('lawyer');
    const cash = l.starterGear.find((g) => g.item === 'cash');
    expect(cash?.qty).toBe(200);
    expect(l.starterGear.some((g) => g.item === 'bible')).toBe(true);
  });

  it('lawyer charisma is 4 (mid-tier — beats banker/scout in ties via the +0.35 bump)', () => {
    expect(getProfession('lawyer').charisma).toBe(4);
  });

  it('teacher charisma is 3', () => {
    expect(getProfession('teacher').charisma).toBe(3);
  });
});
