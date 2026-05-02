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
  { landmarkId: 'chimney_rock', milesAway: 30, event: chimneyRockFirstSight }
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
