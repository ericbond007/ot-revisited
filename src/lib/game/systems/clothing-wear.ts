// #1072 — Clothing wear engine.
//
// Two condition tracks (0–100, default 100):
//   resources.clothingCondition  — garments pool (coats, trousers, dresses,
//     blanket-wraps, all family pieces managed as one pool historically).
//   resources.footwearCondition  — boot + moccasin pool (faster-wearing;
//     "boots worn to pieces" is the period cliché by Devil's Gate).
//
// Each daily tick (scope='all' for NPC parity):
//   1. Abrasion  — per-mile, terrain-scaled, zero on rest days.
//   2. Rot       — flat per-day, every day including rest (mildew, chores).
//   3. Moisture  — ford day +3g/+1.5f; storm +2g/+1f; rain +1g/+0.5f;
//                  while damp +0.5g/day until a clear-weather day.
//   4. Cold minor — frost/snow day +0.25g (brittle fabric stress).
//
// Consequences (§3 — implemented here):
//   warmthFor (warmth.ts) — scales by condition (with 0.35 floor).
//   milesPerDay (travel.ts) — footwear ≤25 → ×0.95; ≤10 → ×0.90.
//   HP nick — footwear ≤10 on desert/mountains: −1 HP alive members/day.
//   Morale drag — garments <25: −1 morale/day.
//
// Threshold log lines (§6.3) — once per downward crossing, re-armed above.
//
// Calibration target: unmended balanced run ≈ 25 garments at the Blues
// (~day 150); footwear hits ≤25 around Devil's Gate–Fort Hall unmitigated.

import type { GameState, Terrain, Weather } from '../types';
import type { TickCtx } from '../daily-steps';

// ---------------------------------------------------------------------------
// Constants — abrasion
// ---------------------------------------------------------------------------

/** Per-mile garment abrasion. Calibrated so ~150-day unmended run arrives
 *  at the Blues around 25 condition. (18 mi/day moderate × 150 days = 2700
 *  mi total abrasion budget. Rot: 0.15×150 = 22.5. Combined loss ~97 points
 *  → ends near 3 raw; terrain mix lifts the effective loss to ~75, landing
 *  near 25. Terrain multiplier below explains the mix.) */
export const GARMENT_WEAR_PER_MILE = 0.022;

/** Per-mile footwear abrasion. Boots wear ~2× faster than garments
 *  (McMartin thesis; Longmire arriving one-booted; Ward "shoes ruined").
 *  0.045 × moderate run (2700 mi total) ≈ 121 — hits ≤25 well before the Blues,
 *  sooner on desert/mountain terrain. MILD revisit-after-SO note. */
export const FOOTWEAR_WEAR_PER_MILE = 0.045;

/** Terrain-driven abrasion multiplier. Prairie baseline (1.0).
 *  Desert spike (1.5) captures sage, prickly-pear, alkali; the spec note
 *  "worsens west of South Pass via the terrain mix" is this constant at work.
 *  Mountains (1.6) — sharp granite scree, rocky descents.
 *  Forest (1.2) — roots, underbrush, wet ground.
 *  River (1.0) — ford days get a moisture spike instead. */
export const TERRAIN_WEAR_MULT: Record<Terrain, number> = {
  prairie:   1.0,
  forest:    1.2,
  desert:    1.5,
  mountains: 1.6,
  river:     1.0
};

// ---------------------------------------------------------------------------
// Constants — rot (flat per-day)
// ---------------------------------------------------------------------------

/** Dust embedding, mildew, camp-chore wear. Applies every day incl. rest. */
export const GARMENT_ROT_PER_DAY = 0.15;
export const FOOTWEAR_ROT_PER_DAY = 0.10;

// ---------------------------------------------------------------------------
// Constants — moisture spikes
// ---------------------------------------------------------------------------

/** Ford-crossing moisture spike — everyone waded or got soaked caulking.
 *  Flag: state.flags._fordedToday (set by actions/ford.ts, cleared here). */
