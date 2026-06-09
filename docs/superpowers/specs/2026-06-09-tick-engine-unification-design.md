# Tick-Engine Unification (#1266) — Design

**Ticket:** #1266. **Date:** 2026-06-09. **Author:** HAL (with Dave).

**Goal:** Replace the 3–4 hand-maintained copies of the daily-simulation order with **one canonical day-tick engine** driven by thin per-context adapters, so a new system is wired **once** and every context (live player, headless/test, NPC wagon, rest day) inherits it. NPC wagons run the **full** daily-system list and finally match the player. Compact NPC state is preserved.

## Why (the drift problem, with evidence)

The day's simulation order is currently typed out **by hand in three places**, with a fourth for rest days:

1. `tickDay` (`engine.ts` `DAILY_STEPS`) — pure reduce; **tests + headless only**. The most drifted: missing spoilage, cleanliness, ambient-water, pastry, theft, recovery, sabbath-debit, the whole train block. Auto-resolves events inline.
2. `tickDayPausable` (`engine-pausable.ts`) — the **real player/bot path**; pauses for modals.
3. `tickNpcWagon` (`npc-engine.ts`) — per NPC wagon; runs the real systems via the synth/project bridge but **hand-lists its own order** with a drifted subset.
4. `rest()` (`actions/rest.ts`) — rest/camp days; its own ordering again.

This duplication is a proven, recurring bug class:
- **#939** was a **14-slice campaign** to delete NPC parallel reimplementations and route them through the engine via the synth bridge (it fixed silent numeric drift — NPCs kept missing bonuses the player got).
- **#1264 (ox-thirst)** shipped wired into `tickDay` only; the player experienced **nothing** until six byte-identical sweeps were traced to the missing `tickDayPausable` wiring (PR #245).
- **`pushMoraleHistory`** (the PartyPanel morale sparkline) runs **only** in `tickDay`. In real play it never executes — the sparkline has **never worked** for a live player (latent bug since commit `e68d418`, Apr 2026).
- The NPC ordering has **visibly drifted**: it skips the cleanliness chain (`decayCleanliness`/`applyDirtyMorale`/`applyFilthDiseaseRisk`) and `applyAmbientWaterRefill` entirely, runs theft last vs the player's mid-tick, runs sabbath-debit early, etc. So NPC wagon hygiene literally isn't simulated.
- The **dissent-override** continuation (`applyCompanyDissent`) and `applyPendingChoice` travel branches **skip `tickOxen`/`tickWagon`/`applyDehydration`** — press-through days charge no ox fatigue, no wagon wear, no dehydration.
- The **synth bridge only carries 4 flag families** (`spoilDays`/`dryDays`/`greaseMiles`/`starvationDays`); every other persistent `flags._*` is discarded on projection. This already causes **two live bugs**: NPC coffee/tea **never depletes** (`_hotDrinkClock` lost → infinite hot-drink morale), and NPCs **re-fire the holiday morale bump every tick** on Jul 4 / Christmas (`_july4Year`/`_christmasYear` lost — *and a code comment falsely claims they round-trip*).

## Goal architecture

One canonical engine over a declarative step list, consumed by thin drivers.

### 1. The canonical step list — `DAILY_STEPS`

A single ordered array of **step descriptors** (new module, e.g. `src/lib/game/daily-steps.ts`). Each entry:

```ts
interface DailyStep {
  id: string;                 // 'progressConditions', 'tickOxen', 'rollEvent', …
  run: (s: GameState, rng: Rng) => GameState;  // the real engine system fn
  travelGated?: boolean;      // skipped on a rest/lay-by day (tickOxen, applyTravel, ambientWater, …)
  pauseCapable?: boolean;     // may surface a pendingEvent (rollEvent, arrival, approach)
  scope?: 'both' | 'playerOnly' | 'npcOnly';  // default 'both'
  rngIsolated?: boolean;      // must draw from a derived sub-rng, not the shared stream (camp bundle)
}
```

The list is the **single source of truth for the daily order**. `pauseCapable` steps return a marker the driver interprets (yield vs auto-resolve). The order is taken from the current `tickDayPausable` (the real path) — making it canonical means `tickDay` and `tickNpcWagon` adopt the player's order, which is the intended behavior change.

### 2. The engine core — `runDailySteps(state, rng, driver)`

