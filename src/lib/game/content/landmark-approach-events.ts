import type { GameState } from '../types';
import type { GameEvent } from './events';

// Approach events fire BEFORE the party reaches a landmark — when a
// distant feature first becomes visible on the horizon. Period reality
// for Chimney Rock, Scotts Bluff, the Tetons, Mt. Hood, etc. was that
// the days-long slow approach was more memorable than the at-arrival
// moment; first-sight got its own diary entry. Pairs with the at-arrival
// event in landmark-arrival-events.ts.
//
// Each entry fires once per game (one-shot via `_approachFired_<id>`
// flag). Distinct from arrival events both in trigger (miles-out, not
// at-pass) and in content (anticipation, not vignette).

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

// #234 — Three Island Crossing decision. Period reality: at the Snake's
// gravel braid by the three islands, parties chose between fording north
// (riskier wet crossing, then easier going past Boise) or staying on the
// south bank through the Bruneau / Birds-of-Prey arid stretch (no river,
// but a 60-mile dry pull — alkali springs, sage, and sun). This vignette
// fires ~10 miles out so the player sets the route before reaching the
// braided gravel. Default: ford here. Detour: skip the river entirely
// via a flag that applyTravel reads, plus inline penalties representing
// the desert pull.
const threeIslandRouteChoice: GameEvent = {
  id: 'approach_three_island_routes',
  category: 'historical',
  title: 'The Snake — ford or skirt?',
  body: "The trail forks. North across the Snake at the three gravel islands — wet, swift, but the trail past Boise runs easy. Or you can stay south through the Bruneau, a sun-baked sixty miles of sage, alkali springs, and worn cattle. Diaries call it the Birds-of-Prey country. Pick before you hit the gravel.",
  weight: 1,
  choices: [
    {
      id: 'ford_north',
      icon: '🌊',
      label: 'Ford at Three Island',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        s,
        'Decided on the Three Island ford. The river is ahead.'
      )
    },
    {
      id: 'detour_south',
      icon: '🏜️',
      label: 'Skirt south through the Bruneau',
      silentLog: true,
      apply: (s) => {
        // Commit the route. The engine's stop-worthy check honors the
        // flag and walks past the river without parking.
        const flags = { ...s.flags, _threeIslandDetour: true };
        // Desert pull penalty applied at decision time, modeling the
        // ~60-mile waterless stretch.
        const water = Math.max(0, Math.floor(s.resources.water * 0.5));
        const oxen = s.oxen.map((o) =>
          o.health > 0 ? { ...o, fatigue: Math.min(100, (o.fatigue ?? 0) + 18) } : o
        );
        const morale = Math.max(0, s.morale - 4);
        return logLine(
          {
            ...s,
            flags,
            resources: { ...s.resources, water },
            oxen,
            morale
          },
          'Took the south-bank detour. Sage, sun, alkali. Water -50%, oxen worn, morale -4.'
        );
      }
    }
  ]
};

const chimneyRockFirstSight: GameEvent = {
  id: 'approach_chimney_rock',
  category: 'historical',
  title: 'A pale finger on the horizon',
  body: "Someone in the lead wagon points west. Far across the sage flats — barely a smudge above the heat haze — stands a thin spire of clay and stone. Chimney Rock. The trail's first famous landmark. You'll be days reaching it.",
  weight: 1,
  choices: [
    {
      id: 'press_on',
      label: 'Roll on — eyes on the road',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 2) },
        'First sight of Chimney Rock — still days away. Morale +2.'
      )
    },
    {
      id: 'journal',
      icon: '📓',
      label: 'Pause to mark it in the journal',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 4) },
        'Sketched the spire from 30 miles out — every diary on this trail will have it. Morale +4.'
      )
    }
  ]
};

interface ApproachEntry {
  /** Target landmark id — fires while approaching this landmark. */
  landmarkId: string;
  /** Miles-out threshold. Fires when remaining miles drops to this or below. */
  milesAway: number;
  event: GameEvent;
}

export const LANDMARK_APPROACH_EVENTS: readonly ApproachEntry[] = [
  { landmarkId: 'chimney_rock', milesAway: 30, event: chimneyRockFirstSight },
  { landmarkId: 'snake_three_island', milesAway: 10, event: threeIslandRouteChoice }
];

/** Per-landmark one-shot flag key. */
export function approachFiredFlag(landmarkId: string): string {
  return `_approachFired_${landmarkId}`;
}

/**
 * Returns the first approach event that should fire for the current
 * state — i.e. the player is within the miles-away threshold of the
 * target and the one-shot flag has not yet been set.
 */
export function pickApproachEvent(
  state: GameState,
  milesToLandmark: (id: string) => number
): ApproachEntry | undefined {
  for (const entry of LANDMARK_APPROACH_EVENTS) {
    if (state.flags[approachFiredFlag(entry.landmarkId)]) continue;
    const dist = milesToLandmark(entry.landmarkId);
    if (dist > 0 && dist <= entry.milesAway) {
      return entry;
    }
  }
  return undefined;
}
