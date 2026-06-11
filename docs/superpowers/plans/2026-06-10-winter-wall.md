# Winter Wall (#1304) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `docs/superpowers/specs/2026-06-10-winter-wall-design.md` — hidden-severity winter, two mountain gates (storm escalation → closure rolls → snowed_in ending), seasonal grazing decline, signal-honest news/gossip, the shared `estimateSnowSafeDay` agent brain, and the player projected-arrival chip.

**Workspace:** `/home/eric/projects/hoosierTrail-1304-winter`, bookmark `feat/1304-winter-wall`, base master `fc87ea0e` (#1284 in).

**BEFORE baselines:** `/tmp/bot-stats-1284-final.md`; arrival-timing regenerated at T6 from master via the committed script.

**Order matters:** T1 (core winter) → T2 (grazing) → T3 (signals) → T4 (agents) → T5 (UI chip) → T6 (gates/ship). T4 depends on T3's flags; T5 depends on T4's estimator.

---

### Task 1: Winter core — severity, zones, storm escalation, closures, snowed_in

**Files:** `src/lib/game/types.ts` (Outcome union + flags), `src/lib/game/engine.ts` (severity roll at createInitialState), `src/lib/game/systems/weather.ts` (zone/calendar escalation), new `src/lib/game/systems/winter.ts` (zones, dates, closure logic), `src/lib/game/engine-pausable.ts` + `src/lib/game/systems/travel.ts` (closure holds travel), `src/lib/game/systems/wagon-train.ts`/`npc-engine.ts` (NPC parity), end-screen copy (grep how 'wiped' renders in EndScreen.svelte + tombstone), tests `tests/winter-wall-1304.test.ts`.

- [ ] Failing tests: severity roll deterministic from seed, one of early/normal/late, stored hidden (`_winterSeverity`), never in any UI string; zone predicate (`winterZoneAt(trailPosition)` → 'blues' | 'cascades' | null) derived from landmark positions; storm-floor escalation (in-zone October snow probability ≥ floor, rising; out-of-zone unchanged vs master — regression-pin a couple of (terrain, season) weights); closure: in-zone snowstorm from Nov 1 (severity-shifted) can set `_passClosedUntil`; while closed, a travel day moves 0 miles + logs; closure duration 2–6 days; snowed_in: deep-winter closure (Dec 1 normal, shifted) → `completed: true, outcome: 'snowed_in'`; NPC wagons in-zone share the closure (train holds) and can roll snowed_in.
- [ ] Implement. Severity shifts ALL dates ±14 (one helper `severityShift(state)` in winter.ts — single source). Closure check lives where the in-zone storm is known (driver level in tickDayPausable after weather, sub-rng `winter:${seed}:${day}`); travel.ts no-ops under `_passClosedUntil >= day` with a log line. Outcome union + EndScreen: add 'snowed_in' rendering (period copy — the company is snowbound; epilogue text references the food running out; reuse tombstone framing). Keep numbers as named constants in winter.ts with the spec's example values; the gate tunes them.
- [ ] Full verify; re-baselines justified (weather-weight pins, outcome unions in serializers/scoring).

### Task 2: Seasonal grazing decline

**Files:** `src/lib/game/systems/oxen.ts` (consumeOxenFeed / effectiveGrazing), tests.

- [ ] Failing tests: grazing efficiency = 1.0 through Aug; declines via Sept–Oct; ~0.4 floor from Nov (exact curve as named constants); applies in both player + NPC paths (shared math — one unit test on the helper + one NPC synth check).
- [ ] Implement as a calendar multiplier inside the existing grazing math (period comment: autumn grass dies; emigrant stock starved late-season). Full verify; ox-recovery test re-baselines justified.

### Task 3: Signals — news schedule, first-snow flag, fort gossip

**Files:** `src/lib/game/systems/news.ts`, flags, tests.

- [ ] Failing tests: first mountain-snow news appears no earlier than (Sep 20/Oct 5/Oct 20 by severity, ±jitter ≤5d, sub-rng); tone escalates with calendar (3 tiers of copy); `_firstSnowNewsDay` flag set when the first item surfaces; fort-gossip lines at ft_hall/ft_boise/whitman_mission repeat the current tier; NO signal string or flag ever encodes the severity word itself.
- [ ] Implement against the existing news plumbing (the "Heavy snow is in the high passes" line is the tier-3 anchor). Full verify.

### Task 4: Agent layer — estimator, seasonal pressure, family inversion, governance

**Files:** `src/lib/game/ai/schedule.ts` (estimateSnowSafeDay + seasonal schedulePressure + family inversion), `src/lib/game/ai/personas.ts` (pace upgrade under pressure; sabbath holds until critical for sacred), `src/lib/game/systems/company-rest.ts` (season term), tests.

- [ ] Failing tests: `estimateSnowSafeDay` = baseline 185 when no signals; drops as `_firstSnowNewsDay` is earlier + frost-day count rises (pure function, table-test it); schedulePressure measures against min(doctrine target, estimate); family branch now TIGHTENS (−10) instead of exempting (regression-flip the #1235 tests with justification); persona responses: balanced under 'critical' picks fast pace (health floors hold); faithful keeps Sabbath at 'behind', breaks at 'critical'; companyRestDecision under behind+ defers maintenance lay-bys and suppresses non-devout Sabbath; dissent still fires for devout members (existing tests keep passing).
- [ ] Implement. The estimator reads ONLY observable flags from T3 + weather history. Full verify; #1235-era tests re-baseline with explicit justification comments.

### Task 5: Player chip

**Files:** the top bar component (grep src/lib/ui for TopBar/date display), small `ProjectedArrival.svelte` or inline; tests + MANDATORY visual check.

- [ ] Implement: "At this pace: ~Nov 9" chip calling projectedArrivalDay + estimateSnowSafeDay; colors ok/behind/critical (theme tokens, broadsheet style); hidden before MIN_JUDGE_DAYS (estimator returns null); Z Fold 4 width degrades to icon+date.
- [ ] Verify + dev server (`systemd-run --user --unit=ot-dev npm run dev`) + Playwright screenshot of the chip in all three states (drive via dev scenarios / loadScenario) — UI changes get eyes per project rule. Stop the unit after.

### Task 6: Gates + ship (controller)

- [ ] Graduate the timing probe to `scripts/arrival-timing.ts` (relative imports, --runs/--out flags, severity-bucket columns: arrivals + Blues-clear day by severity).
- [ ] BEFORE: run timing script against master (throwaway master workspace or jj checkout dance). AFTER: bot-stats-250 + arrival-timing on the branch (250×10, same seeds).
- [ ] Verdict per spec §6: histogram splits; normal-severity arrivals ~60–75%; aggressive/pace_pusher ≥85%; December arrivals → snowed_in; severity-bucketed legibility check ('early'-year runs clear the Blues sooner than 'late'); persona medians compress toward Oct; no starvation resurgence; watch-fors (grueling-into-ox-death, closure death-spiral fairness).
- [ ] Full verify; PR (gate tables incl. the legibility proof, re-baseline list); Opus whole-branch review; CI; merge; VK #1304 close + #1280 close-or-note (the pacing pressure now exists); memory update (winter wall shipped); workspace cleanup.

## Self-review
- Spec §1→T1, §2→T2, §3→T3, §4→T4, §5→T5, §6→T6; out-of-scope fenced. Names consistent: `_winterSeverity`, `winterZoneAt`, `severityShift`, `_passClosedUntil`, `_firstSnowNewsDay`, `estimateSnowSafeDay`, outcome `snowed_in`. T-order respects data dependencies. Tuning constants named in winter.ts; the gate, not the plan, owns final values.
