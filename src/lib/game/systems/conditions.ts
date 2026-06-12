import type { GameState } from '../types';
import type { Rng } from '../rng';
import type { ConditionId } from '../types';
import { getCondition } from '../content/conditions';
import { hasLiveDoctor } from '../professions/predicates';
import { careLevel } from './care';

// Doctor profession dampens condition damage by 30% — they bleed,
// purge, dose with calomel and laudanum, and the patient takes a
// gentler beating from disease and injury. Applied to the daily
// health delta only; morale delta still hits in full.
const DOCTOR_RELIEF_MULT = 0.7;

/** #1389 — acute-cholera damage multiplier. The malignant (Asiatic) form
 *  kills through catastrophic fluid loss — "healthy in the morning, dead
 *  by nightfall." 5x the base dailyHealthDelta (-35/day for cholera;
 *  gate-tuned from 3x — see the note below) while daysSinceOnset <
 *  ACUTE_WINDOW_DAYS (4). After the window the case either killed or
 *  turned the corner; the engine models this by downgrading to mild
 *  behavior (the acute flag is still present but no longer active).
 *
 *  Math sanity (comment per spec #1389):
 *    Adult, doctor aboard:  -21 × 0.7 (DOCTOR_RELIEF_MULT) = -14.7/day
 *      × 2 days = ~-29 HP total before downgrade — a survivor IF healthy
 *      at onset, scarred but alive.
 *    Child (childAmp 1.75):  -21 × 1.75 × 0.7 = -25.7/day doctored
 *      — a child starting at 100 HP hits ~49 after 2 days: alive but
 *      marginal. A child at 60 HP or below is likely fatal.
 *    Undoctored adult: -21/day × 2 = -42 HP — adults starting below 60
 *      HP are coin-flips; adults at 100 HP survive with ~16 HP buffer.
 *  Bimodality is the point: ~30% of corridor cases are coin-flips weighted
 *  by HP at onset, age, and doctor presence. */
// Gate-tuned 3 -> 5: at 3x the convalescent care stack + full-HP early-trail
// parties survived every acute case (two probes, zero direct deaths). At 5x
// (-35/day raw): an undoctored adult dies inside the window; a doctored adult
// at full HP barely survives (-24.5/day x 3 = -74); a child (1.75x amp)
// rarely does. Period: the violent case killed healthy adults in 24 hours —
// fluid loss is absolute, not proportional to reserve.
export const ACUTE_CHOLERA_DAMAGE_MULT = 5;

/** #1389 gate-tuned 2 -> 3: at a 48h window the doctored care stack
 *  survives every acute case from full HP (probe: 21/30 runs with
 *  onsets, zero direct deaths). At 72h: a doctored adult loses ~44 HP
 *  (a survivable horror), an undoctored adult ~63 (dies with any prior
 *  wear), a doctored child ~77 (usually fatal — small bodies fail in
 *  hours-to-days). The bimodal coin-flip the period record describes.
 *  Gate-tuned 3 -> 4 with the 5x mult: traced child acute cases rode the
 *  3-day window to exactly ~8 HP and recovered (rest-day healing offsets
 *  one day's drain); the 4th day is what the period record calls the
 *  death — or the turn — of the violent case. */
export const ACUTE_WINDOW_DAYS = 4;

// #1259 §1 — Age-banded disease lethality (Bashore/BYU 2014 J-curve).
//
// Children aged 1–9 died from dehydrating disease at ~1.6–2× the rate
// of prime adults. The mechanism is physiological: small bodies have a
// higher surface-area-to-volume ratio and dehydrate in hours-to-days
// rather than days-to-weeks. Cholera and dysentery (the primary killers)
// operated through fluid loss, so body mass was the decisive variable.
//
// Typhoid and measles are explicitly NOT in this set — the Bashore data
// shows them epidemic but NOT child-lethality-skewed. Measles was roughly
// flat across age cohorts on the Mormon Trail; typhoid skewed adult-male.
//
// The applyDirtyWaterRisk channel (consumption.ts) inflicts either
// 'cholera' or 'dysentery' — both are in this set, so the channel is
// fully covered by the multiplier.
//
// NPC parity: NPC wagons tick conditions through the shared
// progressConditions function via wagon-synth.ts (synthesizeWagonState +
// tickNpcWagon). This multiplier lives at the single shared damage site,
// so player, bot, and NPC wagons inherit it identically.

