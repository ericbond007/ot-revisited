import type { GameState } from '../types';
import type { Rng } from '../rng';
import type { GameEvent } from './events';
import { inTerrain, yearAtLeast, milesBetween, and } from './event-gating';
import { tribesAtMile, type Tribe } from './tribes';
import {
  getTribeAttitude,
  adjustTribeAttitude,
  hasGiftedTribe,
  markGiftedTribe
} from '../systems/tribe-relations';
import { addNews, effectHuntBonus, effectCholeraScare } from '../systems/news';
import { hasLiveIndianTrader } from '../professions/predicates';
import { setSpoilClock } from '../systems/spoilage';

// Random trail encounters — wagon trains, soldiers, traders, natives.
// These fire through the same rollEvent pipeline as weather / wagon
// events (category: 'encounter'). Native encounters pull from the
// tribe-relations system (#121) at apply-time so the outcome reflects
// current attitude.
//
// Each event's gate ensures it only fires where it makes sense
// (terrain, year, tribe-region); apply functions use the shared rng
// for any random rolls so replays stay deterministic.

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

/** Pick a tribe from `tribesAtMile` matching the given attitude-level
 *  predicate. Returns null when none qualify — caller should no-op. */
function pickTribe(
  state: GameState,
  rng: Rng,
  match: (attitude: number) => boolean
): Tribe | null {
  const here = tribesAtMile(state.location.milesTraveled);
  const candidates = here.filter((t) => match(getTribeAttitude(state, t.id)));
  if (candidates.length === 0) return null;
  return candidates[rng.int(0, candidates.length - 1)];
}

// --- Emigrant / traveler encounters ---

// Going-back party (#226) — emigrants who quit and turned for home,
// usually after sickness or a wagon break they couldn't fix. A real
// trail institution past Fort Kearny: diary-attested every few weeks
// west of mile 500. Three roles in the world: discount supply (they
// want lighter wagons for the eastbound trip), east-bound mail courier
// (the cheapest way to send word home), and trail-ahead news source.
const going_back_party: GameEvent = {
  id: 'encounter_going_back_party',
  category: 'encounter',
  title: 'A going-back party',
  body: "Wagons rolling the wrong way. A family that gave up — sickness, broken wheels, a grave dug this morning. They'll trade what they no longer need, and they're heading where the mail goes.",
  weight: 2,
  // Period reality: turnarounds happened after a major reversal, not at
  // the start. Mile 500 lands ~Fort Kearny, where parties first really
  // confront the scale of what's ahead.
  gate: milesBetween(500, 99999),
  choices: [
    {
      id: 'trade',
      icon: '💰',
      label: 'Trade for their surplus',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        // Swap $10 for 20 lb flour + a random wagon part they no longer need.
        if (s.cash < 10) {
          return logLine(s, "They asked $10 — you didn't have it. They rolled on.");
        }
        const parts = ['wheel', 'axle', 'canvas', 'tongue'];
        const part = parts[rng.int(0, parts.length - 1)];
        return logLine(
          {
            ...s,
            cash: s.cash - 10,
            inventory: {
              ...s.inventory,
              flour: (s.inventory.flour ?? 0) + 20,
              [part]: (s.inventory[part] ?? 0) + 1
            }
          },
          `Bought 20 lb flour and a spare ${part.replace(/_/g, ' ')} for $10.`
        );
      }
    },
    {
      id: 'buy_trade_goods',
      icon: '🪞',
      label: 'Buy their trade-goods box ($3)',
      silentLog: true,
      apply: (s) => {
        // Going-back parties often had no use for the trinket box they
        // bought at Independence — Plains tribes were now BEHIND them.
        // Period reality: heavy markdowns on these were a real road
        // commerce thing.
        if (s.cash < 3) {
          return logLine(s, "They wanted $3 for the trade-goods box — you didn't have it.");
        }
        return logLine(
          {
            ...s,
            cash: s.cash - 3,
            inventory: {
              ...s.inventory,
              mirror: (s.inventory.mirror ?? 0) + 1,
              vermilion: (s.inventory.vermilion ?? 0) + 1,
              awl: (s.inventory.awl ?? 0) + 2,
              thimble: (s.inventory.thimble ?? 0) + 3,
              calico: (s.inventory.calico ?? 0) + 1,
              pocket_knife: (s.inventory.pocket_knife ?? 0) + 1
            }
          },
          'Bought their trade-goods box for $3 — mirror, vermilion jar, two awls, three thimbles, calico bolt, pocket knife. They had no use for it east of here.'
        );
      }
    },
    {
      id: 'mail_home',
      icon: '✉️',
      label: 'Hand off a letter home',
      silentLog: true,
      apply: (s) => {
        // Quiet comfort across the alive adults — word will reach
        // family. No item gate; paper + quill were universal and
        // forts had stick-board letter posts feeding eastbound parties.
        const adults = s.party.filter((m) => !m.dead && m.kind === 'adult').length;
        if (adults === 0) {
          return logLine(s, 'No one fit to write — the moment passed.');
        }
        const bump = Math.min(100 - s.morale, 1);
        return logLine(
          { ...s, morale: s.morale + bump },
          'Pressed a letter into their hands — word will reach home before the snow flies. Morale +1.'
        );
      }
    },
    {
      id: 'listen',
      icon: '💬',
      label: 'Just hear their stories',
      silentLog: true,
      apply: (s) => {
        let next = { ...s, morale: Math.max(0, s.morale - 2) };
        next = logLine(next, 'Heard their tale of misfortune. The party is quiet for a while. Morale -2.');
        // The eastbounders bring word from the road ahead — and a
        // cholera scare with mechanical bite.
        return addNews(next, {
          text: 'Cholera was thick in the train ahead — boil your water.',
          source: 'eastbound emigrants',
          topic: 'hazard',
          day: s.day,
          applyEffect: effectCholeraScare
        });
      }
    },
    {
      id: 'pass',
      icon: '🚶',
      label: 'Wish them luck and move on',
      silentLog: true,
      apply: (s) => logLine(s, 'Waved as the eastbound wagons passed.')
    }
  ]
};

