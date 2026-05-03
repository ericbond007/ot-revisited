import type { GameState, Pace, Terrain } from '../types';
import type { Rng } from '../rng';
import { oxenSpeedFactorFor } from './oxen';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../content/landmarks';
import { getWagon } from '../content/wagons';
import { loadSpeedMult } from './load';
import { gatherFirewoodOnTravel } from './fire';
import { applyAxleGrease } from './wagon';
import { rollStrayMorning } from './strays';
import { hasLiveScout } from '../professions/predicates';
import { weatherTravelMult } from './weather';

// Base mileage per pace, before terrain / oxen / weather modifiers.
// Calibrated against the #119 audit: with these values + the (c) terrain
// reclass, a moderate-pace journey lands at ~150 days realistic — the
// historical median for an Oregon Trail wagon (1843–1869, range
// 120–180 days, "took four to six months" was the proverb).
//
// Slow: ~200-day cautious slog. Moderate: ~150-day median. Fast: ~120-day
// hard push. Grueling: ~95-day record-pace try.
const PACE_BASE_MILES: Record<Pace, number> = {
  slow: 14,
  moderate: 20,
  fast: 26,
  grueling: 32
};

// Travel-day multipliers per terrain. Real-world wagons did roughly
// 8-12 mi/day in true mountains vs 15-18 on plains — a 0.55-0.70 ratio.
// We sit at 0.65 (mid-range), paired with the #119 audit landmark
// reclass that pulled the broad sage flats post-South Pass out of the
// 'mountains' bucket and left only the actual climbs (Devil's Gate,
// Blue Mountains).
const TERRAIN_MULTIPLIER: Record<Terrain, number> = {
  prairie: 1.0,
  forest: 0.85,
  desert: 0.9,
  mountains: 0.65,
  river: 0.0
};

// Mules do better on rough terrain than oxen — surer-footed, lighter
// on descents. Applied as a per-terrain multiplier on top of the base
// terrain modifier when the team is all mules. Mixed teams average.
const MULE_TERRAIN_BONUS: Partial<Record<Terrain, number>> = {
  mountains: 1.25,
  forest: 1.10,
  desert: 1.05
};

// Speed bonus per mule vs ox in the team. Historical rule of thumb
// was "mules move ~25% faster than oxen". We apply it as a fraction
// of the team ratio so a mixed team scales linearly.
const MULE_SPEED_BONUS = 0.25;

export function runningMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  return sum;
}

// Trail miles from the party's current position to a future landmark.
// Returns a negative number if the landmark has already been passed,
// and -1 if the id is unknown.
export function milesToLandmark(state: GameState, landmarkId: string): number {
  let running = 0;
  for (const l of LANDMARKS) {
    running += l.milesFromPrevious;
    if (l.id === landmarkId) {
      return running - state.location.milesTraveled;
    }
  }
  return -1;
}

export function milesPerDay(state: GameState): number {
  const wagon = getWagon(state.wagon.model);
  const aliveTeam = state.oxen.filter((o) => o.health > 0);
  // Hard gate: under wagon's minTeam, the wagon simply can't be pulled.
  if (aliveTeam.length < wagon.minTeam) return 0;

  // #176 — while in a wagon train, pace is clamped to moderate. The
  // train moves at the slowest member's pace, so 'fast' / 'grueling'
  // selections silently downgrade. The trade is the safety net
  // (services, share-watch, morale +1/day).
  const effectivePace = state.wagonTrain
    && (state.pace === 'fast' || state.pace === 'grueling')
    ? 'moderate'
    : state.pace;
  const base = PACE_BASE_MILES[effectivePace];
  let terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const oxen = oxenSpeedFactorFor(state);

  // Team-kind multiplier. Mule ratio scales both the speed bonus and
  // the terrain bonus (so a pure mule team gets full mountain grip,
  // a half-mule team gets half, an all-ox team gets none).
  const muleCount = aliveTeam.filter((a) => a.kind === 'mule').length;
  const muleRatio = aliveTeam.length > 0 ? muleCount / aliveTeam.length : 0;
  const teamSpeedMult = 1 + MULE_SPEED_BONUS * muleRatio;
  const terrainBonus = MULE_TERRAIN_BONUS[state.location.terrain];
  if (terrainBonus !== undefined && muleRatio > 0) {
    // Lerp between base terrain and mule-adjusted terrain by mule ratio.
    terrain = terrain + (terrain * terrainBonus - terrain) * muleRatio;
  }

  const load = loadSpeedMult(state);

  // Hired-guide bonus (#152) — +15% travel speed while the guide
  // window is open. Set by hireGuide() at hub posts.
  const guideUntil = (state.flags._guideUntilDay as number | undefined) ?? 0;
  const guideMult = guideUntil > state.day ? 1.15 : 1.0;

  // Scout profession (#154) — knows the country, picks shortcuts.
  // +8% travel speed while alive in the party.
  const scoutMult = hasLiveScout(state) ? 1.08 : 1.0;

  // Weather (#153) — storm and snow seriously slow the wagon; rain,
  // heat, and fog moderately so. Set by tickWeather earlier in the
  // pipeline.
  const weatherMult = weatherTravelMult(state.weather);

  // Milk cow drag (#139) — a tethered cow walks behind the wagon,
  // grazing as it goes. -5% per cow, capped at -10%. Period reality:
  // cow forces stops to nurse calves and graze; the wagon paces to
  // her rather than the other way around.
  const cows = state.inventory.milk_cow ?? 0;
  const cowMult = Math.max(0.90, 1 - 0.05 * cows);

  return Math.round(base * terrain * oxen * wagon.baseSpeedMult * teamSpeedMult * load * guideMult * scoutMult * weatherMult * cowMult);
}

