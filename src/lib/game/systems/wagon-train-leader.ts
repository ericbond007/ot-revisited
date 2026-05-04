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

import type { GameState, NpcWagonState, PartyMember } from '../types';
import { playerIsCaptain } from './wagon-train-elections';

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
  /** HP gained by the patient. */
  hpGained?: number;
}

/** Period anchor: Marcy 1859 — "the medical man's chest is the
 *  company's." Wagons with a fitted medicine_chest shared it freely
 *  on the trail; the captain often coordinated who got dosed when.
 *
 *  Captain only. Costs 1 charge of `medicine_chest` from the player's
 *  inventory (1 chest = many charges; no consumption mechanic here yet,
 *  treated as an unlimited resource — the player must carry the chest
 *  but doesn't lose it on use). Picks the lowest-HP alive member of the
 *  target companion wagon, restores 30 HP (capped at 100), bumps that
 *  wagon's morale +5. No-op when there's nobody sick. */
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

  const sick = pickSickMember(target.party);
  if (!sick) {
    return { state, treated: false };
  }

  const HP_GAIN = 30;
  const newHp = Math.min(100, sick.health + HP_GAIN);
  const actualGain = newHp - sick.health;

  const updatedTarget: NpcWagonState = {
    ...target,
    party: target.party.map((p) =>
      p.id === sick.id ? { ...p, health: newHp } : p
    ),
    morale: Math.min(100, target.morale + 5),
    eventLog: [
      ...target.eventLog,
      {
        day: state.day,
        text: `Captain visited with the chest — ${sick.name} dosed and bandaged. +${actualGain} HP.`
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
        text: `You walked over to ${target.name} with the medicine chest. Treated ${sick.name}. +${actualGain} HP, +5 wagon morale.`
      }
    ]
  };
  return {
    state: next,
    treated: true,
    patientName: sick.name,
    hpGained: actualGain
  };
}

/** Pick the most-injured alive member of a wagon's party, or null
 *  when nobody needs treatment. "Sick" = HP < 100. Lowest HP wins
 *  ties. Members at full HP with active conditions are NOT included
 *  here — the visit currently bumps HP and morale but doesn't clear
 *  conditions, so a condition-only patient produces a confusing
 *  "treated +0 HP" outcome. Once condition-clearing lands as a
 *  separate mechanic (logged as #296), broaden this filter. */
function pickSickMember(party: PartyMember[]): PartyMember | null {
  const candidates = party.filter((p) => !p.dead && p.health < 100);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.health - b.health)[0];
}

/** True when this wagon has anyone the captain could plausibly help
 *  with the current visit mechanic — drives the `Doctor visit` button
 *  enable-state on WagonTrainModal. Mirrors the `pickSickMember`
 *  filter (HP < 100 only); condition-only patients are excluded until
 *  the visit also clears conditions (#296). */
export function wagonHasSickMember(wagon: NpcWagonState): boolean {
  return wagon.party.some((p) => !p.dead && p.health < 100);
}
