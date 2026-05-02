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
  /** Big-game only (#199): 'full' butchery takes everything (default);
   * 'prize_only' takes tongue + hump and leaves the rest. Period truth
   * — emigrant diaries describe shooting buffalo for the prized cuts
   * alone. Lighter haul, less spoilage pressure, no morale penalty
   * (celebrated as a delicacy run). */
  style?: 'full' | 'prize_only';
  /** Independent of `style`: render fat into tallow on medium/big kills.
   * Default true. Setting false skips the rendering step — saves time
   * but forfeits the tallow byproduct. */
  renderTallow?: boolean;
}

// Structured haul summary written to flags._huntHaul by hunt(). Consumed
// by PostHuntModal; cleared by the ?/ackHunt action after the player
// acknowledges. Kept JSON-serializable — goes through the save format.
export interface HuntHaul {
  target: HuntTarget;
  meat: number;       // lb of fresh game_meat added
  berries: number;    // lb of wild berries gathered
  liver: boolean;     // organ eaten fresh — morale/health already applied
  // #182 byproducts — set on medium/big kills.
  tallow: number;     // lb of rendered fat (medium 5–10, big 15–40)
  prizeCut: number;   // lb of tongue+hump delicacy (big only, 1–2)
  rawHides: number;   // count of raw hides taken (medium 60% ×1, big 80% ×1–2)
  bullets: number;    // bullets spent
  injured: string | null; // name of injured member, if any
  /** True when the hunt's injury came from a grizzly mauling (#198) — used
   * by the post-hunt modal to replace "was injured" with the dramatic
   * variant. Optional for save-format compatibility with pre-#198 saves. */
  mauled?: boolean;
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

// #198 — grizzly mauling on big-game hunts in mountain terrain. Lewis
// & Clark catalogued grizzlies as the trail's most-feared animal;
// emigrant diaries from the Snake / Sierra / Yellowstone basin record
// maulings of solo hunters who startled sows or guarding kills. A
// single rifle ball rarely stopped one; the encounter went bad fast.
// Hunter profession halves the risk — they read the bear sign, hunt
// in pairs, and pick approach lines that don't crowd thickets.
const GRIZZLY_MAUL_CHANCE = 0.05;
const GRIZZLY_HP_MIN = 25;
const GRIZZLY_HP_MAX = 45;

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
  // #174 — every shot consumes 1 charge of gunpowder + 1 cast lead ball
  // + 1 percussion cap. Whichever component runs out first caps the
  // hunt. Caps were the historical bottleneck (couldn't be made on the
  // trail), and the math works out the same here: rifle, all three
  // ammo items, and the band determine `spentBullets`.
  const desired = isGather ? 0 : AMMO_BY_BAND[opts.ammo];
  const availPowder = s.inventory.gunpowder ?? 0;
  const availBalls  = s.inventory.lead_balls ?? 0;
  const availCaps   = s.inventory.percussion_caps ?? 0;
  const spentBullets = Math.min(desired, availPowder, availBalls, availCaps);

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
  // Prize-only on big game (#199): we shot the animal but only carried
  // off the tongue + hump; meat / hide / tallow get left for wolves.
  const isPrizeOnly = !isGather && opts.target === 'big' && opts.style === 'prize_only';
  const meatGain = isGather || isPrizeOnly ? 0 : Math.max(0, meatLbs);

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

  // #182 hunt byproducts — tallow, prize cuts (big only), raw hides.
  // All scaled by yieldFraction so an empty-handed hunt (spentBullets=0
  // or whiff) doesn't pay byproducts; a partial-success haul gives
  // partial byproducts. Period: no kill, no skin.
  const yieldFraction = isGather ? 0
    : spentBullets === 0 ? 0
      : Math.max(0, meatLbs) / Math.max(1, profile.max);
  let tallowGain = 0;
  let prizeCutGain = 0;
  let rawHideGain = 0;
  const renderTallow = opts.renderTallow ?? true;
  if (isPrizeOnly && yieldFraction > 0) {
    // #199 — kill went down but the party only carried off tongue + hump.
    // 4–8 lb of prize cut, no meat / hide. No morale penalty; emigrant
    // diaries describe this as a celebrated delicacy run. Tallow can
    // still be rendered if `renderTallow` is true — the fat is right
    // there next to the prized cuts.
    prizeCutGain = Math.max(1, Math.round(rng.int(4, 8) * yieldFraction));
    if (renderTallow) {
      tallowGain = Math.round(rng.int(15, 40) * yieldFraction * 0.4);
    }
  } else if (!isGather && meatGain > 0) {
    if (opts.target === 'medium') {
      if (renderTallow) tallowGain = Math.round(rng.int(5, 10) * yieldFraction);
      if (rng.chance(0.6)) rawHideGain = 1;
    } else if (opts.target === 'big') {
      if (renderTallow) tallowGain = Math.round(rng.int(15, 40) * yieldFraction);
      if (rng.chance(0.7)) prizeCutGain = rng.int(1, 2);
      if (rng.chance(0.8)) rawHideGain = rng.int(1, 2);
    }
  }

