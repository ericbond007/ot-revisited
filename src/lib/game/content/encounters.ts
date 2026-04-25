import type { GameState } from '../types';
import type { Rng } from '../rng';
import type { GameEvent } from './events';
import { inTerrain, yearAtLeast } from './event-gating';
import { tribesAtMile, type Tribe } from './tribes';
import {
  getTribeAttitude,
  adjustTribeAttitude
} from '../systems/tribe-relations';

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

const eastbound_turnaround: GameEvent = {
  id: 'encounter_eastbound',
  category: 'encounter',
  title: 'An eastbound party',
  body: "Wagons rolling the wrong way. A family that gave up — sickness, broken wheels, a grave dug this morning. They'll trade what they no longer need.",
  weight: 2,
  choices: [
    {
      id: 'trade',
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
      id: 'listen',
      label: 'Just hear their stories',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 2) },
        'Heard their tale of misfortune. The party is quiet for a while. Morale -2.'
      )
    },
    {
      id: 'pass',
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
      label: 'Listen to his mountain stories',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 3) },
        'Spent an hour with a mountain man. Stories of grizzlies and blizzards. Morale +3.'
      )
    },
    {
      id: 'pass',
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
      label: 'Read the letter',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const positive = rng.chance(0.7);
        const delta = positive ? 6 : -3;
        const line = positive
          ? `A letter from home — the family is well. Morale +6.`
          : `A letter from home — grim news. Morale -3.`;
        return logLine(
          { ...s, morale: Math.max(0, Math.min(100, s.morale + delta)) },
          line
        );
      }
    },
    {
      id: 'no_mail',
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
      label: 'Roll past without stopping',
      silentLog: true,
      apply: (s) => logLine(s, 'Rolled past the grave without a word.')
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
      id: 'trade',
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
        inventory.pemmican = (inventory.pemmican ?? 0) + 8;
        // Good trade improves relations slightly.
        let next: GameState = { ...s, inventory };
        next = adjustTribeAttitude(next, tribe.id, 2);
        return logLine(
          next,
          `Traded with the ${tribe.name} — 8 lb pemmican for ${hasTobacco ? 'tobacco' : 'beads'}. Relations +2.`
        );
      }
    },
    {
      id: 'refuse',
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

/** All trail-encounter events. events.ts spreads these into its
 *  EVENTS registry on module load. */
export const ENCOUNTER_EVENTS: readonly GameEvent[] = [
  eastbound_turnaround,
  lone_trapper,
  soldier_patrol,
  mail_rider,
  emigrant_grave,
  native_trading_party,
  native_toll_demand,
  native_guide_offer,
  native_hunters_sharing
];
