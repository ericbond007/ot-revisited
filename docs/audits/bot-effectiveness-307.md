# Bot CLI / game-ai effectiveness audit (#307)

> **#309 correction (2026-05-04)** — this audit hypothesized "rest cycle from chronic conditions" based on the 56% rest-day reading on `determinism-check`. Wrong root cause. `BOT_TRACE=30` revealed the actual trigger: `pickFoodRestock` default 7-day floor was too aggressive — bot at flour=81 said "fine, skip" then ran out 30 days later, sitting in 184 days of starvation rest. The 56% rest was the *symptom*, not the cause. Fix: raise default floor 7→30, cap 60→90 (#309). Recovery: balanced 5-seed avg 989 → 1149 mi (+16%). Lesson for future audits: per-action-day percentages are downstream effects — read inventory + condition snapshots over time to find the upstream trigger before drawing root-cause conclusions.



**Date:** 2026-05-04 (post #16-#22 mechanics shipped)
**Scope:** review the player-bot driver against the new mechanics shipped this session — water tracking (#303e), shopping extraction (#303a), NPC restock (#299), post-stock period fix (#19), saleratus/cookware (#304+#305), buffalo stampede (#306 phase 1), ford/wind/mud/theft + RNG softeners (#306 phase 2). Identify where the bot can or cannot express the right behavior on the new gameplay levers.

The bot is the project's primary smoke-testing tool. If new mechanics aren't visible to it, our automated regression coverage drops silently. This audit catches that.

## Baseline — current bot behavior (5 seeds × 3 personas)

| Persona | Wipe rate | Avg miles | Avg days | Notes |
|---|---|---|---|---|
| Cautious | 0/5 | ~954 | 365 | Survives year; mileage variance 464-1211 |
| Balanced | 0/5 | 989 | 365 | Survives year; one seed reached 1344 |
| Aggressive | 3/5 | wiped 219-258d | — | New attrition tips aggressive over the edge |

**Trajectory across this session** (single `determinism-check` seed, balanced):
- Pre-session: 1346 mi
- After #303a + #299: 1164 mi
- After #19 post-stock: 1346 mi (basket access restored)
- After #304+#305 saleratus: 1350 mi
- After #306 phase 1 stampede: 1348 mi
- After #306 phase 2 ford/wind/mud/theft: 1119 mi

Net drop ~17% across the session. Not necessarily wrong — period-realistic difficulty went up — but worth understanding *why* the bot didn't compensate.

## Findings

### HIGH — bot can't see saleratus

**Symptom:** Bot starts with 4 units saleratus from the outfit (#305 starter-kit add). Daily consumption rate is ~0.005 lb/lb-flour-eaten = ~0.015 lb/day for a 3-eater family at 1 lb/eater/day flour draw. 4 units (2 lb) lasts ~133 days. After day ~135 the bot has 0 saleratus and takes the −1 morale "biscuits sat heavy" debit every flour-eating day for the rest of the journey.

**Why the bot can't fix it:** `pickFoodRestock` priority list is `flour / bacon / sugar / beans / coffee / salt`. **No saleratus.** No other slice in `game/ai/shopping.ts` handles it either. Saleratus is `category: 'tool'` in the items catalog (because it has multiple uses — leavening + stomach-settling + alkali-water-sweetening), so it didn't fall into the "food" slice naturally.

**Fix:** Add saleratus to `pickFoodRestock` (kitchen-staple, period-correct adjacent to flour) OR introduce a new `pickKitchenRestock` slice. Latter cleaner if more kitchen items get added later. Threshold: ~1 unit (0.5 lb) when current < `eaters × 0.014 × daysFloor` — easy math, fits the existing pattern.

### HIGH — bot doesn't trigger restock when cookware lost

**Symptom:** Bot loses cookware in a stampede (#306 phase 1) or ford catastrophe (#306 phase 2) on, say, day 50. Until end of journey it carries the −2 morale "ate paste again" debit per flour day. Player bot CAN buy cookware (it's in `pickEquipmentRestock` at `< 1` threshold), but the bot might walk PAST Laramie or Walla Walla without stopping if food / warmth / medicine triggers don't fire.

**Why:** `Persona.shouldTradeAtPost` only triggers on:
1. Cash < threshold (skip)
2. Food < threshold
3. `postStocksMissingWarmthGear`
4. `postStocksMissingMedicine`

**No predicate for missing cookware / water_skin / shovel / rope** (the equipment slice items). Bot might be food-fine and walk by.

**Fix:** Add `postStocksMissingEquipment` predicate (mirrors warmth/medicine helpers); include in cautious + balanced `shouldTradeAtPost` triggers. Period-realistic: emigrants who lost a cooking pot would absolutely stop at the next fort.

### MEDIUM — persona variance invisible on new mechanics

**Symptom:** Across cautious / balanced / aggressive, all three use the same `composeShoppingList` and the same `pickFoodRestock` defaults. The new mechanics (saleratus restock target, cookware spares, theft response) have no persona-tunable knobs. So a "drinker" persona buys saleratus the same as a "preacher" persona — that doesn't reflect period reality where personality drove household priorities differently.

**Connection:** This is exactly what #303c was logged to address ("expose persona-tunable knobs on Persona"). Now we know which knobs matter most:
- `pickFoodRestock` `daysFloor` / `daysCap` overrides per persona (hoarder doubles cap, drinker keeps minimum)
- `shouldBuyCookwareSpare(state, here) → boolean` (cautious yes, aggressive no)
- `shouldBuySaleratus(state, here) → boolean` (preacher yes, drinker maybe)
- `mudAbandonmentPriority()` (different orders by persona)

**Fix:** Folds naturally into the existing #303c TODO entry. No new ticket needed; just expand #303c's exposed-decision list.

### MEDIUM — aggressive wipes 60% (was rare pre-session)

**Symptom:** Aggressive persona used to be a "barely survives" mode. Now wipes 3/5 around day 220-260. The new attrition vectors (theft, ford, stampede) tip a bot that doesn't trade.

**Period reality:** Aggressive emigrants who skipped resupply absolutely died on the trail. Sage 1846 records multiple wagons that "pushed on" past Bridger and didn't make it past South Pass. So a ~60% wipe rate isn't necessarily wrong — it's the period cost of refusing to cooperate / restock.

**Verdict:** Not a bot bug. Note as a balance observation — when #287 named profiles ship, "drinker" / "Reed brothers" / similar profiles will inherit this fragility, which is correct.

### LOW — mud abandonment never auto-picked

**Symptom:** Bot uses `defaultChoice` or pattern matching for event choices. The `abandon_load` choice on `wagon_stuck` is non-default. Bot always picks `dig_out` (works because every starter kit has a shovel). Player abandonment as a deliberate emotional moment.

**Verdict:** Correct. Abandoning heirlooms / heavy gear is a player-feels choice; auto-picking it would feel wrong. Keep behavior as-is.

### LOW — theft / wind / ford reactions don't trigger anything beyond restock

**Symptom:** Bot loses items to theft / wind / ford. Doesn't change behavior in response (e.g., no "I'll camp closer to the fire" / "I'll lash everything down better" reactions). Just absorbs the loss and tries to restock via existing slices.

**Verdict:** Correct. The bot's response to losing things is "buy more at the next post." That's period-faithful (no emigrant could change camp protocol meaningfully). Wagon-train share-watch already mitigates theft — that's the gameplay choice.

## Severity-ordered close list

1. **HIGH — saleratus consumer wire-up.** Add saleratus to `pickFoodRestock` (or new `pickKitchenRestock`). Sized for the period-rate floor calculation. Smallest fix; biggest immediate bot improvement.
2. **HIGH — cookware-trigger on `shouldTradeAtPost`.** New predicate `postStocksMissingEquipment(state, here)` in personas.ts. Add to cautious + balanced trade triggers. Period-realistic stop forcing function.
3. **MEDIUM — fold persona-tunable shopping knobs into #303c** (already-logged TODO). Add: per-persona `pickFoodRestock` opts, `shouldBuyCookwareSpare`, `shouldBuySaleratus`. Sets up #287 named profiles.
4. **MONITOR — aggressive wipe rate.** Re-baseline after #303c persona variance lands. Period-correct fragility is the goal; if rate climbs much above 70%, dial back the new attrition.

## Recommended next ticket order

1. **#308 (new TODO)** — Bot saleratus + cookware-trigger fix (HIGH gaps from this audit). Small PR, ~50-80 lines + tests. Should restore bot mileage closer to pre-session baseline AND give the existing mechanics actual bot behavior.
2. **#303c** — already-logged persona-tunable knobs. Now informed by this audit's finding 3 (which knobs matter most).
3. **#303d** — `pickRations` NPC wire (already logged).
4. **#287** — named profiles overlay everything (the long-term destination).

## What's working well (don't disturb)

- Player water management (`shouldFindWater`) — unchanged, still effective
- Food basket from #303a — bot adapted automatically when basket changed
- Train share-watch theft halving — bot benefits silently when in a train
- Stampede 70/30 RNG softener — bot lives through near-misses, takes hits when unlucky; period-feel is right
- Pastry 10% improvise bypass — gives the bot occasional breathing room on no-cookware days

## Audit-meta

This audit followed the standing rule from #298/#303: every new feature → check (a) wagon-train/NPC parity AND (b) game-ai impact. Both were named in PR descriptions but weren't actually verified end-to-end via the bot until now. The bot smoke runs at the end of each PR (1 seed, balanced) caught nothing because they're 1-run sanity checks, not effectiveness tests.

**Sharper standing rule going forward**: when shipping a feature that affects gameplay levers (new item, new event, new mechanic), the PR's "test plan" should include a multi-seed bot smoke (5 seeds × 3 personas) and call out any meaningful behavior shift in the description. The single deterministic-check baseline is verification of code-correctness only — not effectiveness.
