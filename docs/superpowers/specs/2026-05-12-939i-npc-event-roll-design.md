# #939i — NPC daily event roll via engine event bank

> Slice of the #939 umbrella (unify NPC tick with engine pipeline). Replaces
> the `rollNpcEvent` parallel impl in `systems/npc-events.ts` with the
> engine's `rollEvent` + `resolveEvent` from `systems/events.ts`.

## Goal

Every NPC wagon in the train rolls events from the same 96-event bank the
player draws from. Today NPCs roll from a separate ~10-event NPC-only pool
in `systems/npc-events.ts`; that parallel impl has drifted (no
profession gates, no historical events, different RNG keying) and is the
last parallel-impl roadblock to declaring the unified-tick refactor done.

## Why this is the umbrella's "biggest behavior risk"

Stated upfront so the design squarely addresses it. Naively routing 10
NPC wagons through `fireEvent` produces:

- **~10× event load.** Engine `BASE_FIRE_CHANCE = 0.30` per wagon-per-day.
  Over a 10-wagon train this fires ~3 events/day vs. the current
  ~0.6/day (10 wagons × 0.06 per the NPC parallel). The player's
  news log would become a firehose.
- **Wrong-context events.** Several categories are train-shared
  (weather: it's not raining on the Reed wagon and clear on yours) or
  one-shot (historical: Marcus Whitman doesn't ride past every wagon).
- **Modal stalls.** Engine events return `pendingEvent` for the player
  to resolve via modal. NPCs have no UI; they need an auto-resolver
  that picks a sensible choice deterministically.

The design below names how each risk is bounded.

## Architecture

```
tickNpcWagon (per NPC, per day)
  └─ event roll block (replaces current rollNpcEvent call)
       ├─ synthesizeWagonState(wagon, env) → GameState shim
       ├─ rollEvent(shim, rng, { pool: NPC_ELIGIBLE_EVENTS,
       │                         fireChance: NPC_FIRE_CHANCE })
       │   └─ returns GameEvent | null
       ├─ if event:
       │    pickNpcEventChoice(state, event.id, choiceIds, rng)
       │      ?? event.choices.find(c => c.isDefault).id
       │      ?? event.choices[0].id
       │    resolveEvent(shim, event, chosenId, rng)
       │    → projectWagonDeltas back onto wagon
       │    → bubble event title/choice line to player news
       └─ rollNpcEvent (parallel impl) → deleted from npc-events.ts
```

### NPC eligibility filter

A new `NPC_ELIGIBLE_EVENTS` constant in `content/events.ts` (or
exported helper) returns the subset of `EVENTS` that may fire on an
NPC. Filtering rule: **allow by category**, with a per-event opt-out
escape hatch.

Allowed categories (31 events):

| Category | Count | Why allowed |
|---|---|---|
| `wagon` | 9 | Wheels break per wagon. Already per-wagon flavor. |
| `encounter` | 9 | Other emigrants / Indians / hunters approach individual wagons. |
| `personal` | 5 | Party-internal dynamics. NPC family has its own fistfights. |
| `health` | 3 | Snakebite / cholera fires per-wagon. |
| `finds` | 5 | Found cash / berries / spring. Per-wagon find is plausible. |

Excluded categories (7 events):

| Category | Count | Why excluded |
|---|---|---|
| `weather` | 5 | Weather is a train-shared environmental state; firing thunderstorm-damage on each wagon would double-charge. The player path already runs weather effects once for the whole train. |
| `historical` | 2 | One-shot named encounters (Marcus Whitman 1843, Fort Hall closure 1856). Period reality is one company sees them per year, not every wagon. |

Per-event escape hatch: any `GameEvent` may set `npcSkip: true` to
opt out even within an allowed category. Used for events whose
`apply()` reads/writes flags the NPC shim doesn't bridge.

### Fire chance budget

`NPC_FIRE_CHANCE = 0.06` — preserves today's NPC parallel's per-wagon
daily rate. Combined with the 10-wagon train, the player still sees
~0.6 NPC events/day, same as today. The 5× wider event pool comes
through *variety*, not *volume*.

(For the player path, `BASE_FIRE_CHANCE = 0.30` stays unchanged.)

### Choice routing

```ts
const choiceId =
  persona.pickNpcEventChoice(shim, event.id, event.choices.map(c => c.id), rng)
  ?? event.choices.find(c => c.isDefault)?.id
  ?? event.choices[0].id;
```

- **`pickNpcEventChoice` first.** Surface exists today on every persona
  and returns `null` everywhere — opting into the default. This wires
  up the per-persona override path for #287 named profiles (e.g.,
  preacher refuses the "drink whiskey" choice on toast events) without
  a separate slice.
- **`isDefault` fallback.** Matches the player's modal default-
  selection convention.
- **First choice fallback.** Safety net so an event that ships without
  an `isDefault` flag still resolves cleanly.

Filtering of `hidden` / `requires` choices happens inside the persona's
choice impl when needed (chaos already does this). The default
fallback intentionally does NOT filter — if the engine ships an event
where the only sensible default is item-gated, that's a content bug
the test suite will surface.

### Cooldown

Engine's `fireEvent` sets `state.flags._lastEventDay` to prevent
double-fire. NPCs run on a synthesized state per tick, so the cooldown
naturally scopes per-wagon (each NPC has its own synth flags blob).
We call `rollEvent` directly rather than `fireEvent` so we keep the
explicit choice-routing pass; we don't need the cooldown flag at all
since `tickNpcWagon` only invokes the event block once per tick.

### Player log integration

Each fired NPC event appends one log line to `playerLogs[]` using the
same `(wagon.name)` suffix convention every other unified-tick block
uses. The engine writes `eventLog: [...applied.eventLog, {day, text}]`
inside `resolveEvent`; we forward those entries name-suffixed.

NPC's own `wagon.eventLog` gets the entries too (via
`projectWagonDeltas`) so the per-wagon history view (#280d future)
keeps its first-person ledger.

## Components touched

| File | Change |
|---|---|
| `src/lib/game/content/events.ts` | Add `npcSkip?: boolean` to `GameEvent` type. Export `NPC_ELIGIBLE_EVENTS` (filtered by category + `npcSkip`). Add `npcSkip: true` to any audited events whose `apply()` is player-only. |
| `src/lib/game/systems/events.ts` | No code change — existing `rollEvent` + `resolveEvent` already parameterize on `pool`. |
| `src/lib/game/systems/npc-engine.ts` | Replace the `rollNpcEvent(next, ctx, rng)` block with the engine-event synth/project pattern. Drop the `rollNpcEvent` import. |
| `src/lib/game/systems/npc-events.ts` | Delete the file (or stub it to a `#939i` comment with the NPC_EVENT_DAILY_CHANCE constant inlined into npc-engine if any test imports it). |
| `tests/wagon-train-events-280c.test.ts` | Drop per-event behavior tests that asserted on the parallel impl's specific outcomes; replace with end-to-end `tickNpcWagon → wagon-state-changed` assertions. |
| New: `tests/npc-engine-events-939i.test.ts` | Pins fire rate (~0.06/day per wagon), category filter, choice routing through `pickNpcEventChoice` → default fallback, eventLog name-suffixing. |

## Data flow per fired event

1. `tickNpcWagon` enters the event block with `next: NpcWagonState`.
2. `synthesizeWagonState(next, env)` builds the GameState shim
   (existing wagon-synth — flags bridged, SYNTH_TRAIN_STUB attached).
3. `rollEvent(shim, rng, { pool: NPC_ELIGIBLE_EVENTS, fireChance: 0.06 })`
   returns either a `GameEvent` or `null`.
4. If null, skip block — no behavior change to wagon.
5. If a `GameEvent`, pick `choiceId` via persona → default.
6. `resolveEvent(shim, event, choiceId, rng)` applies the choice;
   returns a new GameState with event-log entries appended.
7. `projectWagonDeltas(ticked, next)` copies wagon-local changes back.
8. Forward `ticked.eventLog` entries to `playerLogs` as
   `${entry.text} (${next.name})`.

## Error handling

- **Missing default choice.** Already handled by the `?? event.choices[0]?.id`
  fallback. If the event has zero choices, content is malformed; throw.
- **`pickNpcEventChoice` returns an unknown id.** `resolveEvent` already
  throws `unknown choice "${choiceId}"`. Catch in the npc-engine block
  and fall back to `isDefault → choices[0]`; log a `[#939i]` warning so
  the test suite catches drift.
- **Event `apply()` reads a flag the synth doesn't bridge.** Surface
  symptom: the projection drops the change silently. Mitigation:
  per-event `npcSkip: true` on any flagged-out event found during the
  test-pass. The `tests/npc-engine-events-939i.test.ts` "smoke fire
  every eligible event" test exercises this.

## Testing strategy

Three layers:

1. **Fire-rate pinning.** Loop 1000 days × 10 NPC wagons; assert
   ~600 events fire (±10%). Catches accidental BASE_FIRE_CHANCE bleed.
2. **Category-filter sanity.** For each excluded category, assert no
   event from that category appears in `NPC_ELIGIBLE_EVENTS`. For each
   allowed category, assert at least one event does.
3. **Smoke-fire every eligible event.** For each event in
   `NPC_ELIGIBLE_EVENTS`, force-fire it on a fresh NPC wagon and
   verify the wagon's state mutated coherently (no NaN morale, no
   negative inventory, no thrown exception, no missing `name` on the
   bubbled player log).

