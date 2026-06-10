# Water Corridors (#1280/#1281) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quality-aware river-adjacent ambient water refill (`waterCorridor: 'clean' | 'murky'`), the missing Snake/Columbia point-access landmarks, and the Farewell Bend geography fix — per `docs/superpowers/specs/2026-06-09-water-corridor-design.md` (the spec) and `2026-06-09-water-corridor-research.md` (the per-leg table, canonical for flags).

**Architecture:** One new branch in `applyAmbientWaterRefill` keyed off a `corridorForLeg(state)` helper that reads the approached landmark's flag. Content-only changes elsewhere (landmark catalog). Bot-side: find-water triggers read total water. Mechanic lands inert (T1, no flags set), content activates it (T2–T4), bots adapt (T5), gates decide the pre-registered cholera lever (T6).

**Tech stack:** TypeScript, vitest, jj. Workspace `/home/eric/projects/hoosierTrail-1281-water`, bookmark `feat/1281-water-corridor`, base master `69272750`.

**BEFORE baselines (already captured on identical engine code, same seeds):** `/tmp/bot-stats-250.md` + `/tmp/leg-pacing-1280.md` (2026-06-09). Master since then changed only dev-harness/docs files — these ARE the BEFORE.

---

### Task 1: Mechanic — `waterCorridor` type + `corridorForLeg` + refill branch (inert)

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (Landmark interface only)
- Modify: `src/lib/game/systems/consumption.ts` (`applyAmbientWaterRefill`)
- Test: new `tests/water-corridor-1281.test.ts`

- [ ] **Step 1: failing tests** — `tests/water-corridor-1281.test.ts`. Build minimal states with `createInitialState` (see tests/actions/rest.test.ts for the helper pattern), then override `location.nextLandmarkId` to a STUBBED landmark id; since the catalog won't have flags until T2, test via a real landmark you temporarily expect undefined for, plus unit-test `corridorForLeg` directly by passing states pointing at catalog ids — and test the refill math by calling `applyAmbientWaterRefill` on hand-built states. Concretely:
  1. `corridorForLeg(state)` returns undefined for an unflagged landmark (e.g. nextLandmarkId 'independence_mo').
  2. clean corridor: state with water 10/30 on a leg whose landmark you monkey-patch is NOT acceptable — instead export the branch logic so it's testable: implement `applyAmbientWaterRefill(state, rng, corridorOverride?)` — NO. Keep it simple: the function reads `corridorForLeg(state)`; the TESTS for clean/murky math use a tiny exported pure helper `applyCorridorRefill(state, kind)` that the main function calls. Test that helper directly:
     - clean, water 10/cap 30 → water 15, dirtyWater unchanged.
     - clean, water 28/cap 30 → water 30 (clamped).
     - murky, water 10 + dirty 5, cap 30 → dirty 10, water unchanged.
     - murky, water 20 + dirty 8, cap 30 → dirty 10 (clamped to cap − water − dirty room: +2).
     - murky at full (water+dirty == cap) → unchanged object.
  3. Terrain table fallback untouched: desert state, no corridor → no refill; river terrain → +5 (existing behavior, regression guard).
