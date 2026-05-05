import type { GameState } from '../types';
import type { Rng } from '../rng';
import { hasLivePreacher, hasLiveWhore } from '../professions/predicates';
import { canBoilWater } from '../systems/water-purity';
import { fuelFlavorFor } from '../systems/fire';
import { washAll } from '../systems/cleanliness';
import { deathMoralePenalty } from '../professions/bonuses';
import { tribesAtMile, getTribe } from '../content/tribes';
import { getTribeAttitude, adjustTribeAttitude } from '../systems/tribe-relations';

// Camp actions are one-shot activities the party can do during a rest
// day (applied on day 1 of the rest, same as shovel actions). Each has
// an hour cost that shares the 12-hour daily budget with shovel actions.
//
// Adding a new action = one entry in `CAMP_ACTIONS` with `availability`
// and `apply`. The CampStage renders them as a multi-select grid;
// rest.ts applies each picked action's effect after the day's
// morale/consumption/healing but before death reap.

export interface CampActionAvailability {
  available: boolean;
  reason?: string;
}

export interface CampAction {
  id: CampActionId;
  label: string;
  sub: string;
  icon: string;
  hourCost: number;
  availability: (state: GameState) => CampActionAvailability;
  apply: (state: GameState, rng: Rng) => GameState;
  /** When true, the camp grid omits this action entirely. Used for
   *  desperation actions (e.g. cannibalism) that should stay invisible
   *  until conditions arise. Defaults to never-hidden. */
  hidden?: (state: GameState) => boolean;
}

export type CampActionId =
  | 'pass_whiskey'
  | 'big_meal'
  | 'sing_along'
  | 'read_bible'
  | 'share_the_whore'
  | 'service_train'
  | 'cure_meat'
  | 'cast_balls'
  | 'fish'
  | 'patch_wagon'
  | 'replace_canvas'
  | 'replace_planks'
  | 'stitch_moccasins'
  | 'find_water'
  | 'boil_water'
  | 'dig_well'
  | 'dig_out'
  | 'gather_firewood'
  | 'wash_clothes'
  | 'press_cheese'
  | 'make_soap'
  | 'cannibalism_straws'
  | 'pan_for_gold'
  | 'raid_natives'
  | 'take_from_train';

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

function aliveAdults(s: GameState): number {
  return s.party.filter((m) => !m.dead && m.kind === 'adult').length;
}

function totalFoodLb(s: GameState): number {
  // Sum of the primary food items (excludes coffee/tea, which aren't
  // "meals"). Used only for the big-meal gating.
  const ids = ['game_meat', 'berries', 'flour', 'beans', 'bacon', 'jerky', 'hardtack', 'dried_fruit', 'pemmican'];
  return ids.reduce((sum, id) => sum + (s.inventory[id] ?? 0), 0);
}

// --- Actions ---

