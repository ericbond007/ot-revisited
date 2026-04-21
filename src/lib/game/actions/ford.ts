import type { GameState } from '../types';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';

export interface RiverState {
  depthFt: number;
  currentMph: number;
  ferryPrice: number;
}

export type FordMethod = 'ford' | 'caulk' | 'ferry' | 'wait';

export interface FordOptions {
  method: FordMethod;
  river: RiverState;
  waitDays?: number;
}

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

function passiveDay(state: GameState, seedSuffix: string): GameState {
  const rng = makeRng(`${state.seed}:action:ford:${state.day}:${seedSuffix}`);
  let s = progressConditions(state, rng);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);
  s = reapDead(s, rng);
  return { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
}

export function ford(state: GameState, opts: FordOptions): GameState {
  let s = upgradeState(state);

  switch (opts.method) {
    case 'ferry': {
      if (s.cash < opts.river.ferryPrice) {
        throw new Error(`ford: not enough cash for ferry ($${s.cash} < $${opts.river.ferryPrice})`);
      }
      s = { ...s, cash: s.cash - opts.river.ferryPrice };
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: `Paid $${opts.river.ferryPrice} for ferry across the river.` }] };
      return passiveDay(s, 'ferry');
    }

    case 'caulk': {
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Caulked the wagon and floated across the river.' }] };
      s = passiveDay(s, 'caulk-1');
      s = passiveDay(s, 'caulk-2');
      return s;
    }

    case 'wait': {
      const days = opts.waitDays ?? 1;
      if (!Number.isInteger(days) || days <= 0) {
        throw new Error('ford: waitDays must be a positive integer');
      }
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: `Waiting ${days} day${days === 1 ? '' : 's'} for the river to drop.` }] };
      for (let i = 0; i < days; i++) {
        s = passiveDay(s, `wait-${i}`);
      }
      return s;
    }

    case 'ford': {
      const rng = makeRng(`${s.seed}:action:ford:${s.day}:ford`);
      const danger = (opts.river.depthFt / 2) * (opts.river.currentMph / 2);

      if (rng.chance(Math.min(0.7, danger / 10))) {
        const dmg = Math.round(rng.int(5, 20) * danger);
        s = {
          ...s,
          wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - dmg) },
          eventLog: [...s.eventLog, { day: s.day, text: `Wagon took damage fording the river. Condition -${dmg}.` }]
        };
      }

      if (rng.chance(Math.min(0.5, danger / 8))) {
        const loss = rng.int(5, 20);
        const currentFlour = s.inventory.flour ?? 0;
        const taken = Math.min(currentFlour, loss);
        s = {
          ...s,
          inventory: { ...s.inventory, flour: currentFlour - taken },
          eventLog: [...s.eventLog, { day: s.day, text: `Lost ${taken} lb of supplies in the current.` }]
        };
      }

      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: 'Forded the river.' }] };
      return passiveDay(s, 'ford');
    }
  }
}