export const MOISTURE_FORD_GARMENT  = 3.0;
export const MOISTURE_FORD_FOOTWEAR = 1.5;

/** Storm — lightning + hail + driving rain soaks everything. */
export const MOISTURE_STORM_GARMENT  = 2.0;
export const MOISTURE_STORM_FOOTWEAR = 1.0;

/** Rain — wet-weather travel; lighter soak than a storm. */
export const MOISTURE_RAIN_GARMENT  = 1.0;
export const MOISTURE_RAIN_FOOTWEAR = 0.5;

/** While-damp daily garment wear penalty (rot from mold).
 *  Continues until a clear-weather day clears the _clothingDampSinceDay flag.
 *  A later task will wire wash_clothes clearing. */
export const MOISTURE_DAMP_DAILY_GARMENT = 0.5;

// ---------------------------------------------------------------------------
// Constants — cold minor secondary
// ---------------------------------------------------------------------------

/** Frost and snow days nick garments slightly (brittle fabric / leather
 *  stress in the freeze-thaw cycle). Reads weather, not the temperature
 *  model — simple and fast; #1019's nightTempF is available if finer
 *  granularity is wanted later. */
export const COLD_MINOR_GARMENT = 0.25;

// ---------------------------------------------------------------------------
// Constants — consequences
// ---------------------------------------------------------------------------

/** Footwear ≤ this threshold → milesPerDay ×0.95 (blisters slow the driver).
 *  MILD — revisit after SO runs if the pace penalty proves too harsh. */
export const FOOTWEAR_SLOW_THRESHOLD  = 25;
export const FOOTWEAR_SLOW_MULT       = 0.95;

/** Footwear ≤ this threshold → milesPerDay ×0.90 AND desert/mountains HP nick.
 *  MILD per Dave 2026-06-12. Revisit after SO run data. */
export const FOOTWEAR_HALT_THRESHOLD  = 10;
export const FOOTWEAR_HALT_MULT       = 0.90;

/** HP nick per alive member on rough terrain when footwear ≤ HALT_THRESHOLD.
 *  Children included (Conyers "rag-swathed feet" documented for all ages).
 *  MILD per Dave 2026-06-12 — revisit after SO run data. */
export const FOOTWEAR_HP_NICK = 1;

/** Terrains that trigger the footwear HP nick at ≤10. Period: rocky scree,
 *  alkaline sand, and high-altitude talus are the documented foot-shredders. */
const ROUGH_TERRAIN = new Set<Terrain>(['desert', 'mountains']);

/** Garments < this threshold → −1 morale/day (the shame of rags). Light;
 *  does not stack other morale effects; respects #1403 mourning cap trivially
 *  (the cap sits at 70, garment drag fires at 25 — no conflict unless the
 *  party is mourning AND ragged, which is just doubly grim). */
export const GARMENT_MORALE_DRAG_THRESHOLD = 25;
export const GARMENT_MORALE_DRAG = 1;

// ---------------------------------------------------------------------------
// Threshold log lines (§6.3) — once per downward crossing, re-armed above.
// Verbatim period-voice from the spec.
// ---------------------------------------------------------------------------

const LOG_GARMENT_50  = "The sage is dreadful on one's clothes — coats and trousers fraying.";
const LOG_GARMENT_25  = "The family is in rags; the 'best' dress comes out of the trunk.";
const LOG_FOOTWEAR_25 = "Boots worn through — feet swathed in rags.";

/** Flag keys for the level-trigger system. Set to true once the crossing
 *  fires; cleared (deleted) when the value recovers above the threshold.
 *  Plain boolean JSON, no number encoding needed. */
const FLAG_GARMENT_50_FIRED  = '_clothingWarnGarment50';
const FLAG_GARMENT_25_FIRED  = '_clothingWarnGarment25';
const FLAG_FOOTWEAR_25_FIRED = '_clothingWarnFootwear25';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reads clothingCondition from resources, defaulting to 100 for old saves. */
export function getClothingCondition(state: GameState): number {
  return state.resources.clothingCondition ?? 100;
}

