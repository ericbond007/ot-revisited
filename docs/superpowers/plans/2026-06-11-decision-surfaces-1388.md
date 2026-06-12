# Decision-surface fixes (#1388) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development task-by-task. Tasks are SEQUENTIAL — they all touch `ai/personas.ts`.

**Goal:** Fix the four verified HIGH gaps from the #1361 audit
(`docs/superpowers/specs/2026-06-11-bot-decision-audit-1361.md`).

**ERRATA on the audit doc (apply in T1):** the audit's HIGH #2
("pickWaterRation ignores active party dehydration") is a FALSE POSITIVE —
there is no member-level dehydration condition; dehydration is the
party-level `_dehydrationDays` dry-day counter (`systems/dehydration.ts`)
that only ticks at total water 0, where rationing is moot. Add an errata
note to the audit doc; do not implement it.

**Workspace:** `/home/eric/projects/hoosierTrail-1388-surfaces`, bookmark
`feat/1388-decision-surfaces`, base master f5a05b31.

**Gates:** BEFORE = `docs/superpowers/specs/2026-06-11-so-final-1304.md`
(SO 150×14 at f5a05b31). AFTER at branch tip, same seeds. Acceptance: no
PASS row regresses out of band; ford-death distribution shifts seasonally
sane (fewer August ferry fees, no June drowning spike beyond SO noise);
full `npm run verify` green per task.

---

### Task 1: Seasonal river depth — engine + persona read the same water

**Files:** new `src/lib/game/systems/river-season.ts`, `src/lib/game/actions/ford.ts`
(risk consumes effective depth), `ai/personas.ts` (pickFordMethod all
personas), tests; errata edit to the audit doc.

- Helper `effectiveRiverDepth(river, date, weather): number` — base
  `river.depthFt` × seasonal multiplier (snowmelt: May–mid-June ≈ 1.4,
  late June 1.2, July 1.0, Aug–Sep 0.75, Oct 0.85) × recent-rain bump
  (storm/rain today ≈ +15%). Named constants, period comment (June
  snowmelt vs August trickle; Bear River #1144 anchor).
- `ford()` uses effective depth wherever it uses `river.depthFt` for
  drown/loss risk today (read the action first; keep the same curve,
  swap the input). SIGNAL-HONEST: agents and engine read one helper.
- `pickFordMethod`: cautious/balanced/aggressive consult effective depth
  + min party HP: shallow (≤ ~2.5 ft effective) → ford is safe, even
  cautious fords (saves the ferry fee); deep (≥ ~4 ft) → prefer
  ferry/native_ferry, caulk only with cash short; low min-HP biases one
  rung safer. Persona ORDER/flavor preserved (cautious still safest).
- NPC parity: find where NPC/train wagons ford (grep tickNpcWagon /
  wagon-train for ford) and confirm they flow through the same action
  risk; if NPCs have a separate ford roll, feed it the helper too.
- Tests: helper table-test; ford risk differs May vs August same river;
  cautious fords in August/ferries in June (fixed seed); regression-pin
  one existing ford test re-baselined with justification.

### Task 2: Ox-swap + repair triggers read the terrain ahead

**Files:** `ai/foresight.ts` (new `mountainMilesInNextGap(state)` or
equivalent — scan LANDMARKS from current position to the next post with
the relevant service, summing miles of 'mountains' terrain legs),
`ai/personas.ts` (gapAwareOxHealthFloor + gapAwareRepairTrigger consume
it; pickOxSwapCount adds a recent-ox-death bump), tests.

- Floors: mountain miles ahead ≥ ~40 → treat as the next-larger gap tier
  (the existing 150/200-mi escalation reuses its own ladder — no new
  magic curve). Season term for repair: after ~Sep 1 (DOY ≈ 244) the
  repair-trigger floor rises one tier (late-season repairs are
  load-bearing; cite Marcy stock-first + the winter wall).
- Recent-death bump: dead oxen still in `state.oxen` (health 0) — if
  ≥ 2 dead, `pickOxSwapCount` wants +1 (clamped by cash logic as today).
- Tests: helper counts Blues/Cascades miles correctly from two fixture
  positions; floor escalates entering Fort Boise (Blues ahead) vs Fort
  Kearny (prairie); death bump fires at 2 dead, not 1.

### Task 3: Event choices read party composition

**Files:** `ai/personas.ts` (`saferHealthChoice` + a small
`partyRiskAversion(state)` helper), tests.

- `partyRiskAversion(state)`: 'high' when live children > 0, 'normal'
  otherwise; live Doctor grants one notch of confidence on HEALTH events
  (the doctor can treat what goes wrong).
- Behavior: with children aboard, balanced/aggressive also route through
  `saferHealthChoice` on healthish events (today only cautious/balanced
  do — aggressive overrides; keep aggressive's override UNLESS children
  are aboard). With a live Doctor and no children, behavior unchanged
  (the audit's "defer to Doctor" reads as: don't get MORE timid than
  today). Scope strictly to the existing saferHealthChoice surface — no
  new per-event logic.
- Tests: same health event, same seed — aggressive WITH children picks
  the safe choice, without children keeps today's pick (regression pin);
  cautious unchanged.

### Task 4: Gates + ship (controller)

- `npx tsx scripts/arrival-timing.ts --model so --runs 150` vs the
  so-final baseline; acceptance per header. Full verify. PR with gate
  tables; Opus review of the branch diff; CI; merge; VK #1388 close;
  workspace cleanup.