/** Multiplier on daily condition damage for a child afflicted with a
 *  dehydrating disease (ages 1–9 vs prime adults; Bashore/Tolley, BYU
 *  Studies 53:4 2014). Gate note: 1.75 and 2.0 produced identical sweep
 *  results — the lever saturates (the afflicted child already dies; more
 *  damage only moves the death a day earlier), and post-#1281 disease
 *  incidence is low, so this channel is honest but thin. 1.75 (research
 *  band center) kept. */
export const CHILD_DEHYDRATING_DISEASE_MULT = 1.75;

/** Condition ids whose daily damage is amplified by
 *  CHILD_DEHYDRATING_DISEASE_MULT when the afflicted member is a child.
 *  Cholera and dysentery are the primary dehydrating killers; the
 *  dirty-water channel (applyDirtyWaterRisk) can only inflict these two,
 *  so the set fully covers that exposure path. */
export const DEHYDRATING_CONDITIONS: ReadonlySet<ConditionId> = new Set<ConditionId>([
  'cholera',
  'dysentery'
]);

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
      // #1259 §1 — Dehydrating-disease amplifier for children.
      // Small bodies lose fluid volume faster; cholera/dysentery killed
      // ages 1–9 at ~1.6–2× the prime-adult rate (Bashore/BYU 2014).
      // Applies at this shared damage site → player, bot, and NPC wagons
      // inherit identically (NPC parity by construction; see npc-engine.ts
      // §939d note: conditions flow through progressConditions via
      // wagon-synth.ts synthesizeWagonState).
      const childAmp =
        m.kind === 'child' && DEHYDRATING_CONDITIONS.has(c.id)
          ? CHILD_DEHYDRATING_DISEASE_MULT
          : 1.0;

      // #1389 — acute (malignant) cholera branch.
      // Applies only while daysSinceOnset < ACUTE_WINDOW_DAYS (4, gate-
      // tuned; the window decides it — period course: death or turn-the-
      // corner within days). After the window the acute flag is still
      // present but the effects below do NOT fire — the case uses the
      // normal treatment/resolve path.
      // Doctor relief still applies (care mattered at the margin even when
      // medicine didn't — Altonen PSU 2000).
      if (c.acute && c.daysSinceOnset < ACUTE_WINDOW_DAYS) {
        // ACUTE_CHOLERA_DAMAGE_MULT (5x) the base delta (cholera: -7 ->
        // -35/day); childAmp stacks.
        // Treatment dampening (TREATMENT_DAMAGE_MULT) and cure rolls are
        // skipped — the malignant course overwhelms calomel and calomel's
        // purging response ("the treatment was indistinguishable from the
        // disease in effect" — Billington 1842 immigrant physician journal).
        // Consumes a treatment item without effect so supply still drains.
        if (treatment) {
          inventory[treatment] = (inventory[treatment] ?? 0) - 1;
          // no cure roll — acute course ignores treatment inside the window
        }
        healthDelta += meta.dailyHealthDelta * ACUTE_CHOLERA_DAMAGE_MULT * reliefMult * childAmp;
      } else if (treatment) {
        inventory[treatment] = (inventory[treatment] ?? 0) - 1;
        if (rng.chance(TREATMENT_CURE_CHANCE)) {
          continue;
        }
        healthDelta += meta.dailyHealthDelta * reliefMult * TREATMENT_DAMAGE_MULT * childAmp;
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
        healthDelta += meta.dailyHealthDelta * reliefMult * childAmp;
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
