import type { GameState } from '../types';
import { makeRng } from '../rng';
import { hasLiveFarmer, hasLiveTeamster, hasLivePreacher } from '../professions/predicates';
import { TEAMSTER_RECOVERY_MULT } from '../systems/oxen';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption, applyDirtyWaterRisk } from '../systems/consumption';
import { applyStarvation } from '../systems/starvation';
import { tickWeather } from '../systems/weather';
import { progressConditions } from '../systems/conditions';
import { adjustMorale, healingMultiplier } from '../systems/morale';
import { recoverOxenFatigue } from '../systems/oxen';
import { attemptFire } from '../systems/fire';
import { reapDead } from '../systems/death';
import { applyDehydration } from '../systems/dehydration';
import { applyEggLay } from '../systems/eggs';
import {
  getCampAction,
  hourCostFor,
  type CampActionId
} from './camp-actions';

// Rest is the unified "stationary day" action. 1+ days of no travel with:
//   - condition progression + consumption + morale adjust (each day)
//   - accelerated healing scaled by morale
//   - ox fatigue recovery (25/day)
//   - Farmer auto-forage if present
//   - optional camp actions applied on the first day (12-hour budget)
// Camp actions are drawn from the unified registry in camp-actions.ts —
// shovel work (dig_well/dig_grave/dig_out) is part of that registry, so
// this file doesn't special-case any action.

export interface RestOptions {
  campActions?: CampActionId[];
}

// Structured reveal written to flags._campSummary by rest(). Consumed by
// CampSummaryModal; cleared by the `?/ackCamp` server action after the
// player acknowledges. JSON-serializable — goes through the save format.
export interface CampSummary {
  daysRested: number;
  startDay: number;
  morale: { before: number; after: number };
  party: Array<{
    id: string;
    name: string;
    healthBefore: number;
    healthAfter: number;
    dead: boolean;
    diedDuringRest: boolean;
  }>;
  oxen: {
    avgFatigueBefore: number;
    avgFatigueAfter: number;
    alive: number;
    total: number;
  };
  activities: Array<{ id: CampActionId; label: string; icon: string }>;
  // Per-item net change in inventory during the rest. Positive = gained,
  // negative = consumed. The modal filters to "interesting" items; raw
  // data lives here so the surface can evolve without rest.ts changes.
  inventoryDelta: Array<{ id: string; delta: number }>;
  water: { before: number; after: number };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

const OX_FATIGUE_RECOVERY_PER_REST_DAY = 25;
const BASE_HEAL_PER_REST_DAY = 8;
// Berries the Farmer rounds up at rest — wild blackberry / chokeberry /
// serviceberry / currant on the prairie or forest, frozen out in winter.
// Realistic wild-edibles forage; bonus to a profession that knows the
// land. (Old design: +3 lb flour/day from thin air — replaced.)
const FARMER_FORAGE_BERRIES = 4;
const TIME_BUDGET_HOURS = 12;

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

export function rest(state: GameState, days: number, opts: RestOptions = {}): GameState {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('rest: days must be a positive integer');
  }

  let s = upgradeState(state);
  const startDay = s.day;
  // Snapshot pre-rest state for the post-rest summary. Deep-enough for
  // what the summary needs (primitives + arrays of primitives inside
  // structs are already re-created by the reducers, so references
  // stay stable).
  const before = {
    morale: s.morale,
    inventory: { ...s.inventory },
    water: s.resources.water,
    party: s.party.map((m) => ({ id: m.id, health: m.health, dead: m.dead })),
    oxen: s.oxen.map((o) => ({ id: o.id, fatigue: o.fatigue, health: o.health }))
  };

