import type { GameState } from '../types';
import { makeRng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';
import { applyDehydration } from '../systems/dehydration';
import { applyEggLay } from '../systems/eggs';

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

// Structured reveal written to flags._fordResult. Consumed by
// FordSummaryModal; cleared by `?/ackFord`. JSON-serializable.
export interface FordResult {
  method: FordMethod;
  daysElapsed: number;
  crossed: boolean;
  cashDelta: number;
  wagonConditionBefore: number;
  wagonConditionAfter: number;
  // Per-item net inventory change during the attempt (negative = lost).
  inventoryDelta: Array<{ id: string; delta: number }>;
  // Free-form narrative lines — what happened during the crossing.
  events: string[];
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
  s = applyEggLay(s);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);
  s = applyDehydration(s);
  s = reapDead(s, rng);
  return { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
}

export function ford(state: GameState, opts: FordOptions): GameState {
  let s = upgradeState(state);
  // Snapshot for the post-action reveal. We diff against final state to
  // build `FordResult` (see bottom of this function).
  const before = {
    day: s.day,
    cash: s.cash,
    wagonCondition: s.wagon.condition,
    inventory: { ...s.inventory }
  };
  const events: string[] = [];

  // After any ford method succeeds, we've crossed — clear the at-landmark flag
  // so travel can resume toward the next waypoint.
  const clearAtLandmark = (st: GameState): GameState => ({
    ...st,
    location: { ...st.location, atLandmarkId: null }
  });

  let crossed = false;

  switch (opts.method) {
    case 'ferry': {
      if (s.cash < opts.river.ferryPrice) {
        throw new Error(`ford: not enough cash for ferry ($${s.cash} < $${opts.river.ferryPrice})`);
      }
      s = { ...s, cash: s.cash - opts.river.ferryPrice };
      const line = `Paid $${opts.river.ferryPrice} for ferry across the river.`;
      events.push(line);
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: line }] };
      s = clearAtLandmark(passiveDay(s, 'ferry'));
      crossed = true;
      break;
    }

    case 'caulk': {
      const line = 'Caulked the wagon and floated across the river.';
      events.push(line);
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: line }] };
      s = passiveDay(s, 'caulk-1');
      s = passiveDay(s, 'caulk-2');
      s = clearAtLandmark(s);
      crossed = true;
      break;
    }

    case 'wait': {
      const days = opts.waitDays ?? 1;
      if (!Number.isInteger(days) || days <= 0) {
        throw new Error('ford: waitDays must be a positive integer');
      }
      const line = `Waiting ${days} day${days === 1 ? '' : 's'} for the river to drop.`;
      events.push(line);
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: line }] };
      for (let i = 0; i < days; i++) {
        s = passiveDay(s, `wait-${i}`);
      }
      // "Wait" alone doesn't cross the river — you still need to choose a method afterward.
      // So atLandmarkId stays. Player will click Ford/Caulk/Ferry later.
      break;
    }

    case 'ford': {
      const rng = makeRng(`${s.seed}:action:ford:${s.day}:ford`);
      const danger = (opts.river.depthFt / 2) * (opts.river.currentMph / 2);

      if (rng.chance(Math.min(0.7, danger / 10))) {
        const dmg = Math.round(rng.int(5, 20) * danger);
        const line = `Wagon took damage fording the river. Condition -${dmg}.`;
        events.push(line);
        s = {
          ...s,
          wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - dmg) },
          eventLog: [...s.eventLog, { day: s.day, text: line }]
        };
      }

      if (rng.chance(Math.min(0.5, danger / 8))) {
        const loss = rng.int(5, 20);
        const currentFlour = s.inventory.flour ?? 0;
        const taken = Math.min(currentFlour, loss);
        if (taken > 0) {
          const line = `Lost ${taken} lb of supplies in the current.`;
          events.push(line);
          s = {
            ...s,
            inventory: { ...s.inventory, flour: currentFlour - taken },
            eventLog: [...s.eventLog, { day: s.day, text: line }]
          };
        }
      }

      // Chickens in the coop are exposed on the ford method too — coops
      // get tipped and the birds drown or drift. Scales with danger.
      const chickens = s.inventory.chicken ?? 0;
      if (chickens > 0 && rng.chance(Math.min(0.4, danger / 10 + 0.1))) {
        const lost = Math.min(chickens, rng.int(1, Math.max(1, Math.ceil(chickens / 2))));
        const line = `The coop tipped in the current. ${lost} ${lost === 1 ? 'hen' : 'hens'} lost.`;
        events.push(line);
        s = {
          ...s,
          inventory: { ...s.inventory, chicken: chickens - lost },
          eventLog: [...s.eventLog, { day: s.day, text: line }]
        };
      }

      // Dog loss risk scales with river danger — ~3% at a calm ford,
      // up to ~15% at a deep, fast river. Ferry + caulk skip this
      // check because the dog isn't in the current.
      if (s.dog && rng.chance(Math.min(0.15, danger / 20 + 0.03))) {
        const dogName = s.dog.name;
        const line = `${dogName} was swept away in the current. The party watched helpless from the far bank.`;
        events.push(line);
        s = {
          ...s,
          dog: undefined,
          morale: Math.max(0, s.morale - 10),
          eventLog: [...s.eventLog, { day: s.day, text: line }]
        };
      }

      const success = 'Forded the river.';
      events.push(success);
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: success }] };
      s = clearAtLandmark(passiveDay(s, 'ford'));
      crossed = true;
      break;
    }
  }

  // Build the reveal summary — diff the inventory snapshot, compute
  // elapsed days, record cash + wagon condition deltas. Stash on flags.
  const invIds = new Set<string>([
    ...Object.keys(before.inventory),
    ...Object.keys(s.inventory)
  ]);
  const inventoryDelta: FordResult['inventoryDelta'] = [];
  for (const id of invIds) {
    const b = before.inventory[id] ?? 0;
    const a = s.inventory[id] ?? 0;
    if (a !== b) inventoryDelta.push({ id, delta: a - b });
  }

  const result: FordResult = {
    method: opts.method,
    daysElapsed: s.day - before.day,
    crossed,
    cashDelta: s.cash - before.cash,
    wagonConditionBefore: before.wagonCondition,
    wagonConditionAfter: s.wagon.condition,
    inventoryDelta,
    events
  };

  return {
    ...s,
    flags: {
      ...s.flags,
      _fordResult: result as unknown as Record<string, unknown>
    }
  };
}

