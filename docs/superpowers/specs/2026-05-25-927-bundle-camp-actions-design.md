# #927 — Bundle camp actions on every rest day

**Status:** Draft · 2026-05-25
**Owner:** Eric Bond (HAL drafting)
**Vikunja ticket:** [#927 — Stop ratios — when bot stops, bundle multiple actions](https://projects.ericbond.net/tasks/927)
**Pairs with:** #925 (event audit — both reduce calendar burn by making each calendar day do more)

---

## Problem

Today when a bot stops (rest day, find-water-driven stop, Sunday rest, company lay-by), the wagon is largely *idle*:

- `restWithWaterChain` in `src/lib/dev/bot/runner.ts:136` invokes at most `[find_water, boil_water, gather_firewood]`.
- Other rest-day paths call plain `rest(state, 1)` with **no camp actions at all** — Sunday rest is purely passive (oxen recover, +1 morale, day ticks).
- **NPC wagons run no camp actions ever.** `npc-engine.ts:330-340` only flips a `traveled` boolean; rest days inflate the synth and the wagon idles silently.

Period reality (Frizzell 1852, Bryant 1846, Marcy 1859, Sager 1844, Reed-Donner): emigrant rest days were *full work days*. "The men greased wheels, mended yokes, hunted; the women baked bread for three days, washed, mended" (Frizzell). Marcy 1859 prescriptive: "the rest day should be devoted to the renewal of the outfit — repairs, washing, mending, replenishing." Sunday was rest *from travel*, not rest from camp labor.

The gap: every rest day should fill the 12-hour camp budget (#144) with appropriate-to-persona work, for both player bots and NPC wagons.

## Goal

Add a per-persona `bundleCampActions` surface in the game-AI namespace (#302) that, on a non-travel day, returns a list of camp actions (plus an optional hunt directive) that fills the 12-hour budget against state and persona preferences. Bot driver (player) and NPC engine consume the same surface — single source of truth, no parity drift between player and NPC wagons.

## Scope

### In scope
- New module `src/lib/game/ai/bundle.ts` with `bundleCampActions(persona, state, primary, rng): RestBundle` dispatcher + `defaultBundleCampActions` algorithm + per-action `urgency()` table.
- `Persona` interface gains `bundleWeights: BundleWeights` (5 category numbers in {0, 1, 2}) and optional `bundleCampActions?(...)` override.
- 22 bundleable actions across 5 categories: survival, food, maintenance, hygiene, morale.
- Hunt joins the bundle on rest days at 5h budget cost, invoked via the existing `hunt(state, opts, rng)` action after `rest()` runs.
- Travel-day Hunt button preserved unchanged (mid-travel stop-and-hunt remains accessible).
- Player-bot `restWithWaterChain` rewired to `restWithBundle` using the new surface.
- NPC-engine `tickNpcWagon` gains a new step on non-travel days: synthesize wagon state → invoke `bundleCampActions` → apply through `rest()` on the synth → project deltas back.
- 2 persona overrides: `chaos` (random pick), `faithful` (Sabbath-sequenced).
- Unit tests covering algorithm correctness, persona dispatch, per-action urgency, NPC parity.
- Sweep checkpoint validation (10 personas × 4 shapes × 2 runs) with arrival/wiped direction expectations.

### Out of scope (filed as follow-ups)
- **#927b — Player UI integration.** RestModal still takes manual `campActions: CampActionId[]`. Future ticket: when player clicks Rest, pre-fill the camp-action picker with `bundleCampActions(...)` so the human player sees the same recommendation the bot would pick.
- **#927c — Persona-specific event rolls.** Drinker hangover, faithful "sign from god," cautious prudent-foresight, hoarder cache-discovery, etc.
- **#927d — "Hunter rides ahead" mid-travel passive yield.** Models historical pattern 1 (Marcy 1859: hunter rides in advance of the train) — passive meat yield without halting the train.

### Non-goals
- Refactoring `hunt()` into a `CampAction` shape. Hunt keeps its own structured haul + post-hunt modal flow. Bundle layer treats hunt as a separate-but-budgeted path.
- Variable budget caps by persona (drinker's "6h sleep-in" was considered and rejected — weights-only is enough character expression).
- Sweep-validated weight tuning *in the spec*. The matrix below is starting values; if sweep cohorts drift >2pp arrival or >5pp wiped vs slice3-water baseline, weights get adjusted in implementation, not via spec amendment.

## Approach (chosen: C — shared algorithm + persona weights, with override escape hatch)

The decision space had three architectures (A: per-persona logic; B: shared algo + weights only; C: shared algo + weights + optional override). We chose **C** because:

- Most personas map cleanly to category weights (7 of 10).
- Two personas (`chaos`, `faithful`) have rest-day shapes that don't reduce to category weights:
  - `chaos`: random shuffle pick — fundamentally different selection mechanic.
  - `faithful`: Sabbath-aware sequencing (Sunday: domestic only; weekday: full bundle). Conditional weights aren't expressible as data.
- The override escape hatch costs ~1 LoC at the dispatch site and prevents the default algorithm from accumulating `if (persona.id === 'chaos') { ... }` branches over time.

## Architecture

### File layout

| File | Status | Responsibility |
|---|---|---|
| `src/lib/game/ai/bundle.ts` | NEW | `bundleCampActions` dispatcher, `defaultBundleCampActions` algorithm, `urgency()` table, `BUNDLEABLE_ACTIONS` source-of-truth list, `BundleWeights` + `RestBundle` types |
| `src/lib/game/ai/types.ts` | MODIFY | Add `bundleWeights` + optional `bundleCampActions?` to `Persona` |
| `src/lib/game/ai/personas.ts` | MODIFY | Wire `bundleWeights` on all 10 personas; add override impls on chaos + faithful |
| `src/lib/game/ai/index.ts` | MODIFY | Re-export new surface (`bundleCampActions`, `BundleWeights`, `RestBundle`, `BUNDLEABLE_ACTIONS`) |
| `src/lib/game/ai/rest.ts` | MODIFY | Keep `pickRestCampChain` as the chain-fallback. No deletion. |
| `src/lib/dev/bot/runner.ts` | MODIFY | `restWithWaterChain` → `restWithBundle` using new surface; all rest-call sites (Sunday, shouldRest, find-water, company lay-by) call it |
| `src/lib/game/systems/npc-engine.ts` | MODIFY | Add `tickNpcBundle` step on non-travel days |
| `tests/bundle-927.test.ts` | NEW | Algorithm, persona dispatch, urgency table, budget invariant |
| `tests/npc-bundle-927.test.ts` | NEW | NPC tick parity, Sunday/lay-by paths, wagon-synth integration |

### Persona surface

```ts
// src/lib/game/ai/types.ts (additions to existing Persona interface)

export interface BundleWeights {
  survival: number;     // find_water, boil_water, gather_firewood, dig_well
  food: number;         // fish, set_traps, cure_meat, press_cheese, big_meal
                        //   (also gates hunt via RestBundle.hunt: food>0 required)
  maintenance: number;  // patch_wagon, replace_canvas, replace_planks,
                        //   stitch_moccasins, cast_balls, service_train
  hygiene: number;      // wash_clothes, make_soap
  morale: number;       // sing_along, read_bible, pass_whiskey, teach_kids
}

export interface RestBundle {
  /** Fed into rest(state, 1, { campActions }). Always includes the primary
   *  if provided; auto-promoted from the highest-urgency available action
   *  when primary is null. */
  campActions: CampActionId[];
  /** When non-null, caller invokes hunt(state, hunt, rng) AFTER rest()
   *  completes. The 12-hour budget is shared: hunt time is subtracted
   *  alongside camp action time at bundle layer. */
  hunt: { hunters: 1 | 2 } | null;
}

export interface Persona {
  // ...existing surface unchanged

  /** #927 — Per-category priority weights for the default bundle algorithm.
   *  Each weight in {0, 1, 2}: 0 = skip the category entirely, 1 = include
   *  by urgency, 2 = include first when budget tight. Multiplied against
   *  per-action urgency to rank candidates. Weight=0 always loses. */
  bundleWeights: BundleWeights;

  /** #927 — Optional escape hatch: replace the default bundle algorithm
   *  entirely. When omitted, bundle.ts's defaultBundleCampActions runs
   *  with this persona's bundleWeights. Override receives the same
   *  primary action and state as the default, and MUST respect the
   *  12-hour TIME_BUDGET_HOURS cap (otherwise rest() throws on apply). */
  bundleCampActions?: (
    state: GameState,
    primary: CampActionId | null,
    rng: Rng,
  ) => RestBundle;
}
```

### Bundle algorithm

```ts
// src/lib/game/ai/bundle.ts

import { CAMP_ACTIONS_BY_ID, hourCostFor } from '../actions/camp-actions';
import type { CampActionId } from './rest';
import type { GameState, Persona } from '../types';
import type { Rng } from '../rng';

export const HUNT_HOURS = 5;
export const TIME_BUDGET_HOURS = 12;  // re-exported from rest.ts so bundle is self-contained

export type BundleableActionId =
  | 'find_water' | 'boil_water' | 'gather_firewood' | 'dig_well'                          // survival
  | 'fish' | 'set_traps' | 'cure_meat' | 'press_cheese' | 'big_meal'                      // food (hunt handled separately via RestBundle.hunt)
  | 'patch_wagon' | 'replace_canvas' | 'replace_planks' | 'stitch_moccasins'
    | 'cast_balls' | 'service_train'                                                       // maintenance
  | 'wash_clothes' | 'make_soap'                                                          // hygiene
  | 'sing_along' | 'read_bible' | 'pass_whiskey' | 'teach_kids';                          // morale

export const BUNDLEABLE_ACTIONS: readonly BundleableActionId[] = [
  'find_water', 'boil_water', 'gather_firewood', 'dig_well',
  'fish', 'set_traps', 'cure_meat', 'press_cheese', 'big_meal',
  'patch_wagon', 'replace_canvas', 'replace_planks', 'stitch_moccasins', 'cast_balls', 'service_train',
  'wash_clothes', 'make_soap',
  'sing_along', 'read_bible', 'pass_whiskey', 'teach_kids',
];

export const CATEGORY_OF: Record<BundleableActionId, keyof BundleWeights> = {
  find_water: 'survival', boil_water: 'survival', gather_firewood: 'survival', dig_well: 'survival',
  fish: 'food', set_traps: 'food', cure_meat: 'food', press_cheese: 'food', big_meal: 'food',
  patch_wagon: 'maintenance', replace_canvas: 'maintenance', replace_planks: 'maintenance',
  stitch_moccasins: 'maintenance', cast_balls: 'maintenance', service_train: 'maintenance',
  wash_clothes: 'hygiene', make_soap: 'hygiene',
  sing_along: 'morale', read_bible: 'morale', pass_whiskey: 'morale', teach_kids: 'morale',
};

export function bundleCampActions(
  persona: Persona,
  state: GameState,
  primary: CampActionId | null,
  rng: Rng,
): RestBundle {
  return persona.bundleCampActions
    ? persona.bundleCampActions(state, primary, rng)
    : defaultBundleCampActions(state, primary, persona, rng);
}

export function defaultBundleCampActions(
  state: GameState,
  primary: CampActionId | null,
  persona: Persona,
  rng: Rng,
): RestBundle {
  const weights = persona.bundleWeights;

  // 1. Score every bundleable: score = weights[category] × urgency
  const candidates = BUNDLEABLE_ACTIONS
    .filter((id) => CAMP_ACTIONS_BY_ID[id].availability(state).available)
    .filter((id) => weights[CATEGORY_OF[id]] > 0)
    .map((id) => ({
      id,
      hours: hourCostFor(CAMP_ACTIONS_BY_ID[id], state),
      score: weights[CATEGORY_OF[id]] * urgency(state, id),
    }))
    .filter((c) => c.score > 0);

  // 2. Pick the seed: explicit primary wins; otherwise highest score.
  let seed: CampActionId | null = primary;
  if (!seed) {
    const top = [...candidates].sort((a, b) => b.score - a.score)[0];
    seed = top?.id ?? null;
  }
  const campActions: CampActionId[] = [];
  let remaining = TIME_BUDGET_HOURS;
  if (seed) {
    campActions.push(seed);
    remaining -= hourCostFor(CAMP_ACTIONS_BY_ID[seed], state);
  }

  // 3. Greedy fill: sort remaining by score desc, then hours asc, then id asc.
  const rest = candidates
    .filter((c) => c.id !== seed)
    .sort((a, b) => (b.score - a.score) || (a.hours - b.hours) || a.id.localeCompare(b.id));
  for (const c of rest) {
    if (c.hours <= remaining) {
      campActions.push(c.id);
      remaining -= c.hours;
    }
  }

  // 4. Hunt: if persona.shouldHunt and enough budget left, append a hunt directive.
  let hunt: RestBundle['hunt'] = null;
  if (weights.food > 0 && remaining >= HUNT_HOURS && persona.shouldHunt(state, rng)) {
    hunt = { hunters: pickHunters(state) };
  }

  return { campActions, hunt };
}

function pickHunters(state: GameState): 1 | 2 {
  const liveHunters = state.party.filter((m) => !m.dead && m.profession === 'hunter').length;
  return liveHunters >= 2 ? 2 : 1;
}
```

### Urgency function

```ts
export function urgency(state: GameState, id: BundleableActionId): number {
  switch (id) {
    case 'find_water': {
      const w = state.resources.water ?? 0;
      return w < 5 ? 10 : w < 15 ? 6 : 3;
    }
    case 'boil_water': {
      const dirty = state.resources.dirtyWater ?? 0;
      return dirty > 0 ? 8 : 0;
    }
    case 'gather_firewood': {
      const fw = state.resources.firewood ?? 0;
      return fw < 5 ? 10 : fw < 15 ? 6 : 3;
    }
    case 'dig_well': {
      const w = state.resources.water ?? 0;
      return state.location.terrain === 'desert' && (state.inventory.shovel ?? 0) > 0 && w < 5 ? 10 : 0;
    }
    case 'fish': case 'set_traps': {
      const food = totalFoodLb(state);
      return food < 50 ? 8 : 4;
    }
    case 'cure_meat': {
      const meat = state.inventory.game_meat ?? 0;
      return meat >= 20 ? 10 : meat > 0 ? 5 : 0;
    }
    case 'press_cheese':       return (state.inventory.milk ?? 0) > 0 ? 8 : 0;
    case 'big_meal':           return state.morale < 50 ? 6 : 3;
    case 'patch_wagon': {
      const c = state.wagon.condition;
      return c < 60 ? 10 : c < 80 ? 6 : 2;
    }
    case 'replace_canvas':     return state.wagon.canvasDamaged ? 10 : 0;
    case 'replace_planks':     return state.wagon.planksDamaged ? 10 : 0;
    case 'stitch_moccasins':   return (state.inventory.hide ?? 0) > 0 ? 6 : 3;
    case 'cast_balls': {
      const balls = state.inventory.lead_balls ?? 0;
      const hasMats = (state.inventory.lead ?? 0) > 0 && (state.inventory.gunpowder ?? 0) > 0;
      return hasMats && balls < 20 ? 8 : hasMats ? 3 : 0;
    }
    case 'service_train':      return 5;  // fixed preventive maintenance signal
    case 'wash_clothes':       return state.location.terrain === 'river' ? 6 : 0;
    case 'make_soap':          return (state.inventory.tallow ?? 0) > 0 ? 5 : 0;
    case 'sing_along':         return state.morale < 50 ? 6 : 3;
    case 'read_bible':         return state.morale < 60 ? 5 : 2;
    case 'pass_whiskey':       return state.morale < 50 ? 5 : 2;
    case 'teach_kids':         return state.party.some((m) => !m.dead && m.kind === 'child') ? 5 : 0;
  }
}
```

Constants are *starting points* — sweep-tunable during implementation.

### Persona weight matrix

| Persona | Surv | Food | Maint | Hyg | Mor | Mechanism |
|---|---|---|---|---|---|---|
| cautious | 2 | 2 | 2 | 1 | 1 | weights |
| balanced | 1 | 1 | 1 | 1 | 1 | weights |
| aggressive | 2 | 1 | 2 | 0 | 0 | weights — sweep-validate food=1 (was considered for 0 but cost rest-day hunts) |
| chaos | — | — | — | — | — | **override** (random fill) |
| sunday_rester | 2 | 2 | 1 | 1 | 1 | weights — Marcy lay-by routine |
| pace_pusher | 2 | 1 | 1 | 0 | 0 | weights — survival + minimum food |
| hoarder | 1 | 2 | 1 | 1 | 1 | weights — food prep first |
| generous | 1 | 2 | 1 | 1 | 2 | weights — generous on morale activities |
| faithful | — | — | — | — | — | **override** — Sabbath-sequenced |
| drinker | 1 | 0 | 0 | 0 | 1 | weights — survival only + pass_whiskey via morale=1 |

### Override implementations

```ts
// chaos — random pick to fill budget, deterministic via rng
function chaosBundle(state, primary, rng): RestBundle {
  const avail = BUNDLEABLE_ACTIONS
    .filter((id) => CAMP_ACTIONS_BY_ID[id].availability(state).available);
  const shuffled = shuffleRng(avail, rng);
  const seed = primary ?? shuffled[0];
  const campActions: CampActionId[] = seed ? [seed] : [];
  let remaining = TIME_BUDGET_HOURS - (seed ? hourCostFor(CAMP_ACTIONS_BY_ID[seed], state) : 0);
  for (const id of shuffled) {
    if (id === seed) continue;
    const h = hourCostFor(CAMP_ACTIONS_BY_ID[id], state);
    if (h <= remaining) {
      campActions.push(id);
      remaining -= h;
    }
  }
  const hunt = (remaining >= HUNT_HOURS && rng() < 0.4) ? { hunters: 1 as const } : null;
  return { campActions, hunt };
}

// faithful — Sabbath-aware: Sunday skips maintenance, otherwise (2,2,2,1,2)
function faithfulBundle(state, primary, rng): RestBundle {
  const weights: BundleWeights = isSunday(state.date)
    ? { survival: 2, food: 2, maintenance: 0, hygiene: 1, morale: 2 }
    : { survival: 2, food: 2, maintenance: 2, hygiene: 1, morale: 2 };
  // Delegate to default with a temp persona wrapper carrying these weights.
  // bundleCampActions: undefined prevents recursive dispatch via the wrapper.
  return defaultBundleCampActions(
    state, primary,
    { ...faithfulPersona, bundleWeights: weights, bundleCampActions: undefined },
    rng,
  );
}
```

`isSunday(date)` derives day-of-week from `{year, month, day}` (existing helper or new — to be confirmed during implementation).

### Caller integration

#### Player bot (`runner.ts`)

```ts
function restWithBundle(
  state: GameState,
  persona: Persona,
  primary: CampActionId | null,
  stats: RunningStats,
): GameState {
  try {
    const bundle = bundleCampActions(persona, state, primary, makeBotRng(state));
    let s = rest(state, 1, { campActions: bundle.campActions });
    if (bundle.hunt) s = hunt(s, bundle.hunt, makeBotRng(s));
    stats.decisionsMade += 1;
    return s;
  } catch {
    // Fall through to old chain-fallback when something racy invalidates
    // the bundle between pick and apply.
  }
  for (const camp of pickRestCampChain(state)) {
    try {
      const next = rest(state, 1, { campActions: [...camp] });
      stats.decisionsMade += 1;
      return next;
    } catch { /* next */ }
  }
  try { return rest(state, 1); } catch (err) {
    stats.errors.push(`rest-fallback: ${(err as Error).message}`);
    return state;
  }
}
```

Call sites:
- Find-water trigger (`runner.ts` ~line 613, 689) → `restWithBundle(state, persona, 'find_water', stats)`
- Sunday rest / shouldRest trigger → `restWithBundle(state, persona, null, stats)`
- Company lay-by paths → `restWithBundle(state, persona, null, stats)`

#### NPC engine (`npc-engine.ts`)

```ts
// New step after company-decision sets `traveled`:
if (!traveled) {
  next = tickNpcBundle(next, env, persona, rng);
}

function tickNpcBundle(
  wagon: NpcWagonState,
  env: TrainEnv,
  persona: Persona,
  rng: Rng,
): NpcWagonState {
  const synth = synthesizeWagonState(wagon, env);
  const bundle = bundleCampActions(persona, synth, null, rng);
  if (bundle.campActions.length === 0 && !bundle.hunt) return wagon;
  try {
    let rested = rest(synth, 1, { campActions: bundle.campActions });
    if (bundle.hunt) rested = hunt(rested, bundle.hunt, rng);
    return projectWagonDeltas(rested, wagon);
  } catch {
    return wagon;  // defensive: race between availability and apply
  }
}
```

The wagon-synth → engine → projectWagonDeltas pattern matches existing `applyDailyConsumption` integration (#939c). No new pattern introduced.

## Data flow

```
[trigger: Sunday | shouldRest | find_water | company lay-by]
    │
    ▼
PLAYER BOT (runner.ts):                   NPC ENGINE (npc-engine.ts):
restWithBundle(state, persona, ...)       tickNpcBundle(wagon, env, persona, ...)
    │                                          │
    │                                          ▼
    │                                       synthesizeWagonState(wagon, env)
    │ ◄── same Persona surface ─────────► ───┤
    ▼                                          ▼
bundleCampActions(persona, state, primary, rng) → RestBundle
    │
    ├── persona.bundleCampActions ? ─── chaos | faithful overrides
    └── else: defaultBundleCampActions
                │
                ├── candidates = BUNDLEABLE_ACTIONS filter by availability + weight>0
                ├── score = weights[category] × urgency
                ├── primary seed (explicit) or top-score seed
                ├── greedy fill within 12h
                └── hunt directive if budget + shouldHunt
    │
    ▼
rest(state, 1, { campActions: bundle.campActions })  [+ hunt(s, bundle.hunt, rng) if non-null]
    │
    ▼                                       [NPC: projectWagonDeltas(rested, wagon)]
return state'                               return wagon'
```

## Testing strategy

### `tests/bundle-927.test.ts` (new) — 25 cases

**Algorithm:**
- Empty bundle when no available bundleables (boil_water gated by year/doctor, no lead+powder, no hide, etc.)
- Primary always first in returned `campActions` array when provided
- Primary auto-promoted from highest score when null
- Bundle total `hourCostFor` sum ≤ `TIME_BUDGET_HOURS` (invariant — property-style with multiple seeds)
- Hunt directive added only when remaining budget ≥ HUNT_HOURS AND persona.shouldHunt
- Hunt budget subtraction respects available-camp-time
- Score = weights × urgency; weight=0 zeros out the category entirely
- Tiebreak: score desc → hours asc → id asc (deterministic)

**Urgency table — pin per-action breakpoints (one assertion per breakpoint):**
- find_water: water<5 → 10, <15 → 6, else 3
- gather_firewood: firewood<5 → 10, <15 → 6, else 3
- cure_meat: meat≥20 → 10, any → 5, none → 0
- patch_wagon: condition<60 → 10, <80 → 6, else 2
- (one per action listed in urgency table above)

**Persona dispatch:**
- cautious uses defaultBundleCampActions with (2,2,2,1,1)
- aggressive uses default with (2,1,2,0,0) — never picks hygiene or morale
- drinker uses default with (1,0,0,0,1) — survival only + occasional whiskey
- chaos uses chaosBundle override (random shuffle)
- faithful uses faithfulBundle override (Sabbath-sequenced)
- Sunday faithful: maintenance weight 0 → no patch_wagon in result
- Non-Sunday faithful: maintenance weight 2 → matches default-cautious shape

**Determinism:**
- Two calls with same state + persona + seeded rng yield identical RestBundle

### `tests/npc-bundle-927.test.ts` (new) — 8 cases

- Sunday: every persona returns non-empty bundle when bundleables available
- Company maintenance_layby: 3 NPC wagons with different personas bundle in parallel — observable inventory diff per wagon (cured meat, repaired wagon, etc.)
- Company crisis_layby: bundle still fires, but availability gates naturally taper (sick party → no live hunter for set_traps; reduced bundle length)
- Wagon-synth roundtrip: side effects from `rest()` on synth pull back to wagon via `projectWagonDeltas` (inventory + condition + morale fields)
- Hunt-via-bundle: NPC wagon with persona.shouldHunt=true on rest day produces meat in inventory
- Determinism: same env + same wagon + same day → same bundle
- Failure mode: if `rest()` throws (race on availability), wagon stays at pre-bundle state
- Parity invariant: `bundleCampActions(persona, playerState, ...)` and `bundleCampActions(persona, npcSynth, ...)` return identical results for structurally identical inputs

### Sweep checkpoint

`scripts/persona-profession-sweep.ts --runs 2 --tag bundle-927`

Direction expectation per persona (vs slice3-water baseline from #1074):

| Cohort | Direction | Why |
|---|---|---|
| cautious | +arrival | More food prep + repairs = more buffer through Snake/Blues |
| balanced | +small | Same |
| aggressive | flat → slight +arrival | Bundle adds survival+maintenance fill; food=1 enables rest-day hunts |
| **chaos** | unpredictable | Random pick → variance ±3-5pp expected |
| pace_pusher | flat / +small | Survival + minimum food only |
| hoarder | +arrival | Food prep heavy = jerky stockpile rises |
| **drinker** | -arrival? | (1,0,0,0,1) means missed maintenance + food prep |
| faithful | +arrival | Sabbath food/water + weekday full bundle |

**Specific things to watch:**
- Aggressive 4/0 cohort spoilage rate (food=1; will it cure enough meat?)
- Drinker 4/0 cohort wiped %: does (1,0,0,0,1) wipe more than slice3-water?
- Cautious cohort: arrival jump >5pp = overcorrection signal
- NPC survivor disparity in-train vs solo

## Files / line-count budget

| File | Δ LoC (est.) |
|---|---|
| `src/lib/game/ai/bundle.ts` (new) | ~250 |
| `src/lib/game/ai/types.ts` | +30 |
| `src/lib/game/ai/personas.ts` | +100 (10 bundleWeights + 2 overrides) |
| `src/lib/game/ai/index.ts` | +6 |
| `src/lib/dev/bot/runner.ts` | +30 |
| `src/lib/game/systems/npc-engine.ts` | +50 |
| `tests/bundle-927.test.ts` (new) | ~350 |
| `tests/npc-bundle-927.test.ts` (new) | ~150 |
| **Total** | ~960 LoC |

## NPC parity (#298) artifact

`tests/npc-bundle-927.test.ts` includes a one-line invariant:

```ts
expect(bundleCampActions(persona, playerState, null, makeRng('x')))
  .toEqual(bundleCampActions(persona, npcSynth, null, makeRng('x')));
```

…for structurally identical inputs. If player and NPC ever drift, the test breaks loudly.

## Game-AI namespace (#302) artifact

All new decision logic lives at `src/lib/game/ai/bundle.ts`. Persona interface change in `src/lib/game/ai/types.ts`. Re-export from `src/lib/game/ai/index.ts`. The `tickNpcBundle` step in `npc-engine.ts` is purely orchestration (call AI surface, run engine action) — no decision logic spills outside `ai/`.

## Open questions for implementation

1. **`isSunday(date)` helper.** Is there an existing day-of-week computation, or do we add a small one in `date.ts`? Confirm during implementation.
2. **`pickHunters(state)` location.** Probably belongs in `bundle.ts` next to the algorithm, but could move to `ai/hunt.ts` (already exists for `pickHuntTarget`). Either works.
3. **`shuffleRng(arr, rng)` helper.** Used only by chaos override. Co-locate in `bundle.ts` unless an existing helper exists elsewhere.

## Period-fidelity load-bearing references

- Frizzell 1852 (lay-by routine) — "the men greased wheels, mended yokes, hunted; the women baked bread for three days, washed, mended"
- Bryant 1846 (South Pass lay-by) — "two days at the springs — repaired wagons, dried meat, made shoes"
- Marcy 1859 *Prairie Traveler* — "the rest day should be devoted to the renewal of the outfit"
- Sager 1844 (Sunday) — "we did not travel but the men were at chores from breakfast until dark"
- Reed-Donner Sweetwater accounts (organized buffalo hunt halt)

These anchors justify the 12-hour camp budget AND the "fill the day" intent.
