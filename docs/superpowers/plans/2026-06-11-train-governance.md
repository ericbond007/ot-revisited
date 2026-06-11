# Train Governance Under Pressure (#1304 tuning) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `docs/superpowers/specs/2026-06-11-train-governance-design.md` — 1-day crisis holds with sick-wagon drop-behind, and a pressure-aware train pace cap.

**Workspace:** `/home/eric/projects/hoosierTrail-1304-winter`, bookmark `feat/1304-winter-wall` (this extends the winter-wall branch; base is the family-drag probe commit `1a4b6e7e`).

**BEFORE baselines:** `docs/superpowers/specs/2026-06-11-family-drag-probe-results.md` (probe) + `/tmp/so-baseline.md` (SO 150×14, committed in the dcec9ab3 message).

---

### Task 1: Crisis hold = 1 day, then sick wagons drop behind

**Files:** `src/lib/game/systems/company-rest.ts` (CRISIS_HOLD_DAYS, crisis branch, dropWagonIds), `src/lib/game/types.ts` (CompanyRestDecision.dropWagonIds optional), `src/lib/game/engine-pausable.ts` (C2 apply block: remove dropped wagons + log), tests `tests/company-rest-1046.test.ts` (re-baseline 12-day-cap tests with justification) + new cases in a `train-governance-1304.test.ts`.

- [ ] Failing tests: crisis_layby fires on day 1 of an NPC-wagon crisis (unchanged); on the NEXT decision tick with the crisis persisting, decision is `travel` with `dropWagonIds` listing exactly the sub-20 NPC wagons; the apply site removes them from companions and logs one line each; the aggregate no longer sees them (day 3 = clean travel); player-party-only crisis → 1-day hold then plain travel, no dropWagonIds; a NEW sick wagon later starts a NEW 1-day hold.
- [ ] Implement. Replace CRISIS_MAX_DAYS=12 with CRISIS_HOLD_DAYS=1 (keep the constant name change honest — the old cap-comment block is rewritten to the period rationale, citing the research doc). Re-baseline the #1046 §13 cap tests with justification comments pointing at the research.
- [ ] Full `npm run verify`.

### Task 2: Pressure-aware companyPaceCap + DRY the clamp

**Files:** `src/lib/game/systems/company-rest.ts` (captainPressure extracted from the T4 block, companyPaceCap), `src/lib/game/systems/wagon-train.ts` (clampedPace consults the cap; lift log line w/ level-trigger flag `_trainPaceLiftFlagged`), `src/lib/game/systems/travel.ts` (milesPerDay uses clampedPace — delete the inline duplicate), tests.

- [ ] Failing tests: companyPaceCap = 'moderate' at pressure ok, 'fast' at behind and critical; clampedPace passes 'fast' through when cap is 'fast' but still downgrades 'grueling' → 'fast'(cap); milesPerDay honors the lifted clamp (fast base 26 reaches the multiplier chain in a behind-pressure train); regression-pin: pressure ok keeps today's exact moderate behavior; the lift log fires once per pressure episode.
- [ ] Implement. Check import direction first: if company-rest ← wagon-train cycles, host captainPressure/companyPaceCap in `ai/schedule.ts`. Verify `tickNpcWagon` ox fatigue consumes `ctx.pace` so NPC teams tire under the push (name the check in the commit message; fix if it doesn't).
- [ ] Full `npm run verify`.

### Task 3: Gates + ship (controller)

- [ ] AFTER probe: `npx tsx scripts/family-drag-probe.ts --runs 40 --out /tmp/family-drag-after.md` — crisis_layby zero-mile days A/B < 5 (was ~47); mi/moving day up.
- [ ] AFTER SO gate: `npx tsx scripts/arrival-timing.ts --model so --runs 150 --out /tmp/so-after-governance.md` — Traditional Family ≥ 30%, Mess 85-97%, no starvation resurgence.
- [ ] Full verify; commit with gate tables; push; report numbers to Dave (fix-3 decision pending the numbers).
