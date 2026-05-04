# Game-AI + wagon-train symmetry audit (#303)

**Date:** 2026-05-03 (post-merge of #302 game-ai namespace)
**Scope:** every decision the player bot makes vs every decision an NPC wagon could make. Walks `dev/bot/runner.ts` for inline decision logic that should live in `game/ai/`, walks `npc-engine.ts` for decisions NPCs aren't making yet, and audits the `Persona` interface for tunables that are still hardcoded constants.

#302 lifted `personas.ts` to `game/ai/`. This audit identifies what's still misclassified — pure decision logic stuck in the bot driver, NPC-tick gaps that shipping #287 named profiles will need closed, and persona-tunable knobs hardcoded as magic numbers.

## Methodology

1. Read `src/lib/dev/bot/runner.ts` top to bottom — every internal function classified as **AI** (pure decision, should move) or **DRIVER** (composes engine actions, stays).
2. Read `src/lib/game/systems/npc-engine.ts` — what decisions does the NPC tick consult, what's hardcoded, what's missing.
3. Read `src/lib/game/ai/types.ts` `Persona` interface — what's exposed vs what's hardcoded inline.
4. For each gap, classify:
   - **MOVE** — pure decision logic in the wrong namespace; lift to `game/ai/`.
   - **EXPOSE** — hardcoded constant or inline rule that should be a persona-tunable knob.
   - **WIRE** — `game/ai/` decision exists or about to exist; NPC tick should call it.
   - **DEFER** — gap is real but blocked on a prereq (#287 named profiles, #284 multiplayer, encountered-train feature).

## `dev/bot/runner.ts` — decision functions still inline

| Function | Lines | Classification | Why | Action |
|---|---|---|---|---|
| `recordDeaths` / `recordHealthDrama` / `recordOxDeaths` | 69-108 | DRIVER | Stats accounting against state diffs | KEEP |
| `pickHuntTarget` | 112-121 | **AI** | Pure decision: terrain → target + ammo band | **MOVE** to `game/ai/hunt.ts` |
| `restWithWaterChain` | 130-160 | **AI / DRIVER hybrid** | Decides which camp-action chain to try, then calls `rest()`. The decision (gather→find→boil cascade based on firewood + boil capability) is AI; the `rest()` call is driver | **SPLIT** — pure `pickRestCampChain(state)` to `game/ai/rest.ts`, driver stays |
| `buildBotShoppingList` | 169-319 | **AI** | Pure decision: state + post → buy list (food / medicine / warmth / repair tiers) | **MOVE** to `game/ai/shopping.ts` — the bulk extraction. Slice into `pickFoodRestock` / `pickMedicineRestock` / `pickWarmthRestock` / `pickRepairRestock` so NPC tick can call just the food slice (#299) |
| `missingSurvivalGear` | 324-330 | **AI** | Pure predicate | **MOVE** to `game/ai/shopping.ts` (lives next to its consumer) |
| `handleLandmark` | 334-447 | DRIVER | Composes engine actions at a landmark (joinTrain, repairWagon, trade, stayAtInn) | KEEP — but the embedded rules **EXPOSE** below |
| `tryFordWithFallback` | 451-468 | DRIVER | Try ford with degradation; pure error-handling | KEEP |
| `doBotHunt` | 472-483 | DRIVER | Calls `pickHuntTarget` + `hunt()` | KEEP — once `pickHuntTarget` moves |
| `defaultCompanions` | 492-503 | **AI** | Pure decision: priority list for auto-fill companions | **MOVE** to `game/ai/party.ts` (new module — small but the namespace hint is useful) |

## `handleLandmark` embedded rules — should be persona-tunable

The post-handling block at `runner.ts:334-447` carries multiple hardcoded rules that NPCs and named profiles will want to override:

| Rule | Current value | Why hardcoded is wrong | Action |
|---|---|---|---|
| Auto-join train at first post | always | Drinker / aggressive personas might prefer solo | **EXPOSE** as `Persona.shouldJoinTrain(state, here)` |
| Smithy repair threshold | `condition < 70 && cash >= 20` | Hoarder waits longer; cautious repairs sooner | **EXPOSE** as `Persona.pickRepairBudget(state, here) → number` (returns dollars to spend, 0 = skip) |
| Smithy repair budget | `min(40, cash, 100 - condition)` | Same as above — should be persona output | **EXPOSE** combined with above |
| Trade fallback to food-only on full-trade failure | always | Reasonable for all current personas; check `_pendingShoppingList` shape later | KEEP — this is driver error-handling, not policy |
| Cash gate to attempt trade | `s.cash >= cashCap * 0.25` | Conservative bot may want higher gate; aggressive may skip entirely | KEEP for now — this is a downstream guard, not the primary trade decision (which `shouldTradeAtPost` already gates) |

## NPC tick (`npc-engine.ts`) — what's missing or hardcoded

Currently `tickNpcWagon` consults zero AI decisions — every NPC follows the same fixed pipeline. Once `game/ai/` is the consumer-friendly home, the NPC tick should plug in.

| Decision | Current NPC behavior | Player-bot equivalent | Action |
|---|---|---|---|
| `rations` setting | Fixed `'normal'` for life of wagon | `Persona.pickRations(state)` | **WIRE** — call `Persona.pickRations(wagon)` daily; needs `WagonStateLike` signature on the AI side |
| Buy food at posts | Never | `buildBotShoppingList` → `trade()` | **WIRE** via #299 (`pickFoodRestock` extracted slice) |
| Buy medicine at posts | Never | `buildBotShoppingList` (medicine layer) | **WIRE** — `pickMedicineRestock` slice, NPC calls when arrived at post |
| Buy repair parts at posts | Never | `buildBotShoppingList` (blacksmith layer) | **DEFER** — pairs with #300 (NPC `tickWagon`); useless without wagon decay |
| Pay for repair at smithy | Never | Inline rule `repair if condition < 70 && cash ≥ 20` | **DEFER** — pairs with #300 NPC wagon decay |
| Pay for inn stay | Never | `Persona.shouldStayAtInn` | **WIRE** — natural fit when NPC wagon arrives at a post (drains cash, restores HP/morale, period: families stayed in inns when they could afford it) |
| Hunt for food | Never | `Persona.shouldHunt` + `doBotHunt` | **DEFER** — pairs with #287 named profiles (Joe Meek persona drives independent NPC hunting); current company-hunt #294 covers the bulk case |
| Find/boil water | Never (no NPC water field) | `Persona.shouldFindWater` + `restWithWaterChain` | **CLOSE** — `NpcWagonState` is missing water tracking entirely (`water`, `dirtyWater`, `waterCap`). Both #298 and #303 round-1 called this ACCEPT — wrong on both counts. The "shared keg" framing is a runtime *decision* (pool kegs at camp? individual?), not a justification for missing data. Period evidence is mixed: Helen Carpenter 1857 documents pooled kegs; other diaries describe families guarding their own. Need fields on the type + daily consumption + dehydration + dirty-water risk on NPC side. Once data lands, `Persona.shouldFindWater` consumer wires immediately. See TODO #303e |
| Daily dehydration drain on NPC water | Never (no NPC water field) | `applyDehydration` | **CLOSE** — same root as above. Folds into #303e |
| Dirty-water dysentery roll on NPC | Never (no NPC water field) | `applyDirtyWaterRisk` | **CLOSE** — same root. Folds into #303e |
| Pick ford method | Never | `Persona.pickFordMethod` | **DEFER** — in-train NPCs ride the player's choice (period: companies forded together); encountered-train wagons hit it immediately when that feature ships |
| Take a rest day | Never (rides player calendar) | `Persona.shouldRest` | **DEFER** — once #285 NPC captain leadership grows decision-making power, captain might call rest days; needs leader-decision plumbing first |
| Pick event choice on NPC events | Hardcoded — #280c events are choice-less (one-shot mechanical) | `Persona.pickEventChoice` | **EXPOSE** as `Persona.pickNpcEventChoice(wagon, event) → string` — surface today defaults to a no-op (no current #280c event has choices). The moment any NPC event grows a choice ("Reed axle break — repair / abandon / shoulder?"), the persona drives the answer (Sager picks repair; Joe Meek picks shoulder; preacher wagon picks abandon). Sets the surface so #287 profiles can override |
| Doctor visit on sick member | Never (NPCs auto-treat via inventory) | `doctorVisit` engine action (#286) | **DEFER** — pairs with leader-self-treatment; named profiles will drive (Doctor-led NPC wagon doctors its own sick) |
| Cannibalism trigger | Auto when food=0 + corpse fresh (hardcoded in `maybeCannibalize`) | Player gets choice modal | **EXPOSE** as `Persona.shouldCannibalize(wagon, corpse) → boolean` — the *decision* is real AI logic, not a no-decision asymmetry. Today's hardcoded `true` becomes the default persona implementation; a preacher-led wagon refuses on faith (return `false`); a hoarder consumes earlier (different threshold); generous wagon starves first. Player UI surface stays distinct (modal vs auto), but the underlying decision function lives in AI |

## `Persona` interface — coverage gaps

The current `Persona` exposes 9 methods (pickEventChoice / pickPace / pickRations / shouldRest / shouldHunt / pickFordMethod / shouldTradeAtPost / shouldStayAtInn / shouldFindWater). Audit against what the bot actually decides:

| Decision | In Persona? | Current source | Action |
|---|---|---|---|
| Hunt target (big/medium/small) + ammo band | ✗ | `pickHuntTarget` inline in runner | **EXPOSE** as `Persona.pickHuntTarget(state) → { target, ammo }` once moved (cautious might prefer small/safe; aggressive big) |
| Repair budget at smithy | ✗ | Hardcoded `min(40, cash, 100 - condition)` in `handleLandmark` | **EXPOSE** as `Persona.pickRepairBudget(state, here) → number` |
| Whether to join a train | ✗ | Hardcoded `always` in `handleLandmark` | **EXPOSE** as `Persona.shouldJoinTrain(state, here) → boolean` |
| Food-restock target lb (5 day floor / 10 day cap) | ✗ | Will be hardcoded in #299 inline | **EXPOSE** as `Persona.foodRestockTarget(eaters) → { floorDays, capDays }` (hoarder 8/15, drinker 3/6) |
| Medicine-restock thresholds | ✗ | Hardcoded `< 4 quinine, < 4 bandages, < 3 laudanum` etc. in `buildBotShoppingList` | **EXPOSE** as `Persona.medicineThresholds() → Record<itemId, number>` |
| Companion auto-fill priority | ✗ | Hardcoded list in `defaultCompanions` | **EXPOSE** as `Persona.companionPriorityList() → ProfessionId[]` (cautious prioritizes doctor first; aggressive hunter; blacksmith for grueling) |
| Camp-action chain when resting low on water | ✗ | Hardcoded cascade in `restWithWaterChain` | KEEP — this is the only sensible cascade given the actions available; making it tunable adds knobs without play value |
| Cannibalize a fresh corpse when food=0 | ✗ | Hardcoded `true` in `npc-engine.ts:maybeCannibalize` | **EXPOSE** as `Persona.shouldCannibalize(wagon, corpse) → boolean`. Default returns true (preserves current behavior); preacher-led wagons return false; hoarder threshold tighter; generous starves first |
| NPC event choice (when #280c events grow choices) | ✗ | No-op today (all #280c events are choice-less) | **EXPOSE** as `Persona.pickNpcEventChoice(wagon, event) → string`. Surface today defaults to a no-op; consumers grow when any NPC event adds a choice list (e.g. "Reed axle break — repair / abandon / shoulder?") |

## Audit-meta finding: ACCEPT misuse

Round-1 of this audit (and #298 before it) called several decisions ACCEPT — "defensible asymmetry" — when the actual situation was either (a) a data-shape limitation masquerading as a design choice, or (b) a real AI decision with a trivial current implementation that should still live on the persona surface for future overrides. Round-2 reclassified `shouldFindWater` (now CLOSE — water tracking missing entirely), `pickNpcEventChoice` (now EXPOSE), `shouldCannibalize` (now EXPOSE).

**Sharper rule going forward**: ACCEPT means "this isn't a decision at all" or "this is intentionally distinct content/UX surface." If it's a decision and there's any plausible future consumer who'd pick differently, it belongs in `game/ai/` even if the only current implementation is a hardcoded `true` or no-op. Future audits should default-suspect every ACCEPT row.

## Severity-ordered close list

Recommended order to ship the closes:

0. **CLOSE — `NpcWagonState` water tracking** (HIGH, prereq for several others). Add `water` / `dirtyWater` / `waterCap` fields, daily consumption, dehydration, dirty-water dysentery on the NPC side. Round-2 finding — both audits had this wrong. See #303e in TODO.md.
1. **MOVE — extract `buildBotShoppingList` to `game/ai/shopping.ts`** (LARGE). The headline. Slice into 4 pure functions: `pickFoodRestock`, `pickMedicineRestock`, `pickWarmthRestock`, `pickRepairRestock`. Player bot composes all four; NPC tick (per #299) calls just `pickFoodRestock`. Each takes `WagonStateLike & { stock: Set<itemId> }`. This is the single biggest namespace fix; ships as part of #299 or as a separate "#303a shopping extraction" prep PR.
2. **MOVE — `pickHuntTarget`** (SMALL) → `game/ai/hunt.ts`. Trivially pure. Pairs with future independent NPC hunting (Joe Meek named profile, #287).
3. **MOVE — `restWithWaterChain` decision split** (SMALL). `pickRestCampChain(state) → string[]` to `game/ai/rest.ts`. Driver keeps the try/catch fallback loop.
4. **MOVE — `defaultCompanions` + `missingSurvivalGear`** (TINY). Move alongside their natural neighbors.
5. **EXPOSE — `Persona.pickRepairBudget` + `Persona.shouldJoinTrain`** (MEDIUM). The two embedded rules in `handleLandmark` that should be persona-tunable. Establishes the pattern for #287 named profiles to override.
6. **WIRE — NPC `pickRations`** (MEDIUM). Today every NPC stays at `'normal'` forever. Wire `Persona.pickRations(wagon)` into `tickNpcWagon` so a wagon can shift to `'meager'` when food drops below threshold. Period reality: emigrant families tightened on bad stretches.
7. **WIRE — NPC inn-stay** (MEDIUM, depends on closes 1-2). Once `pickRepairBudget` and `shouldStayAtInn` are persona-tunable, NPCs at posts can pay for inn nights — drains cash, restores HP/morale.
8. **EXPOSE — `Persona.pickHuntTarget` + `Persona.medicineThresholds` + `Persona.companionPriorityList`** (MEDIUM). Persona-tunable knobs that #287 named profiles want to override.

## Genuine non-decisions (these aren't AI gaps)

The clean rule: if it's a *decision*, it lives in `game/ai/`, even if today's NPC tick has a trivial/null implementation. "ACCEPT" should mean "this isn't a decision at all," not "the data shape happens to make this decision moot today." Round-2 reclassification flagged that earlier draft used ACCEPT too loosely — the audit's first cut treated `shouldFindWater` / `pickNpcEventChoice` / `shouldCannibalize` as ACCEPT when they're actually real AI decisions whose current trivial implementations should still be persona-overridable. Those are now reclassified as DEFER + EXPOSE above.

What genuinely doesn't belong in `game/ai/`:

- **Camp-action cascade** (`restWithWaterChain` order) — the gather→find→boil chain is the only sensible order given the actions available; persona-tuning would add knobs without play value. This is engine plumbing, not policy.
- **Trade-cash gate** (`cashCap * 0.25` after a failed trade) — downstream guard / error-handling, not a primary policy decision. The primary `shouldTradeAtPost` already covers persona variance; this is just "if the full buy fails, try the food-only subset."
- **Player vs NPC UI surface** — player events are interactive (modals); NPC events are inline (one-shot mechanical). That's a UI/UX division, not an AI division. The decision *content* underneath is shared; the surfacing differs.
- **Train-shared decisions** — when in-train NPCs follow the player's ford / pace / rest choice, that's period reality (companies forded together, paced together). Not an AI gap; it's the train abstraction working as designed. Encountered-train wagons (separate train) would need their own AI for those decisions.

## Recommended next ticket order

After this audit lands, the natural sequence:

1. **#303e** — NPC water tracking. HIGH gap surfaced in round-2; closes the data-shape mismatch. Saves 2 → 3 with NpcWagonState migration. Wires `Persona.shouldFindWater` consumer immediately.
2. **#303a** — Extract `buildBotShoppingList` to `game/ai/shopping.ts` as 4 sliced functions. Mechanical refactor + tests.
3. **#299** — NPC food restock at trading posts using `pickFoodRestock` from #303a.
4. **#303d** — Wire NPC `pickRations` into `tickNpcWagon` (the meager/normal/filling shift NPCs currently can't make).
5. **#303c** — Expose `pickRepairBudget`, `shouldJoinTrain`, `shouldCannibalize`, `pickNpcEventChoice` on `Persona`; refactor `handleLandmark` + `maybeCannibalize` to consult them.
6. **#303b** (optional) — Move the small AI bits (`pickHuntTarget`, rest cascade decision, `defaultCompanions`, `missingSurvivalGear`).
7. **#287 named profiles** — once persona surface is fully exposed, hoarder / drinker / generous / Sager / Reed / Joe Meek profiles overlay specific knob values.

This closes #303 as a documented audit; the closes themselves get their own TODO entries (303a-e).
