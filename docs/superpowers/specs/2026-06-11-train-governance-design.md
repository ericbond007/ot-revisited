# Train governance under pressure (#1304 tuning) — design

**Problem.** The family-drag probe (`2026-06-11-family-drag-probe-results.md`)
showed the SO model's 0% family arrivals are caused by wagon-TRAIN
membership, not children: (1) a crisis_layby hostage loop costs ~47
zero-mile days/run — `trainAggregate` minHP spans NPC wagons, a sick NPC
member at 4-19 HP pins the whole company, and the 12-day cap re-arms the
next day; (2) the #176 pace clamp silently discards ~100 fast-picks/run,
making the entire #1304 winter agent layer a no-op for train wagons.

**Historical basis** (`2026-06-11-train-governance-research.md`): companies
held ~1 day for imminent death/burial; week-long convalescence was
family-scale — the sick wagon dropped behind and the train went on. Late
companies DID push (longer days, 15→20 mi; Sabbath dropped; captain set
the march clock); the Donner disaster was a failure to push. Both fixes
are period-true; the current behavior is backwards.

**Scope:** fixes 1+2 of the package. Fix 3 (persona leave-train under
critical pressure — the `press_on` dissent choice already calls
`leaveTrain`) is deferred until the SO gate shows whether it's needed.

## 1. Sick-wagon accommodation: hold one day, then drop behind

`companyRestDecision` crisis branch (`company-rest.ts`) changes semantics:

- **Crisis hold lasts 1 day, not 12.** `CRISIS_MAX_DAYS` (12) is replaced
  by `CRISIS_HOLD_DAYS = 1` — the period death-watch/burial day (Bishop
  1849, Stout 1853). The first decision tick with `agg.minPartyHP <
  CRISIS_MIN_HP` (20) still returns `crisis_layby`.
- **If the crisis persists past the hold, the sick wagon(s) DROP BEHIND
  instead of pinning the company.** When `mode === 'crisis_layby'` has
  been held ≥ CRISIS_HOLD_DAYS and the aggregate is still in crisis:
  - Identify every NPC companion wagon whose min alive HP <
    CRISIS_MIN_HP. Return `{ mode: 'travel', reason: 'sick wagons drop
    behind to nurse their own', dropWagonIds: [...] }` —
    `CompanyRestDecision` gains an optional `dropWagonIds: string[]`.
  - The APPLY site (the C2 decision block in `engine-pausable.ts` where
    `companyRestDecision` is consumed) removes those wagons from
    `wagonTrain.companions` and logs one period line per wagon ("The
    <name> wagon drops behind to nurse their sick. The company rolls
    on."). No re-join mechanic (YAGNI — historically they caught up
    days later, but trains also gained wagons; model later if missed).
  - **If the only sub-20 group is the PLAYER's own party** there is
    nothing to drop: return `travel` after the hold (the company will
    not wait — Bruff's company never sent the promised relief). The
    player's own persona crisis-rest still lets the family lay by on
    its own; the company DECISION just no longer manufactures zero-mile
    days for a healthy player.
- The `EFFECTIVE_DEAD_HP` viable-wagon exclusion stays (corpse-in-motion
  wagons never pinned the aggregate anyway; now they also drop behind
  when the crisis persists — covered by the same minHP test).
- No serial re-trigger: the loop dies structurally — the pinning wagon
  leaves the aggregate. A NEW sick wagon starts a NEW 1-day hold
  (correct: a new death-watch).

## 2. Pressure-aware train pace: the clamp lifts when the captain is scared

- New pure helper in `company-rest.ts`: `companyPaceCap(state): Pace` —
  returns `'moderate'` under pressure `'ok'`, `'fast'` under `'behind'`
  or `'critical'`. Pressure computed from the captain's perspective via
  the SAME `DOCTRINE_PERSONA` → `doctrineFor` → `schedulePressure`
  machinery the T4 season term already uses — extract that block into a
  shared `captainPressure(state)` helper so the Sabbath/maintenance
  branch and the pace cap read one source. `'grueling'` stays forbidden
  in a train (companies lengthened days; they did not record-push).
- `clampedPace()` (`wagon-train.ts:55`) consults `companyPaceCap(state)`
  instead of hardcoding `'moderate'`: effective pace = the persona's
  pick capped at the company cap. Watch import cycles — if
  company-rest ← wagon-train would cycle, host both helpers in
  `ai/schedule.ts` instead.
- **DRY the duplicate clamp:** `milesPerDay()` (`travel.ts:89-94`)
  re-implements the clamp inline. Replace with a call to `clampedPace`
  so there is exactly one clamp site.
- One log line when the cap first lifts (level-trigger flag
  `_trainPaceLiftFlagged`, cleared when pressure returns to ok):
  "Captain orders longer marches — the company fears the snows in the
  passes." Period anchor: Breen, Oct 1846.
- The persona's own pick is still governed by `winterPaceBoost`'s
  ox-aware ceilings — the cap bounds the TRAIN, the boost bounds the
  TEAM. Forced pace on worn stock stays expensive (Scharmann 1849).

## Mandatory axes

- **NPC parity (#298):** both fixes live in the shared decision path —
  `companyRestDecision` + the C2 apply block in `tickDayPausable` serve
  the player, the bot, and NPC-captained trains identically. The lifted
  pace reaches NPC companion wagons through `NpcTickContext.pace`
  (verify `tickNpcWagon` ox-fatigue uses ctx.pace; their teams must
  tire faster under the push too). Solo NPC wagons are unaffected.
- **game-ai (#302):** no new persona surface. `companyPaceCap` consumes
  the existing shared brain (`schedulePressure` / `estimateSnowSafeDay`)
  — signal-honest: the captain reads the same observables as everyone.

## Out of scope

Fix 3 (persona leave-train under pressure); sick-wagon re-join; burial
ceremony content; player-facing modal changes (the existing dissent modal
copy still applies; if any tooltip hardcodes "trains always travel at
moderate pace", update the text only).

## Gates

BEFORE numbers are committed in `2026-06-11-family-drag-probe-results.md`
and `/tmp/so-baseline.md` (branch tip dcec9ab3).

1. `npx tsx scripts/family-drag-probe.ts --runs 40` — crisis_layby
   zero-mile days: A/B ~47 → **< 5**; mi/moving day for A/B up
   meaningfully (clamp lifts under autumn pressure).
2. `npx tsx scripts/arrival-timing.ts --model so --runs 150` —
   Traditional Family ≥ 30% (directional; the 60-75 band may need fix 3
   or further dials), '49er Mess stays 85-97%, no starvation resurgence,
   December ghost-arrivals stay snowed_in.
3. Full `npm run verify`.