Iterates `DAILY_STEPS`, honoring each step's metadata against the driver's policy:
- skip `travelGated` steps when `driver.traveled === false`;
- skip `playerOnly`/`npcOnly` steps that don't match `driver.kind`;
- for `pauseCapable` steps, call `driver.handlePause(step, state)` which either **yields** (player) or **auto-resolves with the default choice** (headless + NPC) and continues;
- for `rngIsolated` steps, pass a derived sub-rng;
- apply each step via `driver.apply(step.run, state)` — the player/headless driver runs it directly on `GameState`; the NPC driver runs it through **synth → step → project**.

### 3. The three drivers (thin adapters)

| Driver | `apply` | pause policy | extras it owns |
|---|---|---|---|
| **player** (`tickDayPausable`) | direct on `GameState` | **yield** `pendingEvent` | train orchestration (company-rest decision, dissent, elections, `advanceTrain`, post-restock), landmark arrival/approach, the live tail continuations (`applyPendingChoice`/`applyCompanyDissent`) |
| **headless** (`tickDay`) | direct on `GameState` | **auto-resolve** default choice | nothing extra; loops to day-end |
| **npc** (one wagon, in `tickNpcWagon`) | **synth → step → project** | **auto-resolve** | NPC-only patches (`applyNpcMoraleBaseline`, storm-damage), sub-rng camp bundle; runs **the full list** |

Per-driver "extras" are explicitly **NOT** list entries — they are genuinely train-level, pause-level, or context-specific. Everything else lives in the one list.

### 4. The flag-bridge generalization (prerequisite)

The synth bridge must carry **every persistent `flags._*`** the engine writes, not just the 4 counters — otherwise running more systems on NPCs widens the lossy-projection surface. Add a persistent-flag passthrough to `NpcWagonState` (an explicit `persistentFlags?: Record<string, number>` or typed fields), and have `npcFlagsFromWagon` / `npcFieldsFromFlags` pack/unpack the full persistent set. This single fix closes **hot-drinks** (`_hotDrinkClock`), **holidays** (`_july4Year`/`_christmasYear`), `_cannibalismCount`, and any future persistent flag. **Same-tick** flags (e.g. `_lastFoodShortfall`, `_pastryDrawnLb`) need no bridging — they are produced and consumed within one synth and discarded correctly. Delete/fix the false round-trip comment at `npc-engine.ts:367-369`.

## What stays exactly as-is (load-bearing — do NOT change)

- **Compact `NpcWagonState`.** 5–12 wagons serialize to the DB **every tick**; a full `GameState` each would ~12× the save payload and re-introduce the train-recursion hazard. The synth bridge is the NPC driver's state adapter — that is the "custom handler for that state." **No promoting NPCs to full `GameState`.**
- **`SYNTH_TRAIN_STUB`** (empty-companions fake train) — keeps train-aware systems (morale +1/day, theft share-watch halving) firing for NPCs while preventing recursion. Keep.
- **Sub-RNG isolation rule** — any per-wagon step that consumes rng **conditionally** must draw from a derived sub-rng (`makeRng('step:${day}:${name}')`), never the shared stream, or it desyncs later wagons' rolls. Encoded as the `rngIsolated` flag; the refactor must honor it for every newly-added rng-consuming NPC step.
- **Train-shared fields** (location/date/weather/pace) live on the train env, not per wagon. The synth fills them from `TrainEnv`; the projection discards them. Keep.

## Bugs this fixes (free wins)

1. **Morale sparkline** starts working in real play (`pushMoraleHistory` runs in the unified end-of-tick, reached by all drivers/continuations).
2. **NPC hygiene** is simulated (cleanliness chain + ambient-water now run on NPCs — **zero new bridge fields needed**, per the audit).
3. **NPC hot drinks** deplete correctly (`_hotDrinkClock` bridged).
4. **NPC holidays** fire once per year, not every tick (`_july4Year`/`_christmasYear` bridged).
5. **Press-through (dissent-override) days** charge ox fatigue + wagon wear + dehydration (the continuation runs the same list).
6. **`tickDay`** (test engine) becomes the real engine — tests exercise the live path.

## Staged delivery (each stage ships independently, reduces drift)

Sequenced by risk. Each stage is its own plan → PR with `npm run verify` + the relevant sweep.

