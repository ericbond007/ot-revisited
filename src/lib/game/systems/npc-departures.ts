// #290 — Wagon-train morale + departures. Period reality: train
// fissioning was extremely common, not rare. Joel Palmer 1845
// documented it as the standard outcome of any pace dispute; Bryant
// 1846's Russell Party had multiple secessions over rules and
// pacing; Helen Carpenter (1857) describes "the malcontent half"
// leaving at Independence Rock to form their own train; the Donner
// Party itself was a splinter from the Russell Party that split
// AGAIN before disaster.
//
// Mechanics: each tick, low-morale companion wagons (<30) roll for a
// departure. Outcomes weighted: leave alone (50%), take a faction
// with them (30%), turn back to Independence (20%). Charisma — for
// #290 phase 1, a preacher-led wagon in the train damps split rolls
// (faith holds the train together). #285 captain charisma replaces
// this with a richer model later.

import type { Rng } from '../rng';
import type { GameState, NpcWagonState } from '../types';
import { hasLivePreacher } from '../professions/predicates';

/** Morale floor below which a wagon may leave. Above this, even
 *  unhappy wagons grumble but stay. */
const DEPARTURE_MORALE_THRESHOLD = 30;

/** Cap on departure probability — a totally miserable wagon
 *  (morale 0) caps at 10%/day. Below the threshold, probability
 *  scales linearly. */
const MAX_DEPARTURE_CHANCE = 0.10;

/** Charisma damper — halves the roll when a preacher (player or
 *  companion) is keeping the train together. */
const PREACHER_DAMPER = 0.5;

/** Faction recruitment: how unhappy a peer wagon must be to join the
 *  splitter. Slightly above the splitter's threshold so the dynamic
 *  reads as "the discontented cluster." */
const FACTION_MORALE_THRESHOLD = 45;

export interface DepartureResult {
  state: GameState;
  /** Player-visible log lines describing what happened. */
  playerLogs: string[];
}

function departureChance(morale: number): number {
  if (morale >= DEPARTURE_MORALE_THRESHOLD) return 0;
  // Linear: morale=30 → 0%, morale=0 → MAX
  return MAX_DEPARTURE_CHANCE * (1 - morale / DEPARTURE_MORALE_THRESHOLD);
}

function isPreacherLed(state: GameState): boolean {
  if (hasLivePreacher(state)) return true;
  if (!state.wagonTrain) return false;
  return state.wagonTrain.companions.some(
    (c) => c.outcome === 'in-progress' && c.leaderProfession === 'preacher'
  );
}

/** Pick a faction of fellow malcontents to leave with the splitter.
 *  Only applies to wagons with morale below FACTION_MORALE_THRESHOLD
 *  who are also still active. Capped at 3 to keep individual splits
 *  from gutting the train in a single tick. */
function recruitFaction(
  companions: NpcWagonState[],
  splitterIdx: number
): number[] {
  const faction = [splitterIdx];
  for (let i = 0; i < companions.length && faction.length < 4; i++) {
    if (i === splitterIdx) continue;
    const c = companions[i];
    if (c.outcome !== 'in-progress') continue;
    if (c.morale >= FACTION_MORALE_THRESHOLD) continue;
    faction.push(i);
  }
  return faction;
}

/** Format a list of wagon names as natural English: "the X", "the X
 *  and the Y", "the X, the Y, and the Z". */
function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/** Process departures for one tick. Iterates companions, rolls for
 *  each low-morale wagon. At most one departure event per tick — the
 *  splitter may take a faction with them, but two unrelated splits
 *  on the same day would read as noise. */
export function processDepartures(
  state: GameState,
  rng: Rng
): DepartureResult {
  if (!state.wagonTrain) return { state, playerLogs: [] };

  const damper = isPreacherLed(state) ? PREACHER_DAMPER : 1.0;
  const companions = state.wagonTrain.companions;

  // Find first wagon that rolls a departure this tick.
  let splitterIdx = -1;
  for (let i = 0; i < companions.length; i++) {
    const c = companions[i];
    if (c.outcome !== 'in-progress') continue;
    const baseChance = departureChance(c.morale);
    if (baseChance <= 0) continue;
    if (rng.chance(baseChance * damper)) {
      splitterIdx = i;
      break;
    }
  }

  if (splitterIdx === -1) return { state, playerLogs: [] };

  // Pick the departure flavor.
  const outcomeRoll = rng.next();
  const flavor: 'alone' | 'faction' | 'turn_back' =
    outcomeRoll < 0.5 ? 'alone'
    : outcomeRoll < 0.8 ? 'faction'
    : 'turn_back';

  const departing = flavor === 'faction'
    ? recruitFaction(companions, splitterIdx)
    : [splitterIdx];
  const departingSet = new Set(departing);
  const departingNames = departing.map((i) => companions[i].name);
  const remaining = companions.filter((_, i) => !departingSet.has(i));

  let logText: string;
  switch (flavor) {
    case 'alone':
      logText = `${companions[splitterIdx].name} split off from the train at the next halt — they'll find their own way west.`;
      break;
    case 'faction':
      if (departingNames.length === 1) {
        logText = `${companions[splitterIdx].name} split off from the train.`;
      } else {
        logText = `${joinNames(departingNames)} broke off and formed their own company. The malcontents went their own way.`;
      }
      break;
    case 'turn_back':
      logText = `${companions[splitterIdx].name} turned back east — they'd had enough of the trail.`;
      break;
  }

  const next: GameState = {
    ...state,
    wagonTrain: { ...state.wagonTrain, companions: remaining },
    eventLog: [...state.eventLog, { day: state.day, text: logText }]
  };
  // If everyone has left, dissolve the train entirely — the player
  // is solo from here on.
  if (remaining.length === 0) {
    return {
      state: { ...next, wagonTrain: null },
      playerLogs: [logText, 'The train has dissolved. You travel alone now.']
    };
  }
  return { state: next, playerLogs: [logText] };
}

// Re-export constants for tests + future tuning.
export {
  DEPARTURE_MORALE_THRESHOLD,
  MAX_DEPARTURE_CHANCE,
  FACTION_MORALE_THRESHOLD
};
