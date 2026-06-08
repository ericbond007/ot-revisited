# Ox Thirst (desert draft-animal hydration) — Core Design

**Ticket:** #1264 (ox-thirst core scope). **Date:** 2026-06-08.

**Goal:** Make the desert a genuine draft-animal challenge: the team carries a **hydration** that drains on waterless desert legs and refills at real water. Low hydration slows the team (recoverable); sustained near-empty kills it (the lethal tail). Mules tolerate the desert better than oxen — so the prepared player crosses the Snake with mules or a fresh ox team and sane pace, and the neglectful strand a dying team.

## Why
The Snake desert is the trail's death wall (#1245 dig). We just gave the *people* a drycamp lever. But historically the **oxen** were *the* thing that died on dry drives — they drank 15–20 gal/day each (a 4-ox team = 60–80 gal/day, uncarriable), so the desert was a **reach-water-in-time** problem managed by route + pace + the right animals, NOT by carrying water. The engine models **no ox water need at all**. This adds it, as the period-accurate desert mechanic.

## Scope
**Ox-thirst core only.** Deferred to follow-ons: route choice (#1145, the wet/dry Three Island fork), night/cooler travel timing, hauling water for stock. This ticket is the hydration track + its effects + legibility + bot/NPC handling.

## Architecture

### 1. State — per-ox `hydration`
Add to the `Ox` interface (`src/lib/game/types.ts`):
```ts
hydration?: number; // 0..100, 100 = freshly watered. Default 100 (legacy/new).
```
Per-ox (mirrors `health`/`fatigue`, supports the per-ox WATER bar + per-animal mule tolerance). No save migration (project rule) — default `?? 100` on read; initialise to 100 when oxen are created/synthesised.

### 2. The hydration system — `applyOxHydration(state)` (new, in `systems/oxen.ts` or a sibling `ox-hydration.ts`)

Runs each travel day. **"At water"** = the team can drink today: the current `state.location.terrain !== 'desert'` (watered country — streams at the halts), OR the day's landmark is a river ford / has `waterSource`. (Mirror the human dehydration "wet day" reset.)

- **At water → refill:** every alive animal's `hydration = 100`.
- **Dry desert day → drain:** `hydration -= DRAIN_PER_DAY` per alive animal, where ox `DRAIN = 20` (~5-day runway), **mule `DRAIN = 13`** (~7–8-day runway — the desert edge). Floor at 0.
- **Crucially:** human `find_water` / `dig_well` do NOT refill ox hydration (can't water a 60–80 gal/day team from a dug well). Only real sources reset it. *This exclusion is the strategic teeth.*

### 3. Effects (read off hydration; green→amber→red)
Per animal, by `hydration`:
- **≥ 50 (green):** no penalty.
- **20–50 (amber, "dragging"):** **pace penalty.** Implement via the existing fatigue/pace coupling — a hydration fatigue multiplier in `tickOxen` (parched animals fatigue faster) AND/OR a direct `milesPerDay` reduction scaling from 1.0 at 50 down to ~0.7 at 20. Recoverable — refill and it's gone.
- **< 20 (red, lethal tail):** ox **health** drains, ramping as hydration → 0 (e.g. `−round((20 − hydration) / 4)` HP/day, so ~−5/day at hydration 0). Sustained 0 → animals die → team shrinks → `milesPerDay`'s alive-team / min-team logic strands the wagon. This reuses the existing "dying team → stranded" failure path.

### 4. Mules tolerate the desert (the strategic payoff)
Mule `DRAIN_PER_DAY` is lower (13 vs 20). Combined with the existing mule grain need + ox-swap at posts, this makes the period-accurate trade real: **oxen win the prairie (graze free), mules win the desert.** No new "bar to babysit" — it falls out of the existing animal choice. (The ox grain mechanic in oxen.ts is mule-only and stays untouched — oxen graze free.)

### 5. Engine wiring
Insert `applyOxHydration` into the daily pipeline in `engine.ts`, adjacent to `tickOxen` (after it, or fold the hydration drain/refill into `tickOxen` and apply the pace/health effects in the same pass — implementer's call, but keep hydration logic in its own pure function for testability). `milesPerDay` already reads the alive team, so the pace penalty either lives there (a hydration paceMult) or via the fatigue it adds in `tickOxen`.

### 6. Legibility (extends existing ox UI — no new layout)
- **`WagonPanel.svelte`:** add a **💧 avg water** stat beside the existing `❤ avg health` / `⚡ avg fatigue`, and a **`⚠ parched`** warning chip modelled exactly on the existing `⚠ thin grass` chip (fires when avg hydration < ~30).
- **`WagonModal.svelte`:** add a **WATER bar** per ox beside the existing HEALTH / FATIGUE bars (blue fill, depleting).
- A **log line** when the team first crosses into the amber zone ("The team is flagging for want of water") and the red zone ("The oxen are failing — find water").

### 7. Bot / NPC (parity #298, game-ai #302)
The only desert fix is **reaching water** — you can't rest-recover hydration with no water. So the bot/NPC lever is **pace + not over-pushing a parched team**: when team hydration is low and a dry stretch remains, ease off grueling/fast pace (grinding accelerates fatigue + the health drain). Add this to the persona pace decision (`pickPace` / the schedule-gate pace path), persona-flavored: **pace_pusher grinds** the team (characterful, dies more), **cautious eases** to protect it. Wire into BOTH the player-bot runner and `npc-engine` (NPC parity). NPC oxen get the same hydration drain/refill (mirror the existing `applyNpcDehydration` shape).

## Testing
**Unit (`tests/`):**
- `applyOxHydration`: drains on a desert day (ox −20, mule −13); refills to 100 on a watered-terrain day and at a ford/waterSource; does NOT refill on `dig_well`/`find_water`; floors at 0; `?? 100` default.
- Effects: no penalty ≥50; pace penalty 20–50; health drain <20 (ramping, child-of-the-team n/a — oxen only); death at sustained 0.
- Mule edge: a mule and an ox on the same desert run — mule retains more hydration / survives a longer dry leg.
- `milesPerDay`: lower for a parched team than a watered one, same otherwise.

**Sweep gate (`--runs 2`, 6 shapes, BEFORE/AFTER):**
- **PASS = adds desert difficulty WITHOUT re-breaking the fair-if-prepared crossing #1245 just delivered.** Arrival on the dry shapes should dip *modestly* (the desert got harder) but NOT crater, and wiped% must not spike for a *prepared* run. Validate the intended spread: runs that arrive at the Snake with a fresh team / mules + sane pace cross; worn teams pushed hard strand. Tune `DRAIN_PER_DAY` (ox/mule) + the effect thresholds so the real Snake dry legs are survivable-if-prepared. Report the ox-death share of the death mix (should rise from ~0 toward a historical share, since the engine modelled no ox thirst before).

## Out of scope (tracked)
- Route choice (#1145), night/cooler travel timing, hauling water for stock — all under #1264's parent vision; this is the core only.

## Self-review checklist (author)
- State (per-ox hydration + default), drain/refill system, dig-well exclusion, effects (slow→lethal tail), mule edge, engine wiring, legibility (panel chip + modal bar), bot/NPC pace handling + NPC parity, tests + sweep gate — all present.
- Consistency: `hydration`, `applyOxHydration`, `DRAIN_PER_DAY`, the 50/20 thresholds used identically throughout.
- Scope: single mechanic; route/timing/hauling deferred.
- No double-count: ox hydration is independent of the human keg + human dehydration (different track, different reset rule).