- **Stage 0 — Flag-bridge generalization (prerequisite).** Persistent-flag passthrough on `NpcWagonState` + pack/unpack; fix the false comment. Fixes hot-drinks + holidays **on the current NPC list** (no list change yet). Smallest, isolatable, ships the two NPC bugs immediately. Gate: NPC-train sweep neutral-or-better; unit tests for hot-drink depletion + holiday once-per-year on a synth round-trip.
- **Stage 1 — Canonical list + player/headless drivers.** Extract `DAILY_STEPS`; refactor `tickDayPausable` to run it (behavior-preserving for the live path — the order IS today's player order); re-point `tickDay` as the headless driver (auto-resolve, restore `pushMoraleHistory`); fix the dissent-override / `applyPendingChoice` missing-systems gap. **Re-baseline** the value-asserting tests (`smoke`, `engine-integration`, `events-integration`) — the test engine now equals the real engine. Gate: persona sweep neutral (player path order unchanged); full verify.
- **Stage 2 — NPC driver onto the full list.** `tickNpcWagon` runs `DAILY_STEPS` via synth/project instead of its hand-list; add the cleanliness chain + ambient-water; keep the NPC-only extras + sub-rng rule. Retire the hand-rolled NPC ordering. Gate: **full wagon-train sweep** (NPCs now take cleanliness/hygiene penalties + corrected hot-drink/holiday — this WILL shift train balance; confirm the shift is the intended parity correction and nothing craters).
- **Stage 3 — `rest()` onto the list (optional / follow-on).** Rest/camp day = the list with `traveled:false`. Folds the 4th ordering in. Gate: rest-action tests + camp-finish parity.

The drift problem is **solved after Stage 1** (one source of truth for the order, all player/test paths through it). Stages 2–3 retire the remaining hand-copies.

## Testing

- **Unit:** `DAILY_STEPS` is a pure data list; the engine core is table-driven and unit-testable (a step list + a fake driver → assert call order + pause handling). Stage 0: synth round-trip tests proving `_hotDrinkClock`/holiday flags persist. Stage 2: NPC-runs-full-list assertions (an NPC wagon's cleanliness decays; hot-drink tin depletes).
- **Re-baseline (Stage 1):** `smoke`, `engine-integration`, `events-integration` exact-value snapshots shift because the headless engine now runs the ~20 systems + returns events. Update to the new (correct) snapshots; keep the determinism assertions.
- **Sweeps (per memory: ~1k runs, never 60k):**
  - Stage 1 — **persona sweep** (`--runs 2`, 6 shapes) BEFORE/AFTER: must be **neutral** (the player order is unchanged; only `tickDay`/headless changes, which the sweep doesn't use — so this is a regression guard, expect ~identical).
  - Stage 2 — **full wagon-train sweep** BEFORE/AFTER: NPC train survival/composition WILL move (NPCs now simulate hygiene + corrected hot-drink/holiday). PASS = the shift is a coherent parity correction (NPC outcomes move toward player-equivalent), no crater, no NaN/undefined, deterministic.

## Non-goals / out of scope

- **No promoting NPCs to full `GameState`** (rejected — 12× save payload, recursion hazard).
- **No new gameplay** — this is a structural unification; the only behavior changes are the bug fixes enumerated above (sparkline, NPC hygiene, hot-drinks, holidays, press-through wear) and the deliberate "test engine = real engine" re-baseline.
- **No adding firewood-gated systems to NPCs** (`attemptFire`) — `resources.firewood` is stubbed `0` in the synth; would need a bridge field first. Out of scope.
- **No unifying the train-level orchestration** (`companyRestDecision`, elections, `advanceTrain`) into the per-day list — they are genuinely train-scoped and stay in the player driver.

## Open questions for the plan stage

- Exact shape of the persistent-flag passthrough (explicit typed fields vs a generic `Record`) — typed is safer (no stringly-typed drift) but more verbose; lean typed for the known persistent flags + a guarded generic fallback.
- Whether `applyAmbientWaterRefill` should be `travelGated` for NPCs (it is travel-only in the player path) — yes, tag `travelGated`.
- How `pauseCapable` steps express "the default choice" for the headless/NPC auto-resolve — reuse the existing `fireEvent` default-choice logic (`event.choices.find(isDefault) ?? choices[0]`).
