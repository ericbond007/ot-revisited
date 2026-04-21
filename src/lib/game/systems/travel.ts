import type { GameState, Pace, Terrain } from '../types';
import type { Rng } from '../rng';
import { oxenSpeedFactor } from './oxen';
import { LANDMARKS, getLandmark, nextLandmarkAfter } from '../content/landmarks';

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
  const aliveOxen = state.oxen.filter((o) => o.health > 0).length;
  if (aliveOxen < 2) return 0;
  const base = PACE_BASE_MILES[state.pace];
  const terrain = TERRAIN_MULTIPLIER[state.location.terrain];
  const oxen = oxenSpeedFactor(state.oxen);
  return Math.round(base * terrain * oxen);
}

export function applyTravel(state: GameState, _rng: Rng): GameState {
  if (state.completed) return state;

  const miles = milesPerDay(state);
  const milesTraveled = state.location.milesTraveled + miles;

  let next = {
    ...state,
    location: { ...state.location, milesTraveled }
  };

  const nextLandmark = getLandmark(state.location.nextLandmarkId);
  const targetMiles = runningMilesTo(nextLandmark.id);

  if (milesTraveled >= targetMiles) {
    const after = nextLandmarkAfter(nextLandmark.id);
    const prevId = state.location.previousLandmarkId ?? 'independence';
    next = {
      ...next,
      location: {
        ...next.location,
        previousLandmarkId: prevId,
        nextLandmarkId: after?.id ?? nextLandmark.id,
        terrain: after?.terrain ?? next.location.terrain
      },
      eventLog: [
        ...next.eventLog,
        { day: state.day, text: `Reached ${nextLandmark.name}.` }
      ],
      completed: after === null ? true : next.completed,
      outcome: after === null ? 'arrived' : next.outcome
    };
  }

  return next;
}
