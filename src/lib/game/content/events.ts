import type { GameState } from '../types';
import type { Rng } from '../rng';
import { inTerrain, monthIs, yearAtLeast, yearBetween } from './event-gating';

export type EventCategory =
  | 'weather'
  | 'health'
  | 'wagon'
  | 'encounter'
  | 'native'
  | 'bandit'
  | 'finds'
  | 'historical'
  | 'personal';

export interface EventChoice {
  id: string;
  label: string;
  apply: (state: GameState, rng: Rng) => GameState;
  isDefault?: boolean;
}

export interface GameEvent {
  id: string;
  category: EventCategory;
  title: string;
  body: string;
  weight: number;
  choices: EventChoice[];
  gate?: (state: GameState) => boolean;
}

// The full registry is built up in Tasks 2-5. Task 1 ships an empty-or-placeholder
// array to unblock the systems module; Task 2 onward pushes real events.
export const EVENTS: GameEvent[] = [];

// --- Weather events ---
const storm: GameEvent = {
  id: 'weather_storm',
  category: 'weather',
  title: 'A thunderstorm rolls in',
  body: 'Dark clouds gather and the rain comes down in sheets.',
  weight: 4,
  choices: [
    {
      id: 'press_on',
      label: 'Press on',
      isDefault: true,
      apply: (s) => ({
        ...s,
        morale: Math.max(0, s.morale - 2),
        wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 2) }
      })
    },
    {
      id: 'shelter',
      label: 'Shelter until it passes',
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 1) })
    }
  ]
};

const heat_wave: GameEvent = {
  id: 'weather_heat',
  category: 'weather',
  title: 'A stifling heat wave',
  body: 'The sun beats down mercilessly. Water stores dwindle fast.',
  weight: 3,
  gate: inTerrain('prairie', 'desert'),
  choices: [
    {
      id: 'endure',
      label: 'Endure it',
      isDefault: true,
      apply: (s) => ({
        ...s,
        resources: { ...s.resources, water: Math.max(0, s.resources.water - 5) },
        morale: Math.max(0, s.morale - 1)
      })
    }
  ]
};

const fog: GameEvent = {
  id: 'weather_fog',
  category: 'weather',
  title: 'Heavy fog sets in',
  body: 'Visibility drops to nothing.',
  weight: 2,
  choices: [
    {
      id: 'wait',
      label: 'Wait it out',
      isDefault: true,
      apply: (s) => ({ ...s, location: { ...s.location, milesTraveled: Math.max(0, s.location.milesTraveled - 5) } })
    }
  ]
};

const early_snow: GameEvent = {
  id: 'weather_snow',
  category: 'weather',
  title: 'Early snowfall',
  body: 'A chill bite in the air and snowflakes on the pass.',
  weight: 3,
  gate: monthIs(9, 10, 11),
  choices: [
    {
      id: 'push_through',
      label: 'Push through',
      isDefault: true,
      apply: (s) => ({
        ...s,
        morale: Math.max(0, s.morale - 3),
        party: s.party.map((m) => m.dead ? m : ({ ...m, health: Math.max(0, m.health - 3) }))
      })
    }
  ]
};

// --- Wagon / livestock events ---
const broken_wheel: GameEvent = {
  id: 'wagon_wheel',
  category: 'wagon',
  title: 'A wheel shatters',
  body: 'A spoke gives way, then the whole rim.',
  weight: 3,
  choices: [
    {
      id: 'replace',
      label: 'Replace with a spare wheel',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.wheel ?? 0;
        if (have > 0) {
          return {
            ...s,
            inventory: { ...s.inventory, wheel: have - 1 },
            wagon: { ...s.wagon, condition: Math.min(100, s.wagon.condition + 10) }
          };
        }
        return { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 15) } };
      }
    }
  ]
};

const ox_lame: GameEvent = {
  id: 'ox_lame',
  category: 'wagon',
  title: 'An ox goes lame',
  body: 'One of the oxen is favoring a hoof.',
  weight: 3,
  choices: [
    {
      id: 'rest_it',
      label: 'Rest it in the yoke for the day',
      isDefault: true,
      apply: (s) => ({
        ...s,
        oxen: s.oxen.map((o, i) => i === 0 ? { ...o, fatigue: Math.min(100, o.fatigue + 15) } : o)
      })
    }
  ]
};

