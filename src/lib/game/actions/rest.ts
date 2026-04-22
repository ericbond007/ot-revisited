import type { GameState } from '../types';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import { hasLiveFarmer, hasLiveTeamster, hasLivePreacher, hasLiveWhore } from '../professions/predicates';
import { TEAMSTER_RECOVERY_MULT } from '../systems/oxen';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale, healingMultiplier } from '../systems/morale';
import { recoverOxenFatigue } from '../systems/oxen';
import { attemptFire } from '../systems/fire';
import { reapDead } from '../systems/death';

// Rest is the unified "stationary day" action. 1+ days of no travel with:
//   - condition progression + consumption + morale adjust (each day)
//   - accelerated healing scaled by morale
//   - ox fatigue recovery (25/day)
//   - Farmer auto-forage if present
//   - optional shovel actions applied on the first day (12-hour budget)
// A single-day rest with shovel actions is equivalent to "make camp and dig stuff."

export type ShovelAction = 'dig_well' | 'dig_grave' | 'dig_out';

export interface RestOptions {
  shovelActions?: ShovelAction[];
}

const OX_FATIGUE_RECOVERY_PER_REST_DAY = 25;
const BASE_HEAL_PER_REST_DAY = 8;
const FARMER_FORAGE_AT_REST = 3;
const TIME_BUDGET_HOURS = 12;

const SHOVEL_ACTION_HOURS: Record<ShovelAction, number> = {
  dig_well: 5,
  dig_grave: 2,
  dig_out: 4
};

const WELL_WATER_GAL_MIN = 30;
const WELL_WATER_GAL_MAX = 50;
const WELL_SUCCESS_CHANCE = 0.4;

function advanceOneDay(d: { year: number; month: number; day: number }) {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = (d.year % 4 === 0 && d.year % 100 !== 0) || d.year % 400 === 0;
  const cap = d.month === 2 && leap ? 29 : daysInMonth[d.month - 1];
  let { year, month, day } = d;
  day += 1;
  if (day > cap) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
  return { year, month, day };
}

function applyShovelActions(state: GameState, actions: ShovelAction[], rng: Rng): GameState {
  const hasShovel = (state.inventory.shovel ?? 0) > 0;
  if (!hasShovel) {
    throw new Error('rest: shovel actions require a shovel in inventory');
  }

  const totalHours = actions.reduce((sum, a) => sum + SHOVEL_ACTION_HOURS[a], 0);
  if (totalHours > TIME_BUDGET_HOURS) {
    throw new Error(`rest: shovel action budget exceeded (${totalHours} > ${TIME_BUDGET_HOURS} hours)`);
  }

  let s = state;
  for (const a of actions) {
    switch (a) {
      case 'dig_well': {
        if (rng.chance(WELL_SUCCESS_CHANCE)) {
          const gal = rng.int(WELL_WATER_GAL_MIN, WELL_WATER_GAL_MAX);
          s = {
            ...s,
            resources: { ...s.resources, water: Math.min(s.resources.waterCap, s.resources.water + gal) },
            eventLog: [...s.eventLog, { day: s.day, text: `Dug a well and found ${gal} gallons of water.` }]
          };
        } else {
          s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Dug a well — came up dry.' }] };
        }
        break;
      }
      case 'dig_grave':
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Dug a grave in advance.' }] };
        break;
      case 'dig_out':
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Dug out of mud/snow.' }] };
        break;
    }
  }
  return s;
}

export function rest(state: GameState, days: number, opts: RestOptions = {}): GameState {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('rest: days must be a positive integer');
  }

  let s = upgradeState(state);
  const startDay = s.day;

  for (let i = 0; i < days; i++) {
    const rng = makeRng(`${s.seed}:action:rest:${s.day}:0`);

    s = progressConditions(s, rng);
    s = applyDailyConsumption(s);
    s = adjustMorale(s, rng);

    const mult = healingMultiplier(s.morale);
    s = {
      ...s,
      party: s.party.map((m) => {
        if (m.dead) return m;
        const gain = Math.round(BASE_HEAL_PER_REST_DAY * mult);
        return { ...m, health: Math.min(100, m.health + gain) };
      })
    };

    const oxRecovery = hasLiveTeamster(s)
      ? Math.round(OX_FATIGUE_RECOVERY_PER_REST_DAY * TEAMSTER_RECOVERY_MULT)
      : OX_FATIGUE_RECOVERY_PER_REST_DAY;
    s = { ...s, oxen: recoverOxenFatigue(s.oxen, oxRecovery) };

    s = attemptFire(s, rng);

    if (hasLiveFarmer(s)) {
      const currentFlour = s.inventory.flour ?? 0;
      s = { ...s, inventory: { ...s.inventory, flour: currentFlour + FARMER_FORAGE_AT_REST } };
    }

    // Preacher +1 morale per rest night; Whore +2. Both stack.
    let nightMorale = 0;
    if (hasLivePreacher(s)) nightMorale += 1;
    if (hasLiveWhore(s))    nightMorale += 2;
    if (nightMorale > 0) {
      s = { ...s, morale: Math.min(100, s.morale + nightMorale) };
    }

    // Shovel actions apply on the first day only.
    if (i === 0 && opts.shovelActions && opts.shovelActions.length > 0) {
      s = applyShovelActions(s, opts.shovelActions, rng);
    }

    s = reapDead(s, rng);

    s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  }

  s = {
    ...s,
    eventLog: [...s.eventLog, { day: startDay, text: `Rested for ${days} day${days === 1 ? '' : 's'}.` }]
  };

  return s;
}
