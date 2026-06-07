# Human Water Rationing ("Drycamp") — Design

**Ticket:** #1245 (human-water scope). **Date:** 2026-06-07.

**Goal:** Give the player and bot the historical human survival lever for dry stretches — **water rationing / drycamping** — so a *prepared, disciplined* party can cross the Snake desert (and any dry drive) without dying of thirst, while the unprepared still fail. "Hard gate, fair if prepared."

## Why

The bot/sim's #1 death cause is **dehydration** (124:40 over starvation in the cautious-4/0 diag), and wiped runs die at **~mile 1483 — the Snake desert.** Investigation (#1245) showed this is **not** a capacity problem — the wagon already carries a water barrel (`baseWaterCapGal` 15/20/25) and `water_bag` adds +5 gal each. The problem is **structural**: water consumption is **binary** — `waterConsumedToday` always draws full need (1 gal/adult/day, heat-scaled); when the keg empties, the dehydration death curve fires with **no middle gear**.

Historically, emigrants survived dry stretches by **"drycamping"** — *"eating dry food and having nothing to drink,"* rationing water hard and pushing to the next source (Britannica; NPS). Our dehydration *timeline* is already realistic-to-lenient (death ~day 4–5 at zero water in desert vs the medical ~3-day "rule of 3s," less in heat) — so the curve stays. What's missing is the **rationing tier** that lets a party stretch limited water and *avoid hitting zero*. Adding it makes dehydration a rare catastrophe (as in history) instead of the dominant killer.

## Out of scope (deferred)
- **Ox water need + route choice + dry-drive timing** → #1264 (the strategic desert system; oxen are the *other* historical desert killer, managed by route/pace not carrying).
- **Three Island wet/dry route fork** → #1145.
This ticket is strictly the **human** water-ration mechanic.

## Architecture

### 1. State — `waterRation` (parallel to `rations` for food)

Add to `GameState`:
```ts
export type WaterRation = 'normal' | 'conserve' | 'drycamp';
// GameState:
waterRation: WaterRation;   // defaults 'normal' on new + migrated saves
```
Migration: absent → `'normal'` (mirror how `rations`/`cleanliness` default; per project memory there is no save-migration burden, but a nullish-coalesce default keeps old saves loading).

### 2. Consumption — tier multiplier in `waterConsumedToday`

`src/lib/game/systems/consumption.ts`. Add:
```ts
export const WATER_RATION_MULT: Record<WaterRation, number> = {
  normal: 1.0,
  conserve: 0.5,
  drycamp: 0.25
};
```
Apply in `waterConsumedToday` after the existing weather/temp scaling:
```ts
return Math.ceil(base * weatherWaterMult(state.weather) * tempWaterMult(state)
  * WATER_RATION_MULT[state.waterRation ?? 'normal']);
```
Effect: conserve doubles, drycamp ~quadruples how long a keg lasts. The keg never goes negative — rationing **delays/avoids** the zero-water dehydration curve.

### 3. Rationing penalty — `applyWaterRationStrain` (new, in consumption or a small sibling)

Rationing has a real cost so it's a tradeoff, not a free default. Applied each day the party is **not** on `normal` AND the keg is **not** already dry (dry-day damage is the dehydration system's job, not double-counted):

| Tier | Morale/day | HP/day |
|---|---|---|
| conserve | −1 | 0 |
| drycamp | −3 | 0 for the first 3 consecutive drycamp days; **−2/day after day 3** (sustained parching) |

Track consecutive drycamp days in `flags._drycampDays` (mirror `_dehydrationDays`); reset when the party returns to `normal`/`conserve` or reaches water. Starting values; **sweep-tuned** (see Testing). Children take the morale hit; HP nick scaled ×0.7 like dehydration. This keeps drycamp a viable 3–5 day *bridge* but punishes indefinite use.

### 4. Bot/NPC — `persona.pickWaterRation(state, rng): WaterRation`