  for (let i = 0; i < days; i++) {
    const rng = makeRng(`${s.seed}:action:rest:${s.day}:0`);

    s = tickWeather(s, rng);
    s = progressConditions(s, rng);
    s = applyEggLay(s);
    s = applyDailyConsumption(s);
    s = applyDirtyWaterRisk(s, rng);
    s = applyStarvation(s);
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

    // Farmer foraging — wild berries Apr–Sep when plants are bearing.
    // Off-season (Oct–Mar) the farmer's bonus is just the food efficiency
    // multiplier in consumption.ts — nothing to forage from frozen ground.
    if (hasLiveFarmer(s)) {
      const month = s.date.month;
      const inSeason = month >= 4 && month <= 9;
      if (inSeason) {
        const currentBerries = s.inventory.berries ?? 0;
        s = {
          ...s,
          inventory: { ...s.inventory, berries: currentBerries + FARMER_FORAGE_BERRIES }
        };
      }
    }

    // Preacher +1 morale per rest night. (Whore's contribution is the
    // explicit `share_the_whore` camp action below, not a passive.)
    if (hasLivePreacher(s)) {
      s = { ...s, morale: Math.min(100, s.morale + 1) };
    }

    // Camp actions apply on the first day only, sharing the 12-hour
    // budget. Budget check and availability gates fire up front so the
    // player gets a clean failure mode instead of partial application.
    if (i === 0 && opts.campActions && opts.campActions.length > 0) {
      const totalHours = opts.campActions
        .reduce((sum, id) => sum + hourCostFor(getCampAction(id), s), 0);
      if (totalHours > TIME_BUDGET_HOURS) {
        throw new Error(
          `rest: camp action budget exceeded (${totalHours} > ${TIME_BUDGET_HOURS} hours)`
        );
      }

      for (const id of opts.campActions) {
        const action = getCampAction(id);
        const avail = action.availability(s);
        if (!avail.available) {
          throw new Error(`rest: camp action "${id}" unavailable: ${avail.reason ?? 'no reason'}`);
        }
        s = action.apply(s, rng);
      }
    }

    // Dehydration runs AFTER camp actions so dig_well water refills
    // clear the dry-day counter the same tick they're earned.
    s = applyDehydration(s);

    s = reapDead(s, rng);

    s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  }

  s = {
    ...s,
    eventLog: [...s.eventLog, { day: startDay, text: `Rested for ${days} day${days === 1 ? '' : 's'}.` }]
  };

  // Build the post-rest summary by diffing the snapshot against final
  // state. Party + oxen are keyed by id so re-ordering doesn't confuse
  // the delta; inventory is a full-keyspace walk so new items are
  // surfaced.
  const invIds = new Set<string>([
    ...Object.keys(before.inventory),
    ...Object.keys(s.inventory)
  ]);
  const inventoryDelta: CampSummary['inventoryDelta'] = [];
  for (const id of invIds) {
    const b = before.inventory[id] ?? 0;
    const a = s.inventory[id] ?? 0;
    if (a !== b) inventoryDelta.push({ id, delta: a - b });
  }

  const partyDelta: CampSummary['party'] = s.party.map((m) => {
    const b = before.party.find((p) => p.id === m.id);
    return {
      id: m.id,
      name: m.name,
      healthBefore: b?.health ?? m.health,
      healthAfter: m.health,
      dead: m.dead,
      diedDuringRest: m.dead && !(b?.dead ?? false)
    };
  });

  const oxAliveBefore = before.oxen.filter((o) => o.health > 0);
  const oxAliveAfter = s.oxen.filter((o) => o.health > 0);

  const summary: CampSummary = {
    daysRested: days,
    startDay,
    morale: { before: before.morale, after: s.morale },
    party: partyDelta,
    oxen: {
      avgFatigueBefore: avg(oxAliveBefore.map((o) => o.fatigue)),
      avgFatigueAfter: avg(oxAliveAfter.map((o) => o.fatigue)),
      alive: oxAliveAfter.length,
      total: s.oxen.length
    },
    activities: (opts.campActions ?? []).map((id) => {
      const a = getCampAction(id);
      return { id: a.id, label: a.label, icon: a.icon };
    }),
    inventoryDelta,
    water: { before: before.water, after: s.resources.water }
  };

  s = {
    ...s,
    flags: {
      ...s.flags,
      _campSummary: summary as unknown as Record<string, unknown>
    }
  };

  return s;
}
