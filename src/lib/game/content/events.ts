import type { GameState } from '../types';
import type { Rng } from '../rng';
import { inTerrain, monthIs } from './event-gating';

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