const lone_trapper: GameEvent = {
  id: 'encounter_trapper',
  category: 'encounter',
  title: 'A mountain man',
  body: "A bearded, buckskin-clad figure — a fur trapper coming down from the mountains. He has furs, moccasins, and more opinions than any five men.",
  weight: 2,
  gate: inTerrain('mountains', 'forest'),
  choices: [
    {
      id: 'trade_mocs',
      icon: '💰',
      label: 'Trade for moccasins ($6)',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        if (s.cash < 6) return logLine(s, "You didn't have $6 for the moccasins. He wished you luck and rode on.");
        return logLine(
          {
            ...s,
            cash: s.cash - 6,
            inventory: { ...s.inventory, moccasins: (s.inventory.moccasins ?? 0) + 2 }
          },
          'Bought 2 pairs of moccasins for $6.'
        );
      }
    },
    {
      id: 'listen',
      icon: '💬',
      label: 'Listen to his mountain stories',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 3) },
        'Spent an hour with a mountain man. Stories of grizzlies and blizzards. Morale +3.'
      )
    },
    {
      id: 'pass',
      icon: '🚶',
      label: 'Politely move on',
      silentLog: true,
      apply: (s) => logLine(s, 'Traded nods and kept moving.')
    }
  ]
};

const soldier_patrol: GameEvent = {
  id: 'encounter_soldiers',
  category: 'encounter',
  title: 'An army patrol',
  body: 'A detachment of dragoons rides up — blue coats faded, horses tired. They bring news of the road ahead and check the party for deserters.',
  weight: 2,
  gate: yearAtLeast(1849),
  choices: [
    {
      id: 'welcome',
      icon: '💬',
      label: 'Welcome them — share supper',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const foodCost = 4;
        const totalFood = ['flour', 'beans', 'bacon', 'hardtack']
          .reduce((sum, id) => sum + (s.inventory[id] ?? 0), 0);
        if (totalFood < foodCost) {
          return logLine(s, "You hadn't enough to share. The soldiers nodded and rode on.");
        }
        // Pull from the largest food pile.
        const largest = ['flour', 'beans', 'bacon', 'hardtack']
          .reduce((best, id) => (s.inventory[id] ?? 0) > (s.inventory[best] ?? 0) ? id : best, 'flour');
        return logLine(
          {
            ...s,
            inventory: { ...s.inventory, [largest]: (s.inventory[largest] ?? 0) - foodCost },
            morale: Math.min(100, s.morale + 4)
          },
          `Shared ${foodCost} lb of ${largest} with the patrol. News of the trail. Morale +4.`
        );
      }
    },
    {
      id: 'info',
      icon: '💬',
      label: 'Just trade information',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 1) },
        'Traded news with the patrol. Morale +1.'
      )
    }
  ]
};

