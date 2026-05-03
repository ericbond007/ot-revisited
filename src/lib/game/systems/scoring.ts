// End-of-run scoring (#148) + #277 frontier-startup epilogue paragraphs.
// The number that goes on the headstone or the arrival cert. Game has
// no leaderboard yet — this is just for the player's "how did I do"
// reckoning.
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
// #277 added a parallel `epilogueLines` array — one paragraph per
// delivered frontier-startup item, surfaced on the arrival screen as
// the "what those choices became" view. Buyer's remorse for jettisons
// is the gameplay framing.

import type { GameState } from '../types';

/** Per-item prestige points awarded on arrival in Oregon City.
 *  Scores grounded in `docs/historical-pass/07-frontier-startups.md`
 *  case studies (Luelling 1847 trees, Hill 1850 anvil, Hancock 1852
 *  carpenter chest, Brannan 1849 press). */
export const LUXURY_POINTS: Record<string, number> = {
  // Headline hauls — the "single wagon built a town" tier.
  printing_press: 2500,
  fruit_tree_saplings: 1500,
  anvil: 1500,
  medicine_chest: 1200,
  grandfather_clock: 1000,
  carpenter_chest: 1000,
  // Mid-tier — useful on arrival, story-worthy.
  seed_grain: 800,
  trade_inventory: 700,
  plow: 600,
  iron_strongbox: 500,
  silver_tea_service: 500,
  surveying_kit: 400,
  shelf_clock: 400,
  fruit_vine_cuttings: 400,
  china_tea_set: 400,
  // Smaller hauls — flavor + small score.
  medical_books: 300,
  feather_mattress: 300,
  sewing_chest: 300,
  garden_seeds: 200,
  gold_scales: 200,
  family_bible: 200,
  lap_desk: 150,
  daguerreotype_case: 100,
  feather_pillows: 100,
  // Existing trail-comfort items kept at their original (smaller)
  // scores — they're trail-flavor more than frontier-startup.
  fiddle: 50,
  bible: 30,
  buffalo_robe: 25,
  harmonica: 20
};

/** #277 epilogue paragraphs surfaced on the arrival screen. One short
 *  paragraph per delivered item — "what your choice became." Only the
 *  *first* unit triggers the paragraph; bringing two anvils doesn't
 *  read the same line twice. Period grounding in `docs/historical-pass/07-frontier-startups.md`. */
export const EPILOGUE_LINES: Record<string, string> = {
  // Farmer's haul
  seed_grain: "First wheat in the valley. Your bread was on every table by Christmas.",
  fruit_tree_saplings: "Your orchard at the bend of the river is locally famous. The apples are sweeter than any from back east — Luelling himself stopped by to talk grafts.",
  garden_seeds: "Your wife's garden out-produced everyone's. Cabbages the size of a baby's head.",
  plow: "Broke the prairie sod with the same plow that turned your father's Iowa fields.",
  fruit_vine_cuttings: "Your grapes made the territory's first wine. The hop yard supplied every brewery from Salem to Astoria.",
  // Carpenter's haul
  carpenter_chest: "Built half the buildings on your block before the snow. Cash wages were rare; you took payment in beef, milk, and labor swaps. By spring you owned the sawmill.",
  // Doctor's haul
  medicine_chest: "Your fitted chest from Cincinnati saw you through three winters of typhus, measles, and ague. Half the children in the territory are alive because of it.",
  medical_books: "Your copy of *Gunn's Domestic Medicine* is the most-borrowed book in the county. The margin notes are passed down with the volume itself.",
  // Banker's / merchant's haul
  iron_strongbox: "Your strongbox held the assayer's gold dust through the '49 rush. By '52 you owned the bank.",
  gold_scales: "Apothecary's brass scales, calibrated to the grain. After Sutter's strike they paid for themselves in a week.",
  trade_inventory: "Opened the first store on the river. Within a year, half the territory's calico passed through your hands.",
  printing_press: "The territory's first newspaper rolled off your press. They called you 'the editor' before they called you anything else.",
  // Cross-cutting
  surveying_kit: "Filed Donation Land Claims for half your township. Every fence line in the county follows your survey notes.",
  // Heirlooms
  family_bible: "Three generations of births recorded in the front. Reads aloud at every christening from here to the coast.",
  silver_tea_service: "Set out for company every Sunday. Your wedding gift from Boston outlived three governors.",
  shelf_clock: "Tick-tock in the parlor while the snow falls outside.",
  feather_pillows: "Pairs with the mattress. The first soft sleep your children ever remember.",
  sewing_chest: "Made every shirt, dress, and wagon-canvas patch your family ever wore.",
  daguerreotype_case: "The only picture of your mother that survived the trip. Kept on the mantel in the parlor.",
  lap_desk: "Wrote home every Sunday. Your letters are in the Oregon Historical Society now.",
  // Already-in-catalog comfort items (trail-flavor → arrival flavor)
  grandfather_clock: "Stands in the parlor of your Oregon City house. Chimes have been heard at every wedding and funeral on the block.",
  anvil: "The only forge in three counties. At $3 per ox-shoe, you out-earned the lawyers — and bought the saloon next door by '54.",
  china_tea_set: "Survived 2000 miles of jolting. Now poured at every Oregon City social call worth attending.",
  feather_mattress: "The first soft sleep your wife had since Missouri.",
  fiddle: "Saturday-night dances at your barn become legend within a year.",
  bible: "Read aloud at every christening, wedding, and funeral the family attends.",
  harmonica: "Played at every campfire and parlor gathering — small, but it carried home.",
  buffalo_robe: "Hangs by the door, dust dappled. Reminds the children of the high plains every winter."
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
  /** #277 — one paragraph per delivered frontier-startup item, ordered
   *  by point value descending (biggest haul gets the lead paragraph).
   *  Empty when the run didn't arrive. */
  epilogueLines: Array<{ id: string; line: string }>;
}

export function score(state: GameState): ScoreBreakdown {
  const arrived = state.outcome === 'arrived';
  const miles = Math.round(state.location.milesTraveled);
  const aliveCount = state.party.filter((m) => !m.dead).length;
  const survivors = aliveCount * SURVIVOR_POINTS;
  const arrival = arrived ? ARRIVAL_BONUS : 0;

  const luxuryItems: ScoreBreakdown['luxuryItems'] = [];
  const epilogueLines: ScoreBreakdown['epilogueLines'] = [];
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
    for (const lux of luxuryItems) {
      const line = EPILOGUE_LINES[lux.id];
      if (line) epilogueLines.push({ id: lux.id, line });
    }
  }

  return {
    miles,
    survivors,
    arrival,
    luxuries,
    total: miles + survivors + arrival + luxuries,
    luxuryItems,
    epilogueLines
  };
}