/** Reads footwearCondition from resources, defaulting to 100 for old saves. */
export function getFootwearCondition(state: GameState): number {
  return state.resources.footwearCondition ?? 100;
}

/** Clamps a condition value to [0, 100]. */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// ---------------------------------------------------------------------------
// Main daily step
// ---------------------------------------------------------------------------

/**
 * Apply one day's clothing wear — abrasion (if traveled), rot (always),
 * moisture spikes, cold minor, and log-line level triggers.
 *
 * Then apply morale drag and HP nick (footwear only on rough terrain ≤10).
 *
 * Placed in POST_EVENT_TAIL_STEPS (scope='all') so:
 *   - milesTraveledToday is in ctx (player engine passes the delta from
 *     applyTravel; NPC engine passes ctx.traveledMiles).
 *   - Runs after reapDead — we read alive members for the HP nick.
 *   - Runs for both player and NPC (scope='all', NPC parity #298).
 *
 * Miles-delta seam: the player engine captures
 *   `const milesBeforeTravel = s.location.milesTraveled`
 *   before `applyTravel(s, rng)` and then computes
 *   `milesTraveledToday = s.location.milesTraveled - milesBeforeTravel`.
 *   This is passed through TickCtx.milesTraveledToday. Rest days pass 0.
 *   The NPC engine carries the same value in NpcTickContext.traveledMiles
 *   and maps it to TickCtx.milesTraveledToday in the POST_EVENT_TAIL_STEPS
 *   synth round-trip.
 */
