# Wagon wheel 3-choice ladder event (VK #929)

**Status:** design complete, awaiting implementation plan.

**Goal:** Replace today's binary wheel-break resolution (auto-replace from spare, or take a flat condition penalty if no spare) with a 3-choice ladder — `Spare` / `Rebuild` / `Push on` — that matches Marcy 1859 + Bryant 1846 trailside repair practice. Same ladder applies to NPC wagon-break events (#300 parity); persona decision logic lives in `game/ai/` (#303c lineage).

**Pairs with:**
- [[#300]] NPC wagon decay — uses the same resolver via `npc-engine.ts`
- [[#303c]] persona repair-budget — `pickWheelBreakResponse` is the trailside event-side sibling of the existing `pickRepairBudget` (which fires at trading posts)
- [[#1186]] camp/post rebuild + improve broken parts — follow-up that gives the player a path out of `wagon.impairment` between trading posts; gated on a historical-pass research write-up

**Out of scope here:** generalizing impairment to axle / tongue / canvas (separate tickets); camp-action rebuild of broken parts (filed as #1186); UI of the impairment indicator beyond a small icon.

## The three choices

```text
Wheel break event fires →
   ┌─────────────────────────────┬───────────────────────────────┬──────────────────────────────────────┐
   │ Spare                       │ Rebuild                       │ Push on                              │
   ├─────────────────────────────┼───────────────────────────────┼──────────────────────────────────────┤
   │ Mount the spare wheel.      │ Rebuild trailside.            │ Limp toward the next post.           │
   │ Requires `wheel` item.      │ Costs 2 days (1 if Blacksmith)│ No day-cost.                         │
   │ Wagon condition +10.        │ RNG roll: 70% (90% Blacksmith)│ Wagon impairment applied (persistent │
   │ Consumes one wheel item.    │ −20% if wagon.condition < 30. │ until smithy / spare / camp rebuild) │
   │ Clears any existing         │ Success → +15 condition,      │ — pace ×0.5                          │
   │ impairment.                 │   clear impairment.           │ — condition decay ×2                 │
   │                             │ Failure → days spent, wheel   │                                      │
   │                             │   still broken, impairment    │                                      │
   │                             │   applied.                    │                                      │
   └─────────────────────────────┴───────────────────────────────┴──────────────────────────────────────┘
```

## Architecture

### New data: `wagon.impairment`

In `src/lib/game/types.ts`:

```ts
export type WagonImpairment = {
  /** Which part is impaired. v1 = wheel only; generalizable to axle/tongue later. */
  kind: 'wheel';
  /** Daily pace multiplier (wheel = 0.5 — limp at half speed). */
  paceMult: number;
  /** Condition-decay multiplier on the impaired wagon (wheel = 2 — broken wheel hammers the rest of the frame). */
  conditionDecayMult: number;
  /** Day + mile the impairment was contracted, for log + post-debrief copy. */
  contractedAt: { day: number; mile: number };
};

interface Wagon {
  // existing fields ...
  impairment: WagonImpairment | null;
}
```

Default `null`. Existing saves load with `impairment: null` via the deserializer's missing-field default. No save-version bump beyond the existing pattern in `src/lib/game/saves.ts`.

### Refactored event — `broken_wheel`

`src/lib/game/content/events.ts` `broken_wheel` grows from 1 choice to 3, all delegating to a shared resolver:

```ts
choices: [
  {
    id: 'spare',
    icon: '⚙️',
    label: 'Mount the spare wheel',
    enabled: (s) => (s.inventory.wheel ?? 0) > 0,  // greyed when no spare
    isDefault: (s) => (s.inventory.wheel ?? 0) > 0,
    apply: (s, rng) => resolveWheelBreak(s, rng, 'spare')
  },
  {
    id: 'rebuild',
    icon: '🔨',
    label: 'Rebuild the wheel trailside (2 days, 1 if Blacksmith)',
    apply: (s, rng) => resolveWheelBreak(s, rng, 'rebuild')
  },
  {
    id: 'push_on',
    icon: '🐎',
    label: 'Push on — limp to the next post',
    apply: (s, rng) => resolveWheelBreak(s, rng, 'push_on')
  }
]
```

The old "no-spare → improvised fix, −15 condition" branch is **removed**. Players without a spare now make a real choice between Rebuild and Push on; "improvised" is no longer a free option.

### Resolver — `src/lib/game/systems/wheel-break.ts` (NEW)

```ts
export type WheelBreakChoice = 'spare' | 'rebuild' | 'push_on';

export interface WheelBreakResult {
  state: GameState;
  log: string;
}

export function resolveWheelBreak(
  state: GameState,
  rng: Rng,
  choice: WheelBreakChoice
): WheelBreakResult;
```

**Branch logic:**

| Choice | Effect |
|---|---|
| `spare` | Consume one `wheel` item via existing `consumeWagonPart`. `wagon.condition += 10` (clamp 100). `wagon.impairment = null`. Log: `"Mounted a spare wheel. Wagon condition +10."` Variant log when `consumeWagonPart` returns `saved: true`. |
| `rebuild` | `days = hasBlacksmith ? 1 : 2`. Advance day by `days`. Compute `successChance`: base 0.70 (0.90 with Blacksmith) plus `−0.20` if `wagon.condition < 30`. Roll `rng.next() < successChance` → SUCCESS: `wagon.condition += 15`, `wagon.impairment = null`, log `"Rebuilt the wheel (took ${days} day${days===1?'':'s'}). Condition +15."`. FAILURE: `wagon.impairment` applied (see below), log `"The rebuild went wrong — a spoke split during seating. The wagon limps on. ${days} day${days===1?'':'s'} spent."` |
| `push_on` | `wagon.impairment = { kind: 'wheel', paceMult: 0.5, conditionDecayMult: 2, contractedAt: { day: state.day, mile: state.location.milesTraveled } }`. No day-cost. Log: `"Pushed on with a busted wheel. The wagon limps until the next blacksmith."` |

**Rebuild roll table** (for reference + tests):

| Party state | Success rate | Failure cost |
|---|---:|---|
| Blacksmith + cond ≥ 30 | 90% | 1 day, impairment |
| Blacksmith + cond < 30 | 70% | 1 day, impairment |
| No Blacksmith + cond ≥ 30 | 70% | 2 days, impairment |
| No Blacksmith + cond < 30 | 50% | 2 days, impairment |

The bottom-right cell (50%, 2 days lost) is the cell where the persona AI's desperation gate fires — a coin flip *plus* 2 days lost makes pushing on the better expected play.

### Pace + decay hookup

Two single-line additions:

- `src/lib/game/systems/travel-recovery.ts` (or wherever daily pace is computed): multiply pace by `state.wagon.impairment?.paceMult ?? 1`.
- The engine's daily wagon-condition decay tick: multiply decay by `state.wagon.impairment?.conditionDecayMult ?? 1`.

Impairment-aware. Touches one expression per file.

### Impairment clears at smithy

`src/lib/game/systems/town-services.ts:repairWagon` (or its in-flight equivalent) appends `wagon.impairment = null` on a successful smithy repair. The existing Blacksmith profession discount (50% off materials) still applies — the impairment-clear is a side effect of the same action.

### Player-bot wiring — `src/lib/dev/bot/runner.ts`

When `pendingEvent.id === 'wagon_wheel'`, the runner consults `persona.pickWheelBreakResponse(state, rng)` → `applyPendingChoice(state, choice)`. Mirrors the existing event-handling pattern in `handleLandmark` and the engine-pausable's `applyPendingChoice` path. Same code path the UI bot ([[#1176]]) will later drive via DOM clicks.

### NPC parity — `src/lib/game/systems/npc-engine.ts`

The daily NPC event roll already fires `broken_wheel` for NPCs (per the `#280c — wheel break` comment near the event-roll block). Today's NPC resolution is implicit; the change:

1. After the event fires for an NPC, call `npc.persona.pickWheelBreakResponse(synthesizedState, rng)` to pick a choice.
2. Run `resolveWheelBreak(synthesizedState, rng, choice)` — same resolver as the player path.
3. The returned state carries `wagon.impairment` on the NPC's synthesized wagon state; the npc-engine bridges it back to its persistent WagonStateLike flags (mirrors the existing `wagon.condition` + `greaseMiles` bridge pattern at `npc-engine.ts:530+`).
4. The npc-engine's daily pace + decay tick uses the impairment multipliers (same hookup as the player path).

This closes the #300 NPC wagon-decay parity gap.

## AI surface — `Persona.pickWheelBreakResponse`

### Interface

`src/lib/game/ai/types.ts`:

```ts
interface Persona {
  // existing methods ...
  /**
   * Trailside response when a wagon_wheel event fires. Called by the
   * engine-pausable resolver for player-bots and by npc-engine for NPC
   * wagons. Sibling to `pickRepairBudget` (which fires at trading posts).
   */
  pickWheelBreakResponse(state: GameState, rng: Rng): WheelBreakChoice;
}
```

### Default policy

```ts
// src/lib/game/ai/wheel-break.ts (NEW — co-located with the resolver's AI partner)
export function defaultWheelBreakResponse(state: GameState): WheelBreakChoice {
  // Universal: use a spare if you have one.
  if ((state.inventory.wheel ?? 0) > 0) return 'spare';
  const hasBlacksmith = state.party.some(m => !m.dead && m.profession === 'blacksmith');
  // Desperation gate: no spare AND wrecked wagon AND no smith means
  // rebuild is a coin flip + 2 days lost. Limp instead.
  if (state.wagon.condition < 25 && !hasBlacksmith) return 'push_on';
  return 'rebuild';
}
```

### Per-persona overrides

`spare → rebuild → push_on` is the universal priority order. Personas only differ in the **no-spare branch** — specifically, in when (if ever) the desperation gate fires to fall through to `push_on`:

| Persona | If `wheel > 0` | If no spare |
|---|---|---|
| Pioneer | `spare` | default policy (push_on iff cond < 25 + no smith) |
| Pragmatic | `spare` | default policy |
| **Faithful** | `spare` | always `rebuild` — desperation gate **disabled** (faith in the work) |
| **Reckless / Chaos** | `spare` | desperation gate fires at **cond < 40** — more readily resigned to limping |
| **Frugal** | `spare` | `rebuild` even at coin-flip odds — would rather burn the days than risk the persistent impairment |
| **Worn** | `spare` | desperation gate at **cond < 40** — low energy for a 2-day project |

Pioneer + Pragmatic personas use `defaultWheelBreakResponse` verbatim. Others wrap it with their override.

## UI

`src/lib/ui/EventModal.svelte` already renders `event.choices[]` as buttons and honors the existing `choice.enabled` predicate (used by other multi-choice events). **No EventModal change** beyond the 3 choices flowing from the refactored event.

`src/lib/ui/WagonPanel.svelte` (or equivalent action-bar / status surface): when `state.wagon.impairment != null`, render a small impairment icon next to the wagon-condition readout. ~10-line addition. Tooltip: `"Limping — wheel impaired. Pace ×0.5, decay ×2 until a blacksmith mounts a new wheel."`

## Tests (Vitest, no browser)

| File | Coverage |
|---|---|
| `tests/wheel-break-resolver.test.ts` | Each branch (spare consumes item + clears impairment; rebuild advances day by 1/2; push_on sets impairment with correct fields) |
| `tests/wheel-break-rebuild-rng.test.ts` | Each cell of the roll table (4 cells) with a fixed seed, asserts SUCCESS/FAILURE matches the success-rate boundary |
| `tests/wheel-break-impairment-decay.test.ts` | Impairment doubles condition decay; pace mult applied in daily tick; cleared by smithy at post; cleared by spare/rebuild mid-trail |
| `tests/wheel-break-persona-defaults.test.ts` | Default policy and per-persona overrides against canonical fixtures: spare-in-stock, no-spare/healthy/no-smith, no-spare/wrecked/no-smith, no-spare/healthy/with-smith |
| `tests/npc-wheel-break-parity-929.test.ts` | NPC engine fires the event, persona picks via the same method, impairment persists on NPC wagon state across days, pace/decay multipliers apply |

## Sweep validation

Per memory `feedback_sweep_runs_100`: engine change → BEFORE/AFTER sweep at `--runs 25` via `scripts/persona-profession-sweep.ts`. Compare arrival rate, mean days, mean wagon condition, mean push-on count. Land the summary in the implementing PR description. The `--runs 100` gate isn't required unless the bottom-line arrival rate moves outside the noise band — this is a refinement, not a load-bearing rebalance.

## Files touched / created

```
src/lib/game/types.ts                          +WagonImpairment, wagon.impairment field
src/lib/game/saves.ts                          +deserialize-with-null-default for impairment
src/lib/game/systems/wheel-break.ts            NEW — resolver
src/lib/game/ai/wheel-break.ts                 NEW — defaultWheelBreakResponse + override helpers
src/lib/game/systems/travel-recovery.ts        +respect impairment paceMult (1 line)
src/lib/game/systems/town-services.ts          +clear impairment on smithy repair (1 line)
src/lib/game/content/events.ts                 broken_wheel → 3 choices, delegates to resolver
src/lib/game/ai/types.ts                       +Persona.pickWheelBreakResponse signature
src/lib/game/ai/personas.ts                    +per-persona impls (5 overrides, 2 use default)
src/lib/dev/bot/runner.ts                      +handle wagon_wheel pendingEvent
src/lib/game/systems/npc-engine.ts             +pickWheelBreakResponse on the NPC wheel-break path
src/lib/ui/WagonPanel.svelte                   +impairment icon next to condition
tests/wheel-break-*.test.ts                    NEW × 4
tests/npc-wheel-break-parity-929.test.ts       NEW
```

## `npm run verify` impact

Zero regressions expected on the existing test suite (the resolver lives in a new system module; the refactored event still emits `logLine` output through `apply`). New tests are additive. Both `npm run check` and `npm test` continue to pass.

## Open questions (defer to implementation plan)

- **Save-version field bump?** The `wagon.impairment: null` default likely round-trips without a version bump, but if the deserializer is strict about unknown wagon fields, bump the save version and add the field via the existing migrator pattern.
- **Impairment icon exact shape** in `WagonPanel.svelte` — pick during implementation. The existing icon dictionary (`ICON.inventory_categories`) may already have a fitting glyph; if not, ⚠️ + tooltip is the no-art fallback.
- **NPC `WagonStateLike` shape** for the impairment field — extend the synth bridge so `synthesizeWagonState` round-trips the impairment. One-line per bridge direction.
