# #1019 — Continuous Temperature Model — Design

**Tickets:** VK #1019 (continuous nightTempF replaces binary isColdNight), plus its two earned-keep consumers #1073 (cold-camp HP/morale differentiation) and #1074 (ox water-needs scaled by day-temp).
**Surfaced by:** brainstorm 2026-05-23 — #1017 shipped the binary cold/warm with weather awareness; the self-deferral comment in `fire.ts` flagged a continuous-temp follow-up; #143 (wet firewood) and #153 (weather system pass) are already shipped; the model needs at least one new consumer to earn its keep.
**Status:** design approved (bundle scope confirmed 2026-05-23); pre-implementation.

---

## 1. Problem

Today the engine has a `Weather` enum (8 labels) and a binary `isColdNight()` in `src/lib/game/systems/fire.ts` that classifies each night as cold-or-warm using a stack of binary signals (weather ∈ {frost,snow,storm}; terrain === mountains; month ∈ {Nov–Feb}). The function carries its own `#1019 (deferred)` comment noting it *"captures the load-bearing cases for now."*

Three gaps follow from the binary:

- **`fire.ts` cold-camp penalty is flat** (-3 HP / -2 morale on any cold night). A 35°F borderline night and a 15°F mountain night hit identically — emigrant diaries (Bryant 1846, Sager 1844, Reed-Donner Sierra 1846-47) clearly differentiate "annoying chilly camp" from "deadly cold camp."
- **`fire.ts` burn rate is bimodal** (2 lb warm / 5 lb cold). Same lack of intensity granularity.
- **`applyDailyConsumption` ox/party water-loss is gated only on `weather === 'heat'`** (×2 multiplier). A 75°F prairie afternoon, a 95°F day, and a 115°F Snake-basin August all collapse to "not heat" or "heat" with no in-between. Marcy 1859 (*The Prairie Traveler*) is explicit on continuous scaling: *"the working team requires from twenty to thirty gallons of water per day in temperate weather, increasing to forty or even fifty gallons in hot."*

A continuous temperature model lets the cold-camp penalty and the ox water-needs scale on the real underlying signal — period-faithful per the diaries the project has been calibrating against.

## 2. Decisions (locked)