export function applyClothingWear(state: GameState, ctx: TickCtx): GameState {
  let s = state;
  const miles = ctx.milesTraveledToday ?? 0;
  const terrain = s.location.terrain;
  const weather = s.weather;

  let garments = getClothingCondition(s);
  let footwear = getFootwearCondition(s);

  // 1. Abrasion (only on travel days with actual miles).
  if (miles > 0) {
    const terrainMult = TERRAIN_WEAR_MULT[terrain];
    garments -= GARMENT_WEAR_PER_MILE  * miles * terrainMult;
    footwear -= FOOTWEAR_WEAR_PER_MILE * miles * terrainMult;
  }

  // 2. Rot — flat, every day.
  garments -= GARMENT_ROT_PER_DAY;
  footwear -= FOOTWEAR_ROT_PER_DAY;

  // 3. Moisture spikes.
  //    Ford: flag set by actions/ford.ts, consumed here.
  //
  //    The damp daily penalty (MOISTURE_DAMP_DAILY_GARMENT) fires only if
  //    the clothes were ALREADY damp coming INTO this tick (flag was set
  //    before today). A same-day soak (ford/storm/rain) sets the flag for
  //    TOMORROW's damp-extra penalty — it does not also fire the daily extra
  //    on the same tick. This prevents double-counting: the initial soak
  //    spike IS the "got wet today" cost; the damp penalty is the "mold from
  //    staying wet overnight" cost that begins the next day.
  const wasAlreadyDamp = typeof s.flags._clothingDampSinceDay === 'number';

  const fordedToday = s.flags._fordedToday === true;
  if (fordedToday) {
    garments -= MOISTURE_FORD_GARMENT;
    footwear -= MOISTURE_FORD_FOOTWEAR;
    // Set the damp flag so mold continues until a clear day.
    s = {
      ...s,
      flags: { ...s.flags, _clothingDampSinceDay: s.day, _fordedToday: false }
    };
  } else if (weather === 'storm') {
    garments -= MOISTURE_STORM_GARMENT;
    footwear -= MOISTURE_STORM_FOOTWEAR;
    s = { ...s, flags: { ...s.flags, _clothingDampSinceDay: s.day } };
  } else if (weather === 'rain') {
    garments -= MOISTURE_RAIN_GARMENT;
    footwear -= MOISTURE_RAIN_FOOTWEAR;
    s = { ...s, flags: { ...s.flags, _clothingDampSinceDay: s.day } };
  } else if (weather === 'clear') {
    // Clear day — clothes can dry. Remove the damp flag.
    // wash_clothes clearing is wired in a later task (#1193);
    // the flag name is stable so that task just deletes it.
    const newFlags = { ...s.flags };
    delete (newFlags as Record<string, unknown>)['_clothingDampSinceDay'];
    s = { ...s, flags: newFlags };
  }

  // While-damp extra garment rot (mold) — only if already damp before this tick.
  if (wasAlreadyDamp) {
    garments -= MOISTURE_DAMP_DAILY_GARMENT;
  }

  // 4. Cold minor (frost / snow day).
  if (weather === 'frost' || weather === 'snow') {
    garments -= COLD_MINOR_GARMENT;
  }

  // Clamp both tracks.
  garments = clamp(garments);
  footwear = clamp(footwear);

  // Write the updated values back.
  s = {
    ...s,
    resources: {
      ...s.resources,
      clothingCondition: garments,
      footwearCondition: footwear
    }
  };

  // ---------------------------------------------------------------------------
  // Consequences
  // ---------------------------------------------------------------------------

  // Morale drag: garments < 25 → −1/day.
  if (garments < GARMENT_MORALE_DRAG_THRESHOLD) {
    s = { ...s, morale: Math.max(0, s.morale - GARMENT_MORALE_DRAG) };
  }

  // Footwear HP nick: ≤10 on rough terrain, −1 to all alive members.
  if (footwear <= FOOTWEAR_HALT_THRESHOLD && ROUGH_TERRAIN.has(terrain)) {
    s = {
      ...s,
      party: s.party.map((m) =>
        m.dead ? m : { ...m, health: Math.max(0, m.health - FOOTWEAR_HP_NICK) }
      )
    };
  }

  // ---------------------------------------------------------------------------
  // Threshold log lines (§6.3) — level-trigger, once per downward crossing.
  // ---------------------------------------------------------------------------

  // Garments 50: fire on first tick where garments ≤50; re-arm above 50.
  if (garments <= 50 && !s.flags[FLAG_GARMENT_50_FIRED]) {
    s = {
      ...s,
      flags: { ...s.flags, [FLAG_GARMENT_50_FIRED]: true },
      eventLog: [...s.eventLog, { day: s.day, text: LOG_GARMENT_50 }]
    };
  } else if (garments > 50 && s.flags[FLAG_GARMENT_50_FIRED]) {
    const cleared = { ...s.flags };
    delete (cleared as Record<string, unknown>)[FLAG_GARMENT_50_FIRED];
    s = { ...s, flags: cleared };
  }

  // Garments 25: fire on first tick where garments ≤25; re-arm above 25.
  if (garments <= 25 && !s.flags[FLAG_GARMENT_25_FIRED]) {
    s = {
      ...s,
      flags: { ...s.flags, [FLAG_GARMENT_25_FIRED]: true },
      eventLog: [...s.eventLog, { day: s.day, text: LOG_GARMENT_25 }]
    };
  } else if (garments > 25 && s.flags[FLAG_GARMENT_25_FIRED]) {
    const cleared = { ...s.flags };
    delete (cleared as Record<string, unknown>)[FLAG_GARMENT_25_FIRED];
    s = { ...s, flags: cleared };
  }

  // Footwear 25: fire on first tick where footwear ≤25; re-arm above 25.
  if (footwear <= 25 && !s.flags[FLAG_FOOTWEAR_25_FIRED]) {
    s = {
      ...s,
      flags: { ...s.flags, [FLAG_FOOTWEAR_25_FIRED]: true },
      eventLog: [...s.eventLog, { day: s.day, text: LOG_FOOTWEAR_25 }]
    };
  } else if (footwear > 25 && s.flags[FLAG_FOOTWEAR_25_FIRED]) {
    const cleared = { ...s.flags };
    delete (cleared as Record<string, unknown>)[FLAG_FOOTWEAR_25_FIRED];
    s = { ...s, flags: cleared };
  }

  return s;
}