const mail_rider: GameEvent = {
  id: 'encounter_mail_rider',
  category: 'encounter',
  title: 'A mail rider',
  body: 'A lone horseman, canvas bag bulging with letters — the overland mail service. He has a letter for the leader.',
  weight: 1,
  gate: yearAtLeast(1851),
  choices: [
    {
      id: 'read',
      icon: '📬',
      label: 'Read the letter',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const positive = rng.chance(0.7);
        const delta = positive ? 6 : -3;
        const line = positive
          ? `A letter from home — the family is well. Morale +6.`
          : `A letter from home — grim news. Morale -3.`;
        let next = logLine(
          { ...s, morale: Math.max(0, Math.min(100, s.morale + delta)) },
          line
        );
        // The mail rider also carried trail news.
        next = addNews(next, {
          text: rng.chance(0.5)
            ? 'A new ferry has opened on the Green River — west crossing only.'
            : 'Buffalo herds were sighted thick on the prairie last week.',
          source: 'mail rider',
          topic: rng.chance(0.5) ? 'opportunity' : 'opportunity',
          day: s.day
        });
        return next;
      }
    },
    {
      id: 'no_mail',
      icon: '🚶',
      label: 'Tell him no mail for you',
      silentLog: true,
      apply: (s) => logLine(s, 'The mail rider tipped his hat and rode on.')
    }
  ]
};

const emigrant_grave: GameEvent = {
  id: 'encounter_grave',
  category: 'encounter',
  title: 'An emigrant grave',
  body: 'A mound of stones beside the trail. A name and two dates carved into a board, held by a pair of wagon planks.',
  weight: 2,
  choices: [
    {
      id: 'respect',
      icon: '🙏',
      label: 'Pause in silence',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 2) },
        'Paused at the grave. A reminder of what this trail costs. Morale -2.'
      )
    },
    {
      id: 'pass',
      icon: '🚶',
      label: 'Roll past without stopping',
      silentLog: true,
      apply: (s) => logLine(s, 'Rolled past the grave without a word.')
    }
  ]
};

// Abandoned wagon (#201) — past the first 200 mi the trail starts to
// fill with wrecks: families that turned back, axles split, oxen lost.
// Period diaries call out "wagon graveyards" especially past Devil's
// Gate and through the Bear River valley. The party can pick over a
// wreck for usable wood and canvas — costs an hour of travel.
// Period reality on wagon graveyards (Frizzell 1852, Lord 1849, Reed,
// Sager): emigrants past Independence Rock and through the Bear Valley
// ditched everything — iron stoves, dressers, mirrors, china tea sets,
// half-bolts of cloth, books, jars of fruit preserves, harmonicas,
// boxes of trade trinkets bought at Independence and never used. The
// scavenge roll picks across that mix; a single wreck can yield 2-5
// distinct items.
const abandoned_wagon: GameEvent = {
  id: 'encounter_abandoned_wagon',
  category: 'encounter',
  title: 'An abandoned wagon',
  body: 'A bone-bleached wreck off the trail — wheels collapsed, oxen long gone. A note nailed to the box reads "we could not go on."',
  weight: 2,
  gate: and(milesBetween(200, 99999), inTerrain('prairie', 'forest', 'mountains', 'desert')),
  choices: [
    {
      id: 'scavenge',
      icon: '🔧',
      label: 'Scavenge for parts (1 hr)',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const inventory: Record<string, number> = { ...s.inventory };
        const finds: string[] = [];

        // Always: 1-3 spare planks (the wagon itself).
        const planks = rng.int(1, 3);
        inventory.spare_plank = (inventory.spare_plank ?? 0) + planks;
        finds.push(`${planks} plank${planks === 1 ? '' : 's'}`);

        // 50%: canvas off the bonnet.
        if (rng.chance(0.5)) {
          inventory.canvas = (inventory.canvas ?? 0) + 1;
          finds.push('canvas');
        }

        // 30%: small trade trinkets (mirror / awl / thimble — light,
        // often left because too "fancy" for the rest of the trip).
        if (rng.chance(0.3)) {
          const trinketRoll = rng.next();
          let id: string, name: string;
          if (trinketRoll < 0.25) { id = 'mirror'; name = 'a hand mirror'; }
          else if (trinketRoll < 0.50) { id = 'awl'; name = 'an iron awl'; }
          else if (trinketRoll < 0.75) { id = 'thimble'; name = 'a brass thimble'; }
          else { id = 'pocket_knife'; name = 'a pocket knife'; }
          inventory[id] = (inventory[id] ?? 0) + 1;
          finds.push(name);
        }

        // 25%: salvageable food. Some piles spoiled; some still good.
        if (rng.chance(0.25)) {
          const foodRoll = rng.next();
          if (foodRoll < 0.4) {
            const lb = rng.int(3, 8);
            inventory.flour = (inventory.flour ?? 0) + lb;
            finds.push(`${lb} lb of flour`);
          } else if (foodRoll < 0.7) {
            const lb = rng.int(2, 5);
            inventory.hardtack = (inventory.hardtack ?? 0) + lb;
            finds.push(`${lb} lb of hardtack`);
          } else if (foodRoll < 0.9) {
            const lb = rng.int(1, 3);
            inventory.dried_fruit = (inventory.dried_fruit ?? 0) + lb;
            finds.push(`${lb} lb of dried fruit`);
          } else {
            inventory.coffee = (inventory.coffee ?? 0) + 1;
            finds.push('a tin of coffee');
          }
        }

        // 20%: comfort or musical item — books, instruments, whiskey
        // were the most-described "abandoned" items in diaries.
        if (rng.chance(0.2)) {
          const comfortRoll = rng.next();
          if (comfortRoll < 0.3) {
            inventory.bible = (inventory.bible ?? 0) + 1;
            finds.push('a Bible');
          } else if (comfortRoll < 0.55) {
            inventory.harmonica = (inventory.harmonica ?? 0) + 1;
            finds.push('a harmonica');
          } else if (comfortRoll < 0.75) {
            inventory.whiskey = (inventory.whiskey ?? 0) + 1;
            finds.push('a jug of whiskey');
          } else if (comfortRoll < 0.92) {
            inventory.tobacco = (inventory.tobacco ?? 0) + 1;
            finds.push('a twist of tobacco');
          } else {
            inventory.fiddle = (inventory.fiddle ?? 0) + 1;
            finds.push('a fiddle');
          }
        }

        // 10%: bandages / quinine — abandoned medical kit. Period diaries
        // mention these specifically when a family died of cholera and the
        // train moved on without taking them.
        if (rng.chance(0.1)) {
          if (rng.chance(0.5)) {
            const n = rng.int(1, 3);
            inventory.bandages = (inventory.bandages ?? 0) + n;
            finds.push(`${n} bandage${n === 1 ? '' : 's'}`);
          } else {
            inventory.quinine = (inventory.quinine ?? 0) + 1;
            finds.push('a vial of quinine');
          }
        }

        return logLine(
          { ...s, inventory },
          `Picked over the wreck — found ${finds.join(', ')}.`
        );
      }
    },
    {
      id: 'pass',
      icon: '🚶',
      label: 'Roll on past',
      silentLog: true,
      apply: (s) => logLine(s, 'Rolled past the wreck without stopping.')
    }
  ]
};

