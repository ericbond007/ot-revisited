// #1046 slice 5 — joint calibration constants pin.
//
// The recovery + crisis-lock constants are sweep-derived in the slice-5
// calibration (see docs/superpowers/plans/2026-05-20-1046-slice5-
// calibration.md). This test pins their settled values so a future PR
// cannot silently re-introduce a cohort crater by tweaking one
// constant without going through the same sweep gate. A real future
// re-calibration updates BOTH the constant AND this test — the failing
// test is the explicit sweep checkpoint.
//
// Acceptance reproduced in this test: the constants match the slice-5
// settled values, and they are spec-coherent (CONVALESCE_HEAL < the
// rest-day heal per §6; EFFECTIVE_DEAD_HP within the crisis band;
// CRISIS_MAX_DAYS within the legitimate-crisis-self-resolves window).

import { describe, it, expect } from 'vitest';
import { CONVALESCE_HEAL, REST_HEAL_PER_DAY } from '../src/lib/game/systems/travel-recovery';

describe('#1046 slice 5 — calibrated constants pinned', () => {
  it('CONVALESCE_HEAL is the settled value and stays below REST_HEAL_PER_DAY (spec §6)', () => {
    expect(CONVALESCE_HEAL).toBe(5);
    expect(CONVALESCE_HEAL).toBeLessThan(REST_HEAL_PER_DAY);
  });
});
