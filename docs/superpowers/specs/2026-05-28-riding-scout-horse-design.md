# Riding / Scout Horse — Design Spec

**Status:** approved design, pre-plan
**Date:** 2026-05-28
**Context:** hoosierTrail (Oregon Trail Revisited), SvelteKit + Svelte 5 runes.

## Goal

Add an optional **riding horse** the party can own — a non-draft mount used for
**scouting ahead** and **mounted hunting**. It is historically a sign of means,
grain-hungry, and a theft magnet. It is NOT a wagon-pulling animal and never
joins the ox/mule team.

## Why it's distinct from oxen/mules

| | Oxen / Mules (`oxen[]`) | Riding horse (`horses[]`) |
|---|---|---|
| Purpose | Pull the wagon (passive) | Player **actions**: scout, mounted hunt |
| Team math | Hitched, drive travel speed + fatigue | Excluded from all team/speed/fatigue calcs |
| Forage | Oxen graze grass; mules need grain | Grain only (no grass subsistence) |
| Render | In the team, in front of wagon, yoked/harnessed | **Out front of the wagon** (scout/leading position) |

Historical grounding for the out-front render: scouts/pilots rode ahead of the
train on horseback to find route/water/camp and watch for danger. (Herders who
trailed behind managed loose stock — a different role.) So a scout mount ranging
out front is period-correct.

## State model

New entity, tracked individually so a *named* mount can be injured/stolen:

```ts
// src/lib/game/types.ts
export type HorseColor = 'bay' | 'black' | 'gray' | 'palomino';

export interface Horse {
  id: string;
  name: string;        // e.g. "Dusty" — random period name at acquisition, renamable
  color: HorseColor;   // selects the rendered walk-cycle sprite set
  health: number;      // 0–100; declines if unfed, recovers on rest+grain
}

// GameState gains:
horses: Horse[];       // default [] ; own 0–N (realistically 0–2)
```

- A "count" is just `horses.length`; per-horse health/name gives theft/injury
  detail. (This is the "both" decision: real entities AND multiple.)
- No separate `fatigue` field in v1 — heavy use (scout/hunt) applies a small
  health hit; grain + rest restore it. Keep it to one stat.

No `horse` entry is added to `oxen[]` and `hitchedOxenCount()` /
`oxenSpeedFactor()` / travel speed are **untouched**.

## Daily upkeep (grain)

In the daily tick (alongside `consumeOxenFeed`/`tickOxen` in
`systems/oxen.ts`, or a sibling `systems/horses.ts`):

