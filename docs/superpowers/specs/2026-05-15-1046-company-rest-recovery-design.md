# #1046 — Unified Company Rest & Recovery Model — Design

**Tickets:** VK #1046 (ride-in-wagon convalescence) + VK #1041 (company-level Sabbath + maintenance-rest cadence + train-rest coherence), designed as one coupled system.
**Surfaced by:** the #921 aggressive rebalance + the Oregon Trail historical check (a wagon train almost never halted for one person's illness — the sick rode in the wagon; stops were collective and captain-governed).
**Status:** design approved section-by-section; pre-implementation.

---

## 1. Problem

Two coupled modeling gaps produce the same failure (a party that slowly dies because it never recovers and never coherently rests), from opposite ends:

- **Recovery gap (#1046).** `travel-recovery.ts` (#161) gives a passive +1 HP/day **only to condition-free** members (explicit comment: a passive heal would "undermine the condition's pressure"). A *condition-burdened* member on a travel day therefore gets **only** the condition's negative `dailyHealthDelta` — zero counter — vs. the rest action's unconditional `+8 × healingMultiplier`. So the sick recover in camp but pure-decline on the move. Historically wrong: the sick rode in the wagon and a provisioned, tended company mended them slowly even in motion. Separately, **conditions never clear on their own** — only `resolvedByItems` (scurvy→fruit) or the 25%/day `treatmentItems` cure roll. `daysSinceOnset` is tracked but never read. Real diseases ran a course (recover or die).
- **Governance gap (#1041).** `advanceTrain(traveled)` flows entirely from the lead/player wagon; NPC wagons only "conserve individually" (`npc-engine.ts` ~316, #937) and cannot lag or halt the train. Sabbath is a per-wagon persona toggle, so one wagon's persona unilaterally sets train policy (`sundayRester` drags a secular company into Sabbath; a devout NPC in a secular-led train can't make the company lay by). Secular companies have **no maintenance-rest cadence** — their only rest trigger is crisis-level.

## 2. Decisions (locked)

| # | Decision |
|---|---|
| Scope | One **unified "company rest & recovery"** spec (not standalone), #1046 + #1041 together. |
| Disease recovery | **Add** care-gated *spontaneous* condition resolution (duration-based natural course), in addition to item paths. |
| Build order | **Governance-first**: C (captain authority) → B (maintenance/Sabbath triggers) → A+D (recovery math) → joint sweep calibration. |
| Who decides | **Captain decides, player may dissent.** Train captain (`wagon-train-leader.ts` #286) sets the company doctrine; player may abide / lobby / press on solo. |
| Cadence driver | **Captain-profile spectrum, condition-aware.** Fixed doctrine per captain; the *decision* it produces is condition-driven (aggregate train state thresholds), not a blind calendar. |
| Success metric | **Fidelity-driven, sweep-gated.** No persona×demographic cohort may crater; overall arrival period-defensible (bachelor higher, 2/2 family lower); #921r aggressive holds-or-improves under captain authority. |
| `tended` | **Passive-derived** state, not a player action: `hasFood && hasWater && morale≥25`; live doctor = ×1.5; existing `doctorVisit`/camp-actions remain optional boosters. No new action/UI. |
| Save migration | **Out of scope.** No migration, backfill, migration tests, or #191 coordination. Breaking old saves is acceptable. (Per durable user instruction.) |
| Architecture | **Approach 1 — captain-authority layer.** A single daily company-rest decision; governance and recovery-math cleanly separated. |

## 3. Architecture

A new pure function **`companyRestDecision(state) → { mode, reason }`**, `mode ∈ {travel, sabbath_layby, maintenance_layby, crisis_layby}`, lives with the captain in `wagon-train-leader.ts` (extends #286's existing propose/vote rest-day surface). Computed **once per day**; single source of truth.

```
day tick
  └─ captained train?
       ├─ yes → companyRestDecision(state)
       │         ├─ mode=travel    → travel; advanceTrain(traveled=true)
       │         └─ mode=*_layby   → company rests; if player≠captain, dissent prompt
       └─ no  → existing solo per-wagon shouldRest path (UNCHANGED)
  THEN (governance-agnostic, per-member math keyed only on "did the wagon move"):
    • travel day      → travel-recovery.ts   (A: condition-burdened get partial heal)
    • layby/rest day  → rest.ts heal          (unchanged +8×healingMult)
    • every day       → progressConditions    (D: care-gated spontaneous-resolve roll)
```

The recovery half is governance-agnostic so A/D calibrate without touching C, and C is testable without recovery rates.

**Touch points:** `wagon-train-leader.ts` (decision + doctrine), `wagon-train.ts` (advanceTrain consumes decision), `engine-pausable.ts` / play route (player day consults it, surfaces dissent), `npc-engine.ts` (NPC wagons follow company decision, not per-persona; A/D parity wiring), `travel-recovery.ts` + `conditions.ts` (recovery math), `ai/personas.ts` + `ai/types.ts` (`shouldDissent` surface, doctrine mapping).

## 4. C — Captain doctrine + daily decision

**Doctrine** = fixed personality assigned to the captain wagon at train formation, derived from the captain NPC's persona/profile (`aggressive`-family → `hard_driver`; `cautious`/`faithful` → `devout`; else → `prudent`). Static for the journey; the decision it produces is dynamic. Doctrine *parameters* are static content (code, like `dailyHealthDelta`); only *which* doctrine is on the train state.

| Doctrine | Sabbath | Maintenance lay-by trigger | Crisis floor (always) |
|---|---|---|---|
| `hard_driver` | no | avg ox-fatigue > 65 **or** min party HP < 25 | minHP<20 ‖ oxen worn-out |
| `prudent` | no | avg ox-fatigue > 50 **or** min party HP < 40 (≈ every 6–9 d) | "" |
| `devout` | weekly | prudent thresholds as a floor | "" |

(Threshold values are starting points; final values are sweep-derived in calibration.)

**`companyRestDecision`** — precedence **crisis > sabbath > maintenance > travel**:
1. **crisis_layby** — aggregate train true emergency (existing universal floor; even hard-driver stops). Holds until out of crisis.
2. **sabbath_layby** — `devout` doctrine **and** Sabbath day. 1 day.
3. **maintenance_layby** — doctrine condition trigger crossed. **Hysteresis:** holds until avg ox-fatigue < trigger − 15 and minHP recovered a margin (no 1-day-rest-then-instant-retrigger thrash). Typically 1–3 days.
4. **travel** — otherwise.

**Aggregate state = whole company, weakest-wagon-weighted:** avg ox-fatigue across *all* train wagons; *min* party HP across *all* wagons. The captain watches the company, and the train historically moved at the condition of its worst wagon.

**Doctrine ownership:**
- **Player ≠ captain (typical):** NPC captain's doctrine binds; decision drives the day; player gets dissent prompt on `*_layby`.
- **Player = captain (#285 elections exist):** player *sets* the doctrine **once at captaincy start** (train formation, or upon winning an election) via the captain's-log UI — it is then static like an NPC captain's, not re-settable at whim. Per-day deviations from that doctrine's call use the existing #286 leader-override (one day flipped at the standing morale cost), *not* a doctrine re-set. NPCs follow.
- **Solo (no train):** unchanged per-wagon `shouldRest`; Sabbath stays a persona trait for solo bot personas; human solo rests manually.

## 5. C — Player dissent flow

Trigger: player ≠ captain and the company call differs from what the player wants. Pausable modal (event-modal pattern), shown **once per decision block** (a 3-day maintenance lay-by prompts once; "abide" sticky for the block unless the player reopens the captain's-log).

1. **Abide** — follow the company. Default, zero cost.
2. **Lobby the captain** — one gated roll (deliberately simple, YAGNI): success = base 35% + player-wagon-morale modifier − prior-failed-lobby penalty − doctrine stubbornness; a **devout captain never skips the Sabbath** (auto-fail w/ flavor). Success → captain changes that block's call. Failure → small standing/morale nick. One attempt per block.
3. **Press on solo / lay by solo** — split from the train: forfeit shared night watch (→ more/worse night events), news feed, +1 train morale/day, water cross-pour, crisis-share, captain `doctorVisit`. Travel solo (back to the per-wagon path). Sets the **left-train cooldown** so the same company isn't instantly re-offered; cooldown decays over N days/miles, then the #127 encounter-join path re-enables (possibly a different captain → different doctrine).

## 6. A — In-motion convalescence (`travel-recovery.ts`)

New: condition-burdened members get a **partial** travel-day heal, deliberately weaker than rest (a jolting springless wagon is a worse sickbed than camp).

- Base `CONVALESCE_HEAL` ≈ **+3/day** (vs. rest +8, vs. #161 condition-free +1). Starting value; sweep-tuned.
- **Care gate (`tended`, passive-derived):** `hasFood && hasWater(no dry-streak) && morale ≥ 25`. Untended → **no convalesce heal → pure decline** (historically correct).
- **Doctor** ×1.5 (stacks with the existing condition-damage relief). **Pace:** slow/moderate full; fast/grueling reduced (mirrors #161).
- Existing #161 +1 for condition-free members stays; both live in `travel-recovery.ts`.
- **Calibration intent:** tended + minor condition (dysentery/measles −3) → ≈ net-flat HP (survive, slowly mend). Tended + severe (cholera −7) → still net-negative (slows the spiral, buys days, but cholera can still kill — danger preserved per #161's "over-survivability tanked arrival to 0%" warning). Untended anything → decline.

## 7. D — Care-gated spontaneous resolution (`progressConditions`)

`daysSinceOnset` becomes load-bearing (read, not just incremented). After the existing item paths (resolver, 25%/day treatment cure — **medicine stays the fastest path**), add a natural-course roll:

- New `ConditionMeta.naturalCourseDays` (+ `minCourseDays`): dysentery ≈8, cholera ≈5 (short-but-deadly), typhoid ≈14, measles ≈10, exhaustion ≈3; injuries (broken_leg/snakebite/frostbite/bear_mauling) longer; scurvy stays item-resolved; `starvation`/`pox` stay markers (no spontaneous resolve). Starting values; sweep-tuned.
- Once `daysSinceOnset ≥ minCourseDays`, a daily resolve chance **rising with duration**, **scaled by care**: tended → normal curve; doctor → accelerated; untended → roll **suppressed** (you don't recover while also starving — you decline to death); hardship (storm / exposure terrain) slows it.
- **Guardrail (sweep-enforced):** fed/watered party survives most *minor* conditions over ≈ a week; cholera/typhoid still frequently kill without medicine; *any* untended condition still spirals. Numbers not asserted in spec — set by the calibration sweep.
- **Correctness obligation:** D only behaves if every condition-add path initializes `daysSinceOnset`. Audit all condition-add sites (not a save concern — live-mechanic correctness).

## 8. NPC parity + game-AI

- **D parity is free** — `progressConditions` already runs per-NPC-wagon via the `synthesizeWagonState` bridge in `npc-engine.ts`.
- **A parity must be wired** — `travel-recovery.ts` is player-day-only today; `npc-engine`'s travel path must call `applyTravelDayRecovery` on the synth. **Verify the synth carries every field the new code reads** (food inventory, `resources.water` + dry-streak, `morale`, pace, `daysSinceOnset`) *before* wiring — the #921r `fauxState` crash lesson (a missing field crash-loops every train).
- **Captain decision supersedes per-wagon `shouldRest` in a train** — this *is* the governance-first fix. In a captained train, `npc-engine`'s per-persona "conserve individually" gate is replaced by following `companyRestDecision`. Per-persona `shouldRest` governs only a *solo* bot wagon.
- **Bot-player dissent surface** — new `shouldDissent(state, decision, rng)` persona method (#302 game-ai layer): `aggressive`/`pace_pusher` → press-on-solo vs a lay-by; `cautious`/`faithful`/`sunday_rester` → abide (latter two welcome Sabbath); `balanced`/`hoarder`/`generous`/`drinker` → abide; `chaos` → roll. Captain doctrine is itself persona-derived (§4).
- **Known interaction:** an `aggressive` player in a `prudent`-captain train now rests more than `aggressive.shouldRest` alone would — the persona no longer solely governs rest in-company. Intended consequence; #921r must be **re-validated under captain authority** in the joint sweep (the sweep already runs trains → in-scope, not a regression).

## 9. Data model

Sized for clarity (no migration-driven minimization):
- Train **`doctrine`**: `'hard_driver' | 'prudent' | 'devout'`.
- **Company-decision-block** record on train state: `{ mode, blockStartDay, dissentChoice }` (drives hysteresis + once-per-block prompt).
- **Left-train cooldown** field: set on "press on solo"; decays over N days/miles; gates #127 re-join.
- `daysSinceOnset` **reused** (DRY — already exists and is the correct field; a parallel counter would desync). Not a migration decision.
- `naturalCourseDays`/`minCourseDays`: static `ConditionMeta` content, not save state.

**No save migration.** Not in scope; old saves may break.

## 10. Testing & sweep-calibration

- **Unit per part:** `companyRestDecision` (every doctrine × crisis/sabbath/maintenance/travel; hysteresis non-thrash; weakest-wagon aggregation; player-captain branch). Dissent (abide / lobby-roll gating / devout-Sabbath auto-fail / split forfeits benefits / cooldown / re-join). A (tended vs untended; doctor ×1.5; pace gating; minor≈net-flat vs cholera still net-negative). D (duration curve; untended suppression; doctor accel; medicine still fastest; danger preserved).
- **Integration:** NPC-train parity (sick NPC convalesces identically; train follows captain not per-persona).
- **Sweep gate (fidelity-driven, no cohort crater):** final values for `CONVALESCE_HEAL`, `naturalCourseDays`, doctrine thresholds are **sweep-derived**, tuned via the established jj-restore-master before/after harness across persona × profession × demographic. Acceptance: no cohort regresses beyond noise; arrival period-defensible (bachelor higher, 2/2 family lower); #921r aggressive holds-or-improves under captain authority.
- `npm run verify` green throughout; type errors are bugs.

## 11. Build slicing (governance-first, ~5 PRs, each independently green + sweep-checkpointed)

1. **C1** — doctrine type + `companyRestDecision` pure fn + unit tests (unwired).
2. **C2** — wire decision into `advanceTrain` / player-day / `npc-engine` (replaces in-train per-persona `shouldRest`). Sweep checkpoint (governance-only; characterize the arrival shift).
3. **B** — condition-aware maintenance/Sabbath triggers folded into the decision + dissent flow + `shouldDissent` persona surface + left-train cooldown. Sweep checkpoint.
4. **A+D** — recovery math (`travel-recovery` extend + `progressConditions` natural-course) + NPC-parity wiring (verify synth fields first).
5. **Joint calibration** — full-sweep tune; lock `CONVALESCE_HEAL` / `naturalCourseDays` / doctrine thresholds against the no-crater gate.

## 12. Cross-references

#1046 (this), #1041 (subsumed — Gap 1 = §4 captain authority, Gap 2 = §4 maintenance trigger), #921/#921r (re-validated under captain authority, §8), #161 (`travel-recovery.ts` extended by A; its over-survivability warning is the D guardrail), #127 (re-join after split), #286 (`wagon-train-leader.ts` — decision host), #285 (captain elections — player-captain branch), #937 (`npc-engine` shouldRest parity, superseded in-train), #302 (game-ai layer — `shouldDissent`). #191 explicitly NOT a dependency (save migration out of scope).
