import type { GameState } from '../types';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { recoverOxenFatigue } from '../systems/oxen';
import { attemptFire } from '../systems/fire';
import { reapDead } from '../systems/death';

export type ShovelAction = 'dig_well' | 'dig_grave' | 'dig_out';

export interface CampOptions {
  shovelActions?: ShovelAction[];
}

const CAMP_FATIGUE_RECOVERY = 15;
const FARMER_CAMP_FORAGE = 3;
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
    throw new Error('camp: shovel actions require a shovel in inventory');
  }

  const totalHours = actions.reduce((sum, a) => sum + SHOVEL_ACTION_HOURS[a], 0);
  if (totalHours > TIME_BUDGET_HOURS) {
    throw new Error(`camp: shovel action budget exceeded (${totalHours} > ${TIME_BUDGET_HOURS} hours)`);
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

export function camp(state: GameState, opts: CampOptions = {}): GameState {
  let s = upgradeState(state);
  const rng = makeRng(`${s.seed}:action:camp:${s.day}:0`);

  s = progressConditions(s, rng);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);

  s = { ...s, oxen: recoverOxenFatigue(s.oxen, CAMP_FATIGUE_RECOVERY) };
  s = attemptFire(s, rng);

  const hasLiveFarmer = s.party.some((m) => !m.dead && m.profession === 'farmer');
  if (hasLiveFarmer) {
    const currentFlour = s.inventory.flour ?? 0;
    s = { ...s, inventory: { ...s.inventory, flour: currentFlour + FARMER_CAMP_FORAGE } };
  }

  if (opts.shovelActions && opts.shovelActions.length > 0) {
    s = applyShovelActions(s, opts.shovelActions, rng);
  }

  s = reapDead(s, rng);

  s = {
    ...s,
    eventLog: [...s.eventLog, { day: s.day, text: 'Made camp for the night.' }],
    day: s.day + 1,
    date: advanceOneDay(s.date)
  };

  return s;
}