  const nextInventory: Record<string, number> = {
    ...s.inventory,
    gunpowder:       availPowder - spentBullets,
    lead_balls:      availBalls  - spentBullets,
    percussion_caps: availCaps   - spentBullets
  };
  if (meatGain > 0) {
    nextInventory.game_meat = (s.inventory.game_meat ?? 0) + meatGain;
  }
  if (berriesGain > 0) {
    nextInventory.berries = (s.inventory.berries ?? 0) + berriesGain;
  }
  if (tallowGain > 0) {
    nextInventory.tallow = (s.inventory.tallow ?? 0) + tallowGain;
  }
  if (prizeCutGain > 0) {
    nextInventory.prize_cut = (s.inventory.prize_cut ?? 0) + prizeCutGain;
  }
  if (rawHideGain > 0) {
    nextInventory.raw_hide = (s.inventory.raw_hide ?? 0) + rawHideGain;
  }
  const nextFlags = meatGain > 0
    ? { ...s.flags, _gameMeatSpoilDay: computeSpoilDay(s.day) }
    : { ...s.flags };
  s = { ...s, inventory: nextInventory, flags: nextFlags };

  let injuredName: string | null = null;
  let mauled = false;
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

  // #198 — grizzly mauling roll on big-game hunts in mountain terrain.
  // Independent of the routine injury roll above; a hunter can be both
  // sprained AND mauled on the same trip, but the maul is the headline.
  // Hunter halves the rate; the dog (#137) gives no help — bears don't
  // care.
  const inGrizzlyCountry = opts.target === 'big' && s.location.terrain === 'mountains';
  if (inGrizzlyCountry) {
    const baseChance = hasLiveHunter(s) ? GRIZZLY_MAUL_CHANCE * 0.5 : GRIZZLY_MAUL_CHANCE;
    if (rng.chance(baseChance)) {
      const alive = s.party.filter((m) => !m.dead && m.kind === 'adult');
      if (alive.length > 0) {
        const victim = alive[rng.int(0, alive.length - 1)];
        const damage = rng.int(GRIZZLY_HP_MIN, GRIZZLY_HP_MAX);
        injuredName = victim.name;
        mauled = true;
        s = {
          ...s,
          party: s.party.map((m) =>
            m.id === victim.id
              ? {
                  ...m,
                  health: Math.max(0, m.health - damage),
                  conditions: [
                    ...m.conditions.filter((c) => c.id !== 'bear_mauling'),
                    { id: 'bear_mauling', daysSinceOnset: 0 }
                  ]
                }
              : m
          ),
          eventLog: [
            ...s.eventLog,
            { day: s.day, text: `A grizzly came out of the brush — ${victim.name} mauled. -${damage} HP.` }
          ]
        };
      }
    }
  }

  const logText = isGather
    ? `Gathered ${berriesGain} lb of berries and herbs.`
    : isPrizeOnly
      ? prizeCutGain > 0
        ? `Took ${prizeCutGain} lb of tongue and hump and left the rest for the wolves (${spentBullets} shots). Feast tonight.`
        : `Shots missed; came back empty-handed (${spentBullets} shots).`
      : meatLbs > 0
        ? `Hunt returned ${meatLbs} lb of fresh game meat (${spentBullets} shots). Eat it or cure it before it spoils.`
        : `Hunt returned empty-handed (${spentBullets} shots).`;
  s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: logText }] };

  // Stash a structured haul summary for the post-hunt modal. The UI reads
  // this flag and renders a "here's your haul" screen before the player
  // returns to /play. Cleared by the ?/ackHunt action.
  const haul: HuntHaul = {
    target: opts.target,
    meat: meatGain,
    berries: berriesGain,
    liver: liverFound,
    tallow: tallowGain,
    prizeCut: prizeCutGain,
    rawHides: rawHideGain,
    bullets: spentBullets,
    injured: injuredName,
    mauled,
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
