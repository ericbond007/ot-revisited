# NPC AI gap audit — VK #896

**Date:** 2026-05-07. **Branch:** `feat/npc-ai-gap-audit-896`. **Sequence:** slice 2 of 3 (1: wire #895 ✅ → **4: audit #896 ← here** → 2: baseline #897).

## Question being answered

After #895 wired `personaId` onto every NPC wagon and consumed `pickRations` daily inside `tickNpcWagon`, which other `Persona` decisions are still being skipped on the NPC path? For each one: is the gap intentional (surface-only stub), accidental (decision exists, NPC just isn't consuming it), or out of scope (no equivalent NPC mechanic exists yet)?

## Method

For every method on the `Persona` interface (`src/lib/game/ai/types.ts`), grep every consumer outside `ai/`. Classify the call site as:

- **player-only** — `src/lib/dev/bot/runner.ts` (the bot drives the player slot)
- **npc-only** — `src/lib/game/systems/npc-engine.ts` etc.
- **both** — consumed on both paths
- **none** — no consumer; surface exists but nothing reads it

Then for the npc-only / none rows, classify the gap.

## Inventory

| Persona method | Player runner | NPC tick | Gap classification |
|---|---|---|---|
| `pickEventChoice` | ✅ runner.ts:630 | — | **Accidental** — NPC events fire (`rollNpcEvent`) but the `pickNpcEventChoice` shim below is what was meant to handle them; today every NPC wagon takes the same hard-coded outcome regardless of personality |
| `pickPace` | ✅ runner.ts:619 | — | **Out of scope** — pace is train-level, not per-wagon. Captain election (#285) sets the train's pace; an individual NPC wagon can't pick its own |
| `pickRations` | ✅ runner.ts:620 | ✅ npc-engine.ts:396 (#895) | **Wired** |
| `shouldRest` | ✅ runner.ts:593 | — | **Accidental** — NPC tick has no rest-day branching at all; `tickNpcWagon` always advances. Rest behavior currently lives only on the train's shared day from the player/captain. Future: per-wagon "lay over a day, catch up later" mechanic for `sunday_rester` / `faithful` |
| `shouldHunt` | ✅ runner.ts:588 | — | **Out of scope (today)** — NPC wagons consume `wagon-train-hunt-294` (pooled hunt), driven by the train captain not the wagon. Per-wagon hunt would need a meaningful "this wagon split off to hunt" mechanic — bigger scope |
| `pickFordMethod` | ✅ runner.ts:192 | — | **Out of scope** — train-level. The captain picks the ford method; companion wagons follow. Per-wagon override would need a "stragglers wait, captain crosses first" mechanic |
| `shouldTradeAtPost` | ✅ runner.ts:237 | — | **Accidental** — `applyNpcPostRestock` (in `wagon-train.ts`) runs unconditionally on every post arrival for every NPC. A `hoarder` won't actually hoard cash; a `drinker` won't disproportionately spend on inn vs. food. Gating restock on `persona.shouldTradeAtPost(state, here, rng)` is the obvious next wire |
| `shouldStayAtInn` | ✅ runner.ts:339 | — | **Accidental** — same shape as above. NPCs never stay at inns today, so `drinker.shouldStayAtInn`'s lower threshold is a dead override |
| `shouldFindWater` | ✅ runner.ts:539 | — | **Out of scope** — find-water is a player camp action; NPC water tops up via `applyNpcWaterDrain` math + post visits |
| `shouldPan` | ✅ runner.ts:543 | — | **Out of scope** — gold panning is single-player flavor (#313); no NPC equivalent |
| `shouldRaid` | ✅ runner.ts:560 | — | **Out of scope** — raid is a player camp action; no NPC equivalent (and per the persona docs, every persona refuses anyway) |
| `shouldStealFromTrain` | ✅ runner.ts:575 | — | **Out of scope** — by definition the player choice. NPC equivalent would be "another wagon stole from us," which is the inverse mechanic and not on the roadmap |
| `pickOxSwapCount` | ✅ runner.ts:354 | — | **Accidental** — every NPC restock at an `ox_swap` post should consume the persona's number. Today `applyNpcPostRestock` doesn't swap oxen at all. `generous` wants 2 above minTeam, `hoarder` wants 0 — both currently produce identical worn-team behavior |
| `pickRepairBudget` | ✅ runner.ts:227 | — | **Accidental** — NPCs repair at smithy posts via a hard-coded threshold inside `wagon-train.ts`. Personality doesn't shift their repair appetite. `generous` (1.5× balanced) and `hoarder` (½ balanced) currently behave identically |
| `pickFoodRestockOpts` | ✅ runner.ts:179 | — | **Accidental** — `applyNpcPostRestock` calls `composeShoppingList` with default `{ daysFloor: 30, daysCap: 90 }` (we've seen the cull-loop trim this when cash runs out). `hoarder` (15/30) and `chaos` (swings 10/30 → 60/180) have no effect on the NPC. This is the highest-leverage easy wire — feeds straight into the existing `composeShoppingList` call |
| `shouldJoinTrain` | ✅ runner.ts:212 | — | **Out of scope** — NPC wagons are already in the train at gen; rejoin doesn't apply |
| `shouldBuyCookwareSpare` | — | — | **Surface-only** — no consumer in either path. `composeShoppingList` has its own bake-in cookware logic that doesn't read this. Either retire the method or wire it in `shopping.ts` |
| `shouldBuySaleratus` | — | — | **Surface-only** — same as cookware. `shopping.ts` adds saleratus as a fixed FOOD_PRIORITY entry; persona override is silently dead |
| `shouldCannibalize` | — | — | **Surface-only on player path; hardcoded on NPC path.** `npc-engine.ts:294 maybeCannibalize` auto-fires when food=0, ignoring `persona.shouldCannibalize`. Today every NPC personality cannibalizes identically. The Donner family ate their dead, the Whitman missionaries (faithful) would not — the persona override is meaningful here and easy to wire |
| `pickNpcEventChoice` | — | — | **Surface-only** — the comments on every persona say "surface only" / "future named-profile overrides," but `rollNpcEvent` doesn't call into it. Wiring this would let drinker / faithful / generous take different branches on identical NPC events |
| `mudAbandonmentPriority` | — | — | **Surface-only** — there's no mud-abandonment mechanic implemented for NPCs (or the player) yet. Method exists in anticipation of #143 wet-firewood / weather-cascades work |

## Gap summary

- **Wired:** 1 (`pickRations`, this branch)
- **Accidental — NPC code path exists, persona just isn't consumed:** 7
  - `pickEventChoice` (via `rollNpcEvent`)
  - `shouldRest` (no NPC rest-day branching today; wire requires the branching first)
  - `shouldTradeAtPost` (gate `applyNpcPostRestock`)
  - `shouldStayAtInn` (give NPCs an inn-stay branch)
  - `pickOxSwapCount` (extend `applyNpcPostRestock` to swap)
  - `pickRepairBudget` (replace hardcoded smithy threshold)
  - `pickFoodRestockOpts` (lowest-effort wire — already-passed shopping options)
- **Surface-only — persona declares but nobody reads, even on the player path:** 5
  - `shouldBuyCookwareSpare` / `shouldBuySaleratus` (retire or wire into `shopping.ts`)
  - `shouldCannibalize` (hardcoded in `maybeCannibalize`)
  - `pickNpcEventChoice` (NPC events ignore choice diversity)
  - `mudAbandonmentPriority` (waiting on #143 mud abandonment)
- **Out of scope — no per-wagon mechanic to hook into:** 6 (pace, hunt, ford, find-water, pan, raid, steal, joinTrain)

## Adapter shim — current state

`tickNpcWagon` builds `{ inventory: next.inventory } as unknown as GameState` to call `pickRations`. This is sufficient today because every default `pickRations` reads only `state.inventory.flour`. **The shim must widen as the next wires land** — most of the accidental-gap personas above read `state.cash`, `state.morale`, `state.location`, `state.wagon.condition`, `state.date`, etc. Any wire below should:

1. Audit every persona's implementation of the method being wired.
2. Build a partial `GameState` shim with exactly the fields read.
3. Add a comment naming the read fields so the next wire knows whether to widen.

Long term: refactor `Persona` to take a `WagonStateLike & { date, location, ... }` smaller surface, and let both `GameState` and `NpcWagonState` satisfy it. Defer until two more wires force the issue.

## Recommended follow-up tickets (file in Vikunja)

In rough order of leverage / effort:

| Suggested ticket | Effort | Expected effect |
|---|---|---|
| **wire `pickFoodRestockOpts` into `applyNpcPostRestock`** | XS | `hoarder` actually hoards; `chaos` swings; `cautious` (default 25/60) becomes more disciplined. Drops directly into existing `composeShoppingList` call |
| **wire `pickOxSwapCount` into `applyNpcPostRestock`** | S | NPCs that pass through Laramie / Bridger / Hall actually refresh worn teams, narrowing the survival gap between named profiles |
| **wire `pickRepairBudget` into `wagon-train.ts` smithy block** | S | Replaces the hardcoded `condition < 70 && cash >= 20` threshold; lets `generous` / `hoarder` diverge |
| **wire `shouldTradeAtPost` as a gate on `applyNpcPostRestock`** | S | Lets `aggressive` skip post visits entirely; cuts down on NPC over-shopping |
| **wire `shouldCannibalize` into `maybeCannibalize`** | XS | Faithful Whitman/Sager wagons refuse cannibalism; period-accurate branching of the survival arc |
| **wire `pickNpcEventChoice` into `rollNpcEvent`** | M | Requires defining choice ids on NPC events (not all have them today). Highest narrative-color payoff |
| **add per-wagon rest-day branching, then wire `shouldRest`** | M | Sunday-rester actually lays by on Sunday; ox fatigue recovers without dragging the whole train |
| **wire `shouldStayAtInn` after rest-day branching** | S | Drinker dawdles at Laramie; party morale arcs diverge |
| **retire surface-only `shouldBuyCookwareSpare` / `shouldBuySaleratus`** | XS | Either delete or wire into `shopping.ts`; both are dead overrides today |
| **`mudAbandonmentPriority`** | — | Wait until #143 (wet firewood) or a real mud-abandonment mechanic exists |

Each ticket should ship its own `npm run verify` green branch, follow the existing `personaId` adapter pattern, and update this audit doc's table once landed.

## What the next slice (#897 — baseline measurement) needs from this

Before wiring any of the gaps above, run the bot under the current `#895` state and capture per-persona run outcomes (arrived / wiped / abandoned / day count / survivors / final cash). That baseline is what subsequent wires will be measured against — without it we can't tell whether wiring `pickFoodRestockOpts` made `hoarder` runs better or worse. Baseline output goes alongside this doc.