const passWhiskey: CampAction = {
  id: 'pass_whiskey',
  label: 'Pass the whiskey',
  sub: '−1 whiskey · +3 morale · small chance of squabble',
  icon: '🥃',
  hourCost: 1,
  availability: (s) =>
    (s.inventory.whiskey ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need whiskey' },
  apply: (s, rng) => {
    const next: Record<string, number> = {
      ...s.inventory,
      whiskey: (s.inventory.whiskey ?? 0) - 1
    };
    // 15% chance a drunk squabble erupts — net −1 morale instead of +3.
    const squabble = rng.chance(0.15);
    const delta = squabble ? -1 : 3;
    const line = squabble
      ? 'Whiskey turned into a shouting match — morale −1.'
      : 'The bottle went around the fire. Spirits lifted — morale +3.';
    return logLine(
      { ...s, inventory: next, morale: Math.max(0, Math.min(100, s.morale + delta)) },
      line
    );
  }
};

const bigMeal: CampAction = {
  id: 'big_meal',
  label: 'Cook a big meal',
  sub: '−4 lb food · +4 morale · +2 health',
  icon: '🍲',
  hourCost: 2,
  availability: (s) =>
    totalFoodLb(s) >= 8
      ? { available: true }
      : { available: false, reason: 'Need at least 8 lb of food' },
  apply: (s) => {
    // Consume 4 lb of food on top of daily rations, drawing from the
    // heaviest piles first so precious pemmican/jerky is spared.
    const order = ['flour', 'beans', 'bacon', 'hardtack', 'game_meat', 'berries', 'dried_fruit', 'jerky', 'pemmican'];
    const inventory: Record<string, number> = { ...s.inventory };
    let remaining = 4;
    for (const id of order) {
      if (remaining <= 0) break;
      const have = inventory[id] ?? 0;
      const take = Math.min(have, remaining);
      if (take > 0) {
        inventory[id] = have - take;
        remaining -= take;
      }
    }
    return logLine(
      {
        ...s,
        inventory,
        morale: Math.min(100, s.morale + 4),
        party: s.party.map((m) =>
          !m.dead && m.kind === 'adult'
            ? { ...m, health: Math.min(100, m.health + 2) }
            : m
        )
      },
      'Cooked a big meal — biscuits, stew, hot coffee. Morale +4, health +2.'
    );
  }
};

const singAlong: CampAction = {
  id: 'sing_along',
  label: 'Campfire sing-along',
  sub: 'Harmonica or fiddle · +3 morale (+5 fiddle, +2 preacher)',
  icon: '🎻',
  hourCost: 2,
  availability: (s) => {
    const hasHarmonica = (s.inventory.harmonica ?? 0) > 0;
    const hasFiddle = (s.inventory.fiddle ?? 0) > 0;
    return hasHarmonica || hasFiddle
      ? { available: true }
      : { available: false, reason: 'Need harmonica or fiddle' };
  },
  apply: (s) => {
    const hasFiddle = (s.inventory.fiddle ?? 0) > 0;
    let delta = hasFiddle ? 5 : 3;
    const preacherBump = hasLivePreacher(s);
    if (preacherBump) delta += 2;
    const instrument = hasFiddle ? 'fiddle' : 'harmonica';
    const preacherLine = preacherBump ? ' The Preacher led hymns.' : '';
    return logLine(
      { ...s, morale: Math.min(100, s.morale + delta) },
      `A ${instrument} sing-along by the fire.${preacherLine} Morale +${delta}.`
    );
  }
};

const readBible: CampAction = {
  id: 'read_bible',
  label: 'Read the Bible',
  sub: 'Bible · 1 hr · +2 morale (+4 with Preacher)',
  icon: '📖',
  hourCost: 1,
  availability: (s) =>
    (s.inventory.bible ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a Bible' },
  apply: (s) => {
    const delta = hasLivePreacher(s) ? 4 : 2;
    const line = hasLivePreacher(s)
      ? `The Preacher read scripture over supper. A settling presence — morale +${delta}.`
      : `Someone read a psalm aloud before bed. The camp quieted — morale +${delta}.`;
    return logLine({ ...s, morale: Math.min(100, s.morale + delta) }, line);
  }
};

// Replaces the old passive Whore +1/male/night. One-shot per camp;
// the punchier per-use yield (+2/male) lines up roughly with what a
// 1-2 night rest gave previously, while putting it in the player's
// hands as an explicit choice. A small chance of jealousy turns the
// night sour — period-flavored squabble, not a hard punishment.
const shareTheWhore: CampAction = {
  id: 'share_the_whore',
  label: 'Share the Whore',
  sub: 'Whore · 2 hr · +2 morale per adult male',
  icon: '💋',
  hourCost: 2,
  availability: (s) => {
    if (!hasLiveWhore(s)) return { available: false, reason: 'No Whore in the party' };
    const males = s.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length;
    if (males <= 0) return { available: false, reason: 'No adult men to take a turn' };
    return { available: true };
  },
  apply: (s, rng) => {
    const males = s.party.filter((m) => !m.dead && m.kind === 'adult' && m.sex === 'male').length;
    const whore = s.party.find((m) => !m.dead && m.profession === 'whore');
    const name = whore?.name ?? 'The Whore';
    // 12% chance jealousy / argument breaks out — net -2 morale instead.
    if (rng.chance(0.12)) {
      return logLine(
        { ...s, morale: Math.max(0, s.morale - 2) },
        `Tempers flared when ${name}'s line got long. The night soured — morale −2.`
      );
    }
    const delta = males * 2;
    return logLine(
      { ...s, morale: Math.min(100, s.morale + delta) },
      `${name} entertained the men by lantern-light. Spirits high — morale +${delta}.`
    );
  }
};

// #291 — service-the-train. Period reality: emigrant women who
// survived as sex workers on the trail (Helena Frizell, the Sacramento
// "Painted Ladies" who came overland) made the bulk of their money
// during company camp halts — wagon-train travelers were captive
// customers. The "share the whore" action above stays in-party-only;
// this one routes outward to the companion wagons. Per-wagon refusal
// rules track period attitudes — preacher-led wagons abstain always
// (faith); families with young children almost always refuse (mom
// won't have it); other wagons refuse only sometimes (general
// principle vs. boredom + cash-on-hand).

type TrainContribution =
  | { kind: 'cash'; qty: number }
  | { kind: 'item'; item: string; qty: number };

// Period anchor: emigrant sex workers wanted cash + portable luxuries,
// not bulk staples. Diaries name whiskey, sugar, coffee, fine tobacco,
// calico, and silver coin as the standard offerings; nobody paid in
// flour or beans (every wagon already had too much). The pool here
// matches that — high-value consumables + tradeable trade goods.
const TRAIN_CONTRIB_ITEMS: Array<{ item: string; min: number; max: number }> = [
  { item: 'whiskey',   min: 1, max: 2  },
  { item: 'sugar',     min: 2, max: 5  },
  { item: 'coffee',    min: 1, max: 4  },
  { item: 'tobacco',   min: 1, max: 3  },
  { item: 'tea',       min: 2, max: 5  },
  { item: 'calico',    min: 4, max: 10 },
  { item: 'vermilion', min: 1, max: 2  },
  { item: 'beads',     min: 8, max: 20 }
];

/** Refuse rate per companion based on profile. Preacher-led: always
 *  refuse (faith). Has children: usually refuse (mom won't have it).
 *  Otherwise: rare refusal (general principle).
 *  Returns probability ∈ [0, 1]. */
function refuseRateFor(c: { leaderProfession: string; hasChildren: boolean }): number {
  if (c.leaderProfession === 'preacher') return 1;
  if (c.hasChildren) return 0.7;
  return 0.2;
}

/** Roll a contribution for a wagon that didn't refuse. Weighted: 50%
 *  cash, 50% one-of-the-luxury-items. Period reality: cash was the
 *  preferred currency; trade goods were the second-best because they
 *  could be re-sold at the next post. Bulk staples (flour/beans) were
 *  never offered — every wagon had too much already. */
function rollContribution(rng: Rng): TrainContribution {
  if (rng.chance(0.5)) {
    return { kind: 'cash', qty: 5 + Math.floor(rng.next() * 11) }; // $5-15
  }
  const tmpl = TRAIN_CONTRIB_ITEMS[Math.floor(rng.next() * TRAIN_CONTRIB_ITEMS.length)];
  const qty = tmpl.min + Math.floor(rng.next() * (tmpl.max - tmpl.min + 1));
  return { kind: 'item', item: tmpl.item, qty };
}

const serviceTrain: CampAction = {
  id: 'service_train',
  label: 'Service the wagon train',
  sub: 'Whore · 3 hr · cash + luxuries from the company · +5 morale per contributor',
  icon: '🛏️',
  hourCost: 3,
  availability: (s) => {
    if (!hasLiveWhore(s)) return { available: false, reason: 'No Whore in the party' };
    if (!s.wagonTrain) return { available: false, reason: 'Only with a wagon train' };
    const live = s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
    if (live.length === 0) return { available: false, reason: 'No companions left in the train' };
    return { available: true };
  },
  apply: (s, rng) => {
    if (!s.wagonTrain) return s; // defensive — availability gates this
    const whore = s.party.find((m) => !m.dead && m.profession === 'whore');
    const whoreName = whore?.name ?? 'The Whore';
    const live = s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');

    let cashGained = 0;
    const itemsGained: Record<string, number> = {};
    const refusers: string[] = [];
    const contributorIds = new Set<string>();

    for (const c of live) {
      if (rng.chance(refuseRateFor(c))) {
        refusers.push(c.name);
        continue;
      }
      const contrib = rollContribution(rng);
      contributorIds.add(c.id);
      if (contrib.kind === 'cash') cashGained += contrib.qty;
      else itemsGained[contrib.item] = (itemsGained[contrib.item] ?? 0) + contrib.qty;
    }

    const nextInventory: Record<string, number> = { ...s.inventory };
    for (const [item, qty] of Object.entries(itemsGained)) {
      nextInventory[item] = (nextInventory[item] ?? 0) + qty;
    }

    // Train-wide morale shift: contributors +5, refusers unchanged.
    const updatedTrain = {
      ...s.wagonTrain,
      companions: s.wagonTrain.companions.map((c) =>
        contributorIds.has(c.id)
          ? { ...c, morale: Math.min(100, c.morale + 5) }
          : c
      )
    };

    // Compose the period-flavored log lines. Headline is bawdy +
    // matter-of-fact (matches the #130 share-the-whore tone). Refusers
    // get named individually when there are 1-3; >3 collapses to a
    // count.
    const summaryParts: string[] = [];
    if (cashGained > 0) summaryParts.push(`$${cashGained}`);
    for (const [item, qty] of Object.entries(itemsGained)) {
      summaryParts.push(`${qty} ${item.replace(/_/g, ' ')}`);
    }
    const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'nothing';
    const refuseLine = refusers.length === 0
      ? ''
      : refusers.length <= 3
        ? ` ${refusers.map((n) => `${n} would not have it`).join('; ')}.`
        : ` ${refusers.length} wagons would not have it.`;

    let next: GameState = {
      ...s,
      cash: s.cash + cashGained,
      inventory: nextInventory,
      wagonTrain: updatedTrain,
      morale: Math.min(100, s.morale + Math.min(5, contributorIds.size))
    };
    next = logLine(
      next,
      `${whoreName} had a wagon train ran on her tonight — took ${summary} from the company.${refuseLine}`
    );
    return next;
  }
};

const CURE_HOURS_NO_SALT = 6;
const CURE_HOURS_WITH_SALT = 4;
const CURE_RATE_NO_SALT = 0.7;
const CURE_RATE_WITH_SALT = 0.85;

const cureMeat: CampAction = {
  id: 'cure_meat',
  label: 'Cure meat into jerky',
  sub: 'Game meat → jerky · 6 hr (4 hr + 1 salt)',
  icon: '🥩',
  hourCost: CURE_HOURS_NO_SALT, // UI caveat — actual cost adapts in rest.ts
  availability: (s) =>
    (s.inventory.game_meat ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need fresh game meat' },
  apply: (s) => {
    const meat = s.inventory.game_meat ?? 0;
    if (meat <= 0) return s;
    const hasSalt = (s.inventory.salt ?? 0) > 0;
    const rate = hasSalt ? CURE_RATE_WITH_SALT : CURE_RATE_NO_SALT;
    const jerkyLbs = Math.floor(meat * rate);

    const inventory: Record<string, number> = { ...s.inventory };
    inventory.game_meat = 0;
    inventory.jerky = (inventory.jerky ?? 0) + jerkyLbs;
    if (hasSalt) inventory.salt = (inventory.salt ?? 0) - 1;

    // Cleared spoil-day flag — no fresh meat left to rot.
    const flags = { ...s.flags };
    delete (flags as Record<string, unknown>)._gameMeatSpoilDay;

    const lossLbs = meat - jerkyLbs;
    const saltLine = hasSalt ? ' with salt' : '';
    const lossLine = lossLbs > 0 ? ` (${lossLbs} lb lost to air-drying).` : '.';
    return logLine(
      { ...s, inventory, flags },
      `Cured ${meat} lb of game meat${saltLine} into ${jerkyLbs} lb of jerky${lossLine}`
    );
  }
};

// --- Ammunition prep ---
// Period-correct lead-ball casting (#174). Pour molten lead from a
// pig into a brass mold; trim sprues; quench. ~30 balls per 5-lb pig
// is the steady yield emigrants reported (the rest is sprue + spillage,
// reabsorbed in the next melt). Without a mold, the player must buy
// pre-cast balls at posts.
const BALLS_PER_PIG = 30;

const castBalls: CampAction = {
  id: 'cast_balls',
  label: 'Cast balls from a lead pig',
  sub: `Mold + 1 lead pig · 2 hr · +${BALLS_PER_PIG} lead balls`,
  icon: '🔫',
  hourCost: 2,
  availability: (s) => {
    if ((s.inventory.bullet_mold ?? 0) === 0) {
      return { available: false, reason: 'Need a bullet mold' };
    }
    if ((s.inventory.lead_pig ?? 0) === 0) {
      return { available: false, reason: 'Need a pig of lead' };
    }
    return { available: true };
  },
  apply: (s) => {
    const pigs = s.inventory.lead_pig ?? 0;
    if (pigs <= 0 || (s.inventory.bullet_mold ?? 0) === 0) return s;
    const inventory: Record<string, number> = {
      ...s.inventory,
      lead_pig: pigs - 1,
      lead_balls: (s.inventory.lead_balls ?? 0) + BALLS_PER_PIG
    };
    return logLine(
      { ...s, inventory },
      `Cast ${BALLS_PER_PIG} lead balls from a 5-lb pig.`
    );
  }
};

// --- Fishing ---
// #197. Period emigrants under-utilized fishing — most parties had a
// hand-line + hooks but didn't use them despite the Snake / Sweetwater
// / Bear / Columbia being stocked with cutthroat trout, salmon, and
// catfish. The action is gear-gated (need a line, rod, or net) and
// terrain-modulated (river crossings best, desert nearly hopeless).
// Yield is fresh game_meat — log line names the catch by terrain.
type FishingTier = 'net' | 'rod' | 'line';

function bestFishingGear(s: GameState): FishingTier | null {
  if ((s.inventory.fishing_net ?? 0) > 0)  return 'net';
  if ((s.inventory.fishing_rod ?? 0) > 0)  return 'rod';
  if ((s.inventory.fishing_line ?? 0) > 0) return 'line';
  return null;
}

const FISH_BASE_BY_TIER: Record<FishingTier, { min: number; max: number }> = {
  line: { min: 2, max: 6 },
  rod:  { min: 4, max: 10 },
  net:  { min: 8, max: 20 }
};

const FISH_TERRAIN_MULT: Record<string, number> = {
  river: 2.0,    // at a river ford — best fishing
  forest: 1.0,   // mountain streams, river bottoms
  mountains: 0.8,
  prairie: 0.4,  // distant streams, less reliable
  desert: 0.2    // dry; mostly dry creek beds
};

function fishCatchName(terrain: string, tier: FishingTier): string {
  if (terrain === 'river' || terrain === 'forest') {
    return tier === 'net' ? 'salmon and trout' : 'cutthroat trout';
  }
  if (terrain === 'mountains') return 'mountain trout';
  if (terrain === 'desert') return 'a few suckers';
  return 'catfish';
}

const fish: CampAction = {
  id: 'fish',
  label: 'Fish nearby waters',
  sub: 'Line / rod / net · 2 hr · fresh game meat',
  icon: '🎣',
  hourCost: 2,
  availability: (s) => {
    if (bestFishingGear(s) === null) {
      return { available: false, reason: 'Need a fishing line, rod, or net' };
    }
    const mult = FISH_TERRAIN_MULT[s.location.terrain] ?? 0.4;
    if (mult < 0.3) {
      return { available: false, reason: 'No fishable water nearby' };
    }
    return { available: true };
  },
  apply: (s, rng) => {
    const tier = bestFishingGear(s);
    if (!tier) return s;
    const range = FISH_BASE_BY_TIER[tier];
    const mult = FISH_TERRAIN_MULT[s.location.terrain] ?? 0.4;
    const lbs = Math.max(0, Math.round(rng.int(range.min, range.max) * mult));
    if (lbs <= 0) {
      return logLine(s, 'Cast a line for two hours — water came up empty.');
    }
    const inventory: Record<string, number> = {
      ...s.inventory,
      game_meat: (s.inventory.game_meat ?? 0) + lbs
    };
    const flags = { ...s.flags, _gameMeatSpoilDay: s.day + 3 };
    const catchName = fishCatchName(s.location.terrain, tier);
    return logLine(
      { ...s, inventory, flags },
      `Caught ${lbs} lb of ${catchName}. Eat fresh or cure it before it spoils.`
    );
  }
};

// --- Wagon repair (#196 + #201) ---
// Three on-trail repair paths, each tied to a different consumable:
//   patch_wagon     — rawhide → canvas (primitive, no toolkit needed)
//   replace_canvas  — canvas spare → canvas (full cover swap, doubles without iron_toolkit)
//   replace_planks  — spare_plank → frame condition (also doubles without iron_toolkit)
// Period emigrants stockpiled rawhide from kills (they couldn't tan on
// the trail — 3-week process). Rawhide-on-canvas is the classic field
// repair: shrinks tight when wet, dries hard. Plank patches and
// fresh-canvas swaps were standard among well-equipped parties.

const PATCH_HIDE_COST = 1;
const PATCH_CANVAS_GAIN = 8;

const patchWagon: CampAction = {
  id: 'patch_wagon',
  label: 'Patch canvas with rawhide',
  sub: `${PATCH_HIDE_COST} raw hide · 2 hr · +${PATCH_CANVAS_GAIN} canvas`,
  icon: '🩹',
  hourCost: 2,
  availability: (s) => {
    if ((s.inventory.raw_hide ?? 0) < PATCH_HIDE_COST) {
      return { available: false, reason: 'Need a raw hide' };
    }
    if (s.wagon.canvas >= 100) {
      return { available: false, reason: 'Canvas is sound' };
    }
    return { available: true };
  },
  apply: (s) => {
    if ((s.inventory.raw_hide ?? 0) < PATCH_HIDE_COST) return s;
    if (s.wagon.canvas >= 100) return s;
    const inventory: Record<string, number> = {
      ...s.inventory,
      raw_hide: (s.inventory.raw_hide ?? 0) - PATCH_HIDE_COST
    };
    const wagon = {
      ...s.wagon,
      canvas: Math.min(100, s.wagon.canvas + PATCH_CANVAS_GAIN)
    };
    return logLine(
      { ...s, inventory, wagon },
      `Stretched a wet rawhide patch over the tear. Canvas +${PATCH_CANVAS_GAIN}.`
    );
  }
};

// Without iron_toolkit, both fresh-canvas and plank repairs cost double
// — period reality: hand tools alone could not drive proper nails or
// stretch canvas to a tight seam, so the party simply burned more
// material on a worse fix.
const REPLACE_CANVAS_GAIN = 30;

const replaceCanvas: CampAction = {
  id: 'replace_canvas',
  label: 'Replace canvas cover',
  sub: '1 canvas · 2 hr · +30 canvas (2× without toolkit)',
  icon: '⛺',
  hourCost: 2,
  availability: (s) => {
    const cost = (s.inventory.iron_toolkit ?? 0) > 0 ? 1 : 2;
    if ((s.inventory.canvas ?? 0) < cost) {
      return { available: false, reason: `Need ${cost} canvas` };
    }
    if (s.wagon.canvas >= 100) {
      return { available: false, reason: 'Canvas is sound' };
    }
    return { available: true };
  },
  apply: (s) => {
    const cost = (s.inventory.iron_toolkit ?? 0) > 0 ? 1 : 2;
    if ((s.inventory.canvas ?? 0) < cost) return s;
    if (s.wagon.canvas >= 100) return s;
    const inventory: Record<string, number> = {
      ...s.inventory,
      canvas: (s.inventory.canvas ?? 0) - cost
    };
    const wagon = {
      ...s.wagon,
      canvas: Math.min(100, s.wagon.canvas + REPLACE_CANVAS_GAIN)
    };
    const flavor = cost === 1
      ? `Stretched a fresh canvas over the bows. Canvas +${REPLACE_CANVAS_GAIN}.`
      : `Without a toolkit the new cover went on rough — burned through 2 canvas. Canvas +${REPLACE_CANVAS_GAIN}.`;
    return logLine({ ...s, inventory, wagon }, flavor);
  }
};

const REPLACE_PLANK_GAIN = 5;

const replacePlanks: CampAction = {
  id: 'replace_planks',
  label: 'Patch wagon with planks',
  sub: '1 spare plank · 1 hr · +5 wagon condition (2× without toolkit)',
  icon: '🪵',
  hourCost: 1,
  availability: (s) => {
    const cost = (s.inventory.iron_toolkit ?? 0) > 0 ? 1 : 2;
    if ((s.inventory.spare_plank ?? 0) < cost) {
      return { available: false, reason: `Need ${cost} spare plank` };
    }
    if (s.wagon.condition >= 100) {
      return { available: false, reason: 'Wagon is sound' };
    }
    return { available: true };
  },
  apply: (s) => {
    const cost = (s.inventory.iron_toolkit ?? 0) > 0 ? 1 : 2;
    if ((s.inventory.spare_plank ?? 0) < cost) return s;
    if (s.wagon.condition >= 100) return s;
    const inventory: Record<string, number> = {
      ...s.inventory,
      spare_plank: (s.inventory.spare_plank ?? 0) - cost
    };
    const wagon = {
      ...s.wagon,
      condition: Math.min(100, s.wagon.condition + REPLACE_PLANK_GAIN)
    };
    const flavor = cost === 1
      ? `Patched the bed and sides with a plank. Wagon +${REPLACE_PLANK_GAIN}.`
      : `Without a toolkit the planks went on crooked — used 2. Wagon +${REPLACE_PLANK_GAIN}.`;
    return logLine({ ...s, inventory, wagon }, flavor);
  }
};

const STITCH_HIDE_COST = 1;

const stitchMoccasins: CampAction = {
  id: 'stitch_moccasins',
  label: 'Stitch moccasins from rawhide',
  sub: `${STITCH_HIDE_COST} raw hide · 2 hr · +1 moccasins`,
  icon: '🥿',
  hourCost: 2,
  availability: (s) =>
    (s.inventory.raw_hide ?? 0) >= STITCH_HIDE_COST
      ? { available: true }
      : { available: false, reason: 'Need a raw hide' },
  apply: (s) => {
    if ((s.inventory.raw_hide ?? 0) < STITCH_HIDE_COST) return s;
    const inventory: Record<string, number> = {
      ...s.inventory,
      raw_hide: (s.inventory.raw_hide ?? 0) - STITCH_HIDE_COST,
      moccasins: (s.inventory.moccasins ?? 0) + 1
    };
    return logLine(
      { ...s, inventory },
      'Stitched moccasins from a rawhide.'
    );
  }
};

// --- Shovel-work actions ---
// Previously lived in rest.ts under a separate `ShovelAction` type; folded
// into the unified camp-actions registry so the budget check, UI grid, and
// form parsing are a single code path.

const WELL_WATER_GAL_MIN = 30;
const WELL_WATER_GAL_MAX = 50;
const WELL_SUCCESS_CHANCE = 0.4;

const digWell: CampAction = {
  id: 'dig_well',
  label: 'Dig a well',
  sub: 'Shovel · 6 hr · 40% chance to find water',
  icon: '🪣',
  hourCost: 6,
  availability: (s) =>
    (s.inventory.shovel ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a shovel' },
  apply: (s, rng) => {
    if (rng.chance(WELL_SUCCESS_CHANCE)) {
      const gal = rng.int(WELL_WATER_GAL_MIN, WELL_WATER_GAL_MAX);
      return logLine(
        {
          ...s,
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + gal)
          }
        },
        `Dug a well and found ${gal} gallons of water.`
      );
    }
    return logLine(s, 'Dug a well — came up dry.');
  }
};

// (#205) — `dig_grave` camp action removed. Burial decisions belong on
// the burial event popup right after death, where the player picks
// from {dig proper grave / build a stone mound / eat the body}. The
// camp grid no longer carries a duplicate path, and the cannibalism
// corpse-eating decision is a one-shot at the popup rather than a
// deferred camp option (see the personal_burial event in events.ts).

const digOut: CampAction = {
  id: 'dig_out',
  label: 'Dig out the wagon',
  sub: 'Shovel · 4 hr · free stuck wheels',
  icon: '⛏️',
  hourCost: 4,
  availability: (s) =>
    (s.inventory.shovel ?? 0) > 0
      ? { available: true }
      : { available: false, reason: 'Need a shovel' },
  apply: (s) => logLine(s, 'Dug out of mud/snow.')
};

// Firewood gathering — always available. Yield scales with terrain
// (same mean table as passive travel-day gather, but bigger because
// you're focused on it instead of walking). 3-hour slot. Label and
// log flex by terrain (#219) — "buffalo chips" on the plains,
// "sage brush" on desert; the resource bucket stays `firewood`.
const gatherFirewood: CampAction = {
  id: 'gather_firewood',
  label: 'Gather fuel',
  sub: '3 hr · chips on plains, sage in desert, wood elsewhere',
  icon: '🪵',
  hourCost: 3,
  availability: () => ({ available: true }),
  apply: (s, rng) => {
    // Same mean table as travel-day gather, but 2× since this is
    // focused time in one spot rather than grabbing what you pass.
    const baseByTerrain: Record<string, number> = {
      forest: 24, prairie: 12, mountains: 20, desert: 4, river: 16
    };
    const mean = baseByTerrain[s.location.terrain] ?? 10;
    const gained = rng.int(Math.round(mean * 0.7), Math.round(mean * 1.3));
    const fuel = fuelFlavorFor(s.location.terrain);
    return logLine(
      {
        ...s,
        resources: {
          ...s.resources,
          firewood: (s.resources.firewood ?? 0) + gained
        }
      },
      `Gathered ${gained} lb of ${fuel.material} from the ${fuel.source}.`
    );
  }
};

// Cheese press (#139) — 2 gal milk → 2 lb farmer's cheese, 2 hr. Period
// reality: warm milk to ~85°F by the fire, add rennet, curd in 1-2 hr,
// drain whey, salt, press in the wooden hoop with weight stones, age
// 3-4 days. We model the active prep as a 2-hr camp action and abstract
// the aging — cheese is in inventory and shelf-stable from the press.
// Yield is 1 lb cheese per gallon, consistent across period sources
// (Beecher 1846, Marcy 1859). Player runs the action again for more.
const CHEESE_MILK_INPUT = 2;
const CHEESE_OUTPUT_LB = 2;

const pressCheese: CampAction = {
  id: 'press_cheese',
  label: 'Press cheese',
  sub: '2 hr · 2 gal milk + cheese press → 2 lb cheese',
  icon: '🧀',
  hourCost: 2,
  availability: (s) => {
    if ((s.inventory.cheese_press ?? 0) < 1) {
      return { available: false, reason: 'Need a cheese press (hoop, cloth, rennet jar).' };
    }
    if ((s.inventory.milk ?? 0) < CHEESE_MILK_INPUT) {
      return { available: false, reason: `Need at least ${CHEESE_MILK_INPUT} gallons of fresh milk.` };
    }
    return { available: true };
  },
  apply: (s) => {
    const newMilk = (s.inventory.milk ?? 0) - CHEESE_MILK_INPUT;
    return logLine(
      {
        ...s,
        inventory: {
          ...s.inventory,
          milk: newMilk,
          cheese: (s.inventory.cheese ?? 0) + CHEESE_OUTPUT_LB
        }
      },
      `Warmed ${CHEESE_MILK_INPUT} gallons of milk by the fire, added rennet, pressed the curd. ${CHEESE_OUTPUT_LB} lb of farmer's cheese.`
    );
  }
};

// Washday (#230) — laundry + a real bath at a river camp. Restores
// cleanliness across the whole alive party. Period reality: women
// boiled lye and beat clothes on rocks, kids splashed, men shaved.
// Took most of a day; we charge 3 hours for the wash itself and
// trust the camp-day budget for the rest.
//
// #269: with at least one bar of soap on hand, the wash lifts +50
// cleanliness (matches the bath-house single-visit boost) and consumes
// one bar. Without soap, +30 — the original behavior. Frizzell 1852 /
// Royce 1849 describe trail laundry as "barely better than a rinse"
// without soap; with a fresh bar the same wash was "the cleanest we've
// been since St. Joseph."
const WASH_WITH_SOAP_BOOST = 50;
const WASH_WITHOUT_SOAP_BOOST = 30;
const washClothes: CampAction = {
  id: 'wash_clothes',
  label: 'Wash clothes & bathe',
  sub: '3 hr · river camp only · +30 cleanliness (+50 with soap)',
  icon: '🧺',
  hourCost: 3,
  availability: (s) => {
    if (s.location.terrain !== 'river') {
      return { available: false, reason: 'Need a river or stream — no good water for washing.' };
    }
    return { available: true };
  },
  apply: (s) => {
    const hasSoap = (s.inventory.soap ?? 0) >= 1;
    const boost = hasSoap ? WASH_WITH_SOAP_BOOST : WASH_WITHOUT_SOAP_BOOST;
    const next = washAll(s, boost);
    const inventory = hasSoap
      ? { ...next.inventory, soap: (next.inventory.soap ?? 0) - 1 }
      : next.inventory;
    const flavor = hasSoap
      ? `Boiled water, lathered the lye soap, beat the clothes on the rocks, and bathed in the river. Cleanliness +${boost}, one bar of soap used. Morale +2.`
      : `Boiled water, beat the clothes on the rocks, and bathed in the river. Cleanliness +${boost}. Morale +2.`;
    return logLine(
      { ...next, inventory, morale: Math.min(100, next.morale + 2) },
      flavor
    );
  }
};

// #269 Lye-soap making. Period reality: a pioneer staple chore — leach
// lye from hardwood ashes (we abstract this; the cookfire produces ash
// daily), then boil with rendered tallow until the mix saponifies into
// a hard cake. Beecher 1846 + Frizzell 1852 record roughly 1.5 lb
// tallow per bar; we round to 3 lb tallow → 2 bars to keep the math
// friendly and the trade-off real — tallow is a desperation food
// (draw order 6.5), so burning 3 lb of it for soap is a real choice.
const SOAP_TALLOW_INPUT = 3;
const SOAP_OUTPUT_BARS = 2;

const makeSoap: CampAction = {
  id: 'make_soap',
  label: 'Make lye soap',
  sub: `2 hr · ${SOAP_TALLOW_INPUT} lb tallow → ${SOAP_OUTPUT_BARS} bars soap`,
  icon: '🧼',
  hourCost: 2,
  availability: (s) => {
    if ((s.inventory.tallow ?? 0) < SOAP_TALLOW_INPUT) {
      return { available: false, reason: `Need ${SOAP_TALLOW_INPUT} lb of tallow — render it from a hunt kill.` };
    }
    return { available: true };
  },
  apply: (s) => {
    return logLine(
      {
        ...s,
        inventory: {
          ...s.inventory,
          tallow: (s.inventory.tallow ?? 0) - SOAP_TALLOW_INPUT,
          soap: (s.inventory.soap ?? 0) + SOAP_OUTPUT_BARS
        }
      },
      `Boiled ${SOAP_TALLOW_INPUT} lb of tallow with cookfire ash. ${SOAP_OUTPUT_BARS} hard bars of lye soap.`
    );
  }
};

// --- Water (#106) ---
//
// `find_water` is the no-shovel cousin of dig_well: forage along
// streams, ponds, sloughs. Always returns DIRTY water — pre-1854
// players don't know it's dirty, but the disease-risk mechanic in
// consumption.ts catches them anyway. With knowledge (post-1854 OR a
// Doctor in the party), they can also boil it via boil_water.

const FIND_WATER_MIN = 12;
const FIND_WATER_MAX = 24;
const BOIL_GAL_PER_LB_FIREWOOD = 5;

const findWater: CampAction = {
  id: 'find_water',
  label: 'Find water',
  sub: '3 hr · 12-24 gal from a creek or pond',
  icon: '💧',
  hourCost: 3,
  availability: (s) => {
    // Desert had no surface water — dig_well is the right action there.
    // Same pattern as fish (#197) gating off desert "no fishable water".
    if (s.location.terrain === 'desert') {
      return { available: false, reason: 'No streams in this country — dig a well instead' };
    }
    const cap = s.resources.waterCap;
    const total = s.resources.water + (s.resources.dirtyWater ?? 0);
    return total >= cap
      ? { available: false, reason: 'Water kegs are full' }
      : { available: true };
  },
  apply: (s, rng) => {
    const cap = s.resources.waterCap;
    const total = s.resources.water + (s.resources.dirtyWater ?? 0);
    const room = Math.max(0, cap - total);
    if (room === 0) return s;
    const drawn = Math.min(room, rng.int(FIND_WATER_MIN, FIND_WATER_MAX));
    // Find returns dirty water — players who can perceive the
    // distinction will see the dirtyWater pool grow; pre-knowledge
    // players just see total water rise.
    const knowsBoiling = canBoilWater(s);
    const next: GameState = {
      ...s,
      resources: {
        ...s.resources,
        dirtyWater: (s.resources.dirtyWater ?? 0) + drawn
      }
    };
    const line = knowsBoiling
      ? `Found ${drawn} gal of water — looks suspect. Boil before drinking.`
      : `Found ${drawn} gal of water from a nearby stream.`;
    return logLine(next, line);
  }
};

const boilWater: CampAction = {
  id: 'boil_water',
  label: 'Boil water',
  sub: '2 hr · 1 lb firewood per 5 gal · purifies dirty water',
  icon: '🔥',
  hourCost: 2,
  hidden: (s) => !canBoilWater(s), // pre-knowledge parties don't see this option
  availability: (s) => {
    if (!canBoilWater(s)) {
      return { available: false, reason: 'Need a doctor in the party or post-1854 knowledge' };
    }
    const dirty = s.resources.dirtyWater ?? 0;
    if (dirty <= 0) return { available: false, reason: 'No dirty water to boil' };
    if ((s.resources.firewood ?? 0) < 1) return { available: false, reason: 'Need firewood for the fire' };
    return { available: true };
  },
  apply: (s) => {
    const dirty = s.resources.dirtyWater ?? 0;
    if (dirty <= 0) return s;
    const firewood = s.resources.firewood ?? 0;
    if (firewood < 1) return s;
    // Boil up to (firewood × 5) gal, capped at remaining clean room and dirty on hand.
    const cleanRoom = Math.max(0, s.resources.waterCap - s.resources.water);
    const max = Math.min(dirty, cleanRoom, firewood * BOIL_GAL_PER_LB_FIREWOOD);
    if (max <= 0) return s;
    const woodUsed = Math.ceil(max / BOIL_GAL_PER_LB_FIREWOOD);
    return logLine(
      {
        ...s,
        resources: {
          ...s.resources,
          water: s.resources.water + max,
          dirtyWater: dirty - max,
          firewood: firewood - woodUsed
        }
      },
      `Boiled ${max} gal of water clean — burned ${woodUsed} lb firewood.`
    );
  }
};

// --- Cannibalism (desperation) ---

/** True if the party has nothing left to eat. */
function hasNoFood(state: GameState): boolean {
  return totalFoodLb(state) === 0;
}

/** Recently-deceased adult still with the party — eligible to be eaten.
 *  Not 'consumed' yet. Window of 5 days so very-old corpses don't apply. */
function recentCorpse(state: GameState): GameState['party'][number] | null {
  const fresh = state.party.filter((m) =>
    m.dead
    && m.kind === 'adult'
    && !m.consumed
    && typeof m.deathDay === 'number'
    && state.day - m.deathDay <= 5
  );
  if (fresh.length === 0) return null;
  // Most-recent first.
  return fresh.sort((a, b) => (b.deathDay ?? 0) - (a.deathDay ?? 0))[0];
}

/** Lowest-HP alive adult — the one drawn-straws would target (or volunteer). */
function weakestAdult(state: GameState): GameState['party'][number] | null {
  const alive = state.party.filter((m) => !m.dead && m.kind === 'adult');
  if (alive.length === 0) return null;
  return alive.sort((a, b) => a.health - b.health)[0];
}

/** Bumps the cannibalism-guilt counter on flags. The morale system can
 *  read this for a recurrent malus later (#149 follow-up). */
function bumpGuilt(state: GameState, weight: number): GameState {
  const prev = (state.flags._cannibalismCount as number | undefined) ?? 0;
  return {
    ...state,
    flags: { ...state.flags, _cannibalismCount: prev + weight }
  };
}

// (#205) — `cannibalism_corpse` camp action removed. The decision to
// eat a fresh corpse now lives on the burial-event popup as the third
// choice, surfaced only when the party has nothing left to eat. The
// only cannibalism that remains in the camp grid is the draws-straws
// path below: nobody's dead yet, the party is starving, an adult is
// chosen by lot. recentCorpse() is still used here to gate-out
// straws when there's already a body on the ground (the player
// should resolve that body's burial first).

const cannibalism_straws: CampAction = {
  id: 'cannibalism_straws',
  label: 'Draw straws',
  sub: 'No corpse, no food · 8 hr · the unthinkable',
  icon: '🩸',
  hourCost: 8,
  hidden: (s) => {
    const aliveAdultCount = s.party.filter((m) => !m.dead && m.kind === 'adult').length;
    return !(hasNoFood(s) && recentCorpse(s) === null && aliveAdultCount >= 2);
  },
  availability: (s) => {
    const aliveAdultCount = s.party.filter((m) => !m.dead && m.kind === 'adult').length;
    if (!hasNoFood(s)) return { available: false, reason: 'Only when out of food.' };
    if (recentCorpse(s) !== null) return { available: false, reason: 'A body is already at hand.' };
    if (aliveAdultCount < 2) return { available: false, reason: 'Need at least two adults to draw straws.' };
    return { available: true };
  },
  apply: (s) => {
    const victim = weakestAdult(s);
    if (!victim) return s;
    const meatLbs = 60;
    // The victim is consumed in-place — no burial event for them.
    let next: GameState = {
      ...s,
      party: s.party.map((m) =>
        m.id === victim.id
          ? {
              ...m,
              dead: true,
              consumed: true,
              health: 0,
              deathCause: 'Drew the short straw',
              deathDay: s.day
            }
          : m
      ),
      inventory: { ...s.inventory, game_meat: (s.inventory.game_meat ?? 0) + meatLbs },
      morale: Math.max(0, s.morale - 35)
    };
    next = bumpGuilt(next, 3);
    return logLine(
      next,
      `Drew straws. ${victim.name} drew the short one. ${meatLbs} lb meat. The party cannot look at one another. Morale -35.`
    );
  }
};

// --- #313 Panning for gold ---
// Period anchor: Goldsborough Bruff 1849, James Wilkins 1849, John
// Wood 1850. Emigrants on the trail panned **opportunistically** at
// known-gold creeks (Sweetwater, Bear River, Snake corridor, Black
// Hills along the Oregon Trail). Mostly unsuccessful — period yields
// were specks/dust, occasional small flakes worth a few dollars.
// The big finds happened at the California destination, not en route.
//
// Gate: river terrain + miles ≥ 700 (post-Independence Rock /
// Sweetwater country onward — eastern Kansas/Nebraska creeks were
// not gold-bearing) + year ≥ 1849 (post-discovery awareness; emigrants
// pre-1849 didn't know to look). 3hr cost.
//
// Period yields: ~5% chance of any gold; 80% of those are dust ($1-3
// — Bruff 1849: "a few flakes worth perhaps a dollar — the company
// felt rich"); 20% small flake ($5-15).
const panForGold: CampAction = {
  id: 'pan_for_gold',
  label: 'Pan for gold at the creek',
  sub: '3 hr · river only · 1849+ · period yield is mostly nothing',
  icon: '⚒️',
  hourCost: 3,
  availability: (s) => {
    if (s.date.year < 1849) {
      return { available: false, reason: 'Gold rush news hasn\'t reached the trail yet (1849+)' };
    }
    if (s.location.terrain !== 'river') {
      return { available: false, reason: 'Need a creek or river to pan in' };
    }
    if (s.location.milesTraveled < 700) {
      return { available: false, reason: 'Not gold country yet — try the western rivers' };
    }
    return { available: true };
  },
  apply: (s, rng) => {
    if (!rng.chance(0.05)) {
      return logLine(
        s,
        'Spent the afternoon panning at the creek — washed gravel for hours and got nothing.'
      );
    }
    if (rng.chance(0.8)) {
      const value = rng.int(1, 3);
      return logLine(
        { ...s, cash: s.cash + value },
        `Panned a few specks of dust — about $${value}. The company felt rich for a moment.`
      );
    }
    const value = rng.int(5, 15);
    return logLine(
      { ...s, cash: s.cash + value },
      `Pulled a small flake from the gravel — worth perhaps $${value}.`
    );
  }
};

// --- #316 Raid the natives (moral-grey) ---
// Period anchor: Edwin Bryant 1846 (vol. companies that "ran off Pawnee
// stock" along the Platte), Rufus Sage 1846 (Mountain-man journals on
// reciprocal raids in the Green River country), Whitman 1847 (the
// Cayuse retaliations that gave the trail its bloodiest year). Raids
// against tribal camps did happen — almost always punished.
//
// Mechanic: 30% successful theft of tribe-relevant goods, 70% counter-
// attack — party HP loss, ALL nearby tribes crash to hostile, and a
// `_recentRaidDay` flag schedules a revenge-ambush event 5-15 days
// out (encounters.ts gates on the flag).
//
// Persona surface: `Persona.shouldRaid` exists for the bot to express
// this decision. Default for cautious/balanced/aggressive is false —
// even the aggressive bot sees the math (70% bad, ALL tribes hostile).
// Chaos rolls a small chance to exercise the path.
const RAID_SUCCESS_CHANCE = 0.30;
const RAID_PARTY_HP_MIN = 8;
const RAID_PARTY_HP_MAX = 22;
const RAID_REVENGE_DAYS_MIN = 5;
const RAID_REVENGE_DAYS_MAX = 15;

/** Tribe-relevant loot for a successful raid. Plains tribes carried
 *  buffalo robes and pemmican; mountain Shoshone/Bannock kept hides +
 *  pemmican; Plateau peoples ran salmon racks. */
function raidLootFor(tribeId: string, rng: Rng): { items: Record<string, number>; flavor: string } {
  const plains = ['pawnee', 'sioux', 'cheyenne'];
  const mountain = ['shoshone', 'bannock'];
  // Default = plateau (nez_perce / cayuse / walla_walla / umatilla).
  if (plains.includes(tribeId)) {
    return {
      items: {
        buffalo_robe: rng.int(1, 2),
        raw_hide: rng.int(2, 4),
        pemmican: rng.int(8, 16)
      },
      flavor: 'robes, hides, and a pack of pemmican'
    };
  }
  if (mountain.includes(tribeId)) {
    return {
      items: {
        raw_hide: rng.int(2, 5),
        pemmican: rng.int(10, 20),
        moccasins: rng.int(1, 3)
      },
      flavor: 'hides, pemmican, and stitched moccasins'
    };
  }
  return {
    items: {
      game_meat: rng.int(20, 40),
      buffalo_robe: rng.int(0, 1),
      beads: rng.int(2, 6)
    },
    flavor: 'salmon from the racks and a few trade goods'
  };
}

/** Find a raidable tribe at the current mile — one that's wary or
 *  hostile (attitude < 41, the neutral threshold). Friendly+ tribes
 *  weren't raided per the diaries. */
function pickRaidTarget(state: GameState, rng: Rng): string | null {
  const here = tribesAtMile(state.location.milesTraveled);
  const candidates = here.filter((t) => getTribeAttitude(state, t.id) < 41);
  if (candidates.length === 0) return null;
  return candidates[rng.int(0, candidates.length - 1)].id;
}

const raidNatives: CampAction = {
  id: 'raid_natives',
  label: 'Raid the native camp',
  sub: '6 hr · rifle + ammo · 30% theft · 70% counter-attack, all tribes hostile',
  icon: '🏹',
  hourCost: 6,
  availability: (s) => {
    if (s.date.year < 1845) {
      return { available: false, reason: 'Trail tensions before 1845 didn\'t run this hot' };
    }
    if ((s.inventory.rifle ?? 0) < 1) {
      return { available: false, reason: 'Need a rifle' };
    }
    if ((s.inventory.gunpowder ?? 0) < 5) {
      return { available: false, reason: 'Need at least 5 gunpowder' };
    }
    if ((s.inventory.lead_balls ?? 0) < 5) {
      return { available: false, reason: 'Need at least 5 lead balls' };
    }
    if ((s.inventory.percussion_caps ?? 0) < 5) {
      return { available: false, reason: 'Need at least 5 percussion caps' };
    }
    const here = tribesAtMile(s.location.milesTraveled);
    if (here.length === 0) {
      return { available: false, reason: 'No tribal band nearby' };
    }
    const raidable = here.some((t) => getTribeAttitude(s, t.id) < 41);
    if (!raidable) {
      return { available: false, reason: 'No wary or hostile band to raid — only friendly tribes nearby' };
    }
    return { available: true };
  },
  apply: (s, rng) => {
    const targetId = pickRaidTarget(s, rng);
    if (!targetId) return s; // defensive — availability gates this
    const target = getTribe(targetId);
    const here = tribesAtMile(s.location.milesTraveled);

    // Burn 5 gunpowder / 5 lead balls / 5 percussion caps regardless
    // of outcome — the shots got fired either way.
    const inventory: Record<string, number> = {
      ...s.inventory,
      gunpowder: (s.inventory.gunpowder ?? 0) - 5,
      lead_balls: (s.inventory.lead_balls ?? 0) - 5,
      percussion_caps: (s.inventory.percussion_caps ?? 0) - 5
    };

    if (rng.chance(RAID_SUCCESS_CHANCE)) {
      // Success — bag the loot, but every tribe at this mile sours
      // (-25 each). Word travels. No revenge-ambush flag on success;
      // they didn't see who hit them clearly enough to retaliate.
      const loot = raidLootFor(targetId, rng);
      for (const [item, qty] of Object.entries(loot.items)) {
        inventory[item] = (inventory[item] ?? 0) + qty;
      }
      let next: GameState = { ...s, inventory, morale: Math.max(0, s.morale - 4) };
      for (const t of here) {
        next = adjustTribeAttitude(next, t.id, -25);
      }
      return logLine(
        next,
        `Hit the ${target.name} camp at first light — took ${loot.flavor}. Got out clean. Morale -4 (the company is uneasy). All nearby tribes -25 attitude.`
      );
    }

    // 70% — counter-attack. Pick 1-3 alive adults, dock 8-22 HP each.
    // ALL nearby tribes crash to hostile (≤20). Set revenge flag.
    const aliveAdults = s.party.filter((m) => !m.dead && m.kind === 'adult');
    const victimCount = Math.min(aliveAdults.length, rng.int(1, 3));
    const shuffled = [...aliveAdults].sort(() => rng.next() - 0.5);
    const victimIds = new Set(shuffled.slice(0, victimCount).map((m) => m.id));

    const party = s.party.map((m) => {
      if (!victimIds.has(m.id)) return m;
      const dmg = rng.int(RAID_PARTY_HP_MIN, RAID_PARTY_HP_MAX);
      return { ...m, health: Math.max(0, m.health - dmg) };
    });

    let next: GameState = {
      ...s,
      inventory,
      party,
      morale: Math.max(0, s.morale - 8),
      flags: {
        ...s.flags,
        _recentRaidDay: s.day,
        _raidRevengeDay: s.day + rng.int(RAID_REVENGE_DAYS_MIN, RAID_REVENGE_DAYS_MAX)
      }
    };
    for (const t of here) {
      const current = getTribeAttitude(next, t.id);
      const target20 = Math.min(current, 20);
      next = adjustTribeAttitude(next, t.id, target20 - current);
    }
    const victimNames = s.party
      .filter((m) => victimIds.has(m.id))
      .map((m) => m.name)
      .join(', ');
    return logLine(
      next,
      `The ${target.name} were waiting. ${victimNames} took wounds in the fighting. Morale -8. Every band in this country is hostile now — they will be looking for the wagon.`
    );
  }
};

// --- #314 Take from the train (moral-grey, banishment stakes) ---
// Period anchor: Bryant 1846 (Russell Party banished a flour-thief),
// Sage 1846 ("man caught taking from another's wagon was given his
// horse, his rifle, and told to ride. Ten miles before the next camp,
// he was found dead"), Frizzell 1852 (Hancock company expelled a
// thief "with no provisions, no rifle"). Within a tight-knit emigrant
// company, the social cost of getting caught was effectively a death
// sentence.
//
// Mechanic: 50% caught — every companion's morale drops -20, which
// the existing #290 departure pipeline reads (threshold 30) and
// surfaces as departures over the next several days. Player morale
// -15. Sets `_caughtStealingDay` flag.
// 35% small grab — sugar/whiskey/tobacco off the wagon next door.
// 15% bigger grab — cash $20-40 OR luxury item (silver tea service,
// china tea set, fiddle, cookware).
//
// Persona surface: `Persona.shouldStealFromTrain` — every default
// persona refuses (banishment was death). Chaos rolls 3% to fuzz the
// path. Future named profiles (#287) like "drinker" / "gambler" can
// override.
const STEAL_CAUGHT_CHANCE = 0.50;
const STEAL_SMALL_CHANCE = 0.35;   // 0.50 + 0.35 = 0.85; 0.15 remainder = bigger grab
const STEAL_COMPANION_MORALE = -20;
const STEAL_PLAYER_MORALE_CAUGHT = -15;
const STEAL_PLAYER_MORALE_SUCCESS = -3; // small guilt morale debit even on a win

const SMALL_GRAB_TABLE: Array<{ item: string; min: number; max: number; flavor: string }> = [
  { item: 'sugar',   min: 3, max: 8, flavor: 'a sack of sugar' },
  { item: 'whiskey', min: 1, max: 2, flavor: 'a bottle of whiskey' },
  { item: 'tobacco', min: 2, max: 5, flavor: 'plugs of tobacco' },
  { item: 'coffee',  min: 2, max: 5, flavor: 'a tin of coffee' },
  { item: 'bacon',   min: 4, max: 8, flavor: 'a slab of bacon' }
];

const BIGGER_GRAB_TABLE: Array<
  | { kind: 'cash'; min: number; max: number; flavor: string }
  | { kind: 'item'; item: string; flavor: string }
> = [
  { kind: 'cash', min: 20, max: 40, flavor: 'a coin purse' },
  { kind: 'item', item: 'silver_tea_service', flavor: "a wagon's silver tea service" },
  { kind: 'item', item: 'china_tea_set',      flavor: 'a packed china tea set' },
  { kind: 'item', item: 'fiddle',             flavor: 'a fiddle in its case' },
  { kind: 'item', item: 'cookware',           flavor: 'a complete set of cookware' }
];

const takeFromTrain: CampAction = {
  id: 'take_from_train',
  label: 'Take from the train',
  sub: '3 hr · wagon train only · 50% caught (banishment) · 35% small · 15% bigger',
  icon: '🥷',
  hourCost: 3,
  hidden: (s) => !s.wagonTrain
    || s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress').length === 0,
  availability: (s) => {
    if (!s.wagonTrain) return { available: false, reason: 'Only with a wagon train' };
    const live = s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
    if (live.length === 0) return { available: false, reason: 'No companions left to take from' };
    return { available: true };
  },
  apply: (s, rng) => {
    if (!s.wagonTrain) return s; // defensive — availability gates this
    const live = s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
    if (live.length === 0) return s;
    const targetIdx = rng.int(0, live.length - 1);
    const target = live[targetIdx];

    const roll = rng.next();
    if (roll < STEAL_CAUGHT_CHANCE) {
      // Caught — every companion drops -20 morale, player -15, flag set.
      // Departure pipeline will pick this up over the next few days.
      const updatedCompanions = s.wagonTrain.companions.map((c) =>
        c.outcome === 'in-progress'
          ? { ...c, morale: Math.max(0, c.morale + STEAL_COMPANION_MORALE) }
          : c
      );
      const next: GameState = {
        ...s,
        wagonTrain: { ...s.wagonTrain, companions: updatedCompanions },
        morale: Math.max(0, s.morale + STEAL_PLAYER_MORALE_CAUGHT),
        flags: { ...s.flags, _caughtStealingDay: s.day }
      };
      return logLine(
        next,
        `Caught with your hand in the ${target.name} wagon — the captain raised the camp. Word will be at every fire by morning. Morale -15; the train turns cold.`
      );
    }

    if (roll < STEAL_CAUGHT_CHANCE + STEAL_SMALL_CHANCE) {
      // Small grab — pick a small-table item.
      const tmpl = SMALL_GRAB_TABLE[rng.int(0, SMALL_GRAB_TABLE.length - 1)];
      const qty = rng.int(tmpl.min, tmpl.max);
      const inventory: Record<string, number> = {
        ...s.inventory,
        [tmpl.item]: (s.inventory[tmpl.item] ?? 0) + qty
      };
      return logLine(
        { ...s, inventory, morale: Math.max(0, s.morale + STEAL_PLAYER_MORALE_SUCCESS) },
        `Slipped ${tmpl.flavor} (${qty}) from the ${target.name} wagon under cover of dark. The company is none the wiser. Morale -3 (a quiet guilt).`
      );
    }

    // Bigger grab — cash or luxury item.
    const big = BIGGER_GRAB_TABLE[rng.int(0, BIGGER_GRAB_TABLE.length - 1)];
    if (big.kind === 'cash') {
      const amount = rng.int(big.min, big.max);
      return logLine(
        {
          ...s,
          cash: s.cash + amount,
          morale: Math.max(0, s.morale + STEAL_PLAYER_MORALE_SUCCESS)
        },
        `Lifted ${big.flavor} from a coat slung over the ${target.name} wagonbox — $${amount}. The owner will think it slipped in the brush. Morale -3.`
      );
    }
    const inventory: Record<string, number> = {
      ...s.inventory,
      [big.item]: (s.inventory[big.item] ?? 0) + 1
    };
    return logLine(
      { ...s, inventory, morale: Math.max(0, s.morale + STEAL_PLAYER_MORALE_SUCCESS) },
      `Took ${big.flavor} from the ${target.name} wagon. They'll notice in a day or two — by then the company has been on the move. Morale -3.`
    );
  }
};

/** Registry — order controls UI render order in CampStage. */
export const CAMP_ACTIONS: readonly CampAction[] = [
  // Morale / comfort
  passWhiskey,
  bigMeal,
  singAlong,
  readBible,
  shareTheWhore,
  serviceTrain,
  // Preservation
  cureMeat,
  // Ammunition prep
  castBalls,
  // Foraging — passive yield without ammo
  fish,
  // Wagon repair (#196 + #201)
  patchWagon,
  replaceCanvas,
  replacePlanks,
  stitchMoccasins,
  // Practical
  gatherFirewood,
  washClothes,
  pressCheese,
  makeSoap,
  findWater,
  boilWater,
  // Shovel work (gated on having a shovel)
  digWell,
  digOut,
  // #313 Gold Rush trail-side activity — 1849+ at western rivers
  panForGold,
  // #316 Moral-grey — 30/70, only ever a real choice for the desperate
  raidNatives,
  // #314 Theft from the company — hidden until you're in a train
  takeFromTrain,
  // Desperation — hidden until starvation
  cannibalism_straws
];

export const CAMP_ACTIONS_BY_ID: Record<CampActionId, CampAction> = {
  pass_whiskey: passWhiskey,
  big_meal: bigMeal,
  sing_along: singAlong,
  read_bible: readBible,
  share_the_whore: shareTheWhore,
  service_train: serviceTrain,
  cure_meat: cureMeat,
  cast_balls: castBalls,
  fish,
  patch_wagon: patchWagon,
  replace_canvas: replaceCanvas,
  replace_planks: replacePlanks,
  stitch_moccasins: stitchMoccasins,
  gather_firewood: gatherFirewood,
  wash_clothes: washClothes,
  press_cheese: pressCheese,
  make_soap: makeSoap,
  find_water: findWater,
  boil_water: boilWater,
  dig_well: digWell,
  dig_out: digOut,
  pan_for_gold: panForGold,
  raid_natives: raidNatives,
  take_from_train: takeFromTrain,
  cannibalism_straws
};

export function getCampAction(id: CampActionId): CampAction {
  const a = CAMP_ACTIONS_BY_ID[id];
  if (!a) throw new Error(`Unknown camp action: ${id}`);
  return a;
}

/**
 * Dynamic hour cost — only cureMeat adjusts based on salt. Kept as a
 * function so other actions can grow this dimension later (e.g. big
 * meal faster with cookware, sing-along shorter with just a harmonica).
 */
export function hourCostFor(action: CampAction, state: GameState): number {
  if (action.id === 'cure_meat') {
    return (state.inventory.salt ?? 0) > 0 ? CURE_HOURS_WITH_SALT : CURE_HOURS_NO_SALT;
  }
  return action.hourCost;
}