| # | Decision |
|---|---|
| Scope | One bundle: #1019 (foundation) + #1073 (cold-camp HP/morale differentiation) + #1074 (ox water-needs by day-temp). #1072 (clothing wear) **dropped** — codebase check found no wear mechanic to scale; needs its own design pass first. |
| Derivation | **Pure function from state**, no save migration. `dayTempF(state)` and `nightTempF(state)` exported from a new `systems/temperature.ts`. |
| Inputs | **Terrain + elevation + latitude + month + weather**, with **day/night swing** layered on top. |
| Composition | **Additive deltas off a base** (70°F). Each input contributes an independent delta; results clamped to plausible bounds. Game-ify of the real non-linear curves. |
| Day/night swing | Per-terrain — desert wider swing (+25 day / −20 night), mountains narrower at the high end (+10 day) but cold low (−15 night), prairie standard (+15 / −10). |
| Elevation | Per-landmark `elevationFt?` on `landmarks.ts` content (57 entries; defaults by terrain for unbackfilled, named overrides for ~10–15 key altitude landmarks). Linear-interpolate between previous and next landmark for on-trail position. |
| Latitude | **Derived from `milesTraveled`** (linear 39°N → 45°N across the 2195-mi trail). No content. |
| Calibration | Foundation slice ships sweep-equal to today (the `nightTempF < 40°F` threshold replacing the binary is calibrated to fire on the same nights the binary deems *deadly* — narrowing the binary's overclaim on summer storms is intentional). Consumer slices each sweep-checkpointed for cohort safety (no crater, danger preserved). |
| Period anchors | Marcy 1859 for ox water; Bryant 1846 / Sager 1844 / Frizzell 1852 for cold-night gradient; Reed-Donner 1846-47 for the deadly tail. |
| `#1072 clothing wear` | **Deferred** to its own future ticket; needs the clothing wear-out mechanic designed first (independent of temp). |

## 3. Architecture

### 3.1 New module `src/lib/game/systems/temperature.ts`

Two exported pure functions + the per-input deltas + per-terrain swing.

```
dayTempF(state)   = midTempF(state) + daySwing(state.location.terrain)
nightTempF(state) = midTempF(state) − nightSwing(state.location.terrain)
                                   capped by weather-name physical floor (frost ≤ 32, snow ≤ 28)

midTempF(state) = BASE_TEMP_F
                − elevationDelta(state)         //  −5°F per 1000 ft above 1000 ft (dry-adiabatic ≈ 5.5°F/1000 ft)
                − latitudeDelta(state)          //  −1°F per ° north of 39°N
                + monthDelta(state.date.month)  //  sinusoidal, +15°F Jul / −25°F Jan
                + weatherDelta(state.weather)   //  storm −10, frost −15, snow −15, heat +10, …
```

**Constants:**

- `BASE_TEMP_F = 70`
- `ELEVATION_REF_FT = 1000`, `ELEVATION_LAPSE_F_PER_1000FT = 5` (dry-adiabatic lapse rate is ≈5.5°F per 1000 ft; pick 5 so the period anchor holds: South Pass July night = 70 − 5×6.4 (elev) − 3 (lat) + 15 (month) + 0 (weather) = 50°F midTempF, − 15 (mountain night swing) = **35°F** night, matching Marcy 1859's "nights cold from June through August on the high passes")
- `LATITUDE_REF_N = 39`, `LATITUDE_DELTA_F_PER_DEGREE = 1`
- `TRAIL_TOTAL_MI = 2195`, `TRAIL_LATITUDE_START_N = 39`, `TRAIL_LATITUDE_END_N = 45`
- `MONTH_PEAK_DELTA_F = +15` (July), `MONTH_TROUGH_DELTA_F = −25` (January) — sinusoidal between
- `WEATHER_DELTA_F`: `clear` 0, `overcast` −3, `rain` −5, `storm` −10, `snow` −15, `frost` −15, `heat` +10, `fog` −2
- `DAY_SWING_F` / `NIGHT_SWING_F` per terrain: prairie +15/−10, forest +12/−8, mountains +10/−15, desert +25/−20, river +12/−8
- **Weather-name physical floor on `nightTempF`**: `frost` weather caps `nightTempF` at `min(result, 32)`; `snow` weather caps at `min(result, 28)`. (Both names literally describe freezing-grade nights; the additive deltas alone can't force a July prairie frost cold enough to *be* a frost — the cap closes that loophole.) No physical floor on `dayTempF` (frost can persist into a chilly day, but `dayTempF` is the afternoon peak; not bounded by morning frost).

### 3.2 Content additions

**`elevationFt?: number` on `LandmarkDef` in `content/landmarks.ts`.** Backfill the 57 landmarks. Most can be defaulted-by-terrain in the temperature module if `elevationFt` is undefined — only explicit overrides where the landmark is meaningfully off-baseline (South Pass 7400, Independence Rock 6000, Soda Springs 5800, Fort Hall 4500, Fort Boise 2100, Walla Walla 700, Oregon City 50, etc. — ~10–15 key overrides).

For on-trail position (between landmarks): linear interpolate between `location.previousLandmarkId` and `location.nextLandmarkId` elevations by `milesTraveled` ratio along the segment. Both fields are already on `GameState['location']` (confirmed: types.ts:130-131). On the first segment (`previousLandmarkId === null`), use `nextLandmarkId`'s elevation directly.

**Latitude derived from `milesTraveled`** — no content. `latitudeN = 39 + (milesTraveled / 2195) * 6`.

### 3.3 Consumers

**#1019 wire (Slice 2)**: `isColdNight()` in `fire.ts` is **removed**; the 2 callsites consume `nightTempF(state) < 40` directly. Threshold calibrated so the binary's *deadly* cases (storm + mountains, frost, snow, winter) reliably cross below 40°F. The binary's overclaim on summer prairie storms — Bryant 1846 "men shivered but bore it" — is deliberately narrowed.

**#1073 cold-camp differentiation (Slice 2)**: `applyColdPenalty` in `fire.ts` scales the existing `COLD_NIGHT_HEALTH_HIT = 3` and `COLD_NIGHT_MORALE_HIT = 2` by `coldIntensity = clamp((40 − nightTempF) / 8, 0, 3)`. So a 40°F borderline = ×0 (no penalty), a 32°F freezing = ×1 (today's behavior), a 16°F mountain = ×3 (cap). Clothing/tent mitigation unchanged.

**#1074 ox water-needs (Slice 3)**: `applyDailyConsumption` (`systems/consumption.ts`) replaces the existing `weatherWaterMult` heat branch with continuous `heatMult = max(1, 1 + (dayTempF − 70) / 30)`. 70°F → ×1, 85°F → ×1.5, 100°F → ×2 (matches today's "heat"), 130°F → ×3.

## 4. Build slicing (3 PRs)

| Slice | Scope | Sweep gate |
|---|---|---|
| **1 — Foundation** | `temperature.ts` + `LandmarkDef.elevationFt?` content backfill + 25–30 unit tests (every season × terrain × weather combo at representative landmarks; period anchor scenarios). NO consumers wired. | Sweep-equal to today (no consumers wired). |
| **2 — #1019 + #1073 (fire.ts)** | Remove `isColdNight`; consume `nightTempF < 40` in burn-rate and cold-camp gates. Scale cold-camp HP/morale by `coldIntensity`. | Within ±2pp arrival across all 10 personas vs pre-slice; danger preserved (no cohort to ~100%); winter/mountain sweep specifically inspected for unintended escalation. |
| **3 — #1074 (ox water)** | Replace `weatherWaterMult` heat branch with continuous `dayTempF`-scaled multiplier in `applyDailyConsumption`. | Within ±2pp arrival; desert legs (Snake basin, late August) specifically inspected for ox-team dehydration regressions. |

Each slice ships as its own PR with full `npm run verify` + sweep checkpoint between.

## 5. Testing

- **Foundation unit tests** — every season × terrain × weather combination at the trail's representative landmarks. Period-anchor scenarios (approximate; exact numbers calibrate during slice-1 implementation):
  - South Pass (7400 ft, ~42°N, mountains) July clear night → ≈35°F (Marcy 1859: high-pass summer nights cold)
  - Snake desert (3500 ft, ~43°N, desert) August clear day → ≈90–95°F (emigrant August 1850 diaries: ox teams dehydrating fast)
  - Prairie (1500 ft, 39°N) December clear night → ≈30–35°F (well below the 40°F cold-camp threshold)
  - Independence (1000 ft, 39°N) July storm night → ≈55–60°F (NOT cold-camp grade — Bryant 1846 "shivered but bore it")
  - Anywhere + `frost` weather → nightTempF capped at 32°F regardless of season/elevation
  - Anywhere + `snow` weather → nightTempF capped at 28°F regardless of season/elevation
- **Calibration test** for Slice 2 — **load-bearing cases only**, not blanket equivalence. The binary `isColdNight()` overclaims on edge cases (e.g. a July storm at 1500 ft on the prairie: midTempF ≈ 73°F, nightTempF ≈ 63°F — clearly not cold-camp grade despite `weather === 'storm'`). Continuous temp is allowed to *narrow* coverage where the binary overclaimed. What the test pins is that the **deadly tail** is preserved:
  - South Pass July night (mountains, 7400 ft) → `< 40°F` ✓
  - Snake basin January night (desert, 3500 ft) → `< 40°F` ✓
  - Prairie December clear night → `< 40°F` ✓
  - Any `frost` weather at any time → `< 40°F` ✓ (frost-cap = 32 forces this)
  - Any `snow` weather at any time → `< 40°F` ✓ (snow-cap = 28 forces this)
  - Mountain storm any month → `< 40°F` ✓
  Cases the binary previously *overclaimed* (summer prairie storm, summer forest frost, etc.) are explicitly allowed to NOT trigger — the diff is a feature, not a regression, and the §10-style sweep gate is the safety check.
- **Consumer slices** — per-slice behavior tests (scaling matches expected; binary-equivalent case yields binary-equivalent damage) + 10-persona sweep within ±2pp.
- **No save migration** — derivation is pure-function; old saves work unchanged.

## 6. Cross-references

- **#1019 (this)** — was deferred with a self-comment in `fire.ts:108-111`.
- **#1017 shipped** the binary cold/warm precursor (PR #111, commit c7b11a2).
- **#1073 / #1074** — newly filed 2026-05-23 as the earn-its-keep consumers.
- **#1072 (clothing wear)** — newly filed 2026-05-23 + deferred from this bundle; needs a clothing-wear-out mechanic designed first (not present in code today).
- **#143 (wet firewood)** shipped (commit 336b30b).
- **#153 (weather system pass)** effectively shipped (`systems/weather.ts` is 227 lines with 8 consumers).
- **#135 (dehydration mechanic)** — `applyDailyConsumption` is the same path #1074 modifies; consumer slice needs to preserve dehydration semantics.
- **#16 (clothing rework)** — the warmth system #1072 will eventually scale; not in this bundle.
- **Marcy 1859** *The Prairie Traveler* — the load-bearing source on continuous ox water needs.