// --- Native encounters (gate on tribe regions + attitudes) ---

const native_trading_party: GameEvent = {
  id: 'encounter_native_trade',
  category: 'encounter',
  title: 'Native traders approach',
  body: 'A band on horseback rides toward the wagons — blankets, pouches, and an obvious interest in trade. They raise empty palms in greeting.',
  weight: 3,
  gate: (s) => {
    const here = tribesAtMile(s.location.milesTraveled);
    return here.some((t) => getTribeAttitude(s, t.id) >= 41);
  },
  choices: [
    {
      // #241 Gift-first parlay. Smoke-the-pipe diplomacy from period
      // sources — Catlin, Frizzell, Sage. Costs an extra gift up front
      // (2 tobacco) but lifts the tribe attitude permanently and lands
      // a markedly better one-shot trade (+50% pemmican). Hidden when
      // the party can't afford OR the gift has already been given to
      // any tribe at this mile (one-time per tribe, persistent).
      id: 'gift_smoke_first',
      icon: '🕊️',
      label: 'Smoke a pipe first (2 tobacco gift + 1 trade)',
      silentLog: true,
      hidden: (s) => {
        // Need 3 tobacco total — 2 for the gift, 1 for the trade.
        if ((s.inventory.tobacco ?? 0) < 3) return true;
        // Skip if every tribe at this mile has already been gifted.
        const here = tribesAtMile(s.location.milesTraveled).filter(
          (t) => getTribeAttitude(s, t.id) >= 41
        );
        if (here.length === 0) return true;
        return here.every((t) => hasGiftedTribe(s, t.id));
      },
      apply: (s, rng) => {
        // Pick a tribe matching the encounter gate that hasn't yet been
        // gifted — the gift-first benefit is one-time per tribe.
        const candidates = tribesAtMile(s.location.milesTraveled).filter(
          (t) => getTribeAttitude(s, t.id) >= 41 && !hasGiftedTribe(s, t.id)
        );
        const tribe = candidates.length > 0 ? candidates[rng.int(0, candidates.length - 1)] : null;
        if (!tribe) {
          return logLine(s, 'No new tribe to share with — they rode on.');
        }
        // Gift first: -2 tobacco, +6 attitude, set gifted flag.
        let next: GameState = {
          ...s,
          inventory: { ...s.inventory, tobacco: (s.inventory.tobacco ?? 0) - 2 }
        };
        next = adjustTribeAttitude(next, tribe.id, 6);
        next = markGiftedTribe(next, tribe.id);
        // Then the trade: -1 tobacco, +12 lb pemmican (the gift-first
        // rate, matches the Indian Trader bonus). With an Indian
        // Trader in the party the rate stacks to 16 lb — both bonuses
        // come from "knowing how to do business" with these people.
        const traderBonus = hasLiveIndianTrader(next) ? 4 : 0;
        const pemmican = 12 + traderBonus;
        next = {
          ...next,
          inventory: {
            ...next.inventory,
            tobacco: (next.inventory.tobacco ?? 0) - 1,
            pemmican: (next.inventory.pemmican ?? 0) + pemmican
          }
        };
        next = logLine(
          next,
          `Shared a pipe with the ${tribe.name} headman, then traded — ${pemmican} lb pemmican. Relations +6, lasting respect.`
        );
        return addNews(next, {
          text: `The ${tribe.name} speak well of your party — they say you know how to greet a man.`,
          source: `${tribe.name} elder`,
          topic: 'opportunity',
          day: s.day
        });
      }
    },
    {
      id: 'trade',
      icon: '💰',
      label: 'Offer tobacco and beads for pemmican',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 41);
        if (!tribe) return logLine(s, 'They hailed you, but rode on when nothing was offered.');
        const hasTobacco = (s.inventory.tobacco ?? 0) > 0;
        const hasBeads = (s.inventory.beads ?? 0) > 0;
        if (!hasTobacco && !hasBeads) {
          return logLine(
            { ...s, morale: Math.max(0, s.morale - 1) },
            `The ${tribe.name} offered trade, but you had nothing to give. They rode off disappointed. Morale -1.`
          );
        }
        const inventory = { ...s.inventory };
        if (hasTobacco) inventory.tobacco = (inventory.tobacco ?? 0) - 1;
        else inventory.beads = (inventory.beads ?? 0) - 1;
        // Indian Trader (#154) gets a 50% better trade — knows the
        // exchange rates, the dialect, the gestures. Plain emigrants
        // get the standard 8 lb of pemmican.
        const pemmican = hasLiveIndianTrader(s) ? 12 : 8;
        inventory.pemmican = (inventory.pemmican ?? 0) + pemmican;
        // Good trade improves relations — Indian Trader's familiarity
        // adds a touch more goodwill on top.
        const relGain = hasLiveIndianTrader(s) ? 4 : 2;
        let next: GameState = { ...s, inventory };
        next = adjustTribeAttitude(next, tribe.id, relGain);
        next = logLine(
          next,
          `Traded with the ${tribe.name} — ${pemmican} lb pemmican for ${hasTobacco ? 'tobacco' : 'beads'}. Relations +${relGain}.`
        );
        // Tribal news — they know the country well.
        return addNews(next, {
          text: rng.chance(0.5)
            ? `The ${tribe.name} say buffalo are thick to the south.`
            : `The ${tribe.name} say a band of warriors is hunting up the trail.`,
          source: `${tribe.name} traders`,
          topic: rng.chance(0.5) ? 'opportunity' : 'hazard',
          day: s.day
        });
      }
    },
    {
      id: 'refuse',
      icon: '🚫',
      label: 'Wave them off',
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 41);
        if (!tribe) return logLine(s, 'Waved them off — they rode on.');
        const next = adjustTribeAttitude(s, tribe.id, -3);
        return logLine(
          next,
          `Waved the ${tribe.name} traders off. They took offense. Relations -3.`
        );
      }
    }
  ]
};

