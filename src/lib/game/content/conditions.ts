import type { ConditionId, ItemId } from '../types';

export interface ConditionMeta {
  id: ConditionId;
  name: string;
  dailyHealthDelta: number;
  dailyMoraleDelta?: number;
  immediateDamage?: number;
  contagious?: boolean;
  resolvedByItems?: ItemId[];
  treatmentItems?: ItemId[];
  /** #1046 D — natural-course duration model (spec §7). Once
   *  daysSinceOnset >= minCourseDays, a daily resolve roll rises with
   *  duration toward naturalCourseDays, scaled by care (see
   *  systems/conditions.ts). Absent => never spontaneously resolves
   *  (scurvy = item-only; starvation/pox = markers). Starting values;
   *  slice-5 sweep-tuned. */
  naturalCourseDays?: number;
  minCourseDays?: number;
}

export const CONDITIONS: Record<ConditionId, ConditionMeta> = {
  // #161 — disease damage rebalance per May-12 audit. The original
  // rates (cholera -10/day, typhoid -5) made conditions un-survivable
  // without near-perfect treatment access, which drove the bot's
  // rest-loop and kept arrival % at 0. New rates keep cholera as the
  // most dangerous (~3× dysentery) but allow a fed/watered party with
  // 2-3 days of rest to recover.
  cholera: {
    id: 'cholera',
    name: 'Cholera',
    dailyHealthDelta: -7,
    contagious: true,
    treatmentItems: ['quinine', 'dovers_powder', 'camphor'],
    naturalCourseDays: 5,
    minCourseDays: 2
  },
  dysentery: {
    id: 'dysentery',
    name: 'Dysentery',
    dailyHealthDelta: -3,
    treatmentItems: ['calomel', 'epsom_salts', 'paregoric', 'castor_oil'],
    naturalCourseDays: 8,
    minCourseDays: 3
  },
  typhoid: {
    id: 'typhoid',
    name: 'Typhoid',
    dailyHealthDelta: -4,
    contagious: true,
    treatmentItems: ['quinine', 'dovers_powder'],
    naturalCourseDays: 14,
    minCourseDays: 5
  },
  measles: {
    id: 'measles',
    name: 'Measles',
    dailyHealthDelta: -3,
    contagious: true,
    treatmentItems: ['dovers_powder'],
    naturalCourseDays: 10,
    minCourseDays: 4
  },
  exhaustion: {
    id: 'exhaustion',
    name: 'Exhaustion',
    dailyHealthDelta: -2,
    dailyMoraleDelta: -1,
    naturalCourseDays: 3,
    minCourseDays: 1
  },
  broken_leg: {
    id: 'broken_leg',
    name: 'Broken Leg',
    dailyHealthDelta: -1,
    treatmentItems: ['bandages', 'laudanum'],
    naturalCourseDays: 30,
    minCourseDays: 14
  },
  snakebite: {
    id: 'snakebite',
    name: 'Snakebite',
    dailyHealthDelta: -4,
    immediateDamage: 15,
    treatmentItems: ['bandages', 'laudanum', 'hartshorn'],
    naturalCourseDays: 10,
    minCourseDays: 4
  },
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    dailyHealthDelta: -3,
    naturalCourseDays: 14,
    minCourseDays: 5
  },
  scurvy: {
    id: 'scurvy',
    name: 'Scurvy',
    dailyHealthDelta: -1,
    dailyMoraleDelta: -1,
    resolvedByItems: ['dried_fruit']
  },
  // Marker condition for starving members. The bulk of the HP damage
  // comes from systems/starvation.ts on its own curve; the condition
  // itself ticks a small extra drain and — crucially — gives reapDead
  // a deathCause to show ("Starvation") if a starving member dies.
  starvation: {
    id: 'starvation',
    name: 'Starvation',
    dailyHealthDelta: -1,
    dailyMoraleDelta: -1
  },
  // The pox — period name for syphilis. Slow daily drain, no
  // auto-resolve (mercury treatment was the era's "cure" and
  // calomel is in the item catalog as a treatment for dysentery).
  // For now, the condition just persists; future event/system
  // could surface "treat the pox at a doctor" when a doctor + the
  // right item are present.
  pox: {
    id: 'pox',
    name: 'The Pox',
    dailyHealthDelta: -1,
    dailyMoraleDelta: -1
  },
  // #198 — grizzly mauling. Initial damage is applied at the hit site
  // by the hunt() roll; this condition models the wound bleeding out
  // over the days that follow. Bandages + laudanum mirror the broken-leg
  // treatment shape — period emigrant care for severe wounds was
  // identical: clean, wrap, dose for pain, hope for no infection.
  bear_mauling: {
    id: 'bear_mauling',
    name: 'Bear Mauling',
    dailyHealthDelta: -3,
    dailyMoraleDelta: -1,
    treatmentItems: ['bandages', 'laudanum'],
    naturalCourseDays: 21,
    minCourseDays: 10
  }
};

export function getCondition(id: ConditionId): ConditionMeta {
  const c = CONDITIONS[id];
  if (!c) throw new Error(`Unknown condition: ${id}`);
  return c;
}