- Each living horse eats **2 lb grain/day** (horses eat more than the mule's 1 lb).
- Grain is drawn after mules are fed (mules already claim grain). If grain runs
  out, unfed horses lose **3 HP/day** and a log line warns.
- On rest/layover days, fed horses recover **+2 HP/day**.
- A horse reaching 0 HP dies (removed from `horses[]`, logged, small morale hit).

## Role 1 — Scout ahead (active action, v1)

A camp/travel action `scoutAhead(state, rng)`:

- **Requires** ≥1 living horse (button disabled/hidden otherwise; reuse the
  event-choice `requires`/`enabled` gating pattern).
- **Cost:** one use per day; a small **encounter risk** (riding out alone can
  trigger an encounter from the existing events pool — bandit, native, terrain).
- **Reveals** a report on the next leg (terrain, river-ford difficulty, hazard
  level, and **whether game is nearby** — feeds Role 2). Logged as a journal line.
  This is richer than the Scout-profession one-line preview already in
  `travel.ts`.
- **Forewarned effect:** seeing the leg softens ONE bad-surprise event on it —
  e.g. reduce the next terrain/wagon-mishap chance, or a small morale buffer.
  Modest, not a hard shield.
- **Scout-profession synergy:** a live Scout + a horse reveals **two** legs / adds
  danger detail (stacks, doesn't double-count the profession's own preview).
- Heavy ride applies a small horse health hit (−2 HP).

**Later (flagged, NOT v1):** a passive mode where simply owning a horse
auto-reveals the next leg each day without the action/risk. Build the active
version first.

## Role 2 — Mounted hunting (hook into `actions/hunt.ts`)

When ≥1 healthy horse is present, `hunt()` gains a **mounted** modifier:

- **+yield** (~+20%, stacks with hunter/dog/news multipliers already in `hunt.ts`).
- **Run down big game** on the open prairie — raises the big-game yield ceiling
  / success on `terrain === 'prairie'`.
- **Lower injury risk** to the hunter (mounted vantage) — reduce the big-game
  injury and grizzly-mauling rolls.
- **New risk:** the *horse* can be injured in a mounted big-game hunt (small
  chance, −HP; rare worst-case loss in mountains). The scout→hunt loop: scout
  ahead spots game, then ride out and take it.

## Historical levers (cost/risk — the gamble of owning one)

- **Grain drain** — see upkeep above.
- **Theft magnet** — owning a horse nudges bandit/native-raid event weight up
  (via `wagonHazardMult`-style modifier in `rollEvent`); raid events target a
  horse first with a high steal chance, removing a specific named mount.
- **Sign of means** — a small standing morale bump while you own ≥1 horse
  (prestige). Implementation: a few points folded into the morale calc, or a
  flavor line on acquisition.
- **Injury / loss** — river fords and a stampede event can injure or kill a horse.

## Acquisition & economy

- **Game start (outfitter):** purchasable during initial outfitting as a
  "sign of means" splurge — integrates with the outfitter flow (see
  `2026-05-28-1172-outfitter-rework-design.md`). Optional line item, not in the
  default kit.
- **Forts / trading posts:** buy a horse (~$60–100, period-accurate). Add to the
  post buy flow alongside the existing ox/mule swap (`systems/town-services.ts` /
  `systems/barter.ts`). Names the horse on purchase (random period name).
- **Events:** native trade (swap goods → horse — natives already trade horses in
  flavor) and a rare "found stray" finds-event.
- Sells back at a discount like other livestock.

## UI surfaces

- **Livestock panel** (`ui/InventoryPanel.svelte`): list horses by name, color,
  and health, in the livestock section next to oxen/cows.
- **Scout-ahead action:** a button in the camp/travel UI, gated on owning a horse.
- **Wagon scene** (`ui/wagon/WagonScene.svelte`): render a walking horse **out
  front** of the wagon (ahead of the ox/mule team) when `horses.length > 0`. Use
  the lead horse's `color` to pick the sprite set.

## Render asset (already produced)

- Source: "Horse animest super pro" (Sketchfab, **CC-BY-4.0**), rigged, baked fur
  texture, straight `Horse_walk`.
- Rendered via the Blender pipeline: **24-frame** side-profile walk, root-anchored
  (in-place, ~1px drift), union-cropped (aspect ≈ 1.20).
- **4 colors**: bay (native baked coat), black / gray / palomino (HSV-tinted).
  Staged in `/tmp/horse-set/`; to be moved into
  `static/wagon-bg/wagon-blender/horse-walk-frames[-color]/` on implementation.

## Saddle + rider (v1)

The horse renders **tacked and ridden** — it's a scout mount ranging ahead, so a
rider belongs on it (historically the whole point of the out-front position).
Part of v1, not deferred.

- **Saddle + bridle/reins** on the horse, and a **seated rider** on its back.
- Approach (decided at implementation): either (a) **bake** a saddle mesh +
  seated rider onto the horse in Blender and render into the walk sprites — reuse
  the seated-cowboy asset (`tools/blender/models/cowboy-driver.glb`,
  `pose_cowboy_seated.py`) for the rider and borrow/adapt the saddle from the
  saddled-horse model (Ayan, CC-BY) — or (b) an SVG saddle/rider overlay. The
  bake is preferred for consistency with the ox/mule (tack baked into the sprite,
  moves with the body); the mule-yoke bake experience informs the fit work.
- Rider should read at sprite scale (period clothing/hat), facing the direction
  of travel, matching the horse's out-front placement.

## Out of scope (v1)

- Passive auto-scouting (flagged above as a later upgrade).
- Breeding/foals, multiple simultaneous riders, mounted combat, a cavalry
  profession, horse-specific vet services (fold into fort services later if wanted).

## Open questions

None blocking. Random period-name list and exact tuning numbers (prices, morale
points, event weights) are dialed during implementation against the existing
balance constants.