const native_toll_demand: GameEvent = {
  id: 'encounter_native_toll',
  category: 'encounter',
  title: 'Warriors block the trail',
  body: 'Armed riders come out of the brush and block the road. Their leader gestures plainly: you are crossing their land, and a toll is owed.',
  weight: 2,
  gate: (s) => {
    const here = tribesAtMile(s.location.milesTraveled);
    return here.some((t) => {
      const a = getTribeAttitude(s, t.id);
      return a >= 15 && a <= 55;
    });
  },
  choices: [
    {
      id: 'pay_tobacco',
      icon: '💰',
      label: 'Pay 2 tobacco',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'tobacco', icon: '🚬', reason: 'Need tobacco to pay the toll' },
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 15 && a <= 55)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They took the tobacco and let you pass.');
        const inventory = { ...s.inventory, tobacco: Math.max(0, (s.inventory.tobacco ?? 0) - 2) };
        let next: GameState = { ...s, inventory };
        next = adjustTribeAttitude(next, tribe.id, 4);
        return logLine(
          next,
          `Paid 2 tobacco. The ${tribe.name} stepped aside. Relations +4.`
        );
      }
    },
    {
      id: 'pay_beads',
      icon: '💰',
      label: 'Pay 3 beads',
      silentLog: true,
      requires: { itemId: 'beads', icon: '📿', reason: 'Need beads to pay the toll' },
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 15 && a <= 55)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They took the beads and waved you through.');
        const inventory = { ...s.inventory, beads: Math.max(0, (s.inventory.beads ?? 0) - 3) };
        let next: GameState = { ...s, inventory };
        next = adjustTribeAttitude(next, tribe.id, 3);
        return logLine(
          next,
          `Paid 3 strings of beads. The ${tribe.name} let you pass. Relations +3.`
        );
      }
    },
    {
      id: 'refuse',
      icon: '💪',
      label: 'Refuse and push through',
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 15 && a <= 55)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'Pushed through. Nothing came of it.');
        // Refusing sours relations sharply; some odds of a skirmish (wagon damage).
        const skirmish = rng.chance(0.35);
        let next: GameState = adjustTribeAttitude(s, tribe.id, -12);
        if (skirmish) {
          const dmg = rng.int(6, 15);
          next = {
            ...next,
            wagon: { ...next.wagon, condition: Math.max(0, next.wagon.condition - dmg) },
            morale: Math.max(0, next.morale - 3)
          };
          return logLine(
            next,
            `Refused the ${tribe.name} toll. A skirmish — wagon -${dmg}, morale -3, relations -12.`
          );
        }
        return logLine(next, `Refused the ${tribe.name} toll and pushed through. Relations -12.`);
      }
    }
  ]
};

