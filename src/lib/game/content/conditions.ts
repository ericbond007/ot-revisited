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
    treatmentItems: ['quinine']
  },
  dysentery: {
    id: 'dysentery',
    name: 'Dysentery',
    dailyHealthDelta: -3,
    treatmentItems: ['calomel']
  },
  typhoid: {
    id: 'typhoid',
    name: 'Typhoid',
    dailyHealthDelta: -5,
    contagious: true,
    treatmentItems: ['quinine']
  },
  measles: {
    id: 'measles',
    name: 'Measles',
    dailyHealthDelta: -3,
    contagious: true
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
    treatmentItems: ['bandages', 'laudanum']
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
  }
};

export function getCondition(id: ConditionId): ConditionMeta {
  const c = CONDITIONS[id];
  if (!c) throw new Error(`Unknown condition: ${id}`);
  return c;
}
