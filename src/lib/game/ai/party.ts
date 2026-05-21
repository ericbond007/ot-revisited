// #303b — defaultCompanions + COMPANION_PRIORITY extracted from
// src/lib/dev/bot/runner.ts so future NPC wagon generation and
// encountered-train AI can share the same priority logic.

import type { ProfessionId } from '../types';

/** Priority order for default companion picks: the skilled
 *  professions that fill the most common survival gaps first.
 *  Doctor for disease, hunter for meat, teamster for the team,
 *  blacksmith for repairs, scout for navigation. */
export const COMPANION_PRIORITY: ProfessionId[] = ['doctor', 'hunter', 'teamster', 'blacksmith', 'scout'];

/** Pick default companion professions for a party of `partySize`
 *  led by `leader`. Walks the priority list skipping the leader's
 *  own profession; pads with farmer (generic able-body) if the
 *  priority list runs short of the requested count.
 *  Clamps partySize to [1, 6] so companion count stays in [0, 5]. */
export function defaultCompanions(partySize: number, leader: ProfessionId): ProfessionId[] {
  const want = Math.max(0, Math.min(5, partySize - 1));
  const picks: ProfessionId[] = [];
  for (const p of COMPANION_PRIORITY) {
    if (picks.length >= want) break;
    if (p !== leader) picks.push(p);
  }
  while (picks.length < want) picks.push('farmer');
  return picks;
}