const native_guide_offer: GameEvent = {
  id: 'encounter_native_guide',
  category: 'encounter',
  title: 'A native guide approaches',
  body: 'A single rider, unarmed, rides up and speaks some English. He offers to lead the party through a shorter, safer route.',
  weight: 1,
  gate: (s) => {
    const here = tribesAtMile(s.location.milesTraveled);
    return here.some((t) => getTribeAttitude(s, t.id) >= 61);
  },
  choices: [
    {
      id: 'hire',
      icon: '💰',
      label: 'Hire him (5 tobacco or $5)',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 61);
        if (!tribe) return logLine(s, 'The guide rode on when no deal was struck.');
        const hasTobacco = (s.inventory.tobacco ?? 0) >= 5;
        const hasCash = s.cash >= 5;
        if (!hasTobacco && !hasCash) {
          return logLine(
            s,
            `The ${tribe.name} guide asked for 5 tobacco or $5. You had neither. He rode on.`
          );
        }
        const inventory = hasTobacco
          ? { ...s.inventory, tobacco: (s.inventory.tobacco ?? 0) - 5 }
          : s.inventory;
        const cash = hasTobacco ? s.cash : s.cash - 5;
        // Advance 10 miles as a reward — the shortcut the guide knew.
        return logLine(
          {
            ...s,
            inventory,
            cash,
            location: { ...s.location, milesTraveled: s.location.milesTraveled + 10 },
            morale: Math.min(100, s.morale + 2)
          },
          `Hired a ${tribe.name} guide. Skipped 10 mi of rough country. Morale +2.`
        );
      }
    },
    {
      id: 'decline',
      icon: '🚶',
      label: 'Thank him and decline',
      silentLog: true,
      apply: (s) => logLine(s, 'Declined the guide. He rode back the way he came.')
    }
  ]
};

const native_hunters_sharing: GameEvent = {
  id: 'encounter_native_hunters',
  category: 'encounter',
  title: 'Native hunters share their kill',
  body: 'A hunting party rides up with a fresh buffalo on travois. They offer a share to the travelers — no payment expected, only respect.',
  weight: 1,
  gate: (s) => {
    const here = tribesAtMile(s.location.milesTraveled);
    return here.some((t) => getTribeAttitude(s, t.id) >= 65);
  },
  choices: [
    {
      id: 'accept',
      icon: '🤲',
      label: 'Accept with thanks',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 65);
        if (!tribe) return logLine(s, 'They shared meat without ceremony — a kindness.');
        const meat = rng.int(20, 35);
        let next: GameState = {
          ...s,
          inventory: { ...s.inventory, game_meat: (s.inventory.game_meat ?? 0) + meat },
          morale: Math.min(100, s.morale + 5)
        };
        next = adjustTribeAttitude(next, tribe.id, 2);
        return logLine(
          next,
          `The ${tribe.name} shared ${meat} lb of fresh buffalo. Morale +5, relations +2.`
        );
      }
    },
    {
      id: 'reciprocate',
      icon: '💬',
      label: 'Accept and offer tobacco in return',
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 65);
        if (!tribe) return logLine(s, 'Shared meat, shared tobacco. A good day.');
        const hasTobacco = (s.inventory.tobacco ?? 0) > 0;
        if (!hasTobacco) {
          // Falls back to accept-only.
          const meat = rng.int(20, 35);
          let next: GameState = {
            ...s,
            inventory: { ...s.inventory, game_meat: (s.inventory.game_meat ?? 0) + meat },
            morale: Math.min(100, s.morale + 5)
          };
          next = adjustTribeAttitude(next, tribe.id, 2);
          return logLine(next, `The ${tribe.name} shared ${meat} lb of buffalo. No tobacco to return. Morale +5, relations +2.`);
        }
        const meat = rng.int(20, 35);
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            game_meat: (s.inventory.game_meat ?? 0) + meat,
            tobacco: (s.inventory.tobacco ?? 0) - 1
          },
          morale: Math.min(100, s.morale + 6)
        };
        next = adjustTribeAttitude(next, tribe.id, 5);
        return logLine(
          next,
          `The ${tribe.name} shared ${meat} lb of buffalo; you offered tobacco in return. Morale +6, relations +5.`
        );
      }
    }
  ]
};