const ox_threw_shoe: GameEvent = {
  id: 'ox_shoe',
  category: 'wagon',
  title: 'An ox throws a shoe',
  body: 'The rocky terrain took a toll.',
  weight: 3,
  gate: inTerrain('mountains', 'desert'),
  choices: [
    {
      id: 'reshoe',
      label: 'Re-shoe the ox',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.ox_shoes ?? 0;
        if (have > 0) {
          return { ...s, inventory: { ...s.inventory, ox_shoes: have - 1 } };
        }
        return {
          ...s,
          oxen: s.oxen.map((o, i) => i === 0 ? { ...o, shod: false } : o)
        };
      }
    }
  ]
};

const tongue_snaps: GameEvent = {
  id: 'wagon_tongue',
  category: 'wagon',
  title: 'The wagon tongue snaps',
  body: 'A crack, then a splinter. The oxen halt.',
  weight: 2,
  choices: [
    {
      id: 'repair',
      label: 'Repair with a spare tongue',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.tongue ?? 0;
        if (have > 0) {
          return { ...s, inventory: { ...s.inventory, tongue: have - 1 } };
        }
        return { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 20) } };
      }
    }
  ]
};

const canvas_tear: GameEvent = {
  id: 'wagon_canvas',
  category: 'wagon',
  title: 'The canvas cover tears',
  body: 'A gust of wind rips a seam.',
  weight: 2,
  choices: [
    {
      id: 'patch',
      label: 'Patch it',
      isDefault: true,
      apply: (s) => {
        const have = s.inventory.canvas ?? 0;
        if (have > 0) {
          return { ...s, inventory: { ...s.inventory, canvas: have - 1 } };
        }
        return { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 8) }, morale: Math.max(0, s.morale - 1) };
      }
    }
  ]
};

const ox_wanders: GameEvent = {
  id: 'ox_wander',
  category: 'wagon',
  title: 'An ox wandered off in the night',
  body: 'Tracks lead into the brush.',
  weight: 2,
  choices: [
    {
      id: 'search',
      label: 'Search for it (half day)',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 1) })
    }
  ]
};

EVENTS.push(storm, heat_wave, fog, early_snow, broken_wheel, ox_lame, ox_threw_shoe, tongue_snaps, canvas_tear, ox_wanders);

// --- Health ---
const cholera_scare: GameEvent = {
  id: 'health_cholera',
  category: 'health',
  title: 'Water tastes foul downstream',
  body: 'The river here smells off. Someone got sick at the last wagon train.',
  weight: 3,
  choices: [
    {
      id: 'risk_drink',
      label: 'Drink anyway',
      isDefault: true,
      apply: (s, rng) => {
        // Boiling knowledge cuts risk dramatically
        const baseChance = 0.25;
        const chance = s.flags.hasBoilingKnowledge || s.party.some(m => !m.dead && m.profession === 'doctor') ? baseChance * 0.3 : baseChance;
        if (rng.chance(chance)) {
          const alive = s.party.filter(m => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return {
              ...s,
              party: s.party.map(m => m.id === victim.id ? { ...m, conditions: [...m.conditions, { id: 'cholera', daysSinceOnset: 0 }] } : m)
            };
          }
        }
        return s;
      }
    },
    {
      id: 'wait',
      label: 'Travel upstream before drinking',
      apply: (s) => ({ ...s, day: s.day })
    }
  ]
};