Plus harness sanity: re-run `persona-profession-sweep.ts` pre/post and
diff. Expect modest wipe-rate movement (events fire from a wider pool
with more variety; some are tougher, some softer). Any movement >5
percentage points is a flag for a content audit.

## Decisions locked (2026-05-12 Dave review)

1. **Category allow-list** — wagon / encounter / personal / health /
   finds in; weather / historical out. ✅
2. **`npcSkip: true` per-event escape hatch on `GameEvent`** — adds a
   surgical opt-out for any event whose `apply()` reads player-only
   state that the synth doesn't bridge. ✅
3. **`NPC_FIRE_CHANCE = 0.06`** to preserve today's ~0.6 events/day
   across a 10-wagon train. ✅
4. **Drop `systems/npc-events.ts` entirely.** ✅

## Out of scope

- Per-NPC pendingEvent UI (modals for NPC choices). NPCs auto-resolve
  via the persona → default chain forever; the player never sees an
  NPC modal.
- Choice-bearing NPC events (a sub-bank that uses `pickNpcEventChoice`
  for branching). Designed in but not authored; lands when a real
  use case shows up.
- Migrating events that today fire on the player but should ALSO fire
  on NPCs with different outcomes (e.g., "you got robbed" → "the Reed
  wagon got robbed"). The events fire on NPCs as-is; if their flavor
  text says "you" it'll read odd in the player log. Treat as a
  content-pass follow-up if visible in playtesting.