// Hide-for-robe trade encounter (#203). Native bands tanned hides far
// better than emigrants could on the trail (3-week process they
// couldn't do mid-march). A band willing to trade would take 2-3 raw
// hides for 1 finished buffalo robe — period reality. Also offers
// pemmican and moccasins for hide. Gates on the party actually having
// raw hides and a wary+ tribe being at hand.
const native_hide_trade: GameEvent = {
  id: 'encounter_native_hide_trade',
  category: 'encounter',
  title: 'A band offers to trade hides',
  body: 'Riders fall in alongside the wagon — a band has spotted the bundles of raw hide on top of the load. The lead man holds up a finished buffalo robe and points at your scrape-bundles, then at his.',
  weight: 3,
  gate: (s) => {
    if ((s.inventory.raw_hide ?? 0) < 1) return false;
    const here = tribesAtMile(s.location.milesTraveled);
    return here.some((t) => getTribeAttitude(s, t.id) >= 21);
  },
  choices: [
    {
      id: 'trade_robe',
      icon: '🟫',
      label: 'Trade 2 raw hides for 1 buffalo robe',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'raw_hide', icon: '🟫', reason: 'Need 2 raw hides' },
      apply: (s, rng) => {
        if ((s.inventory.raw_hide ?? 0) < 2) {
          return logLine(s, 'Only one raw hide on hand — they shrugged and rode on.');
        }
        const tribe = pickTribe(s, rng, (a) => a >= 21)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They rode on.');
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            raw_hide: (s.inventory.raw_hide ?? 0) - 2,
            buffalo_robe: (s.inventory.buffalo_robe ?? 0) + 1
          }
        };
        next = adjustTribeAttitude(next, tribe.id, 2);
        return logLine(
          next,
          `The ${tribe.name} took 2 hides and handed over a finished robe — clean tanned, soft as cloth. Relations +2.`
        );
      }
    },
    {
      id: 'trade_pemmican',
      icon: '🍖',
      label: 'Trade 1 raw hide for 5 lb pemmican',
      silentLog: true,
      requires: { itemId: 'raw_hide', icon: '🟫', reason: 'Need a raw hide' },
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 21)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They rode on.');
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            raw_hide: (s.inventory.raw_hide ?? 0) - 1,
            pemmican: (s.inventory.pemmican ?? 0) + 5
          }
        };
        next = adjustTribeAttitude(next, tribe.id, 1);
        return logLine(
          next,
          `The ${tribe.name} took 1 hide and counted out 5 lb of pemmican. Relations +1.`
        );
      }
    },
    {
      id: 'trade_moccasins',
      icon: '🥿',
      label: 'Trade 1 raw hide for 2 pairs of moccasins',
      silentLog: true,
      requires: { itemId: 'raw_hide', icon: '🟫', reason: 'Need a raw hide' },
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 21)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They rode on.');
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            raw_hide: (s.inventory.raw_hide ?? 0) - 1,
            moccasins: (s.inventory.moccasins ?? 0) + 2
          }
        };
        next = adjustTribeAttitude(next, tribe.id, 1);
        return logLine(
          next,
          `The ${tribe.name} took 1 hide and traded 2 pairs of stitched moccasins. Relations +1.`
        );
      }
    },
    {
      id: 'pass',
      icon: '🚶',
      label: 'Wave them off',
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 21);
        if (!tribe) return logLine(s, 'Waved them off — they rode on.');
        const next = adjustTribeAttitude(s, tribe.id, -1);
        return logLine(next, `Waved the ${tribe.name} off. Relations -1.`);
      }
    }
  ]
};

