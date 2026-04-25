import type { GameState, Pace, Terrain } from '../types';
import type { Rng } from '../rng';
import { oxenSpeedFactor } from './oxen';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../content/landmarks';
import { getWagon } from '../content/wagons';
import { loadSpeedMult } from './load';
import { gatherFirewoodOnTravel } from './fire';

const PACE_BASE_MILES: Record<Pace, number> = {
  slow: 12,
  moderate: 18,
  fast: 24,
  grueling: 30
};

const TERRAIN_MULTIPLIER: Record<Terrain, number> = {
  prairie: 1.0,
  forest: 0.85,
  desert: 0.9,
  mountains: 0.55,
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

function runningMilesTo(id: string): number {
  let sum = 0;
  for (const l of LANDMARKS) {
    sum += l.milesFromPrevious;
    if (l.id === id) return sum;
  }
  return sum;
}

export function milesPerDay(state: GameState): number {
  const wagon = getWagon(state.wagon.model);
  const aliveTeam = state.oxen.filter((o) => o.health > 0);
  // Hard gate: under wagon's minTeam, the wagon simply can't be pulled.
  if (aliveTeam.length < wagon.minTeam) return 0;

  const base = PACE_BASE_MILES[state.pace];
  let terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const oxen = oxenSpeedFactor(state.oxen, wagon.optimalTeam);

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

  return Math.round(base * terrain * oxen * wagon.baseSpeedMult * teamSpeedMult * load * guideMult);
}

// Landmark kinds that halt travel when reached so the player can make a choice.
// Scenic landmarks just flavor-log and keep rolling.
const STOP_WORTHY_KINDS = new Set<string>(['trading_post', 'river', 'end']);

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

  const miles = milesPerDay(startState);
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
  }

  const nextLandmark = getLandmark(startState.location.nextLandmarkId);
  const targetMiles = runningMilesTo(nextLandmark.id);

  if (milesTraveled >= targetMiles) {
    const after = nextLandmarkAfter(nextLandmark.id);
    // Adopt the next leg's terrain — but river landmarks are decision waypoints,
    // not travel legs. Keep the current terrain instead when the next landmark is a river.
    const newTerrain = after?.kind === 'river' ? next.location.terrain : (after?.terrain ?? next.location.terrain);
    const stopHere = STOP_WORTHY_KINDS.has(nextLandmark.kind);

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
