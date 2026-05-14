import type { GameState, NpcWagonState } from '../types';
import { makeRng } from '../rng';
import { hasLiveHunter } from '../professions/predicates';
import { upgradeState } from '../upgrade';
import { applyDailyConsumption } from '../systems/consumption';
import { progressConditions } from '../systems/conditions';
import { adjustMorale } from '../systems/morale';
import { reapDead } from '../systems/death';
import { applySpoilage, computeSpoilDay, setNpcSpoilClock } from '../systems/spoilage';
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
  /** #294 — 'solo' (default) keeps the existing behavior: yield goes
   * to the player wagon. 'company' assembles a hunting party from the
   * train (only valid when in-train), bumps the yield with each
   * companion's contribution, and divides the meat by alive-soul count
   * across all wagons (Marcy 1859 equity rule). Period: trains
   * organized hunts at sundown for the next morning; the captain
   * picked riders + rifles, and the kill was divided by household.
   * Going solo while in-train slightly drops train morale — the
   * company saw you break the equity rule. */
  mode?: 'solo' | 'company';
}

// Structured haul summary written to flags._huntHaul by hunt(). Consumed
// by PostHuntModal; cleared by the ?/ackHunt action after the player
// acknowledges. Kept JSON-serializable — goes through the save format.
export interface HuntHaul {
  target: HuntTarget;
  meat: number;       // lb of fresh game_meat added (player's share on company hunt)
  berries: number;    // lb of wild berries gathered
  liver: boolean;     // organ eaten fresh — morale/health already applied
  // #182 byproducts — set on medium/big kills. Stay with the player
  // wagon even on company hunts — period: hides/tallow traveled with
  // the killer wagon.
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
  // #294 — company-hunt fields. `mode` records which path ran;
  // `companyShareLb` is total lb redistributed to companion wagons
  // (already moved into their inventories when this haul is written).
  // Both optional for save-format compatibility with pre-#294 saves.
  mode?: 'solo' | 'company';
  companyShareLb?: number;
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
  // #317a — gunsmith's old +20% yield was placeholder hunter-overlap.
  // Gunsmith now bonuses casting yield + brings a 2nd starter rifle;
  // hunt-yield is hunter's territory.
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
  // #294 — company hunt assembles a hunting party from the train.
  // Each in-progress companion contributes a hunter (period: every
  // wagon could field at least one man with a rifle). Yield bumps
  // 0.3x per companion — calibrated so a 5-companion train roughly
  // doubles the haul (1 + 5×0.3 = 2.5x with 5 wagons, the larger
  // share-out below offsets that). Forage doesn't get the bump (no
  // company-foraging mechanic).
  const isCompanyHunt = opts.mode === 'company' && !!s.wagonTrain;
  const liveCompanions = isCompanyHunt
    ? s.wagonTrain!.companions.filter((c) => c.outcome === 'in-progress')
    : [];
  if (isCompanyHunt && !isGather) {
    carryMultiplier *= 1 + 0.3 * liveCompanions.length;
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
  //   medium: 55% — deer, pronghorn.
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

  // #294 — divide the meat across all wagons by alive-soul count when
  // running a company hunt. Period anchor: Marcy 1859 codifies the
  // captain enforcing "share by household" for buffalo/elk hunts. The
  // player's wagon gets its proportional cut (`playerShareLb`); the
  // rest moves into companion inventories below. Solo hunts skip this
  // — the player keeps everything regardless of train.
  //
  // Distribute from the running `leftover` and `remainingSouls` so
  // rounding never overshoots — the final companion always gets the
  // remainder, and intermediate rounds can't drive `leftover` negative
  // because each round takes a fraction of what's left, not of the
  // total. Floors at 0 defensively for the last share even though the
  // math should prevent it.
  let playerShareLb = meatGain;
  let companyShareLb = 0;
  type CompanionShare = { wagonId: string; lb: number };
  const companionShares: CompanionShare[] = [];
  if (isCompanyHunt && meatGain > 0) {
    const playerSouls = s.party.filter((m) => !m.dead).length;
    const compSouls = liveCompanions.map((c) => c.party.filter((p) => !p.dead).length);
    const totalSouls = playerSouls + compSouls.reduce((a, b) => a + b, 0);
    if (totalSouls > 0) {
      playerShareLb = Math.round(meatGain * (playerSouls / totalSouls));
      let leftover = meatGain - playerShareLb;
      let remainingSouls = totalSouls - playerSouls;
      for (let i = 0; i < liveCompanions.length; i++) {
        const compSoul = compSouls[i];
        const isLast = i === liveCompanions.length - 1;
        const lb = isLast
          ? Math.max(0, leftover)
          : remainingSouls > 0
            ? Math.round(leftover * (compSoul / remainingSouls))
            : 0;
        leftover -= lb;
        remainingSouls -= compSoul;
        companionShares.push({ wagonId: liveCompanions[i].id, lb });
      }
      companyShareLb = companionShares.reduce((a, c) => a + c.lb, 0);
    }
  }

  if (playerShareLb > 0) {
    nextInventory.game_meat = (s.inventory.game_meat ?? 0) + playerShareLb;
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
  const nextFlags = playerShareLb > 0
    ? { ...s.flags, _gameMeatSpoilDay: computeSpoilDay(s.day) }
    : { ...s.flags };
  s = { ...s, inventory: nextInventory, flags: nextFlags };

  // #294 — apply company-hunt redistribution + train-morale shifts.
  // Solo hunt while in-train: small −1 train morale per in-progress
  // companion (capped −5) — the company saw you keep the kill alone.
  // Company hunt success: +2 morale per in-progress companion.
  if (s.wagonTrain) {
    const liveTrain = s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
    if (isCompanyHunt && companionShares.length > 0) {
      // #295 — companion meat now spoils on the same curve as the
      // player's pile (`setNpcSpoilClock` matches the player's
      // `_gameMeatSpoilDay` set in nextFlags above). The NPC tick
      // consumes from FOOD_DRAW_ORDER first (game_meat is at index 0),
      // so a wagon will eat the share before it spoils most of the
      // time — but a wagon that's already loaded with bulk staples
      // will see the share rot if it's not consumed within
      // GAME_MEAT_FRESH_DAYS.
      const shareById = new Map(companionShares.map((c) => [c.wagonId, c.lb]));
      s = {
        ...s,
        wagonTrain: {
          ...s.wagonTrain,
          companions: s.wagonTrain.companions.map((c) => {
            if (c.outcome !== 'in-progress') return c;
            const share = shareById.get(c.id) ?? 0;
            const morale = Math.min(100, c.morale + 2);
            if (share <= 0) return { ...c, morale };
            const updated: NpcWagonState = {
              ...c,
              inventory: { ...c.inventory, game_meat: (c.inventory.game_meat ?? 0) + share },
              morale
            };
            return setNpcSpoilClock(updated, 'game_meat', s.day);
          })
        }
      };
    } else if (!isCompanyHunt && !isGather && meatGain > 0 && liveTrain.length > 0) {
      // Solo hunt while in-train with a real haul — the company saw you
      // keep the kill alone. Drop train morale a bit. No effect for
      // empty hunts (no kill = no breach of equity).
      const moraleDrop = Math.min(5, liveTrain.length);
      s = {
        ...s,
        wagonTrain: {
          ...s.wagonTrain,
          companions: s.wagonTrain.companions.map((c) =>
            c.outcome === 'in-progress'
              ? { ...c, morale: Math.max(0, c.morale - moraleDrop) }
              : c
          )
        }
      };
    }
  }

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
        ? isCompanyHunt
          ? `Company hunt brought in ${meatLbs} lb (${spentBullets} shots). Divided by household — your wagon's share: ${playerShareLb} lb.`
          : `Hunt returned ${meatLbs} lb of fresh game meat (${spentBullets} shots). Eat it or cure it before it spoils.`
        : `Hunt returned empty-handed (${spentBullets} shots).`;
  s = { ...s, eventLog: [...s.eventLog, { day: s.day, text: logText }] };

  // Stash a structured haul summary for the post-hunt modal. The UI reads
  // this flag and renders a "here's your haul" screen before the player
  // returns to /play. Cleared by the ?/ackHunt action.
  const haul: HuntHaul = {
    target: opts.target,
    meat: playerShareLb,
    berries: berriesGain,
    liver: liverFound,
    tallow: tallowGain,
    prizeCut: prizeCutGain,
    rawHides: rawHideGain,
    bullets: spentBullets,
    injured: injuredName,
    mauled,
    spoilDay: playerShareLb > 0 ? computeSpoilDay(s.day) : null,
    mode: isCompanyHunt ? 'company' : 'solo',
    companyShareLb
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
