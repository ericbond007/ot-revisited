// #1388 T1 — Seasonal river depth helper. Engine and persona read one
// helper so depth signals are consistent: the same June snowmelt that
// kills a naive ford also tells the cautious persona to pay the ferry.
//
// Period anchor: Bear River crossing (#1144) and emigrant diary records
// show May–mid-June crossings as the most treacherous of the trail
// year — snowmelt from the Rockies and Sierra Nevada peaks in early
// June, then recedes through July. By August the Snake and Bear River
// tributaries are summer trickles the guides called "ankles-wet" fords.
// Tamsen Donner's diary (June 1846, Green River): "swollen with
// snowmelt — the ferryman said twice the depth of ordinary season."
// October sees a modest autumn rise from early-Sierra snowpack but
// nothing approaching the spring peak.

import type { GameDate } from '../types';
import type { Weather } from '../types';

// --- Seasonal multipliers (month-indexed) ---
// Named constants: the magnitude is calibrated to diary accounts.
// A 3-ft July crossing (the landmark base) becomes 4.2 ft in May
// (×1.4) and 2.25 ft in August (×0.75).

/** May and early June (month 5, first half of month 6): Rocky Mountain
 *  snowmelt peak. Frizzell 1852 / Donner 1846 — "the river twice its
 *  ordinary depth." Wide fords across the Kansas, Big Blue, Platte,
 *  and Green ran 4–5 ft where they ran 2–3 in July. */
const SNOWMELT_PEAK_MULT = 1.4;

/** Late June (second half of month 6): snowmelt ebbing but still
 *  elevated. Guides advised haste; Bryant 1846 (Green River, 22 June):
 *  "still high, but the ferry managed it." */
const SNOWMELT_LATE_MULT = 1.2;

/** July: shoulder season. Snowmelt done, summer baseflow. Most diary
 *  accounts describe crossings as "ordinary" or "knee-deep." Baseline. */
const JULY_MULT = 1.0;

/** August–September: late-summer trickle. Marcy 1859: "August
 *  crossings are the easiest of the year — the stock can drink while
 *  pulling through." Platte fords that drowned wagons in June are
 *  "ankles-wet" by August. Bear River #1144 research table confirms
 *  the same pattern for the Fort Hall corridor. */
const LATE_SUMMER_MULT = 0.75;

/** October: early-season snowpack starts the rivers rising again,
 *  though nowhere near the spring peak. A modest uptick from summer.
 *  Parties this late on the trail faced rising mountain crossings
 *  (Columbia corridor, Sierra) and heavier currents. */
const EARLY_AUTUMN_MULT = 0.85;

/** All other months (Nov–Apr): winter/spring, highly variable —
 *  some rivers freeze (reducing effective depth), others flood. We
 *  use 1.0 (nominal) as the fallback; this period rarely appears in
 *  play because the trail's travel window is Apr–Oct. */
const OTHER_MONTHS_MULT = 1.0;

// Mid-month split for June: the calendar day at which we transition
// from peak snowmelt to the late-June ebb. Historically the crest
// passed the trail fords around June 15–18.
const JUNE_PEAK_DAY_CUTOFF = 15;

/** Rain bump: recent precipitation raises river levels. Period: the
 *  ferrymen would say "the river's up a foot from last night's
 *  storm." +15% when today's weather is rain or storm. This is a
 *  same-day surface indicator — the model doesn't track antecedent
 *  moisture — so it understates multi-day rain events but preserves
 *  simplicity and signal-honesty. */
const RAIN_BUMP = 0.15;

/** Compute the effective river depth given the static landmark depth,
 *  the current calendar date, and today's weather. Both the ford()
 *  engine and every persona's pickFordMethod consume this helper so
 *  they always read the same water.
 *
 *  @param river  The river's static config (depthFt from landmarks.ts).
 *  @param date   Current GameDate — month + day drive the seasonal term.
 *  @param weather Today's weather — rain/storm triggers the rain bump.
 *  @returns      Effective depth in feet (always > 0). */
export function effectiveRiverDepth(
  river: { depthFt: number },
  date: GameDate,
  weather: Weather | undefined
): number {
  const { month, day } = date;

  let seasonMult: number;
  if (month === 5) {
    // May: full snowmelt peak
    seasonMult = SNOWMELT_PEAK_MULT;
  } else if (month === 6) {
    // June: peak for the first half, late-ebb for the second half
    seasonMult = day <= JUNE_PEAK_DAY_CUTOFF ? SNOWMELT_PEAK_MULT : SNOWMELT_LATE_MULT;
  } else if (month === 7) {
    // July: ordinary summer baseflow
    seasonMult = JULY_MULT;
  } else if (month === 8 || month === 9) {
    // August–September: late-summer trickle
    seasonMult = LATE_SUMMER_MULT;
  } else if (month === 10) {
    // October: early-autumn rise
    seasonMult = EARLY_AUTUMN_MULT;
  } else {
    // November–April: nominal; trail rarely runs in these months
    seasonMult = OTHER_MONTHS_MULT;
  }

  const rainMult = (weather === 'rain' || weather === 'storm') ? 1 + RAIN_BUMP : 1.0;

  return river.depthFt * seasonMult * rainMult;
}
