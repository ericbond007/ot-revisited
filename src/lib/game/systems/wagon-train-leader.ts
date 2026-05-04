// #286 — Wagon-train leader abilities. The captain has powers no
// other slot has — these should feel like "the captain's view."
// Period anchor: Marcy 1859 codifies the captain's role as keeper of
// the company-shared resources ("the medical man's chest is the
// company's"). Russell 1846 (per Bryant) administered the company
// purse, the smithy schedule, and the team-pool. The captain knew
// who carried what flour barrels, which wagon had the working anvil,
// and which wagon had a doctor's stock.
//
// This file ships the smallest practically-useful set of leader
// powers in this PR; #286 phase 2 (deferred) extends with vote-on-
// decisions, leader-override-with-morale-cost, and the captain's-log
// proposal queue. Pre-reqs: #280 per-wagon train state, #285 phase 1
// (captaincy pointer + charisma elections).
//
// Powers in this PR:
//   - inventory peek (UI only — captain sees companion inventories)
//   - transferBetweenCompanions (move items between any two wagons)
//   - doctorVisit (use captain's medicine_chest on a sick companion)
//
// Powers deferred to a later phase 2 slice:
//   - propose / vote on pace, rest-day, fork choices
//   - leader-override-with-morale-cost
//   - call emergency vote on abandoning a struggling wagon

import type { GameState, NpcWagonState, PartyMember, ConditionId } from '../types';
import { playerIsCaptain } from './wagon-train-elections';

// #296 — chest-curable conditions: the drugs in a fitted medicine
// chest (laudanum / calomel / quinine / ipecac / dovers_powder /
// paregoric / jalap / hartshorn) were specifically curative for these
// disease conditions in period emigrant medicine. Marcy 1859 and
// Ramsey's Practice (1842) both prescribe quinine for cholera/typhoid
// and calomel/paregoric for dysentery as the standard chest doses.
// Pox (period name for syphilis) gets the mercury cure: calomel was
// the standard treatment ("a night with Venus, a lifetime with
// Mercury"). Period outcomes were grim — but the cure was real.
const CHEST_CURABLE_CONDITIONS: ReadonlySet<ConditionId> = new Set([
  'cholera',
  'dysentery',
  'typhoid',
  'measles',
  'pox'
]);

// #296 — chest-helpable injuries: laudanum + bandages eased pain and
// stopped infection, but the underlying wound still needed time + rest
// to heal. The visit grants extra HP per such injury (a flat first-aid
// bonus) without clearing the condition — the patient still has the
// broken leg / mauling / venom moving through them.
const CHEST_HELPABLE_INJURIES: ReadonlySet<ConditionId> = new Set([
  'broken_leg',
  'bear_mauling',
  'snakebite'
]);

const VISIT_HP_BASE = 30;
const VISIT_HP_PER_INJURY = 15;

/** Captain-only predicate. Returns false when the player isn't in a
 *  train, or they're a wagon but not the leader. UI gates and engine
 *  actions both call this to throw / disable when used by a non-
 *  captain. */
export function isCaptain(state: GameState): boolean {
  return playerIsCaptain(state);
}

export interface TransferLine {
  item: string;
  qty: number;
}

export interface TransferResult {
  state: GameState;
  /** Whether the transfer went through. */
  accepted: boolean;
  /** Reason for refusal (only when `accepted=false`). */
  declineReason?: string;
}

/** Move items between any two in-progress companions (captain only).
 *  Period: the captain ran this kind of transfer all the time —
 *  "lend the smith's anvil to the Reeds for the day," "shift a flour
 *  barrel from the Sagers to the Whitmans." NPCs accept unless they
 *  are hostile-morale (<25); the captain's authority is real but not
 *  unlimited.
 *
 *  Throws on bad inputs (unknown wagons, non-positive qty, source
 *  lacks the items). Returns `{ accepted: false, declineReason }` if
 *  the destination wagon refuses. */