- [ ] **Step 2: run, FAIL** (helpers don't exist).
- [ ] **Step 3: implement** —

landmarks.ts, inside `Landmark`:
```ts
  /** #1281 — the LEG ARRIVING AT this landmark runs beside accessible water.
   *  'clean' = potable (Sweetwater, Boise, Bear); 'murky' = accessible but
   *  filthy (the Platte — refills dirtyWater, the 1849 cholera story).
   *  Absent = rim/point/dry: ambient refill stays terrain-based. */
  waterCorridor?: 'clean' | 'murky';
```

consumption.ts:
```ts
import { getLandmark } from '../content/landmarks';

/** #1281 — corridor classification for the leg being traveled, read off the
 *  landmark the party is approaching. Null nextLandmarkId (end of trail) or
 *  unknown id → no corridor. */
export function corridorForLeg(state: GameState): 'clean' | 'murky' | undefined {
  const nextId = state.location.nextLandmarkId;
  if (!nextId) return undefined;
  try { return getLandmark(nextId).waterCorridor; } catch { return undefined; }
}

/** #1281 — daily corridor refill. Clean tops the keg; murky fills dirtyWater
 *  (clamped so water + dirtyWater <= waterCap) — drinkable (#1136: dirty
 *  counts as hydration) but it feeds applyDirtyWaterRisk. */
export function applyCorridorRefill(state: GameState, kind: 'clean' | 'murky'): GameState {
  const { water, waterCap } = state.resources;
  const dirty = state.resources.dirtyWater ?? 0;
  if (kind === 'clean') {
    const added = Math.min(Math.max(0, waterCap - water), CORRIDOR_REFILL_GAL);
    if (added <= 0) return state;
    return { ...state, resources: { ...state.resources, water: water + added } };
  }
  const room = Math.max(0, waterCap - water - dirty);
  const added = Math.min(room, CORRIDOR_REFILL_GAL);
  if (added <= 0) return state;
  return { ...state, resources: { ...state.resources, dirtyWater: dirty + added } };
}

export const CORRIDOR_REFILL_GAL = 5; // river-grade: the water is right there
```

In `applyAmbientWaterRefill`, FIRST line of the body:
```ts
  const corridor = corridorForLeg(state);
  if (corridor) return applyCorridorRefill(state, corridor);
  // ...existing terrain table unchanged...
```
Note: the corridor branch consumes NO rng — document with a comment that this is
deliberate (deterministic like river terrain; keeps the rng stream identical for
unflagged legs, which is ALL legs until T2 → T1 is behavior-inert).

- [ ] **Step 4: tests pass + full `npm run verify`** — expect ZERO existing-test changes (no catalog flags exist yet; every state takes the terrain path).
- [ ] **Step 5: commit** (controller).

### Task 2: Content — corridor flags per the research table

**Files:**
- Modify: `src/lib/game/content/landmarks.ts` (flag ~33 landmarks)
- Test: extend `tests/water-corridor-1281.test.ts`

- [ ] **Step 1: derive the flag list** from `docs/superpowers/specs/2026-06-09-water-corridor-research.md` ("game-flag recommendation" column) cross-checked against spec §1. Rules: flag goes ON the landmark the leg ARRIVES at; CORRIDOR rows → 'clean' or 'murky' per the table's quality notes (Platte legs murky; Kansas/Blue, Sweetwater, Bear/Portneuf, Boise valley, Powder/Grande Ronde/Umatilla clean; Burnt River murky); RIM/POINT/DRY rows → no flag. The Ash Hollow ridgeback legs (windlass_hill, ash_hollow arrivals) and the Caspar→Independence Rock dry-drive legs stay UNFLAGGED.
- [ ] **Step 2: failing test** — spine-style content locks in the test file:
  1. Named spot-checks: `getLandmark('ft_kearny').waterCorridor === 'murky'`-style for ~8 representative ids (a Platte murky, Sweetwater clean, ash_hollow undefined, a Snake rim undefined, three_island-arrival… use the actual arriving-landmark ids from the table).
  2. Count lock: number of flagged landmarks equals the table's corridor count (state the number in the test with a comment pointing at the research doc).
  3. Dry-drive guard: every landmark between fort_caspar (exclusive) and independence_rock (inclusive→exclusive per table) has NO flag.
- [ ] **Step 3: apply the flags**, run tests + full verify. Existing tests that hand-build states on flagged legs may shift (water no longer drains) — re-baseline only with per-case justification; anything weird = STOP.
- [ ] **Step 4: report** the complete id→flag mapping in the task report for controller cross-check against the appendix. Commit (controller).

### Task 3: New point-access landmarks (Snake ×2, Columbia plateau ×up-to-4)

**Files:**
- Modify: `src/lib/game/content/landmarks.ts`
- Test: extend `tests/water-corridor-1281.test.ts`

- [ ] **Step 1: check existing coverage** — grep the catalog for umatilla/john day/deschutes/willow creek: any already present as river-kind landmarks satisfy the requirement (a ford IS a water access). Only add what's missing.
- [ ] **Step 2: failing tests** —
  1. Total-trail-miles invariant: `LANDMARKS.reduce((s,l)=>s+l.milesFromPrevious,0)` equals the CURRENT total (compute it first and hard-code; this test predates the insertions and survives them).
  2. New landmarks exist with `kind: 'landmark'`, `waterSource: true`, sensible terrain (desert for Snake rim, prairie for plateau), and the split legs sum to the original (`american_falls.milesFromPrevious + gate_of_death.milesFromPrevious === old gate_of_death.milesFromPrevious` — read the old values first and assert the sums).
- [ ] **Step 3: insert** — `american_falls` ~10 mi after ft_hall; `rock_creek_snake` splitting gate_of_death→salmon_falls near its midpoint; Columbia plateau crossings per Step 1 findings, splitting whitman_mission→ft_walla_walla→the_dalles legs at the table's approximate positions. Names/blurbs: short period-accurate (American Falls of the Snake; Rock Creek; Umatilla River crossing; etc.). Follow the existing waterSource landmark entries (salmon_falls) as the template, including any art-component registration the catalog requires — check how salmon_falls is referenced in src/lib/ui landmark-art registries and add plain placeholders the same way other GAP landmarks are handled (grep for an existing GAP/no-art landmark to copy the pattern; do NOT create decorated SVG art).
- [ ] **Step 4: full verify** — landmark-count-pinned tests will shift (re-baseline with justification); arrival/approach event tests should be unaffected (new landmarks have no events). Run a 3-run bot smoke (`npx tsx scripts/bot-stats-250.ts --runs 3 --out /tmp/t3-smoke.md`) to prove no runtime explosion at the new ids. Commit (controller).

### Task 4: Farewell Bend geography fix

**Files:**
- Modify: `src/lib/game/content/landmarks.ts`
- Test: extend `tests/water-corridor-1281.test.ts`

- [ ] **Step 1: failing test** — order lock: indexOf(farewell_bend) < indexOf(burnt_river_canyon) < indexOf(flagstaff_hill); farewell_bend has waterSource true and terrain !== 'desert' (use 'river' or 'prairie' per the research note); total-miles invariant from T3 still green.
- [ ] **Step 2: reorder** the three entries (ft_boise → farewell_bend → burnt_river_canyon → flagstaff_hill), redistribute milesFromPrevious so each leg is plausible (research: Boise→Farewell Bend ~40mi along the Snake, then Burnt River canyon ~25mi, then Flagstaff ~15mi — keep the SUM identical to the old three legs + adjust blue_mountains' milesFromPrevious if needed to preserve the total), retype farewell_bend, add waterSource. Murky/clean flags from T2: burnt_river_canyon arrival = 'murky' (the brackish creek leg), flagstaff_hill arrival = unflagged or per table.
- [ ] **Step 3: full verify** — tests pinned to the old order/legs re-baseline with justification (likely: landmark research-doc tests, period-gate tests, scenario fixtures that drop at these ids). Anything that semantically depends on farewell_bend being post-Burnt-River is itself the bug — fix forward. Commit (controller).

### Task 5: Bot/AI water-trigger adjustments

**Files:**
- Modify: `src/lib/dev/bot/runner.ts` (rest-primary election)
- Audit/modify: persona `shouldFindWater` implementations (grep `shouldFindWater` under src/lib/game/ai/)
- Audit: `src/lib/game/ai/bundle.ts` boil_water urgency
- Test: extend `tests/water-corridor-1281.test.ts` (persona-level unit checks where impls change)

- [ ] **Step 1:** runner election: `const ratio = cap > 0 ? state.resources.water / cap : 1` → total: `(state.resources.water + (state.resources.dirtyWater ?? 0)) / cap`. Comment: #1281 — dehydration runs on total (#1136); clean-only ratio burned find_water days on full-but-dirty Platte kegs.
- [ ] **Step 2:** grep every persona `shouldFindWater` — any that read clean-only water/cap get the same total-water treatment (keep persona-specific thresholds). Report each change.
- [ ] **Step 3:** read bundle.ts boil_water urgency scoring — confirm it triggers when dirtyWater is high + firewood ≥ 1 + canBoilWater; if it never fires for knowledge parties on murky corridors, raise its urgency weight minimally and note it. NO behavior change for non-knowledge parties.
- [ ] **Step 4:** full verify; bot-behavior tests may re-baseline (justify each). Commit (controller).

### Task 6: Gates + ship (controller-driven)

- [ ] Full `npm run verify`.
- [ ] AFTER harness runs: `npx tsx scripts/bot-stats-250.ts --runs 250 --out /tmp/bot-stats-250-after.md` and `npx tsx scripts/leg-pacing-1280.ts --runs 250 --out /tmp/leg-pacing-after.md`.
- [ ] Verdict vs the BEFORE files, per spec §6: corridor dry% ~0; find_water days collapsed; dehydration share well below 70% and confined to rim/dry legs; arrivals up, no persona craters; starvation not 1:1 replacing dehydration; Platte cholera/dysentery up modestly — if it over-rotates (cholera deaths rivaling the old dehydration count), implement the §2 fraction-scaling lever (`chance × dirtyDrawn/waterNeeded` in applyDirtyWaterRisk, min-clamped so a sip isn't free) as Task 6b with its own re-gate.
- [ ] PR (body: design summary, both gate tables, re-baseline list, the historical research citation), Opus whole-branch review, CI, merge, VK #1280/#1281 updates (this closes #1281; #1280 keeps the late-trail rest-spiral remainder — re-measure and note), Icons/Backgrounds follow-up tickets for the new landmarks' art, workspace cleanup.

## Self-review

- Spec coverage: §1→T2, §2→T1(+T6b lever), §3→T3, §4→T4, §5→T5, §6→T6. ✔
- T1 is provably inert (no flags in catalog) — safe first commit. ✔
- Type names consistent: `waterCorridor`, `corridorForLeg`, `applyCorridorRefill`, `CORRIDOR_REFILL_GAL` used identically across tasks. ✔
- No placeholders: flag list delegated to the committed research appendix table by design (canonical source), with count-lock + spot-checks pinning it in tests. ✔
