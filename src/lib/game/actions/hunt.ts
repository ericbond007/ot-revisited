import type { GameState } from '../types';
import { makeRng } from '../rng';
import { hasLiveHunter, hasLiveGunsmith } from '../professions/predicates';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';
import { applySpoilage, computeSpoilDay } from '../systems/spoilage';
import { applyDehydration } from '../systems/dehydration';
import { applyEggLay } from '../systems/eggs';

export type HuntTarget = 'small' | 'medium' | 'big' | 'gather';
export type AmmoBand = 'light' | 'moderate' | 'heavy';

export interface HuntOptions {
  target: HuntTarget;
  ammo: AmmoBand;
  hunters: number;
}

// Structured haul summary written to flags._huntHaul by hunt(). Consumed
// by PostHuntModal; cleared by the ?/ackHunt action after the player
// acknowledges. Kept JSON-serializable — goes through the save format.
export interface HuntHaul {
  target: HuntTarget;
  meat: number;       // lb of fresh game_meat added
  berries: number;    // lb of wild berries gathered
  liver: boolean;     // organ eaten fresh — morale/health already applied
  bullets: number;    // bullets spent
  injured: string | null; // name of injured member, if any
  spoilDay: number | null; // day meat pile spoils; null when no meat
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
  s = applyEggLay(s);
  // Spoilage fires before consumption so rotten meat is purged, not eaten.
  s = applySpoilage(s);
  s = applyDailyConsumption(s);
  s = adjustMorale(s, rng);

  const profile = BASE_YIELD_BY_TARGET[opts.target];
  const bullets = isGather ? 0 : AMMO_BY_BAND[opts.ammo];
  const availableBullets = s.inventory.bullets ?? 0;
  const spentBullets = Math.min(bullets, availableBullets);

  let yieldMultiplier = 1;
  if (hasLiveHunter(s)) yieldMultiplier += 0.2;
  if (hasLiveGunsmith(s)) yieldMultiplier += 0.2;
  // A dog retrieves, flushes, tracks — documented emigrant-party boost.
  // Small so it stacks under profession bonuses without dwarfing them.
  if (s.dog) yieldMultiplier += 0.15;
  // News-driven herd tip (#150) — bumps yield while the rumor window
  // is open. Lets gossip pay off when the player acts on it.
  const huntBonusUntil = (s.flags._huntBonusUntilDay as number | undefined) ?? 0;
  if (huntBonusUntil > s.day) yieldMultiplier += 0.25;

  let carryMultiplier = 1;
  if (opts.hunters === 2) {
    carryMultiplier = rifleCount >= 2 ? 1.8 : 1.5;
  }

  const rawYield = rng.int(profile.min, profile.max);
  const meatLbs = isGather
    ? rawYield
    : Math.round(rawYield * yieldMultiplier * carryMultiplier * (spentBullets / AMMO_BY_BAND.moderate));

  // Gather yields berries + a few foraged herbs (routed through `berries`
  // as a generic wild-food proxy). Hunts yield fresh game meat and often
  // additional berries dressed from the kill site. Meat refreshes the
  // spoil clock on the whole pile — newer kill delays rot on everything,
  // a simplification over per-lb aging.
  const meatGain = isGather ? 0 : Math.max(0, meatLbs);

  // Berries: gather produces the yield itself; hunts get a 20% bonus
  // sprinkle from the processing area (3–8 lb).
  const berriesGain = isGather
    ? Math.max(0, meatLbs)
    : rng.chance(0.2)
      ? rng.int(3, 8)
      : 0;

  // Liver: large-game kills nearly always yield an organ eaten fresh
  // that night — morale + small health bump. Not inventoried; it's
  // consumed on the spot by convention. Roll chance scales with target.
  //   small: 0 — rabbits and birds don't produce a trail-worthy liver.
  //   medium: 55% — deer, antelope.
  //   big:    85% — buffalo, bear, elk.
  const liverChance = opts.target === 'big' ? 0.85 : opts.target === 'medium' ? 0.55 : 0;
  const liverFound = !isGather && meatGain > 0 && liverChance > 0 && rng.chance(liverChance);

  // Liver effect: adult party gets +3 morale and +2 health (capped at
  // their existing max). Iron-rich organ, shared raw or seared.
  if (liverFound) {
    s = {
      ...s,
      morale: Math.min(100, s.morale + 3),
      party: s.party.map((m) =>
        !m.dead && m.kind === 'adult'
          ? { ...m, health: Math.min(100, m.health + 2) }
          : m
      )
    };
  }

  const nextInventory: Record<string, number> = {
    ...s.inventory,
    bullets: availableBullets - spentBullets
  };
  if (meatGain > 0) {
    nextInventory.game_meat = (s.inventory.game_meat ?? 0) + meatGain;
  }
  if (berriesGain > 0) {
    nextInventory.berries = (s.inventory.berries ?? 0) + berriesGain;
  }
  const nextFlags = meatGain > 0
    ? { ...s.flags, _gameMeatSpoilDay: computeSpoilDay(s.day) }
    : { ...s.flags };
  s = { ...s, inventory: nextInventory, flags: nextFlags };

  let injuredName: string | null = null;
  if (profile.injuryRisk > 0 && rng.chance(profile.injuryRisk)) {
    // Only adults hunt, so only adults take hunting injuries.
    const alive = s.party.filter((m) => !m.dead && m.kind === 'adult');
    if (alive.length > 0) {
      const victim = alive[rng.int(0, alive.length - 1)];
      injuredName = victim.name;
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
    ? `Gathered ${berriesGain} lb of berries and herbs.`
    : meatLbs > 0
      ? `Hunt returned ${meatLbs} lb of fresh game meat (${spentBullets} bullets). Eat it or cure it before it spoils.`
      : `Hunt returned empty-handed (${spentBullets} bullets).`;
  s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: logText }] };

  // Stash a structured haul summary for the post-hunt modal. The UI reads
  // this flag and renders a "here's your haul" screen before the player
  // returns to /play. Cleared by the ?/ackHunt action.
  const haul: HuntHaul = {
    target: opts.target,
    meat: meatGain,
    berries: berriesGain,
    liver: liverFound,
    bullets: spentBullets,
    injured: injuredName,
    spoilDay: meatGain > 0 ? computeSpoilDay(s.day) : null
  };
  // Cast required because HuntHaul is a named interface (stricter than
   // the Record<string, unknown> branch of flags). Round-trips fine through
   // JSON save/load.
  s = { ...s, flags: { ...s.flags, _huntHaul: haul as unknown as Record<string, unknown> } };

  s = applyDehydration(s);
  s = reapDead(s, rng);
  s = { ...s, day: s.day + 1, date: advanceOneDay(s.date) };
  return s;
}