export function transferBetweenCompanions(
  state: GameState,
  fromWagonId: string,
  toWagonId: string,
  items: TransferLine[]
): TransferResult {
  if (!state.wagonTrain) {
    throw new Error('transferBetweenCompanions: not in a wagon train');
  }
  if (!isCaptain(state)) {
    throw new Error('transferBetweenCompanions: only the captain can move items between companions');
  }
  if (fromWagonId === toWagonId) {
    throw new Error('transferBetweenCompanions: source and destination must differ');
  }
  const fromIdx = state.wagonTrain.companions.findIndex((c) => c.id === fromWagonId);
  if (fromIdx === -1) throw new Error(`transferBetweenCompanions: no wagon ${fromWagonId}`);
  const toIdx = state.wagonTrain.companions.findIndex((c) => c.id === toWagonId);
  if (toIdx === -1) throw new Error(`transferBetweenCompanions: no wagon ${toWagonId}`);
  const from = state.wagonTrain.companions[fromIdx];
  const to = state.wagonTrain.companions[toIdx];
  if (from.outcome !== 'in-progress') {
    throw new Error(`transferBetweenCompanions: ${from.name} is no longer with the train`);
  }
  if (to.outcome !== 'in-progress') {
    throw new Error(`transferBetweenCompanions: ${to.name} is no longer with the train`);
  }
  for (const l of items) {
    if (l.qty <= 0) throw new Error(`transferBetweenCompanions: bad qty for ${l.item}`);
    if ((from.inventory[l.item] ?? 0) < l.qty) {
      throw new Error(`transferBetweenCompanions: ${from.name} doesn't have ${l.qty} ${l.item}`);
    }
  }
  // Hostile-morale destination refuses everything. Period: a wagon at
  // morale-floor isn't going to take orders from anyone, captain or no.
  if (to.morale < 25) {
    return {
      state,
      accepted: false,
      declineReason: `${to.name} won't take anything from anyone today.`
    };
  }
  // Apply atomically.
  const fromInv: Record<string, number> = { ...from.inventory };
  const toInv: Record<string, number> = { ...to.inventory };
  for (const l of items) {
    fromInv[l.item] = (fromInv[l.item] ?? 0) - l.qty;
    toInv[l.item] = (toInv[l.item] ?? 0) + l.qty;
  }
  const summary = items.map((l) => `${l.qty} ${l.item}`).join(', ');
  const logText = `Captain moved ${summary} from ${from.name} to ${to.name}.`;
  const next: GameState = {
    ...state,
    wagonTrain: {
      ...state.wagonTrain,
      companions: state.wagonTrain.companions.map((c, i) => {
        if (i === fromIdx) return { ...c, inventory: fromInv };
        if (i === toIdx) {
          return {
            ...c,
            inventory: toInv,
            // Receiver's morale lifts a hair — they got something useful.
            morale: Math.min(100, c.morale + 2)
          };
        }
        return c;
      })
    },
    eventLog: [...state.eventLog, { day: state.day, text: logText }]
  };
  return { state: next, accepted: true };
}

export interface DoctorVisitResult {
  state: GameState;
  /** Whether the visit happened (false if no sick member found). */
  treated: boolean;
  /** Name of the treated party member (when `treated=true`). */
  patientName?: string;
  /** HP gained by the patient (base + injury first-aid bonus). */
  hpGained?: number;
  /** Disease conditions cleared by the chest's drugs. */
  conditionsCleared?: ConditionId[];
  /** Injuries the chest eased (extra HP gain) but didn't cure. */
  injuriesEased?: ConditionId[];
}

/** Period anchor: Marcy 1859 — "the medical man's chest is the
 *  company's." Wagons with a fitted medicine_chest shared it freely
 *  on the trail; the captain often coordinated who got dosed when.
 *
 *  Captain only. Requires `medicine_chest` in the player's inventory
 *  (the chest itself is a tool, not consumed on use). Picks the
 *  lowest-HP alive member, OR — if everyone's at full HP — picks
 *  someone with a chest-affectable condition (curable disease or
 *  helpable injury).
 *
 *  Effects on the patient:
 *   - +30 HP base (capped at 100).
 *   - **Diseases** in CHEST_CURABLE_CONDITIONS (cholera, dysentery,
 *     typhoid, measles, pox): cleared from the conditions array.
 *     Period: the chest had quinine/calomel/paregoric/dovers_powder,
 *     the era's standard cure for each. Pox (syphilis) gets the
 *     mercury treatment via calomel — period-real, period-grim.
 *   - **Injuries** in CHEST_HELPABLE_INJURIES (broken_leg, bear_mauling,
 *     snakebite): NOT cleared (wounds need time + bandages + rest), but
 *     the patient gets an extra +15 HP per injury treated as a first-
 *     aid bonus — pain dampened, infection cleaned, the body has more
 *     to fight with.
 *   - Other conditions (frostbite, scurvy, exhaustion, starvation):
 *     no effect — those need other items/systems (warming, vitamin C,
 *     food, rest). The visit can still happen if the patient also has
 *     HP loss or one of the affectable conditions.
 *
 *  Wagon-level: morale +5 (the company saw the captain coordinating
 *  care). Both player + wagon eventLogs updated. */
