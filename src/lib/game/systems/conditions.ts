import type { GameState } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';
import { hasLiveDoctor } from '../professions/predicates';
import { careLevel } from './care';

// Doctor profession dampens condition damage by 30% — they bleed,
// purge, dose with calomel and laudanum, and the patient takes a
// gentler beating from disease and injury. Applied to the daily
// health delta only; morale delta still hits in full.
const DOCTOR_RELIEF_MULT = 0.7;

// Treatment-item dampening + cure chance. Period-faithful: emigrants
// dosed with quinine, calomel, laudanum, dovers powder; outcomes were
// uncertain but treatment did improve odds. Engine model: while an
// item from `treatmentItems` is on hand, consume one per day per
// condition — daily damage is halved, and a per-day cure roll has a
// chance to fully resolve the condition.
const TREATMENT_DAMAGE_MULT = 0.5;
const TREATMENT_CURE_CHANCE = 0.25;

// #1046 D — natural-course resolve probability. Rises linearly from
// minCourseDays (0) to naturalCourseDays (NATURAL_BASE_CEILING) and
// holds at the ceiling beyond. Doctor care closes half the remaining
// gap to certainty (accelerated, never instant — medicine + the
// treatment-cure roll above is still the fastest path). Untended is
// suppressed by the caller. Starting curve; slice-5 sweep-tuned.
const NATURAL_BASE_CEILING = 0.35;

function naturalResolveChance(
  daysSinceOnset: number,
  minCourseDays: number,
  naturalCourseDays: number,
  accelerated: boolean
): number {
  if (daysSinceOnset < minCourseDays) return 0;
  const span = Math.max(1, naturalCourseDays - minCourseDays);
  const t = Math.min(1, (daysSinceOnset - minCourseDays) / span);
  const base = NATURAL_BASE_CEILING * t;
  return accelerated ? base + (1 - base) * 0.5 : base;
}

export function progressConditions(state: GameState, rng: Rng): GameState {
  let moraleDelta = 0;
  const reliefMult = hasLiveDoctor(state) ? DOCTOR_RELIEF_MULT : 1.0;
  const care = careLevel(state);

  // Mutable copy of inventory — items consumed by `resolvedByItems`
  // auto-cure or `treatmentItems` daily dosing aren't available to
  // another party member's condition the same tick.
  // First-come-first-served by party order.
  const inventory: Record<string, number> = { ...state.inventory };

  const party = state.party.map((m) => {
    if (m.dead) return m;
    let healthDelta = 0;
    const nextConditions: typeof m.conditions = [];
    for (const c of m.conditions) {
      const meta = getCondition(c.id);

      // Auto-resolve: if the condition declares `resolvedByItems` and
      // the party has any of those items on hand, consume one and drop
      // the condition. Period reality: scurvy clears within days of
      // eating fresh fruit; the engine just needed the consumer wired
      // in. Today this only matches scurvy → dried_fruit.
      const resolver = (meta.resolvedByItems ?? []).find(
        (id) => (inventory[id] ?? 0) > 0
      );
      if (resolver) {
        inventory[resolver] = (inventory[resolver] ?? 0) - 1;
        continue;
      }

      // Treatment: consume one treatment item if available. Halves
      // today's HP damage and rolls for full cure. Doctor's relief
      // stacks on top — a doctor dosing quinine is the best odds
      // emigrants ever had.
      const treatment = (meta.treatmentItems ?? []).find(
        (id) => (inventory[id] ?? 0) > 0
      );
      if (treatment) {
        inventory[treatment] = (inventory[treatment] ?? 0) - 1;
        if (rng.chance(TREATMENT_CURE_CHANCE)) {
          continue;
        }
        healthDelta += meta.dailyHealthDelta * reliefMult * TREATMENT_DAMAGE_MULT;
      } else {
        // #1046 D — care-gated natural-course resolve. Checked on the
        // INCOMING daysSinceOnset, after the item paths so medicine
        // stays the fastest cure. Untended suppresses it entirely (you
        // don't mend while starving — you decline to death).
        const naturalDays = meta.naturalCourseDays;
        const minDays = meta.minCourseDays;
        const canResolve =
          care !== 'untended' &&
          naturalDays !== undefined &&
          minDays !== undefined;
        const resolveP = canResolve
          ? naturalResolveChance(c.daysSinceOnset, minDays as number, naturalDays as number, care === 'doctor')
          : 0;
        if (resolveP > 0 && rng.chance(resolveP)) {
          continue; // ran its course; no damage, condition dropped
        }
        healthDelta += meta.dailyHealthDelta * reliefMult;
      }
      if (meta.dailyMoraleDelta) moraleDelta += meta.dailyMoraleDelta;
      nextConditions.push({ ...c, daysSinceOnset: c.daysSinceOnset + 1 });
    }
    const health = Math.max(0, Math.min(100, m.health + Math.round(healthDelta)));
    return { ...m, health, conditions: nextConditions };
  });

  const morale = Math.max(0, Math.min(100, state.morale + moraleDelta));
  return { ...state, party, morale, inventory };
}
