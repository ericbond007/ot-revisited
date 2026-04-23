import type { GameState, Pace, Terrain } from '../types';
import type { Rng } from '../rng';
import { oxenSpeedFactor } from './oxen';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../content/landmarks';
import { getWagon } from '../content/wagons';
import { loadSpeedMult } from './load';

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
  const aliveOxen = state.oxen.filter((o) => o.health > 0).length;
  // Hard gate: under wagon's minTeam, the wagon simply can't be pulled.
  if (aliveOxen < wagon.minTeam) return 0;

  const base = PACE_BASE_MILES[state.pace];
  const terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const oxen = oxenSpeedFactor(state.oxen, wagon.optimalTeam);
  const load = loadSpeedMult(state);
  return Math.round(base * terrain * oxen * wagon.baseSpeedMult * load);
}

// Landmark kinds that halt travel when reached so the player can make a choice.
// Scenic landmarks just flavor-log and keep rolling.
const STOP_WORTHY_KINDS = new Set<string>(['trading_post', 'river', 'end']);

export function applyTravel(state: GameState, _rng: Rng): GameState {
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
