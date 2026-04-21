import type { GameState } from '../types';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale, healingMultiplier } from '../systems/morale';
import { recoverOxenFatigue } from '../systems/oxen';
import { attemptFire } from '../systems/fire';
import { reapDead } from '../systems/death';

const OX_FATIGUE_RECOVERY_PER_REST_DAY = 25;
const BASE_HEAL_PER_REST_DAY = 8;
const FARMER_FORAGE_AT_REST = 3;

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

export function rest(state: GameState, days: number): GameState {
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

    s = { ...s, oxen: recoverOxenFatigue(s.oxen, OX_FATIGUE_RECOVERY_PER_REST_DAY) };

    s = attemptFire(s, rng);

    const hasLiveFarmer = s.party.some((m) => !m.dead && m.profession === 'farmer');
    if (hasLiveFarmer) {
      const currentFlour = s.inventory.flour ?? 0;
      s = { ...s, inventory: { ...s.inventory, flour: currentFlour + FARMER_FORAGE_AT_REST } };
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
