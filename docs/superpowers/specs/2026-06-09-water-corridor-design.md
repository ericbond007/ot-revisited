# Water corridors — quality-aware river-adjacent refill (#1280/#1281)

**Problem.** The 2,500-run bot stats pass (2026-06-09) showed dehydration is 70% of all
deaths and bots burn ~20+ days/run on `find_water` camp actions — both concentrated on
legs that historically ran beside rivers. Root cause: river-corridor legs are terrain
`prairie`, so `applyAmbientWaterRefill` gives 0.6 gal/day expected against ~5–7 consumed.
The historical audit (appendix: `2026-06-09-water-corridor-research.md`) classified all
54 legs: ~33 corridor, 4 rim/canyon, ~13 point, 1–2 genuinely dry.

**Decision (Dave, 2026-06-09):** hybrid, historically faithful, quality-aware.
Corridors refill daily; canyon rivers (the Snake) keep the #1039 point-access model with
the missing historical descents added; genuinely dry stretches stay dry.

## 1. Content model

`Landmark` gains:

```ts
/** #1281 — the LEG ARRIVING AT this landmark runs beside accessible water.
 *  'clean' = potable (Sweetwater, Boise, Bear); 'murky' = accessible but
 *  filthy (the Platte — the 1849 cholera vector); absent = no corridor
 *  (rim/canyon, point, or dry: ambient refill stays terrain-based). */
waterCorridor?: 'clean' | 'murky';
```

Flag assignments (full per-leg table + evidence in the research appendix):

- Independence → Fort Kearny (Kansas/Blue creek country): `clean`
- Fort Kearny → Fort Caspar (Platte south-bank road): `murky` — EXCEPT the
  Windlass Hill / Ash Hollow ridgeback legs (unflagged; historically dry) —
  exact ids per the appendix table
- Fort Caspar → Independence Rock (the dry drive, poison sloughs): unflagged.
  This stretch's 17% dry days in telemetry are historically CORRECT.
- Independence Rock → South Pass (Sweetwater, nine crossings): `clean`
- Big Sandy/Green stretch: unflagged (point/dry per appendix)
- Big Hill → Soda Springs → Fort Hall (Bear/Portneuf valleys): `clean`
- Fort Hall → Three Island (Snake RIM): unflagged — point-access model (see §3)
- Three Island → Fort Boise (north/wet route, Boise valley): `clean`
- Farewell Bend (post-reorder, §4) → Burnt River legs: `murky` (brackish creek)
- Flagstaff Hill → Grande Ronde → Blue Mountains → Whitman (Powder/Grande
  Ronde/Umatilla): `clean` (Blue Mountains legs already forest-terrain ambient)
- Whitman → The Dalles (Columbia plateau, inland): unflagged — point-access (§3)
- Barlow Road legs: unflagged (forest ambient already 3 gal @ 60%)

## 2. Mechanic