New persona method (parallel to `pickRations`). Default impl (shared, on `balancedPersona`, inherited by spread personas):
```ts
pickWaterRation(state) {
  // Gap-aware: ration when a dry stretch ahead would empty the keg at
  // normal draw before the next water. Reuse foresight.
  const dryDaysAhead = projectedDryDaysToNextWater(state); // helper below
  const daysOfWater = state.resources.water / Math.max(1, waterPerDayAtNormal(state));
  if (daysOfWater >= dryDaysAhead) return 'normal';        // enough — drink freely
  if (daysOfWater * 2 >= dryDaysAhead) return 'conserve';  // 0.5x bridges it
  return 'drycamp';                                         // 0.25x or bust
}
```
`projectedDryDaysToNextWater(state)` derives from the existing desert/gap foresight (`effectiveGapMiles` / `nextSupplyDistance` / terrain) ÷ pace. Personas vary: cautious rations **earlier** (bigger safety margin), pace_pusher later, chaos ignores it (null → normal). The bot runner + npc-engine call `persona.pickWaterRation` once per day (same place they call `pickRations`).

### 5. Player UI — water-ration control

Mirror the existing food-rations picker (a 3-way Normal/Conserve/Drycamp control) on the play screen / camp, with a one-line hint of the tradeoff (e.g. "Conserve — half water, the party grumbles"). Reuses the food-rations control pattern. Persisted via the play actions (same path as `setRations`).

### 6. Provisioning — water_bag buyable before the desert (#1223 interaction)

Ensure the desert-gateway posts (Ft Hall, Ft Boise, and the last post before each ≥200mi dry gap) **stock enough `water_bag`** that a 4-adult party can hit the gap-aware target. Two-part: (a) verify `water_bag` is in those posts' `stock`; (b) raise the per-post remaining for water gear (e.g. a `stockScale` floor or a category exemption for `water_bag` at desert-gateway posts) so #1223's stock cap doesn't starve the supply. The bot already targets `gapAwareWaterBagTarget` (4 before a big gap) — this makes that reachable.

## Data flow
Daily tick → `pickWaterRation` (bot) / player setting → `waterConsumedToday` scales by tier → keg drains slower → `applyWaterRationStrain` (morale/sustained-HP cost) → if keg still hits 0, existing `applyDehydration` curve fires (unchanged).

## Testing

**Unit:**
- `WATER_RATION_MULT` applied in `waterConsumedToday` (normal/conserve/drycamp scale 1/0.5/0.25 of the heat-scaled base).
- `applyWaterRationStrain`: morale/HP per tier; drycamp HP nick only after 3 consecutive days; `_drycampDays` accumulates + resets on water/normal; no double-count on dry days.
- `pickWaterRation`: normal when water covers the gap; conserve/drycamp as the margin shrinks; chaos → normal; cautious rations earlier than pace_pusher.
- Migration: save without `waterRation` loads as `normal`.

**Sweep gate (`--runs 2`, ~1.2k, BEFORE/AFTER, incl. 4/2 & 3/3):**
- **PASS** = arrival % **rises** on the dry-sensitive shapes (esp. 4/0 / 3/0 crossing the Snake) and **dehydration's share of deaths drops materially** (it should no longer be the #1 killer), **without** a new failure mode spiking (e.g. morale-collapse desertion from over-rationing). Tune `WATER_RATION_MULT` + strain penalties to hit "prepared crosses, unprepared dies."
- Report dehydration vs other death-cause mix BEFORE/AFTER (the realism check: it should fall toward a historical minority).

## Self-review checklist (author)
- Spec coverage: state field, consumption multiplier, strain penalty, bot logic, player UI, provisioning, migration, tests — all present.
- Consistency: `waterRation` type used identically across consumption, persona, UI; penalties not double-counted with dehydration (strain only when keg > 0).
- Scope: single plan; ox-water/route explicitly deferred (#1264/#1145).
- Ambiguity: penalty numbers are starting values, explicitly sweep-tuned.
