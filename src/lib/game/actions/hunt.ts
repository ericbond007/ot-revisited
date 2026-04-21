import type { GameState } from '../types';
import { makeRng } from '../rng';
import { hasLiveHunter, hasLiveGunsmith } from '../professions/predicates';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';

export type HuntTarget = 'small' | 'medium' | 'big' | 'gather';
export type AmmoBand = 'light' | 'moderate' | 'heavy';

export interface HuntOptions {
  target: HuntTarget;
  ammo: AmmoBand;
  hunters: number;
}

const AMMO_BY_BAND: Record<AmmoBand, number> = {
  light: 5,
  moderate: 10,
  heavy: 20
};

const BASE_YIELD_BY_TARGET: Record<HuntTarget, { min: number; max: number; injuryRisk: number }> = {
  small: { min: 5, max: 20, injuryRisk: 0 },
  medium: { min: 20, max: 60, injuryRisk: 0.02 },
  big: { min: 60, max: 200, injuryRisk: 0.08 },
  gather: { min: 4, max: 14, injuryRisk: 0 }
};

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

export function hunt(state: GameState, opts: HuntOptions): GameState {
  if (opts.hunters < 1 || opts.hunters > 2 || !Number.isInteger(opts.hunters)) {
    throw new Error(`hunt: hunters must be 1 or 2, got ${opts.hunters}`);
  }

  const rifleCount = state.inventory.rifle ?? 0;
  const isGather = opts.target === 'gather';

  if (!isGather && rifleCount === 0) {
    throw new Error('hunt: no rifle in inventory; use target "gather" for foraging-only');
  }

  let s = upgradeState(state);
  const rng = makeRng(`${s.seed}:action:hunt:${s.day}:0`);

  s = progressConditions(s, rng);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);

  const profile = BASE_YIELD_BY_TARGET[opts.target];
  const bullets = isGather ? 0 : AMMO_BY_BAND[opts.ammo];
  const availableBullets = s.inventory.bullets ?? 0;
  const spentBullets = Math.min(bullets, availableBullets);

  let yieldMultiplier = 1;
  if (hasLiveHunter(s)) yieldMultiplier += 0.2;
  if (hasLiveGunsmith(s)) yieldMultiplier += 0.2;

  let carryMultiplier = 1;
  if (opts.hunters === 2) {
    carryMultiplier = rifleCount >= 2 ? 1.8 : 1.5;
  }

  const rawYield = rng.int(profile.min, profile.max);
  const meatLbs = isGather
    ? rawYield
    : Math.round(rawYield * yieldMultiplier * carryMultiplier * (spentBullets / AMMO_BY_BAND.moderate));

  const key = isGather ? 'flour' : 'bacon';
  const current = s.inventory[key] ?? 0;
  s = {
    ...s,
    inventory: {
      ...s.inventory,
      [key]: current + Math.max(0, meatLbs),
      bullets: availableBullets - spentBullets
    }
  };

  if (profile.injuryRisk > 0 && rng.chance(profile.injuryRisk)) {
    const alive = s.party.filter((m) => !m.dead);
    if (alive.length > 0) {
      const victim = alive[rng.int(0, alive.length - 1)];
      s = {
        ...s,
        party: s.party.map((m) =>
          m.id === victim.id
            ? { ...m, health: Math.max(0, m.health - 10), conditions: [...m.conditions, { id: 'broken_leg', daysSinceOnset: 0 }] }
            : m
        ),
        eventLog: [...s.eventLog, { day: s.day, text: `${victim.name} was injured during the hunt.` }]
      };
    }
  }

  const logText = isGather
    ? `Gathered ${meatLbs} lb of berries and roots.`
    : meatLbs > 0
      ? `Hunt returned ${meatLbs} lb of meat (${spentBullets} bullets).`
      : `Hunt returned empty-handed (${spentBullets} bullets).`;
  s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: logText }] };

  s = reapDead(s, rng);
  s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  return s;
}
