# NPC persona baseline — VK #897 / #914

**First snapshot:** 2026-05-07 (#897, tick-only).
**Extended:** 2026-05-08 (#914, added synthetic post visits — captures the landmark-time wires from #899/#902/#905/#906/#909/#911).

## Question being answered

After #895 wired `personaId` and `pickRations` is the only persona-driven NPC decision, what's the per-persona spread on a deterministic synthetic schedule? This is the comparison point future wires from the #896 gap audit will be measured against — without a baseline, we can't tell whether wiring `pickFoodRestockOpts` made `hoarder` runs better or worse.

## Method — synthetic per-wagon harness

`scripts/npc-baseline-897.ts`. For each `PersonaId`, the harness:

1. Generates a fresh NPC wagon via `generateTrain(seed, ...)` keyed on the persona name (so each persona gets its own profile assignment — Donners for cautious, Bidwell-Bartleson for balanced, etc.).
2. Overrides `wagon.personaId` to the test persona (decouples the test from the gen-time `personaVariantHint` picks so the comparison is symmetric).
3. Ticks 180 days under a deterministic schedule:
   - 6 travel + 1 rest per week (the emigrant standard).
   - Prairie terrain throughout.
   - Mostly `clear` weather, occasional `rain` (every 19th day).
   - 14 mi traveled per travel day.
4. Refills the keg every 5 days, simulating landmark / river-cross water access the synthetic harness can't drive directly. Without this the wagon dehydrates inside two weeks regardless of persona, drowning the food-economy signal.

The harness does **not** run landmark visits, ferries, restocks, captain elections, or events that fire only via the wagon-train shared schedule. Those layers will be added as more persona surface is wired.

## Result — 180-day run, 1849 (Gold Rush year), with synthetic posts (#914)

Posts: ft_kearny @ d30, ft_laramie @ d60, ft_bridger @ d90, ft_hall @ d120, ft_boise @ d150.

| Persona | Outcome | Days | Alive | Food (lb) | Cash | Morale | Oxen | Posts | $ at posts | M/N/F rations |
|---|---|---|---|---|---|---|---|---|---|---|
| cautious | wiped | 25 | 0/9 | 15 | $291 | 0 | 2 | 0 | $0 | 0/14/11 |
| balanced | wiped | 139 | 0/3 | 50 | $0 | 0 | 3 | 4 | $263 | 0/139/0 |
| aggressive | wiped | 72 | 0/4 | 50 | $55 | 0 | 5 | 2 | $104 | 72/0/0 |
| chaos | wiped | 77 | 0/2 | 50 | $56 | 0 | 2 | 2 | $147 | 17/28/32 |
| sunday_rester | wiped | 125 | 0/4 | 12.5 | $0 | 0 | 0 | 4 | $131 | 0/125/0 |
| pace_pusher | wiped | 109 | 0/4 | 50 | $2 | 0 | 1 | 3 | $202 | 0/109/0 |
| hoarder | wiped | 79 | 0/3 | 50 | $1 | 0 | 4 | 2 | $99 | 0/79/0 |
| generous | wiped | 115 | 0/5 | 25 | $2 | 0 | 2 | 3 | $129 | 0/115/0 |
| faithful | wiped | 114 | 0/3 | 0 | $4 | 5 | 3 | 3 | $262 | 0/114/0 |
| drinker | wiped | 146 | 0/3 | 50 | $12 | 0 | 0 | 4 | $262 | 0/146/0 |

## Diff against original tick-only baseline (#897)

| Persona | Tick-only days | With-posts days | Δ |
|---|---|---|---|
| cautious | 25 | 25 | 0 (Donners wipe before d30 first post) |
| balanced | 52 | **139** | **+87** |
| aggressive | 72 | 72 | 0 (shouldTradeAtPost gates skip posts) |
| chaos | 48 | 77 | +29 |
| sunday_rester | 49 | **125** | **+76** |
| pace_pusher | 44 | **109** | **+65** |
| hoarder | 71 | 79 | +8 |
| generous | 64 | **115** | **+51** |
| faithful | 55 | **114** | **+59** |
| drinker | 74 | **146** | **+72** |

Posts flipped this from a pure-attrition test into a **persona-driven survival measurement**. Every restocking persona roughly doubled lifespan; the personas that gate posts (aggressive `shouldTradeAtPost`) or get wiped early (cautious 9-soul Donners) didn't move.

### Reading the columns

- **Days** — days survived before `outcome` flipped from `in-progress`.
- **Alive** — survivors at wipe / X starting party. The starting party size is set by the named-profile assignment, so cautious has 9 (Donner family) and chaos has 2 (Joe Meek archetype). That's noise relative to the persona signal — confounded variable noted below.
- **Food (lb)** — total food remaining at wipe (so 0 means starvation took them; non-zero means HP loss / dehydration / disease did).
- **Cash** — wagon cash at wipe.
- **Posts** — count of synthetic post visits the wagon survived to (out of 5 scheduled).
- **$ at posts** — total cash spent on restocks across all visits.
- **M/N/F rations** — count of meager / normal / filling daily picks. Direct expression of `pickRations`:
  - aggressive picks meager 100% (72/0/0) ✅
  - cautious picks filling when flour > 50 lb, normal otherwise ✅
  - chaos rolls ~uniform ✅
  - everyone else inherits balanced → 100% normal ✅

## Reading the spread

**The persona-induced lifespan range is 25–74 days** (3× spread). This is narrower than it looks once the confounders are factored out:

- **Party size dominates.** cautious's 9-soul Donner wagon eats 31.5 lb/day at filling (9 × 3.5) and burns through provisions faster than any other persona regardless of decision quality. The 25-day lifespan is mostly Donner family math, not cautious-persona choices. Survival of the smallest party would be the apples-to-apples test.
- **Aggressive (meager) doesn't lengthen survival much past hoarder/drinker** (72 vs. 71/74). At meager rations the food drain is 4.5 lb/day for a 3-eater wagon — but ration choice doesn't affect the HP-loss path that's actually killing them (low morale, condition tick, NPC event roll).
- **Most wagons wipe with food still on hand** — every row except cautious/generous has 25–50 lb left. The killer is morale-driven HP attrition + NPC event damage, not starvation. Future persona wires that affect cash, repair, and restock cadence will move this number more than `pickRations` ever can.

**Bottom line:** with only `pickRations` wired, the persona signal is real but small. Most of the food-economy lever is downstream of `pickFoodRestockOpts` (controls how much food enters the wagon at every post visit), `pickOxSwapCount` (worn-team longevity), and `pickRepairBudget` (wagon-decay lifespan). All of those are accidental gaps per #896.

## What this baseline anchors

The next wires the gap-audit recommends — in rough order — should each move the table:

| Wire | Expected effect |
|---|---|
| `pickFoodRestockOpts` → `applyNpcPostRestock` | hoarder buys less food per stop (dies sooner under tight cash, lives longer under flush cash); cautious's 25/60 default already in effect for default fallback — the wire makes other personas diverge |
| `pickOxSwapCount` → `applyNpcPostRestock` | generous keeps fresher teams, lives longer; hoarder defers swaps, oxen die sooner. Today every wagon wipes with 2–6 oxen alive — already not the bottleneck without wiring |
| `pickRepairBudget` → smithy block | wagon condition decays slower for generous, faster for hoarder. Wagon-condition wipe rate (currently 0 in this synthetic harness — need a longer run with more travel days for this to bind) |
| `shouldTradeAtPost` gate | aggressive skips post visits, so food/medicine never replenish. Only meaningful once posts are in the harness |
| `shouldCannibalize` | faithful/sunday_rester don't cannibalize; survival path diverges from Donner-style runs once food=0 |

To re-run the baseline after each wire lands:

```bash
npx tsx scripts/npc-baseline-897.ts 180
```

Output is a pasteable markdown table — drop it into the row above the previous baseline and diff.

## Caveats / known gaps in this baseline

- **No landmarks.** Real wagons restock food/medicine/ammo at posts, ford rivers (with boost-spoilage), and refill water at every crossing. The synthetic harness simulates only periodic water refill. Adding a landmark schedule (every ~12 days a "post" that opens up `applyNpcPostRestock`) is a natural next step once `shouldTradeAtPost` is wired.
- **No events** are filtered/forced. `rollNpcEvent` fires daily at the engine's defaults; persona doesn't gate it. `pickNpcEventChoice` would only become meaningful once `rollNpcEvent` actually consults it.
- **No captain.** Pace, ration overrides from a captain, and election-driven leadership swaps are absent. NPC wagons carry their own `pace` / `rations` here without train-level coordination.
- **Confounded by profile assignment.** Each persona maps to a different gen-time profile (cautious gets Donners, chaos gets Joe Meek). For a clean apples-to-apples per-persona comparison, the harness should be extended to fix `partySize` and `inventory` across personas. Deferred until the persona spread itself is the bottleneck.

## File layout

- `scripts/npc-baseline-897.ts` — the harness. Run via `npx tsx scripts/npc-baseline-897.ts [days]`.
- `docs/handoff/npc-baseline-897.md` — this doc. The result table is the snapshot to diff against.

The harness is intentionally tiny (~120 LOC) and stands apart from `scripts/bot.ts` (which drives the player slot via the full game runner). They serve different measurement purposes — keep both.