One branch in `applyAmbientWaterRefill` (daily-steps MORNING — reaches the player,
NPCs, and rest days automatically post-#1266):

```ts
const corridor = corridorForLeg(state);   // reads the arriving landmark's flag
if (corridor === 'clean')  -> +5 gal/day guaranteed into resources.water (cap-clamped)
if (corridor === 'murky')  -> +5 gal/day guaranteed into resources.dirtyWater
                              (clamped so water + dirtyWater <= waterCap)
else                       -> existing terrain table unchanged
```

`corridorForLeg` resolves the leg via `location.nextLandmarkId` (the landmark being
approached carries the flag for the leg arriving at it).

### Interactions verified (2026-06-09 code check) — all preserved, no changes:

- **Dehydration (#1136):** `applyDehydration` reads `water + dirtyWater` — dirty
  water hydrates at disease risk; murky corridors cannot recreate the
  drank-only-dirty-water dehydration bug.
- **Knowledge gating:** `canBoilWater` = live doctor OR year >= 1854 OR
  `hasBoilingKnowledge`; `boil_water` is hidden pre-knowledge; `find_water` masks
  the clean/dirty distinction in its log line for ignorant parties. Murky corridor
  water flows into the same `dirtyWater` pool — ignorant parties drink it unaware.
- **Coffee/tea (incidental boiling):** `waterborneDiseaseModifier` (0.6x with
  coffee/tea on hand) is applied inside `applyDirtyWaterRisk` regardless of the
  dirty water's source. Untouched.
- **NPC parity:** `dirtyWater` is a projected `NpcWagonState` field; the risk step
  is in MORNING. NPCs and rest days get the full pathway for free.

### Tuning lever (gated, expect to need it)

`applyDirtyWaterRisk` is currently binary: ANY dirty gallon drunk → full per-adult
chance (5%, 2.5% w/ doctor, x0.6 w/ coffee), one infection max/day. On a ~40-day
murky Platte stretch where most draws are dirty, that compounds to ~19%/day for a
4-adult party — cholera would replace dehydration 1:1. Lever: scale the chance by
the fraction drunk dirty (`dirtyDrawn / waterNeeded`). Decision belongs to the
BEFORE/AFTER gate: Platte cholera should RISE modestly (the 1849 story), not wipe
the board. Implement the lever only if the gate shows over-rotation.

## 3. New point-access landmarks (walk-past `waterSource`, no UI pause)

Snake rim (caps each rim leg at ~one keg-lifetime):
- `american_falls` — ~10 mi past Fort Hall (between ft_hall and gate_of_death)
- `rock_creek_snake` — mid-leg between gate_of_death and salmon_falls (~mile 1360)

Columbia plateau (Whitman → The Dalles, the four historical river crossings):
- `umatilla_crossing`, `willow_creek_crossing`, `john_day_crossing`,
  `deschutes_crossing` — verify first whether any already exist as river-kind
  landmarks; only add the missing ones.

Mileage: split the containing legs' `milesFromPrevious` so trail totals are
UNCHANGED (lock with a total-miles test). Each new landmark needs a GAP art
component eventually — file follow-ups in Icons/Backgrounds (project 4); plain
`<image>`-less SVG placeholder until then, per the FLUX-backdrop pattern.

## 4. Farewell Bend geography fix

Catalog has `ft_boise → burnt_river_canyon → flagstaff_hill → farewell_bend`;
historically the trail leaves the Snake AT Farewell Bend, THEN climbs Burnt River
canyon to Flagstaff Hill. Reorder to
`ft_boise → farewell_bend → burnt_river_canyon → flagstaff_hill`, redistribute
`milesFromPrevious` (totals unchanged), retype farewell_bend off `desert`
(it sits on the Snake) and give it `waterSource: true`. Re-baseline any tests
pinned to the old ordering. Separate task — it shifts three legs' identities and
should be reviewable in isolation.

## 5. Bot / game-AI adjustments (the two mandatory axes)

- **NPC parity:** free via the daily-steps spine (verified above).
- **Bot find-water trigger:** the runner's rest-primary election uses
  `water / waterCap` (clean only) — on murky corridors bots would burn find_water
  days on full-but-dirty kegs. Change the trigger to total
  (`(water + dirtyWater) / waterCap`). Persona `shouldFindWater` surfaces: audit
  the same way; they should fire on TOTAL scarcity (dehydration pressure), not
  clean scarcity. Knowledge parties wanting clean water express that through
  boil_water bundling, not extra find_water days.
- **Camp bundle:** verify `boil_water` urgency scoring fires on murky corridors
  for knowledge parties (dirtyWater high + firewood available).
- No new persona surfaces.

## 6. Gates

`bot-stats-250` + `leg-pacing-1280`, same seeds, BEFORE (master) / AFTER:

- Corridor-leg dry% → ~0; rim/dry legs unchanged (Caspar→Independence Rock keeps
  its historical dryness).
- find_water days/run collapse (from ~20+ to a few, concentrated on point/dry legs).
- Dehydration deaths confined to rim/dry legs; overall dehydration share well
  below 70%.
- Arrivals up across personas; nobody craters; chaos still wipes (fuzzer).
- Watch-fors: starvation must NOT 1:1 replace dehydration; dysentery/cholera
  SHOULD rise modestly on the Platte (mechanic working) — if it over-rotates,
  apply the §2 fraction-scaling lever and re-gate.
- Full `npm run verify`; total-trail-miles invariant test for §3/§4.

## 7. Out of scope

- UI surfacing of corridor state (pairs with #134 water glyph — note only).
- The south/dry Snake alternate route (that's #1145 Three Island wet/dry).
- Late-trail rest-spiral pacing (re-measure after this lands; remainder stays #1280).
- Art for new landmarks (GAP follow-ups in project 4).
