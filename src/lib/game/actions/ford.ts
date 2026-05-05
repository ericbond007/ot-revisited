import type { GameState } from '../types';
import { makeRng, type Rng } from '../rng';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption, applyDirtyWaterRisk } from '../systems/consumption';
import { applyStarvation } from '../systems/starvation';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';
import { applyDehydration } from '../systems/dehydration';
import { applyEggLay } from '../systems/eggs';
import { rollFordLoss } from '../systems/item-loss';
import { exposureMult } from '../systems/warmth';
import { adjustTribeAttitude, getTribeAttitude } from '../systems/tribe-relations';

export interface RiverState {
  depthFt: number;
  currentMph: number;
  ferryPrice: number;
  // #238 Native ferry parameters (mirrors RiverStats.nativeFerry — see
  // landmarks.ts). Plumbed through the server action so the ford() can
  // verify gating + apply the trade.
  nativeFerry?: {
    tribeId: string;
    priceItem: string;
    priceQty: number;
    blurb: string;
  };
}

export type FordMethod = 'ford' | 'caulk' | 'ferry' | 'wait' | 'native_ferry';

export interface FordOptions {
  method: FordMethod;
  river: RiverState;
  waitDays?: number;
}

/** #238 minimum tribe attitude to be offered the native-ferry option. */
export const NATIVE_FERRY_MIN_ATTITUDE = 50;
/** #238 attitude bump from successful native-ferry trade — quiet boost
 *  for paying the customary price without haggling. */
export const NATIVE_FERRY_ATTITUDE_BUMP = 2;

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

// Season + terrain modifier for ford-chill. Wading a Kansas creek in
// July shouldn't cost health — this returns 0 in summer non-mountain
// terrain and ramps with the cold. Mountain rivers stay cold from
// snowmelt year-round, so they always carry some chill.
function chillSeasonMult(state: GameState): number {
  const m = state.date.month;
  const mountains = state.location.terrain === 'mountains';
  let mult: number;
  if (m >= 5 && m <= 9) mult = 0.0;          // May–Sep: warm
  else if (m === 4 || m === 10) mult = 0.5;  // Apr, Oct: shoulder
  else mult = 1.0;                           // Nov–Mar: cold
  if (mountains) mult += 0.25;
  return mult;
}

// Apply a cold-water chill to everyone who went in. `baseHit` is the
// naked-party-in-mild-weather ceiling; mitigated by clothing (via
// `exposureMult`) and amplified by season/terrain. Severe chill
// (warm-season, naked) can also inflict frostbite.
function applyFordChill(
  state: GameState,
  baseHit: number,
  rng: Rng,
  events: string[]
): GameState {
  const exp = exposureMult(state);
  const season = chillSeasonMult(state);
  const perAdult = Math.round(baseHit * exp * season);
  if (perAdult <= 0) return state;

  let s = state;
  let anyAffected = false;
  s = {
    ...s,
    party: s.party.map((m) => {
      if (m.dead) return m;
      anyAffected = true;
      const hit = m.kind === 'child' ? Math.max(1, Math.round(perAdult * 0.7)) : perAdult;
      return { ...m, health: Math.max(0, m.health - hit) };
    })
  };
  if (!anyAffected) return state;

  const line = `Cold water chilled the party — about ${perAdult} HP each.`;
  events.push(line);
  s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: line }] };

  // Severe exposure in cold weather: someone may come out frostbitten.
  if (exp > 0.6 && season > 1.3 && rng.chance(0.25 * exp)) {
    const alive = s.party.filter((m) => !m.dead);
    if (alive.length > 0) {
      const victim = alive[rng.int(0, alive.length - 1)];
      const already = victim.conditions.some((c) => c.id === 'frostbite');
      if (!already) {
        s = {
          ...s,
          party: s.party.map((m) =>
            m.id === victim.id
              ? {
                  ...m,
                  conditions: [
                    ...m.conditions,
                    { id: 'frostbite' as const, daysSinceOnset: 0 }
                  ]
                }
              : m
          )
        };
        const fline = `${victim.name} came out with frostbite.`;
        events.push(fline);
        s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: fline }] };
      }
    }
  }
  return s;
}

function passiveDay(state: GameState, seedSuffix: string): GameState {
  const rng = makeRng(`${state.seed}:action:ford:${state.day}:${seedSuffix}`);
  let s = progressConditions(state, rng);
  s = applyEggLay(s);
  s = applyDailyConsumption(s);
  s = applyDirtyWaterRisk(s, rng);
  s = applyStarvation(s);
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

    case 'native_ferry': {
      // #238 Native-run ferry — bull-boat / raft. Re-checks all gates
      // server-side: river config has the entry, tribe is friendly
      // enough, and party has the trade currency.
      const nf = opts.river.nativeFerry;
      if (!nf) {
        throw new Error('ford: this river has no native-ferry option');
      }
      if (getTribeAttitude(s, nf.tribeId) < NATIVE_FERRY_MIN_ATTITUDE) {
        throw new Error(`ford: ${nf.tribeId} are not friendly enough for the native ferry`);
      }
      const have = s.inventory[nf.priceItem] ?? 0;
      if (have < nf.priceQty) {
        throw new Error(`ford: not enough ${nf.priceItem} (need ${nf.priceQty}, have ${have})`);
      }
      s = {
        ...s,
        inventory: { ...s.inventory, [nf.priceItem]: have - nf.priceQty }
      };
      s = adjustTribeAttitude(s, nf.tribeId, NATIVE_FERRY_ATTITUDE_BUMP);
      const line = `Traded ${nf.priceQty} ${nf.priceItem} for the native ferry — across in a single day.`;
      events.push(line);
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: line }] };
      s = clearAtLandmark(passiveDay(s, 'native-ferry'));
      crossed = true;
      break;
    }

    case 'caulk': {
      const line = 'Caulked the wagon and floated across the river.';
      events.push(line);
      s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: line }] };
      s = passiveDay(s, 'caulk-1');
      s = passiveDay(s, 'caulk-2');
      // Even with a floating wagon, feet, boots, and gear get wet.
      // Lighter chill than a full ford — water spills over the bow.
      const caulkRng = makeRng(`${s.seed}:action:ford:${s.day}:caulk-chill`);
      s = applyFordChill(s, 3, caulkRng, events);
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

      // #306 phase 2 — catastrophic-loss roll. Period: Sager 1844 lost
      // a trunk in the Snake; Carpenter 1857 lost barrels at Green
      // River; Frizzell 1852 records a chest off the raft at the
      // Platte. Picks heavy items from FORD_VICTIMS — cookware,
      // butter_crock, china_tea_set, etc. Danger-scaled; calm fords
      // skip entirely. Independent of the flour-bag roll above (one
      // event can take both the flour AND a trunk).
      const fordResult = rollFordLoss(s, danger, rng);
      if (fordResult.lossLine) {
        events.push(fordResult.lossLine);
        s = fordResult.state;
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
      // Everyone got wet. Chill scales with cold-water exposure: base
      // ramp from danger, mitigated by clothing, gated by season — so
      // a summer prairie ford does no health damage at all.
      const chillBase = Math.round(6 + Math.min(6, danger));
      s = applyFordChill(s, chillBase, rng, events);
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

