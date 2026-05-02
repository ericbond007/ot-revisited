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
}

export const CONDITIONS: Record<ConditionId, ConditionMeta> = {
  cholera: {
    id: 'cholera',
    name: 'Cholera',
    dailyHealthDelta: -10,
    contagious: true,
    treatmentItems: ['quinine', 'dovers_powder', 'camphor']
  },
  dysentery: {
    id: 'dysentery',
    name: 'Dysentery',
    dailyHealthDelta: -3,
    treatmentItems: ['calomel', 'epsom_salts', 'paregoric', 'castor_oil']
  },
  typhoid: {
    id: 'typhoid',
    name: 'Typhoid',
    dailyHealthDelta: -5,
    contagious: true,
    treatmentItems: ['quinine', 'dovers_powder']
  },
  measles: {
    id: 'measles',
    name: 'Measles',
    dailyHealthDelta: -3,
    contagious: true,
    treatmentItems: ['dovers_powder']
  },
  exhaustion: {
    id: 'exhaustion',
    name: 'Exhaustion',
    dailyHealthDelta: -2,
    dailyMoraleDelta: -1
  },
  broken_leg: {
    id: 'broken_leg',
    name: 'Broken Leg',
    dailyHealthDelta: -1,
    treatmentItems: ['bandages', 'laudanum']
  },
  snakebite: {
    id: 'snakebite',
    name: 'Snakebite',
    dailyHealthDelta: -5,
    immediateDamage: 15,
    treatmentItems: ['bandages', 'laudanum', 'hartshorn']
  },
  frostbite: {
    id: 'frostbite',
    name: 'Frostbite',
    dailyHealthDelta: -3
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
    treatmentItems: ['bandages', 'laudanum']
  }
};

export function getCondition(id: ConditionId): ConditionMeta {
  const c = CONDITIONS[id];
  if (!c) throw new Error(`Unknown condition: ${id}`);
  return c;
}