const snakebite: GameEvent = {
  id: 'health_snake',
  category: 'health',
  title: 'Rattlesnake strike',
  body: 'A camp-gatherer reaches into the brush and recoils, clutching their hand.',
  weight: 1,
  gate: inTerrain('prairie', 'desert'),
  choices: [
    {
      id: 'treat',
      label: 'Treat with bandages & laudanum',
      isDefault: true,
      apply: (s, rng) => {
        const alive = s.party.filter(m => !m.dead);
        if (alive.length === 0) return s;
        const victim = alive[rng.int(0, alive.length - 1)];
        const bandages = s.inventory.bandages ?? 0;
        const hp = bandages > 0 ? 10 : 20;
        return {
          ...s,
          inventory: bandages > 0 ? { ...s.inventory, bandages: bandages - 1 } : s.inventory,
          party: s.party.map(m =>
            m.id === victim.id
              ? { ...m, health: Math.max(0, m.health - hp), conditions: [...m.conditions, { id: 'snakebite', daysSinceOnset: 0 }] }
              : m
          )
        };
      }
    }
  ]
};

// --- Finds ---
const berry_patch: GameEvent = {
  id: 'find_berries',
  category: 'finds',
  title: 'A patch of wild berries',
  body: 'Dark-purple berries hang heavy on the bushes.',
  weight: 3,
  gate: monthIs(6, 7, 8),
  choices: [
    {
      id: 'harvest',
      label: 'Harvest them',
      isDefault: true,
      apply: (s, rng) => {
        const amount = rng.int(10, 25);
        return {
          ...s,
          inventory: { ...s.inventory, dried_fruit: (s.inventory.dried_fruit ?? 0) + amount },
          morale: Math.min(100, s.morale + 2)
        };
      }
    }
  ]
};

const abandoned_cache: GameEvent = {
  id: 'find_cache',
  category: 'finds',
  title: 'An abandoned cache',
  body: 'A sealed barrel and a small wooden chest, left by a party that moved on quickly.',
  weight: 1,
  choices: [
    {
      id: 'take',
      label: 'Take everything',
      isDefault: true,
      apply: (s, rng) => ({
        ...s,
        inventory: {
          ...s.inventory,
          flour: (s.inventory.flour ?? 0) + rng.int(20, 60),
          bullets: (s.inventory.bullets ?? 0) + rng.int(5, 15)
        }
      })
    }
  ]
};

const fresh_spring: GameEvent = {
  id: 'find_spring',
  category: 'finds',
  title: 'A cold clear spring',
  body: 'Water bubbles up from between the rocks.',
  weight: 3,
  choices: [
    {
      id: 'fill',
      label: 'Fill every water skin',
      isDefault: true,
      apply: (s) => ({ ...s, resources: { ...s.resources, water: s.resources.waterCap } })
    }
  ]
};

// --- Chance encounters ---
const emigrant_party: GameEvent = {
  id: 'encounter_emigrants',
  category: 'encounter',
  title: 'A passing wagon train',
  body: 'Fellow travelers bound the same direction. They stop to swap news.',
  weight: 3,
  choices: [
    {
      id: 'talk',
      label: 'Trade news',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 2) })
    }
  ]
};

const abandoned_wagon: GameEvent = {
  id: 'encounter_abandoned',
  category: 'encounter',
  title: 'An abandoned wagon',
  body: 'Tipped over, split at the tongue. Scattered possessions lie in the grass.',
  weight: 2,
  choices: [
    {
      id: 'scavenge',
      label: 'Scavenge what you can',
      isDefault: true,
      apply: (s, rng) => {
        const parts = ['wheel', 'axle', 'tongue', 'canvas'];
        const gift = parts[rng.int(0, parts.length - 1)];
        return { ...s, inventory: { ...s.inventory, [gift]: (s.inventory[gift] ?? 0) + 1 } };
      }
    },
    { id: 'pass', label: 'Pass it by', apply: (s) => s }
  ]
};

const lost_child: GameEvent = {
  id: 'encounter_child',
  category: 'encounter',
  title: 'A lost child',
  body: 'A small figure sits crying beside the trail. Separated from another party.',
  weight: 1,
  choices: [
    {
      id: 'help',
      label: 'Take them to the next post',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 3), inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 5) } })
    }
  ]
};

// --- Personal ---
const personal_quarrel: GameEvent = {
  id: 'personal_quarrel',
  category: 'personal',
  title: 'A quarrel breaks out',
  body: 'Tensions boil over. Harsh words pass between party members.',
  weight: 2,
  choices: [
    {
      id: 'mediate',
      label: 'Mediate',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 1) })
    }
  ]
};