// #239 — Salmon trade in the Snake / Columbia corridor. Period reality:
// Salmon Falls (mile ~1450), Three Island, the Dalles fisheries — the
// Shoshone-Bannock and the Plateau peoples (Nez Perce, Cayuse, Walla
// Walla) ran extensive salmon trade with emigrants. Drying racks miles
// long at the falls. Diaries describe whole 8-lb salmon for a knife
// (Frizzell 1852) or a few rounds of beads (Royce 1849).
//
// Yields land in `game_meat` — same fresh-meat slot as a hunt kill,
// same 3-day spoil clock. The log line names it salmon for flavor.
const native_salmon_trade: GameEvent = {
  id: 'encounter_native_salmon',
  category: 'encounter',
  title: 'Salmon at the river',
  body: "A fishing party at a rapids — drying racks behind them, fresh-caught salmon laid on cedar. They wave you over. Whole fish for a few trade goods.",
  weight: 3,
  // Snake / Columbia salmon corridor — Three Island onward through the
  // Dalles. Tribes in that range: Bannock, Nez Perce, Cayuse, Walla
  // Walla. Friendly+ attitude required (>= 41) — hostile bands wouldn't
  // trade.
  gate: (s) => {
    if (s.location.milesTraveled < 1200) return false;
    if (s.location.milesTraveled > 2050) return false;
    const here = tribesAtMile(s.location.milesTraveled);
    if (!here.some((t) => getTribeAttitude(s, t.id) >= 41)) return false;
    // Need at least one trade item in hand, otherwise the encounter
    // dead-ends and just irritates the player.
    return (s.inventory.beads ?? 0) > 0
      || (s.inventory.tobacco ?? 0) > 0
      || (s.inventory.fishing_line ?? 0) > 0;
  },
  choices: [
    {
      id: 'trade_fishhook',
      icon: '🎣',
      label: 'Trade a fishing line for ~8 lb salmon',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'fishing_line', icon: '🎣', reason: 'Need a fishing line (hooks)' },
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 41)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They waved you on without trading.');
        const yieldLb = hasLiveIndianTrader(s) ? 12 : 8;
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            fishing_line: Math.max(0, (s.inventory.fishing_line ?? 0) - 1),
            game_meat: (s.inventory.game_meat ?? 0) + yieldLb
          }
        };
        next = setSpoilClock(next, 'game_meat');
        next = adjustTribeAttitude(next, tribe.id, 3);
        return logLine(
          next,
          `Traded a fishing line to the ${tribe.name} — ${yieldLb} lb of fresh salmon. Eat soon. Relations +3.`
        );
      }
    },
    {
      id: 'trade_tobacco',
      icon: '🌿',
      label: 'Trade tobacco for ~5 lb salmon',
      silentLog: true,
      requires: { itemId: 'tobacco', icon: '🌿', reason: 'Need tobacco' },
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 41)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They waved you on.');
        const yieldLb = hasLiveIndianTrader(s) ? 8 : 5;
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            tobacco: Math.max(0, (s.inventory.tobacco ?? 0) - 1),
            game_meat: (s.inventory.game_meat ?? 0) + yieldLb
          }
        };
        next = setSpoilClock(next, 'game_meat');
        next = adjustTribeAttitude(next, tribe.id, 2);
        return logLine(
          next,
          `Tobacco for ${yieldLb} lb of fresh salmon. Relations +2.`
        );
      }
    },
    {
      id: 'trade_beads',
      icon: '📿',
      label: 'Trade 2 strings of beads for ~4 lb salmon',
      silentLog: true,
      requires: { itemId: 'beads', icon: '📿', reason: 'Need beads' },
      apply: (s, rng) => {
        if ((s.inventory.beads ?? 0) < 2) {
          return logLine(s, 'Only one string on hand — they shrugged and turned back to the racks.');
        }
        const tribe = pickTribe(s, rng, (a) => a >= 41)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'They waved you on.');
        const yieldLb = hasLiveIndianTrader(s) ? 6 : 4;
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            beads: (s.inventory.beads ?? 0) - 2,
            game_meat: (s.inventory.game_meat ?? 0) + yieldLb
          }
        };
        next = setSpoilClock(next, 'game_meat');
        next = adjustTribeAttitude(next, tribe.id, 2);
        return logLine(
          next,
          `Two strings of beads for ${yieldLb} lb of fresh salmon. Relations +2.`
        );
      }
    },
    {
      id: 'wave_off',
      icon: '✋',
      label: 'Wave them off — keep moving',
      silentLog: true,
      apply: (s, rng) => {
        const tribe = pickTribe(s, rng, (a) => a >= 41)
          ?? (tribesAtMile(s.location.milesTraveled)[0] ?? null);
        if (!tribe) return logLine(s, 'Kept moving past the rapids.');
        const next = adjustTribeAttitude(s, tribe.id, -1);
        return logLine(next, `Passed the ${tribe.name} fishery without trading. Relations -1.`);
      }
    }
  ]
};

/** All trail-encounter events. events.ts spreads these into its
 *  EVENTS registry on module load. */
export const ENCOUNTER_EVENTS: readonly GameEvent[] = [
  going_back_party,
  lone_trapper,
  soldier_patrol,
  mail_rider,
  emigrant_grave,
  abandoned_wagon,
  native_trading_party,
  native_toll_demand,
  native_guide_offer,
  native_hunters_sharing,
  native_hide_trade,
  native_salmon_trade
];