// Landmark kinds that halt travel when reached so the player can make a choice.
// Scenic landmarks just flavor-log and keep rolling.
const STOP_WORTHY_KINDS = new Set<string>(['trading_post', 'river', 'end']);

// Detour flags that bypass an otherwise-stop-worthy landmark — the
// player committed to a strategic route in an earlier choice and the
// landmark is being walked past, not visited. Centralized here so #235
// (Barlow Road vs Columbia raft) and any future bypass plug in the
// same way.
function isBypassed(state: GameState, landmarkId: string): boolean {
  if (landmarkId === 'snake_three_island' && state.flags._threeIslandDetour) return true;
  // #235 — Columbia raft skips barlow_road + laurel_hill entirely; the
  // raft event re-anchors milesTraveled past them, so any cascade arrival
  // through them shouldn't park.
  if (state.flags._columbiaRaft && (landmarkId === 'barlow_road' || landmarkId === 'laurel_hill')) {
    return true;
  }
  // #240 — Sublette Cutoff bypasses Fort Bridger. The cutoff itself
  // doesn't compress miles in the model; the trade-off is the dry-stretch
  // penalty applied at decision time vs. losing the resupply / repair stop.
  if (landmarkId === 'ft_bridger' && state.flags._subletteCutoff) return true;
  return false;
}

export function applyTravel(state: GameState, rng: Rng): GameState {
  if (state.completed) return state;

  // If we were parked at a landmark from a previous day, "depart" before moving.
  let startState = state;
  if (state.location.atLandmarkId) {
    startState = {
      ...state,
      location: { ...state.location, atLandmarkId: null }
    };
  }

  // Stray-oxen morning roll (#221) — runs BEFORE distance is computed
  // so the multiplier lands on actual miles. May mutate state via a
  // rare permanent ox loss.
  const strayResult = rollStrayMorning(startState, rng);
  startState = strayResult.state;
  if (strayResult.logLine) {
    startState = {
      ...startState,
      eventLog: [...startState.eventLog, { day: startState.day, text: strayResult.logLine }]
    };
  }

  const miles = Math.round(milesPerDay(startState) * strayResult.milesMult);
  const milesTraveled = startState.location.milesTraveled + miles;

  let next: GameState = {
    ...startState,
    location: { ...startState.location, milesTraveled }
  };
  // Passive firewood gather on any day that actually moved. Terrain
  // sets the mean — cottonwood groves by rivers, sage + chips on the
  // plains, scarce fuel in the desert.
  if (miles > 0) {
    next = gatherFirewoodOnTravel(next, rng);
    next = applyAxleGrease(next, miles);
  }

  const nextLandmark = getLandmark(startState.location.nextLandmarkId);
  const targetMiles = runningMilesTo(nextLandmark.id);

  if (milesTraveled >= targetMiles) {
    const after = nextLandmarkAfter(nextLandmark.id);
    // Adopt the next leg's terrain — but river landmarks are decision waypoints,
    // not travel legs. Keep the current terrain instead when the next landmark is a river.
    const newTerrain = after?.kind === 'river' ? next.location.terrain : (after?.terrain ?? next.location.terrain);
    const stopHere = STOP_WORTHY_KINDS.has(nextLandmark.kind) && !isBypassed(startState, nextLandmark.id);

    next = {
      ...next,
      location: {
        ...next.location,
        previousLandmarkId: nextLandmark.id,
        nextLandmarkId: after?.id ?? nextLandmark.id,
        terrain: newTerrain,
        atLandmarkId: stopHere ? nextLandmark.id : null
      },
      // Scenic landmarks get a flavor line here. Stop-worthy landmarks defer
      // their log entry to the travel loop, which combines arrival with the
      // days/miles summary into one readable line.
      eventLog: stopHere
        ? next.eventLog
        : [...next.eventLog, { day: state.day, text: `Passed ${nextLandmark.name}.` }],
      completed: after === null ? true : next.completed,
      outcome: after === null ? 'arrived' : next.outcome
    };
  }

  return next;
}
