# Player vs NPC code-path symmetry audit (#298)

**Date:** 2026-05-03 (post-merge of #295 NPC wagon spoilage)
**Scope:** every system + action that mutates `GameState` for the player, checked against the equivalent code on `NpcWagonState[]`. Builds a coverage table with severity ratings and a recommended action per gap.

The wagon-train work (#176 → #295) brought NPC wagons up from "decorative roster" to "fully-stateful sibling of the player." This audit identifies what's still asymmetric, classifies whether each gap is a bug (silent benefit/penalty to NPCs) or a defensible design choice (shared resource, distinct content surface).

## Methodology

1. Read `engine-pausable.tickDayPausable` top to bottom — that's the player tick.
2. Read `npc-engine.tickNpcWagon` top to bottom — that's the NPC tick.
3. Walk every player action in `src/lib/game/actions/` and check whether the action either (a) reaches NPC wagons through `advanceTrain`, (b) has an explicit NPC equivalent, or (c) is silently player-only.
4. For each gap, classify:
   - **CLOSE** — gameplay-relevant asymmetry; should ship a fix.
   - **WIRE** — sound infrastructure exists but the producer/consumer isn't on NPCs yet. Fold into the relevant feature ticket.
   - **ACCEPT** — defensible asymmetry (shared resource, distinct content surface). Document why.

## Tick-system coverage

| System | Player | NPC | Symmetric? | Severity | Action |
|---|---|---|---|---|---|
| `tickWeather` | ✓ | shared via `ctx.weather` | ✓ | n/a | ACCEPT |
| Crisis re-election (#285 phase 2) | ✓ | n/a — player-only state | n/a | n/a | ACCEPT |
| Sabbath morale debit (#224) | ✓ | ✗ | should be (period: companies felt Sunday guilt collectively) | medium | CLOSE |
| `progressConditions` / `tickConditions` | ✓ | ✓ | ✓ | n/a | OK |
| `applyEggLay` (#138) | ✓ | ✗ — NPCs have no chickens | depends | low | WIRE — fold into #297 |
| `applyDairy` (#139) | ✓ | ✗ — NPCs have no cows | depends | low | WIRE — fold into #297 |
| `applyButterChurn` (#222) | ✓ | ✗ — needs milk | depends | low | WIRE — fold into #297 |
| `applySpoilage` | ✓ | ✓ (#295 `applyNpcSpoilage`) | ✓ | n/a | OK |
| `applyHeatSpoilage` | ✓ | ✓ (#295 `applyNpcHeatSpoilage`) | ✓ | n/a | OK |
| `decayCleanliness` (#230) | ✓ | ✗ — no cleanliness on NPCs | partial | medium | WIRE — needs cleanliness field on NpcWagonState first |
| `applyDirtyMorale` | ✓ | ✗ | depends on cleanliness | medium | WIRE — same |
| `applyFilthDiseaseRisk` | ✓ | ✗ | should be (period: dirty wagons got cholera too) | medium | WIRE — same |
| `applyDailyConsumption` | ✓ | ✓ (`consumeFood`, simpler draw order) | mostly | low | ACCEPT — NPCs miss diet morale lifts but also avoid the math complexity |
| `applyDietVariety` (#110) | ✓ | ✗ | should be | low | CLOSE — small daily morale lift would matter for diverse-food NPC wagons |
| `applyHotDrinks` (#110) | ✓ | ✗ | depends — needs dirty water on NPCs first | low | ACCEPT for now |
| `applyDirtyWaterRisk` (#106) | ✓ | ✗ — NPCs share player keg | n/a | n/a | ACCEPT — period: companies pooled water |
| `applyStarvation` | ✓ | ✓ | ✓ | n/a | OK |
| `tickOxen` | ✓ | ✓ (subset — fatigue + overwork only) | mostly | low | ACCEPT — NPC ox tick is intentionally simpler |
| Stray oxen morning roll (#220) | ✓ | ✗ | should be (period: every wagon could lose oxen overnight) | medium | CLOSE — small daily roll on NPC oxen |
| `tickWagon` | ✓ | ✗ | **should be — every wagon broke** | **HIGH** | **CLOSE** — companion wagons should also lose condition |
| `applyAxleGrease` (#214) | ✓ | ✗ | depends on tickWagon for NPCs | medium | CLOSE alongside tickWagon for NPCs |
| `adjustMorale` | ✓ | event-driven only | partial | medium | CLOSE — daily morale baseline drift on NPCs is missing |
| `applyHolidays` (#178) | ✓ | ✗ | should be (July 4 / Christmas hit the whole company) | medium | CLOSE — bump train morale on those days |
| `applyTravel` | ✓ | shared (train moves with player) | ✓ | n/a | ACCEPT |
| Landmark elections (#285 phase 1) | ✓ runs at landmarks | drives across train | ✓ | n/a | OK |
| `prepareEventForSurfacing` / arrival events | ✓ | n/a — player UI surface | n/a | n/a | ACCEPT — distinct content surface |
| `attemptFire` (#143) | ✓ | ✗ | should be (NPC wagons can lose firewood / cold-camp too) | low | CLOSE — small fire-related morale dip on NPCs |
| `applyDehydration` | ✓ | ✗ — shared keg | n/a | n/a | ACCEPT |
| `reapDead` | ✓ | ✓ | ✓ | n/a | OK |
| Auto-cannibalism (#149 / #288) | player choice | NPC auto | parallel | n/a | OK by design |
| #280c NPC events | ✗ — player doesn't have them | ✓ | n/a | n/a | OK — distinct content (player gets full `EVENTS` catalog; NPCs get a small one-shot bank) |
| Train events (#282) | ✓ | source for some | parallel | n/a | OK |

## Action / camp-action coverage

| Action | Reaches NPCs? | Severity | Action |
|---|---|---|---|
| `rest` | ✓ via `advanceTrain` | n/a | OK |
| `hunt` solo | ✗ — player-only | medium | ACCEPT — NPCs don't hunt; the loss is they never replenish meat |
| `hunt` company (#294) | ✓ — distributes meat | n/a | OK |
| `ford` | ✓ shared | n/a | OK |
| `trade` (post buy/sell) | **✗ — player-only** | **HIGH** | **CLOSE / NPC bot brain** — without post restock, NPC wagons inevitably run out of food. Companions should buy at posts (cash → food, like the player) |
| `tradeWithCompanion` (#289) | ✓ both directions | n/a | OK |
| `sundayLayBy` (#224) | ✓ runs the rest | partial | NPCs don't get the +morale bonus from "the company laid by" |
| Camp actions (camp-actions.ts) | n/a — player-only by design | n/a | ACCEPT — camp activities are player choices; NPCs do their version via the implicit tick |
| `joinTrain` / `leaveTrain` / `townToggleStandAside` | meta — operates on the train | n/a | OK |
| `townDoctorVisit` / `townHandToCompanion` (#286) | ✓ NPCs receive | n/a | OK |
| `townGiveToCompanion` (#289 phase 1) | ✓ | n/a | OK |
| `whore service-the-train` (#291) | ✓ NPCs contribute | n/a | OK |
| Player condition treatment via items | ✓ | ✓ (NPCs consume their own treatment items via `tickConditions`) | n/a | OK |

## Bot-AI layer

The player's bot persona (`src/lib/dev/bot/`) drives every tunable: `pickPace`, `pickRations`, `shouldRest`, `shouldHunt`, `shouldFindWater`, `shouldTradeAtPost`, `shouldStayInn`, etc. NPC wagons currently have **no bot brain**:

- `rations` — fixed at `'normal'` for the lifetime of the wagon. Period: emigrants tightened to `meager` on bad stretches. NPCs being stuck on normal makes them artificially fragile.
- No "rest if HP low" — NPCs ride out the calendar with the train regardless of party condition. Their HP drains until they die or starvation events fire.
- No "buy food at posts" — see HIGH gap above. The NPC starves silently as months pass.
- No "hunt when food low" — same.
- No "treat conditions purposefully" — currently `tickConditions` consumes treatment items if any are in inventory; bot brain would be deciding whether to *buy* quinine when needed.

## Severity-ordered close list

Recommended order to ship the closes, biggest gameplay impact first:

1. **HIGH — companion wagons buy food at posts** (#TODO post-restock). Without this, every NPC wagon's food goes to zero on a fixed timeline determined only by their starting kit + rare gifts. Mechanism: when `applyTravel` lands at a stop-worthy `trading_post`, run a per-companion "buy food" pass — each in-progress companion with cash on hand buys flour / bacon / beans up to a target stockpile, scaled by alive-soul count. Keeps the train alive long enough for actual gameplay.
2. **HIGH — `tickNpcWagon` runs wagon condition decay**. Companion wagons are immortal; player wagon decays. Bring up a simpler version of `tickWagon` (terrain + weather inputs, axle-grease mitigation) on NPC wagons.
3. **MEDIUM — daily morale baseline drift** for NPC wagons. Currently only event/starvation moves NPC morale; player gets a daily `adjustMorale` based on alive ratio + profession bonuses. Mirror a simpler version on NPCs so slow-burn morale changes match the player's curve.
4. **MEDIUM — Sabbath, holidays, stray oxen** (group cluster). Three small daily-ish hooks; one branch each, or one combined.
5. **MEDIUM — companion hunting**. NPCs never replenish meat; player can. Without #275-style bot AI per wagon, simplest model is: probability roll on travel days when food is low → +N lb game_meat. Crude but closes the gap until #287 named profiles bring real bot personality.
6. **LOW — diet variety / hot drinks morale**. Small lift; nice to have.
7. **WIRE-ON-SHIP** — `applyEggLay`, `applyDairy`, `applyButterChurn` (#297) — fold into #287 named profiles when chickens / cows actually appear on companion wagons.
8. **WIRE-ON-SHIP** — `decayCleanliness` etc. — needs `cleanliness` field on NpcWagonState first; defer until cleanliness becomes user-visible on the train roster.

## Asymmetries that are CORRECT (don't close)

- Water keg (`applyDirtyWaterRisk`, `applyDehydration`) — train shares the player's keg; period reality of company water management.
- Distinct event surfaces — player has interactive `EVENTS` catalog with modals; NPCs have one-shot mechanical events (#280c). Different content for different roles.
- Camp actions — player chooses how to spend a camp day; NPCs handle their version via the tick. The player's surface is the input, the NPC's is the output of the same calendar.
- Travel / weather / terrain — shared by definition.

## Recommended next ticket order

After this audit, the natural next branches in order of value:

1. **#TODO** — companion post-restock (HIGH gap #1) — the single biggest "NPCs feel real" fix.
2. **#TODO** — companion `tickWagon` decay (HIGH gap #2).
3. **Fold into #287 named profiles** — daily morale drift, holidays, stray oxen, NPC hunting, NPC chickens/cows. Named profiles are the natural surface for "the Sagers always carry chickens" or "Joe Meek hunts for the train."

This closes #298 as a documented audit; the closes themselves get their own TODO entries.
