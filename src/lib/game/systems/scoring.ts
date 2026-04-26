// End-of-run scoring (#148). The number that goes on the headstone or
// the arrival cert. Game has no leaderboard yet — this is just for the
// player's "how did I do" reckoning.
//
// Formula:
//   base       = miles traveled (capped at trail length)
//   survivors  = +200 per surviving party member
//   arrival    = +1000 if outcome === 'arrived' (you have to *finish*)
//   luxuries   = sum of per-item prestige points × quantity, ONLY if
//                you arrived (you have to *deliver* the haul)
//
// Final = base + survivors + arrival + luxuries.
//
// The grandfather clock is the headline luxury — historically the meme
// item every Oregon Trail player remembers hauling. 1000 pts of bonus
// for delivering one to Oregon City makes it a legitimate win condition
// of its own.

import type { GameState } from '../types';

/** Per-item prestige points awarded on arrival in Oregon City. */
export const LUXURY_POINTS: Record<string, number> = {
  grandfather_clock: 1000,
  fiddle: 50,
  bible: 30,
  harmonica: 20,
  whiskey: 5,
  tobacco: 5,
  buffalo_robe: 25
};

const SURVIVOR_POINTS = 200;
const ARRIVAL_BONUS = 1000;

export interface ScoreBreakdown {
  miles: number;
  survivors: number;
  arrival: number;
  luxuries: number;
  total: number;
  /** Per-luxury contributions for surfacing on the end screen. */
  luxuryItems: Array<{ id: string; name: string; qty: number; points: number }>;
}

export function score(state: GameState): ScoreBreakdown {
  const arrived = state.outcome === 'arrived';
  const miles = Math.round(state.location.milesTraveled);
  const aliveCount = state.party.filter((m) => !m.dead).length;
  const survivors = aliveCount * SURVIVOR_POINTS;
  const arrival = arrived ? ARRIVAL_BONUS : 0;

  const luxuryItems: ScoreBreakdown['luxuryItems'] = [];
  let luxuries = 0;
  if (arrived) {
    for (const [id, ptsPerUnit] of Object.entries(LUXURY_POINTS)) {
      const qty = state.inventory[id] ?? 0;
      if (qty <= 0) continue;
      const pts = qty * ptsPerUnit;
      luxuries += pts;
      luxuryItems.push({ id, name: id.replace(/_/g, ' '), qty, points: pts });
    }
    luxuryItems.sort((a, b) => b.points - a.points);
  }

  return {
    miles,
    survivors,
    arrival,
    luxuries,
    total: miles + survivors + arrival + luxuries,
    luxuryItems
  };
}
