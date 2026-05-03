import type { GameState } from '../types';
import type { Rng } from '../rng';
import { getCondition } from '../content/conditions';
import { hasLiveDoctor } from '../professions/predicates';

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

export function progressConditions(state: GameState, rng: Rng): GameState {
  let moraleDelta = 0;
  const reliefMult = hasLiveDoctor(state) ? DOCTOR_RELIEF_MULT : 1.0;

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
