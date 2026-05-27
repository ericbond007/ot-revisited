# VK #102 — Pre-made historical party choice on New Game

**Date:** 2026-05-26
**Branch:** `spec/102-premade-party`
**Status:** Design approved by Dave, ready for implementation plan.

## Goal

On the `/new` (Create New Game) screen, let the player pick a pre-made historical party (the Donners, the Sagers, the Reeds…) instead of always hand-building the roster. The premade ships with its full party (names + sex + ages + leader profession), kit, and historical year. The custom-party flow remains available as one of the cards.

## Why

We already ship 10 named historical profiles (`src/lib/game/content/bot-profiles.ts`, #287a) built for NPC wagon-train use. The data shape — `BotProfileMember[]` + `kit` + `leaderProfession` + `year` + `trait` — is 90 % of what a player premade needs. Surfacing them as a player choice:

- Cuts the friction of party-setup for new players ("just give me a working start")
- Frames Hoosier Trail's historical research as a *gameplay experience*, not just flavor text
- Reuses authored content (10 profiles already vetted by the bot-profiles dossier)

## Architecture (Approach A — extend BotProfile in place)

Single source of truth in `bot-profiles.ts`. Two new fields on `BotProfile`:

```ts
interface BotProfile {
  // ... existing fields ...

  /** Player-facing difficulty signal. Authored by hand per profile.
   *  Drives the card badge; does NOT modify game balance. */
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary';

  /** Whether this profile is surfaced as a player option on /new.
   *  False = NPC-only (incomplete kit, special-case data, or not
   *  yet vetted for player balance). Hastings starts false until
   *  #887 lands his kit. */
  playerEligible: boolean;
}
```

A new helper, co-located in `bot-profiles.ts`:

```ts
export function profileToNewGameOptions(
  profile: BotProfile,
  startDate: GameDate,
  seed: string
): NewGameOptions
```

…converts a `BotProfile` to the `NewGameOptions` shape that `createInitialState` already accepts. Maps `BotProfileMember` → `PartyPick`, leader is the first member, companions are the rest. `includeStarterKit: false` (the profile's `kit` is the kit; BASE_KIT would double-up). Wagon model: default prairie schooner.

### UI shape

`/new` is reorganized **cards-first**:

```
+--------------------------------------------+
| Choose your party                          |
+--------------------------------------------+
| [Sagers]    [Donners]   [Reeds]   [Joe Meek] |
| [Whitmans]  [T. Brown]  [Meekers] [Bidwell] |
| [Palmer]    [Build custom party]            |
+--------------------------------------------+

(when a historical card is selected)
+--------------------------------------------+
| The Donner Family                  [Legendary] |
| April 14, 1846 — George + Tamzene + 5 kids…  |
| trait: Trapped in Sierra winter snow…        |
|                                              |
| Departure date: [1846] [April] [14]          |
|                                              |
| [Begin journey]                              |
+--------------------------------------------+

(when "Build custom party" is selected → existing builder)
```

Card content per profile:
- `displayName` (large)
- `difficulty` badge (Easy / Normal / Hard / Legendary, color-coded)
- `year` + composition summary ("family of 7", "solo", "4 adults + 1 child")
- `trait` (one-line hook)
- `leaderProfession` (small subtitle)

### Date row behavior

Picking a premade auto-fills `year` / `month` / `day` from the profile (year = `profile.year`, month = April default, day = 15 default — matches the existing date preset convention; we can refine month/day per profile if some have well-known departure dates).

The date stays **editable** — player can choose to leave April 1846 as the Donners earlier or later. Picking "Build custom party" keeps the existing date picker default (April 15, 1848).

### Difficulty pass (content task in the plan)

Hand-author one rating per profile. Recommended draft for self-review:

| Profile | Difficulty | Why |
|---|---|---|
| Sager family | Normal | Farmer lead, family of 9, no doctor — but historically modal demographic |
| Donner family | Legendary | Wealthy but late departure; historical 50 % mortality |
| Reed family | Hard | Wealthy, no doctor; tied to Donner fate |
| Joe Meek | Easy | Solo trapper, scout-style |
| Whitman party | Hard | Missionary group, distinct play (no children, ends at mission) |
| Tabitha Brown | Hard | Solo elderly woman, 1846 |
| Meeker family | Normal | Family + farmer, well-documented success |
| Bidwell-Bartleson | Hard | First-wagon era (1841), thin trail support |
| Joel Palmer | Easy | Experienced trail leader, solo/small |
| Lansford Hastings | (n/a) | `playerEligible: false` until #887 |

Final pass happens in the implementation plan; the spec just commits to the schema.

## Data layer changes

1. `BotProfile` gains `difficulty` + `playerEligible`. Both are **required** — no defaults — so the type system enforces authoring.
2. Each of the 10 profiles in `LAUNCH_PROFILES` gets the two fields filled in. Hastings is the only `playerEligible: false`.
3. `profileToNewGameOptions(profile, startDate, seed)` helper, exported alongside `getBotProfile`.
4. Stale comment in `bot-profiles.ts:49-50` referencing "#322 follow-up" gets removed — lawyer profession shipped via #317a, Hastings already uses it. The remaining gap is his kit (#887 open).

## UI layer changes

1. `src/routes/new/+page.svelte` reorganized: 11-card grid replaces the current member-row + presets layout. Existing date-preset row is removed (year is determined by profile or default for custom).
2. New component `src/lib/ui/ProfileCard.svelte` — renders one card, accepts `BotProfile | null` (null = "Build custom party" card).
3. `+page.server.ts` `loadProfile` action: takes `profileId` + date overrides, calls `profileToNewGameOptions`, persists to the chosen save slot. Mirrors existing custom-party submit path.
4. The custom-party builder lives inside a `{#if selectedCard === 'custom'}` block — same component shape as today, just gated.

## Out of scope

- **Custom kit picker** for the custom-party flow. The #102 title originally bundled this; Dave's re-scope (2026-05-26) keeps it as a future ticket. The outfitter at Independence already lets the player buy/sell anything before leaving, so the functional need is small.
- **Portraits / art** on cards. Text-only cards for v1. Phase-2 AI imagery decision lives in the project-level memory and isn't required for this ticket.
- **Hastings playable** — gated on #887 (his `kit`). A follow-up VK ticket tracks the activation: flip `playerEligible: true` once #887 ships.
- **Per-profile wagon model** (Donners had a "Pioneer Palace Car," Joe Meek may have ridden mule-only). Default schooner for all v1. Future ticket if we want to surface this.

## Cross-cutting concerns (per memory checklist)

- **Wagon-train + game-ai impact** (per `feedback_wagon_train_and_ai_consideration`): None. BotProfiles are already wired into NPC wagons via `generateNpcWagon` — adding `difficulty` + `playerEligible` doesn't change that path. Player premades use `createInitialState`, which doesn't touch the wagon-train decision layer.
- **NPC parity (#298)**: Adding `playerEligible: false` is purely a UI filter; NPC wagons still pick from all 10 profiles via `pickProfilesForRoster`.
- **Save-format migration** (per `feedback_no_save_migration`): No migration. Premade picks emit a regular `NewGameOptions` → `GameState`, indistinguishable from a custom party on disk. The save just has those specific names + that specific kit.
- **Mobile target** (Z Fold 4 ~884 px): The 11-card grid degrades to 2 columns on narrow viewports; profile cards stack. Existing custom-party form already fits; reusing it post-card-pick preserves that.

## Self-review

- **Spec coverage:** Architecture, data layer, UI layer, out-of-scope, cross-cutting concerns all present.
- **Placeholders:** None — every type, function name, and file path is concrete.
- **Internal consistency:** `playerEligible` filter (data layer) matches the card-grid filter (UI layer). `profileToNewGameOptions` returns `NewGameOptions`, which `createInitialState` already accepts — no engine changes needed.
- **Ambiguity:** Difficulty ratings are draft-only in the spec — the plan task that authors them is the gate, but the schema commitment is firm. Card layout / styling is one paragraph; the implementation plan will pin the CSS.
- **Scope:** Single focused subsystem (new-game UI + profile conversion helper). One plan, not multiple.

## Follow-ups filed

- Hastings activation — separate VK ticket (see body for the "flip `playerEligible` after #887" task).
