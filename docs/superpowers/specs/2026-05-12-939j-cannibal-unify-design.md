# #939j — Unify cannibalism path: shared helper + by-choice camp action

> Slice of the #939 umbrella. Extracts the shared cannibal math used
> by the burial-event choice and the NPC's `maybeCannibalize` into
> one helper, **reinstates a `cannibalism_corpse` camp action** so the
> player can choose cannibalism by intent (not only when the burial
> popup fires), and unifies child-cannibalism exposure across all
> player and NPC paths.

## Goal

Three player-visible cannibal entry points plus one NPC entry point —
all routed through a single `applyCannibalize(state, corpseId, rng,
opts) → state` helper so the math, log line, and guilt counter live
in exactly one place.

Player paths:
1. **Burial event `eat_the_body` choice** — forced "decide today" moment the day after a death.
2. **`cannibalism_corpse` camp action** *(new — reinstating the action removed in #205)* — player-initiated whenever camp opens.
3. **`cannibalism_straws` camp action** *(existing)* — sacrifice a live adult when there's no corpse.

NPC path:
4. **`tickNpcWagon → maybeCannibalize`** *(existing)* — auto-decides via `persona.shouldCannibalize`.

## Design principle: last-resort visibility

All cannibal surfaces are hidden until **food = 0** (zero pounds of
food across all `THEFT_VICTIMS`-style food keys). The action only
appears in the camp grid when the party is genuinely out of food.
Period framing: emigrants never *considered* it; survival forced it.

This carries across every surface — the burial event already hides
`eat_the_body` behind `hasNoFoodAtBurial`; the new corpse camp action
uses the same predicate; straws preserves its existing strict gate.

## Today's drift (what the unification fixes)

Three cannibal sites today, three different sets of constants:

| Path | File | Adult meat | Adult morale | Child meat | Child morale | `_cannibalismCount` |
|---|---|---|---|---|---|---|
| Burial event `eat_the_body` | `content/events.ts:1144` | 50 lb | −18 | hidden / n/a | n/a | +1 |
| Camp `cannibalism_straws` | `actions/camp-actions.ts:1115` | 60 lb (sacrifice victim, not corpse) | −35 | n/a | n/a | +3 |
| NPC `maybeCannibalize` | `systems/npc-engine.ts:197` | 50 lb | **−15** | 25 lb | −25 | none |

Drift this slice resolves:
- Adult morale: unify on **−18** (player's playtest-tuned number).
- Child cannibalism: expose to player surfaces too (no more "NPC can, player can't" asymmetry).
- `_cannibalismCount`: NPC path now increments it (was uniform-bookkeeping gap).

Straws stays its own thing — it's a *sacrifice* mechanic, not corpse
consumption. Its `−35 morale / +3 guilt / 60 lb meat` numbers are
distinct by design (killing a live adult should sting worse than
eating an already-dead one).

## Architecture

```
NEW: src/lib/game/systems/cannibal.ts
  Constants:
    CANNIBAL_ADULT_MEAT_LB     = 50
    CANNIBAL_CHILD_MEAT_LB     = 25
    CANNIBAL_ADULT_MORALE_HIT  = 18
    CANNIBAL_CHILD_MORALE_HIT  = 25
    CANNIBAL_FRESHNESS_DAYS    = 5

  export findFreshUnconsumedCorpse(state): PartyMember | null
    Adult: any deathCause within freshness window.
    Child: deathCause ∈ {'Starvation','starvation','attrition',
                         'cannibalism_volunteered'}; freshness same.

  export hasFoodOnHand(state): boolean
    Replaces inline `hasNoFood` / `hasNoFoodAtBurial` predicates.
    Returns true iff Σ(inventory[id] for id in FOOD_ITEMS) > 0.

  export applyCannibalize(state, corpseId, rng, opts): { state, log }
    1. Find corpse by id; defensive null-return if missing/consumed.
    2. Constants by kind (adult vs child).
    3. Mark consumed, +meat, −morale, ++_cannibalismCount (always).
    4. Return { state, log }.

content/events.ts:
  Burial event eat_the_body choice → calls applyCannibalize.
  Adult-only restriction on freshUnconsumedDead REMOVED — child
  corpses already gate-filtered inside findFreshUnconsumedCorpse.

actions/camp-actions.ts:
  NEW cannibalism_corpse action — player-initiated corpse consumption.
  EXISTING cannibalism_straws action — left structurally alone (its
  60 lb / −35 morale / +3 guilt numbers are sacrifice-flow, not the
  corpse-flow being unified). Internal bumpGuilt collapses to use the
  shared `+= 1 per call × weight` shape against applyCannibalize's
  unified flag bookkeeping.

systems/npc-engine.ts:
  maybeCannibalize → uses findFreshUnconsumedCorpse + applyCannibalize.
  trackCount no longer an opt-in; the helper always increments. NPC
  cannibalism now feeds _cannibalismCount uniformly.
```

### `cannibalism_corpse` camp action (new — reinstating #205)

```ts
const cannibalism_corpse: CampAction = {
  id: 'cannibalism_corpse',
  label: 'Take the body for meat',
  sub: 'Fresh corpse · food gone · 2 hr · the unthinkable',
  icon: '🍖',
  hourCost: 2,
  hidden: (s) => !hasFoodOnHand(s) ? false : true,
  // i.e. visible only when food = 0
  availability: (s) => {
    if (hasFoodOnHand(s)) {
      return { available: false, reason: 'Only when out of food.' };
    }
    if (!findFreshUnconsumedCorpse(s)) {
      return { available: false, reason: 'No fresh body to consume.' };
    }
    return { available: true };
  },
  apply: (s, rng) => {
    const corpse = findFreshUnconsumedCorpse(s);
    if (!corpse) return s;
    const { state, log } = applyCannibalize(s, corpse.id, rng);
    return logLine(state, log);
  }
};
```

Hour cost is 2 (vs 8 for straws) — corpse consumption is faster than
the ritual of drawing straws. Period diaries (Donner Patrick Breen,
Feb 1847) show the *decision* was agonizing but the act was quick.

The `hidden` predicate matches `cannibalism_straws` strictness — the
action does NOT appear in the grid when there's food. Last-resort.

### Helper signature

```ts
export interface ApplyCannibalizeResult {
  state: GameState;
  /** One-line log entry. Caller decides where it goes (logLine for
   *  player paths, playerLogs.push with wagon-name suffix for NPC). */
  log: string;
}

export function applyCannibalize(
  state: GameState,
  corpseId: string,
  _rng: Rng
): ApplyCannibalizeResult;
```

No `opts` parameter — `_cannibalismCount` increments unconditionally
(decision #7 locked: NPC counts too).

### Behavior

```
1. Find corpse: state.party.find(m => m.id === corpseId && m.dead && !m.consumed)
   Missing → { state, log: 'No fresh corpse to consume.' } (defensive fallback)

2. Constants by kind:
     adult: meat=50, morale=−18
     child: meat=25, morale=−25

3. Apply:
     party: mark corpse.consumed = true
     inventory.game_meat += meat
     morale = max(0, morale − hit)
     flags._cannibalismCount = (flags._cannibalismCount ?? 0) + 1

4. Compose log:
     `Took ${corpse.name}'s body for meat — ${meat} lb of fresh game. Nobody spoke. Morale −${hit}.`

5. Return { state: applied, log }
```

### `findFreshUnconsumedCorpse`

```ts
export function findFreshUnconsumedCorpse(state: GameState): PartyMember | null {
  const fresh = state.party.filter((m) => {
    if (!m.dead || m.consumed) return false;
    if (typeof m.deathDay !== 'number') return false;
    if (state.day - m.deathDay > CANNIBAL_FRESHNESS_DAYS) return false;
    if (m.kind === 'adult') return true;
    if (m.kind === 'child') {
      const cause = (m.deathCause ?? '').toLowerCase();
      return cause === 'starvation' || cause === 'attrition'
        || m.deathCause === 'cannibalism_volunteered';
    }
    return false;
  });
  if (fresh.length === 0) return null;
  return fresh.sort((a, b) => (b.deathDay ?? 0) - (a.deathDay ?? 0))[0];
}
```

Casing handling carries forward from #939m: engine `reapDead` writes
`'Starvation'` (capital, condition name); test fixtures inject
`'starvation'` and `'attrition'`. Accept all three.

## Components touched

| File | Change |
|---|---|
| **New: `src/lib/game/systems/cannibal.ts`** | Constants + `applyCannibalize` + `findFreshUnconsumedCorpse` + `hasFoodOnHand`. |
| `src/lib/game/content/events.ts` | Burial event `eat_the_body.apply` → `applyCannibalize`. `freshUnconsumedDead` deleted; `hasNoFoodAtBurial` → `!hasFoodOnHand(s)` inline call. `BURIAL_CANNIBALISM_*` constants deleted. Child filter loosens to allow `findFreshUnconsumedCorpse`'s shape (which already gates children by deathCause). |
| `src/lib/game/actions/camp-actions.ts` | **NEW** `cannibalism_corpse` action exported in the camp-action registry; `cannibalism_straws` untouched structurally (different mechanic). Inline `recentCorpse` / `hasNoFood` helpers replaced by imports from cannibal.ts. |
| `src/lib/game/systems/npc-engine.ts` | `maybeCannibalize` collapses to a synth/project block using `findFreshUnconsumedCorpse` + `applyCannibalize`. Local `isCannibalEligible`, NPC_CANNIBAL_* constants deleted. |
| **New: `tests/cannibal-unified-939j.test.ts`** | Helper unit tests: adult vs child constants, freshness window, casing, count incrementing. |
| **New: `tests/cannibalism-corpse-action-939j.test.ts`** | Camp-action availability + apply: hidden when food present, visible+available when food=0 + corpse fresh, applies correctly. |
| `tests/cannibalism.test.ts` | Burial-event regression. Update adult morale assertion if pinned (no change from 18). Add child-cannibalism case if missing. |
| `tests/npc-cannibalize-907.test.ts` | NPC integration regression. Adult morale assertion updates −15 → −18. Verify `_cannibalismCount` now bumps on NPC tick. |

## Data flow

### Burial-event path (unchanged surface, refactored internals)

```
death → reapDead → flags._burialPending = true
next tick → rollEvent → burial event
player → eat_the_body choice (hidden unless food=0)
  → applyCannibalize(state, corpse.id, rng)
  → modal closes; _burialPending cleared
```

### New camp-action path

```
player → open camp → cannibalism_corpse appears in grid (food=0 + corpse fresh)
player picks it
  → applyCannibalize(state, corpse.id, rng)
  → camp action consumes 2 hr; state mutated; log appended
```

### NPC path (now uniformly counted)

```
tickNpcWagon → step 7
  if !hasFoodOnHand(synth) AND findFreshUnconsumedCorpse(synth) AND persona.shouldCannibalize:
    { state, log } = applyCannibalize(synth, corpse.id, rng)
    next = projectWagonDeltas(state, wagon)
    playerLogs.push(`${log} (${next.name})`)
```

## Behavior changes (visible)

| Surface | Before | After |
|---|---|---|
| Player burial popup, adult | 50 lb / −18 | 50 lb / −18 (unchanged) |
| Player burial popup, child | not exposed | exposed (25 lb / −25) when corpse is a starved/attrition child |
| Player camp action, corpse | did not exist | new: 50 lb adult / 25 lb child, food=0 gate |
| Player camp action, straws | 60 lb / −35 (no corpse) | unchanged |
| NPC, adult corpse | 50 lb / **−15** | 50 lb / **−18** |
| NPC, child corpse | 25 lb / **−25** | 25 lb / −25 (unchanged) |
| `_cannibalismCount` from NPC | not incremented | +1 per consumption (uniform bookkeeping) |

Three points to call out at playtest:
- NPCs hit morale 3 harder on adult cannibalism. Won't change wipe rate
  meaningfully — adult cannibalism fires rarely and the wagon's
  usually wiping anyway.
- Player burial popup now shows child option when applicable. UI flow
  identical; one more choice button.
- `_cannibalismCount` ticks up faster (NPCs feed it). No consumer of
  the counter exists today, so observable impact is zero until a
  future event reads it.

## Error handling

- **Corpse not found in `applyCannibalize`.** Return state unchanged
  with the defensive log. Both call sites pre-filter via
  `findFreshUnconsumedCorpse`, so this is the safety net.
- **Camp action picked while food = N > 0.** `availability` predicate
  blocks it; `apply` is unreachable. Defensive: re-check `hasFoodOnHand`
  in `apply` and no-op if it passes.
- **Two corpses present.** `findFreshUnconsumedCorpse` returns the
  most-recently-dead. Player camp action consumes that one; tomorrow's
  open of camp surfaces the next one. Period-coherent — survivors ate
  through what was fresh, body by body.

## Testing strategy

1. **Helper unit tests** (`cannibal-unified-939j.test.ts`):
   - Adult corpse → 50 lb, −18, `_cannibalismCount` +1, consumed flag set
   - Child corpse → 25 lb, −25, same flag bookkeeping
   - Corpse ≥6 days old → `findFreshUnconsumedCorpse` returns null
   - Consumed corpse → returns null
   - Adult deathCause variants (anything) → eligible
   - Child deathCause variants ('Starvation'/'starvation'/'attrition'/'cannibalism_volunteered') → eligible; ('cholera'/'broken_leg') → ineligible
2. **Camp action behavior** (`cannibalism-corpse-action-939j.test.ts`):
   - Food on hand → action hidden
   - Food = 0 + no fresh corpse → unavailable with right reason
   - Food = 0 + fresh corpse → available; apply consumes 2 hr + mutates
   - Picking action when food appears between hide-check and apply → defensive no-op
3. **Existing burial regression** (`cannibalism.test.ts`):
   - Adult numbers unchanged
   - Child path: new test pinning 25 lb / −25
4. **NPC integration** (`npc-cannibalize-907.test.ts`):
   - Adult morale assertion: −15 → −18
   - New: `_cannibalismCount` increments after NPC consumption
5. **Harness sanity:** rerun `persona-profession-sweep.ts`; expect ±1-2 percentage points on wipe rate from the morale shift. Flag anything bigger.

## Decisions locked (2026-05-12 Dave review)

1. **Corpse camp action gate** — `food = 0` strict. Action does NOT
   appear in the grid when any food is present. ✅
2. **Burial event "eat the body" choice** — kept alongside the new
   camp action. Two surfaces; both food=0 gated; one (popup) is
   forced-decision day-after-death, the other (camp) is player-pull. ✅
3. **Draw-straws gate** — unchanged strict (`hasNoFood` + no corpse +
   ≥2 adults). ✅
4. **Adult morale hit** — unify on **−18** (player playtest-tuned). ✅
5. **Child cannibalism player-side** — exposed in both burial popup
   and new camp action (no more "NPC can, player can't" asymmetry). ✅
6. **`trackCount` on NPC path** — always increments. Helper takes no
   opts; bookkeeping is uniform across all four surfaces. ✅

## Out of scope

- A `cannibalismCount`-fed guilt event (the recurrent malus the
  bumpGuilt comment hints at). Designed in but no content yet; surface
  to land when an event author wants it.
- Persona flavor on the player burial popup (preacher refuses, etc.).
  `persona.shouldCannibalize` already gates the NPC path. Player UI
  override lands with #287 named profile expansions if/when they add
  player-side persona flavor.
- Animation / illustration on the cannibal modal (the haul-modal-style
  visual the EventModal polish ticket is tracking). Pure mechanics
  here; UX pass is its own slice.