export function doctorVisit(state: GameState, wagonId: string): DoctorVisitResult {
  if (!state.wagonTrain) {
    throw new Error('doctorVisit: not in a wagon train');
  }
  if (!isCaptain(state)) {
    throw new Error('doctorVisit: only the captain can call a doctor visit');
  }
  if ((state.inventory.medicine_chest ?? 0) <= 0) {
    throw new Error('doctorVisit: no medicine chest in your wagon');
  }
  const idx = state.wagonTrain.companions.findIndex((c) => c.id === wagonId);
  if (idx === -1) throw new Error(`doctorVisit: no wagon ${wagonId}`);
  const target = state.wagonTrain.companions[idx];
  if (target.outcome !== 'in-progress') {
    throw new Error(`doctorVisit: ${target.name} is no longer with the train`);
  }

  const patient = pickSickMember(target.party);
  if (!patient) {
    return { state, treated: false };
  }

  const conditionsCleared: ConditionId[] = [];
  const injuriesEased: ConditionId[] = [];
  const remainingConditions = patient.conditions.filter((c) => {
    if (CHEST_CURABLE_CONDITIONS.has(c.id)) {
      conditionsCleared.push(c.id);
      return false;
    }
    if (CHEST_HELPABLE_INJURIES.has(c.id)) {
      injuriesEased.push(c.id);
    }
    return true;
  });

  const totalHpDelta = VISIT_HP_BASE + injuriesEased.length * VISIT_HP_PER_INJURY;
  const newHp = Math.min(100, patient.health + totalHpDelta);
  const actualGain = newHp - patient.health;

  const updatedTarget: NpcWagonState = {
    ...target,
    party: target.party.map((p) =>
      p.id === patient.id
        ? { ...p, health: newHp, conditions: remainingConditions }
        : p
    ),
    morale: Math.min(100, target.morale + 5),
    eventLog: [
      ...target.eventLog,
      {
        day: state.day,
        text: buildWagonLog(patient.name, actualGain, conditionsCleared, injuriesEased)
      }
    ]
  };

  const next: GameState = {
    ...state,
    wagonTrain: {
      ...state.wagonTrain,
      companions: state.wagonTrain.companions.map((c, i) =>
        i === idx ? updatedTarget : c
      )
    },
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: buildPlayerLog(target.name, patient.name, actualGain, conditionsCleared, injuriesEased)
      }
    ]
  };
  return {
    state: next,
    treated: true,
    patientName: patient.name,
    hpGained: actualGain,
    conditionsCleared,
    injuriesEased
  };
}

/** Period-flavored log. Names the diseases cleared explicitly ("ran
 *  the cholera off"); injuries get a softer phrasing ("eased the
 *  mauling, bandages and laudanum"). */
function buildWagonLog(
  patientName: string,
  hpGained: number,
  cleared: ConditionId[],
  eased: ConditionId[]
): string {
  const parts: string[] = [];
  if (cleared.length > 0) parts.push(`cleared ${cleared.map(conditionLabel).join(', ')}`);
  if (eased.length > 0) parts.push(`eased ${eased.map(conditionLabel).join(', ')}`);
  if (hpGained > 0) parts.push(`+${hpGained} HP`);
  const detail = parts.length > 0 ? ` — ${parts.join('; ')}` : '';
  return `Captain visited with the chest. ${patientName} dosed and bandaged${detail}.`;
}

function buildPlayerLog(
  wagonName: string,
  patientName: string,
  hpGained: number,
  cleared: ConditionId[],
  eased: ConditionId[]
): string {
  const parts: string[] = [];
  if (hpGained > 0) parts.push(`+${hpGained} HP`);
  if (cleared.length > 0) parts.push(`cleared ${cleared.map(conditionLabel).join(' + ')}`);
  if (eased.length > 0) parts.push(`eased ${eased.map(conditionLabel).join(' + ')}`);
  parts.push('+5 wagon morale');
  return `You walked over to ${wagonName} with the medicine chest. Treated ${patientName} — ${parts.join(', ')}.`;
}

function conditionLabel(id: ConditionId): string {
  return id.replace(/_/g, ' ');
}

/** True when at least one of the patient's conditions is something
 *  the chest can act on (cure or ease). Drives both `pickSickMember`
 *  eligibility (so a full-HP cholera patient still counts) and the
 *  Doctor visit UI gate. Conditions outside both sets (frostbite,
 *  scurvy, exhaustion, pox, starvation) don't qualify someone for a
 *  visit on their own — those need other items/systems. */
function hasChestAffectableCondition(p: PartyMember): boolean {
  return p.conditions.some(
    (c) => CHEST_CURABLE_CONDITIONS.has(c.id) || CHEST_HELPABLE_INJURIES.has(c.id)
  );
}

/** Pick the most-injured alive member of a wagon's party, or null
 *  when nobody can be helped by a chest visit. Eligible = HP < 100
 *  OR has at least one chest-affectable condition (curable disease or
 *  helpable injury). Lowest HP wins ties so the most-injured member
 *  is treated first; if everyone's at full HP, the patient with an
 *  affectable condition is picked. */
function pickSickMember(party: PartyMember[]): PartyMember | null {
  const candidates = party.filter(
    (p) => !p.dead && (p.health < 100 || hasChestAffectableCondition(p))
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.health - b.health)[0];
}

/** True when this wagon has anyone the captain could help with a
 *  chest visit — drives the Doctor visit button enable-state. Mirrors
 *  `pickSickMember` exactly. */
export function wagonHasSickMember(wagon: NpcWagonState): boolean {
  return wagon.party.some(
    (p) => !p.dead && (p.health < 100 || hasChestAffectableCondition(p))
  );
}