const personal_prayer: GameEvent = {
  id: 'personal_prayer',
  category: 'personal',
  title: 'A quiet evening prayer',
  body: 'Someone leads a short prayer at the campfire.',
  weight: 2,
  choices: [
    {
      id: 'join',
      label: 'Join',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 1) })
    }
  ]
};

EVENTS.push(cholera_scare, snakebite, berry_patch, abandoned_cache, fresh_spring, emigrant_party, abandoned_wagon, lost_child, personal_quarrel, personal_prayer);

// --- Historical year/month-gated events ---
const donner_rumor: GameEvent = {
  id: 'historical_donner',
  category: 'historical',
  title: 'News of the Donner Party',
  body: 'A returning traveler tells a chilling story of a party caught in the mountains last winter.',
  weight: 2,
  gate: yearAtLeast(1847),
  choices: [
    {
      id: 'heed',
      label: 'Heed the warning',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.max(0, s.morale - 2), flags: { ...s.flags, donner_warning_heard: true } })
    }
  ]
};

const gold_rush_news: GameEvent = {
  id: 'historical_gold',
  category: 'historical',
  title: 'Word of gold in California',
  body: 'Travelers speak excitedly of nuggets as big as walnuts picked straight out of the streams.',
  weight: 3,
  gate: yearAtLeast(1849),
  choices: [
    {
      id: 'stay_course',
      label: 'Stay on the Oregon Trail',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 1) })
    }
  ]
};

const cholera_peak_1852: GameEvent = {
  id: 'historical_cholera_1852',
  category: 'health',
  title: 'Cholera sweeps the trail',
  body: '1852 is a cruel year. Graves line the way.',
  weight: 6,  // extra high weight for 1852
  gate: yearBetween(1852, 1852),
  choices: [
    {
      id: 'keep_moving',
      label: 'Keep moving',
      isDefault: true,
      apply: (s, rng) => {
        // 50% chance of cholera onset on a random alive member
        if (rng.chance(0.5)) {
          const alive = s.party.filter(m => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return {
              ...s,
              party: s.party.map(m => m.id === victim.id ? { ...m, conditions: [...m.conditions, { id: 'cholera', daysSinceOnset: 0 }] } : m)
            };
          }
        }
        return s;
      }
    }
  ]
};

const mormon_handcart: GameEvent = {
  id: 'historical_mormon',
  category: 'encounter',
  title: 'A Mormon handcart company',
  body: 'A line of men, women, and children pushing and pulling handcarts westward.',
  weight: 2,
  gate: yearBetween(1856, 1860),
  choices: [
    {
      id: 'share',
      label: 'Share a meal',
      isDefault: true,
      apply: (s) => ({
        ...s,
        morale: Math.min(100, s.morale + 2),
        inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 5) }
      })
    }
  ]
};

const pony_express: GameEvent = {
  id: 'historical_pony',
  category: 'encounter',
  title: 'A Pony Express rider',
  body: 'A rider thunders past, bags bulging with mail. He shouts news of the east.',
  weight: 2,
  gate: yearBetween(1860, 1861),
  choices: [
    {
      id: 'cheer',
      label: 'Cheer him on',
      isDefault: true,
      apply: (s) => ({ ...s, morale: Math.min(100, s.morale + 2) })
    }
  ]
};

const spring_flood: GameEvent = {
  id: 'weather_flood',
  category: 'weather',
  title: 'Spring flooding',
  body: 'Swollen creeks overflow into the trail.',
  weight: 3,
  gate: monthIs(3, 4, 5),
  choices: [
    {
      id: 'detour',
      label: 'Detour around the flood',
      isDefault: true,
      apply: (s) => ({ ...s, location: { ...s.location, milesTraveled: Math.max(0, s.location.milesTraveled - 8) } })
    }
  ]
};

EVENTS.push(donner_rumor, gold_rush_news, cholera_peak_1852, mormon_handcart, pony_express, spring_flood);
