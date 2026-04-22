import type { GameState } from '../types';
import type { Rng } from '../rng';
import { inTerrain, monthIs, yearAtLeast, yearBetween } from './event-gating';
import { consumeWagonPart, deathMoralePenalty } from '../professions/bonuses';

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
  // When true, suppress the auto-appended "Title: choice label." log line.
  // Audited choices that write their own outcome line set this to true so the
  // log isn't redundant. Unaudited choices keep getting the auto-append.
  silentLog?: boolean;
}

export interface GameEvent {
  id: string;
  category: EventCategory;
  title: string;
  body: string;
  // Optional text-pool key for body flavor variants. When present, the engine
  // picks one variant by seeded rng at fire time and stores it in
  // flags._pendingEventBody so the modal renders it.
  bodyKey?: string;
  weight: number;
  choices: EventChoice[];
  gate?: (state: GameState) => boolean;
}

// The full registry is built up in Tasks 2-5. Task 1 ships an empty-or-placeholder
// array to unblock the systems module; Task 2 onward pushes real events.
export const EVENTS: GameEvent[] = [];

// Helper: append a single log line in one statement.
function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

// --- Weather events ---
const storm: GameEvent = {
  id: 'weather_storm',
  category: 'weather',
  title: 'A thunderstorm rolls in',
  body: 'Dark clouds gather and the rain comes down in sheets.',
  bodyKey: 'weather_storm.body',
  weight: 4,
  choices: [
    {
      id: 'press_on',
      label: 'Press on',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 2), wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 2) } },
        'Pushed through the storm. Morale −2, wagon condition −2.'
      )
    },
    {
      id: 'shelter',
      label: 'Shelter until it passes',
      silentLog: true,
      apply: (s) => logLine({ ...s, morale: Math.max(0, s.morale - 1) }, 'Sheltered out the storm. Morale −1, no progress.')
    }
  ]
};

const heat_wave: GameEvent = {
  id: 'weather_heat',
  category: 'weather',
  title: 'A stifling heat wave',
  body: 'The sun beats down mercilessly. Water stores dwindle fast.',
  bodyKey: 'weather_heat.body',
  weight: 3,
  gate: inTerrain('prairie', 'desert'),
  choices: [
    {
      id: 'endure',
      label: 'Endure it',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          resources: { ...s.resources, water: Math.max(0, s.resources.water - 5) },
          morale: Math.max(0, s.morale - 1)
        },
        'Endured the heat. Water −5 gal, morale −1.'
      )
    }
  ]
};

const fog: GameEvent = {
  id: 'weather_fog',
  category: 'weather',
  title: 'Heavy fog sets in',
  body: 'Visibility drops to nothing.',
  bodyKey: 'weather_fog.body',
  weight: 2,
  choices: [
    {
      id: 'wait',
      label: 'Wait it out',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, location: { ...s.location, milesTraveled: Math.max(0, s.location.milesTraveled - 5) } },
        'Lost 5 mi waiting for the fog to lift.'
      )
    }
  ]
};

const early_snow: GameEvent = {
  id: 'weather_snow',
  category: 'weather',
  title: 'Early snowfall',
  body: 'A chill bite in the air and snowflakes on the pass.',
  bodyKey: 'weather_snow.body',
  weight: 3,
  gate: monthIs(9, 10, 11),
  choices: [
    {
      id: 'push_through',
      label: 'Push through',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.max(0, s.morale - 3),
          party: s.party.map((m) => m.dead ? m : ({ ...m, health: Math.max(0, m.health - 3) }))
        },
        'Pressed through the snow. Morale −3, every alive member −3 hp.'
      )
    }
  ]
};

// --- Wagon / livestock events ---
const broken_wheel: GameEvent = {
  id: 'wagon_wheel',
  category: 'wagon',
  title: 'A wheel shatters',
  body: 'A spoke gives way, then the whole rim.',
  bodyKey: 'wagon_wheel.body',
  weight: 3,
  choices: [
    {
      id: 'replace',
      label: 'Replace with a spare wheel',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const have = s.inventory.wheel ?? 0;
        if (have > 0) {
          const { state: after, saved } = consumeWagonPart(s, rng, 'wheel');
          const log = saved
            ? 'The carpenter pieced the old wheel back together — the spare was kept.'
            : 'Mounted a spare wheel. Wagon condition +10.';
          return logLine(
            { ...after, wagon: { ...after.wagon, condition: Math.min(100, after.wagon.condition + 10) } },
            log
          );
        }
        return logLine(
          { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 15) } },
          'No spare wheel. Improvised a fix — wagon condition −15.'
        );
      }
    }
  ]
};

const ox_lame: GameEvent = {
  id: 'ox_lame',
  category: 'wagon',
  title: 'An ox goes lame',
  body: 'One of the oxen is favoring a hoof.',
  bodyKey: 'ox_lame.body',
  weight: 3,
  choices: [
    {
      id: 'rest_it',
      label: 'Rest it in the yoke for the day',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          oxen: s.oxen.map((o, i) => i === 0 ? { ...o, fatigue: Math.min(100, o.fatigue + 15) } : o)
        },
        'Eased the lame ox along. Lead ox fatigue +15.'
      )
    }
  ]
};

const ox_threw_shoe: GameEvent = {
  id: 'ox_shoe',
  category: 'wagon',
  title: 'An ox throws a shoe',
  body: 'The rocky terrain took a toll.',
  bodyKey: 'ox_shoe.body',
  weight: 3,
  gate: inTerrain('mountains', 'desert'),
  choices: [
    {
      id: 'reshoe',
      label: 'Re-shoe the ox',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const have = s.inventory.ox_shoes ?? 0;
        if (have > 0) {
          return logLine(
            { ...s, inventory: { ...s.inventory, ox_shoes: have - 1 } },
            'Re-shod the ox. Ox shoes −1.'
          );
        }
        return logLine(
          { ...s, oxen: s.oxen.map((o, i) => i === 0 ? { ...o, shod: false } : o) },
          'No ox shoes on hand. Lead ox now travels barefoot — slower, faster fatigue.'
        );
      }
    }
  ]
};

const tongue_snaps: GameEvent = {
  id: 'wagon_tongue',
  category: 'wagon',
  title: 'The wagon tongue snaps',
  body: 'A crack, then a splinter. The oxen halt.',
  bodyKey: 'wagon_tongue.body',
  weight: 2,
  choices: [
    {
      id: 'repair',
      label: 'Repair with a spare tongue',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const have = s.inventory.tongue ?? 0;
        if (have > 0) {
          const { state: after, saved } = consumeWagonPart(s, rng, 'tongue');
          const log = saved
            ? 'The carpenter spliced the old tongue with a plank — the spare was kept.'
            : 'Fitted the spare tongue. Spare tongue −1.';
          return logLine(after, log);
        }
        return logLine(
          { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 20) } },
          'No spare tongue. A lashed-together repair — wagon condition −20.'
        );
      }
    }
  ]
};

const canvas_tear: GameEvent = {
  id: 'wagon_canvas',
  category: 'wagon',
  title: 'The canvas cover tears',
  body: 'A gust of wind rips a seam.',
  bodyKey: 'wagon_canvas.body',
  weight: 2,
  choices: [
    {
      id: 'patch',
      label: 'Patch it',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const have = s.inventory.canvas ?? 0;
        if (have > 0) {
          const { state: after, saved } = consumeWagonPart(s, rng, 'canvas');
          const log = saved
            ? 'The carpenter stitched the tear clean — the spare canvas was kept.'
            : 'Replaced the torn canvas. Canvas −1.';
          return logLine(after, log);
        }
        return logLine(
          { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 8) }, morale: Math.max(0, s.morale - 1) },
          'No spare canvas. Tied off the tear — wagon condition −8, morale −1.'
        );
      }
    }
  ]
};

const ox_wanders: GameEvent = {
  id: 'ox_wander',
  category: 'wagon',
  title: 'An ox wandered off in the night',
  body: 'Tracks lead into the brush.',
  bodyKey: 'ox_wander.body',
  weight: 2,
  choices: [
    {
      id: 'search',
      label: 'Search for it (half day)',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Spent half a day tracking the wandered ox. Morale −1.'
      )
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
  bodyKey: 'health_cholera.body',
  weight: 3,
  choices: [
    {
      id: 'risk_drink',
      label: 'Drink anyway',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        // Boiling knowledge cuts risk dramatically
        const baseChance = 0.25;
        const chance = s.flags.hasBoilingKnowledge || s.party.some(m => !m.dead && m.profession === 'doctor') ? baseChance * 0.3 : baseChance;
        if (rng.chance(chance)) {
          const alive = s.party.filter(m => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return logLine(
              {
                ...s,
                party: s.party.map(m => m.id === victim.id ? { ...m, conditions: [...m.conditions, { id: 'cholera', daysSinceOnset: 0 }] } : m)
              },
              `${victim.name} drank the bad water and has cholera.`
            );
          }
        }
        return logLine(s, 'Drank from the river. No ill effects — this time.');
      }
    },
    {
      id: 'wait',
      label: 'Travel upstream before drinking',
      silentLog: true,
      apply: (s) => logLine(s, 'Traveled upstream to clean water. No harm done.')
    }
  ]
};

const snakebite: GameEvent = {
  id: 'health_snake',
  category: 'health',
  title: 'Rattlesnake strike',
  body: 'A camp-gatherer reaches into the brush and recoils, clutching their hand.',
  bodyKey: 'health_snake.body',
  weight: 1,
  gate: inTerrain('prairie', 'desert'),
  choices: [
    {
      id: 'treat',
      label: 'Treat with bandages & laudanum',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const alive = s.party.filter(m => !m.dead);
        if (alive.length === 0) return s;
        const victim = alive[rng.int(0, alive.length - 1)];
        const bandages = s.inventory.bandages ?? 0;
        const hp = bandages > 0 ? 10 : 20;
        const log = bandages > 0
          ? `${victim.name} took a snakebite. Bandages used (−1). Health −${hp}.`
          : `${victim.name} took a snakebite. No bandages — health −${hp}.`;
        return logLine(
          {
            ...s,
            inventory: bandages > 0 ? { ...s.inventory, bandages: bandages - 1 } : s.inventory,
            party: s.party.map(m =>
              m.id === victim.id
                ? { ...m, health: Math.max(0, m.health - hp), conditions: [...m.conditions, { id: 'snakebite', daysSinceOnset: 0 }] }
                : m
            )
          },
          log
        );
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
  bodyKey: 'find_berries.body',
  weight: 3,
  gate: monthIs(6, 7, 8),
  choices: [
    {
      id: 'harvest',
      label: 'Harvest them',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const amount = rng.int(10, 25);
        return logLine(
          {
            ...s,
            inventory: { ...s.inventory, dried_fruit: (s.inventory.dried_fruit ?? 0) + amount },
            morale: Math.min(100, s.morale + 2)
          },
          `Harvested wild berries. Dried fruit +${amount}, morale +2.`
        );
      }
    }
  ]
};

const abandoned_cache: GameEvent = {
  id: 'find_cache',
  category: 'finds',
  title: 'An abandoned cache',
  body: 'A sealed barrel and a small wooden chest, left by a party that moved on quickly.',
  bodyKey: 'find_cache.body',
  weight: 1,
  choices: [
    {
      id: 'take',
      label: 'Take everything',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const flour = rng.int(20, 60);
        const bullets = rng.int(5, 15);
        return logLine(
          {
            ...s,
            inventory: {
              ...s.inventory,
              flour: (s.inventory.flour ?? 0) + flour,
              bullets: (s.inventory.bullets ?? 0) + bullets
            }
          },
          `Picked the cache clean. Flour +${flour}, bullets +${bullets}.`
        );
      }
    }
  ]
};

const fresh_spring: GameEvent = {
  id: 'find_spring',
  category: 'finds',
  title: 'A cold clear spring',
  body: 'Water bubbles up from between the rocks.',
  bodyKey: 'find_spring.body',
  weight: 3,
  choices: [
    {
      id: 'fill',
      label: 'Fill every water skin',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const filled = s.resources.waterCap - s.resources.water;
        return logLine(
          { ...s, resources: { ...s.resources, water: s.resources.waterCap } },
          `Filled every water skin from the spring. Water +${filled} gal (now full).`
        );
      }
    }
  ]
};

// --- Chance encounters ---
const emigrant_party: GameEvent = {
  id: 'encounter_emigrants',
  category: 'encounter',
  title: 'A passing wagon train',
  body: 'Fellow travelers bound the same direction. They stop to swap news.',
  bodyKey: 'encounter_emigrants.body',
  weight: 3,
  choices: [
    {
      id: 'talk',
      label: 'Trade news',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 2) },
        'Swapped news with a passing train. Morale +2.'
      )
    }
  ]
};

const abandoned_wagon: GameEvent = {
  id: 'encounter_abandoned',
  category: 'encounter',
  title: 'An abandoned wagon',
  body: 'Tipped over, split at the tongue. Scattered possessions lie in the grass.',
  bodyKey: 'encounter_abandoned.body',
  weight: 2,
  choices: [
    {
      id: 'scavenge',
      label: 'Scavenge what you can',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const parts = ['wheel', 'axle', 'tongue', 'canvas'];
        const gift = parts[rng.int(0, parts.length - 1)];
        const display = gift.replace(/_/g, ' ');
        return logLine(
          { ...s, inventory: { ...s.inventory, [gift]: (s.inventory[gift] ?? 0) + 1 } },
          `Scavenged the abandoned wagon. Found a ${display} (+1).`
        );
      }
    },
    {
      id: 'pass',
      label: 'Pass it by',
      silentLog: true,
      apply: (s) => logLine(s, 'Passed the wreck by. Nothing gained, nothing lost.')
    }
  ]
};

const lost_child: GameEvent = {
  id: 'encounter_child',
  category: 'encounter',
  title: 'A lost child',
  body: 'A small figure sits crying beside the trail. Separated from another party.',
  bodyKey: 'encounter_child.body',
  weight: 1,
  choices: [
    {
      id: 'help',
      label: 'Take them to the next post',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 3),
          inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 5) }
        },
        'Took the lost child to the next post. Morale +3, flour −5.'
      )
    }
  ]
};

// --- Personal ---
const personal_quarrel: GameEvent = {
  id: 'personal_quarrel',
  category: 'personal',
  title: 'A quarrel breaks out',
  body: 'Tensions boil over. Harsh words pass between party members.',
  bodyKey: 'personal_quarrel.body',
  weight: 2,
  choices: [
    {
      id: 'mediate',
      label: 'Mediate',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Mediated the quarrel — but tempers stayed frayed. Morale −1.'
      )
    }
  ]
};

const personal_prayer: GameEvent = {
  id: 'personal_prayer',
  category: 'personal',
  title: 'A quiet evening prayer',
  body: 'Someone leads a short prayer at the campfire.',
  bodyKey: 'personal_prayer.body',
  weight: 2,
  choices: [
    {
      id: 'join',
      label: 'Join',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 1) },
        'Joined in prayer at the fire. Morale +1.'
      )
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
  bodyKey: 'historical_donner.body',
  weight: 2,
  gate: yearAtLeast(1847),
  choices: [
    {
      id: 'heed',
      label: 'Heed the warning',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 2), flags: { ...s.flags, donner_warning_heard: true } },
        'Heard the Donner story. The party is sobered. Morale −2.'
      )
    }
  ]
};

const gold_rush_news: GameEvent = {
  id: 'historical_gold',
  category: 'historical',
  title: 'Word of gold in California',
  body: 'Travelers speak excitedly of nuggets as big as walnuts picked straight out of the streams.',
  bodyKey: 'historical_gold.body',
  weight: 3,
  gate: yearAtLeast(1849),
  choices: [
    {
      id: 'stay_course',
      label: 'Stay on the Oregon Trail',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 1) },
        'Stayed the course toward Oregon. Resolve hardened. Morale +1.'
      )
    }
  ]
};

const cholera_peak_1852: GameEvent = {
  id: 'historical_cholera_1852',
  category: 'health',
  title: 'Cholera sweeps the trail (1852)',
  body: '1852 is a cruel year. Graves line the way.',
  bodyKey: 'historical_cholera_1852.body',
  weight: 6,  // extra high weight for 1852
  gate: yearBetween(1852, 1852),
  choices: [
    {
      id: 'keep_moving',
      label: 'Keep moving',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        // 50% chance of cholera onset on a random alive member
        if (rng.chance(0.5)) {
          const alive = s.party.filter(m => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return logLine(
              {
                ...s,
                party: s.party.map(m => m.id === victim.id ? { ...m, conditions: [...m.conditions, { id: 'cholera', daysSinceOnset: 0 }] } : m)
              },
              `${victim.name} caught cholera in the 1852 epidemic.`
            );
          }
        }
        return logLine(s, 'Kept moving past the graves. The party was spared this time.');
      }
    }
  ]
};

const mormon_handcart: GameEvent = {
  id: 'historical_mormon',
  category: 'encounter',
  title: 'A Mormon handcart company',
  body: 'A line of men, women, and children pushing and pulling handcarts westward.',
  bodyKey: 'historical_mormon.body',
  weight: 2,
  gate: yearBetween(1856, 1860),
  choices: [
    {
      id: 'share',
      label: 'Share a meal',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 2),
          inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 5) }
        },
        'Shared a meal with the handcart company. Flour −5, morale +2.'
      )
    }
  ]
};

const pony_express: GameEvent = {
  id: 'historical_pony',
  category: 'encounter',
  title: 'A Pony Express rider',
  body: 'A rider thunders past, bags bulging with mail. He shouts news of the east.',
  bodyKey: 'historical_pony.body',
  weight: 2,
  gate: yearBetween(1860, 1861),
  choices: [
    {
      id: 'cheer',
      label: 'Cheer him on',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 2) },
        'Cheered the rider on. Spirits lifted. Morale +2.'
      )
    }
  ]
};

const spring_flood: GameEvent = {
  id: 'weather_flood',
  category: 'weather',
  title: 'Spring flooding',
  body: 'Swollen creeks overflow into the trail.',
  bodyKey: 'weather_flood.body',
  weight: 3,
  gate: monthIs(3, 4, 5),
  choices: [
    {
      id: 'detour',
      label: 'Detour around the flood',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, location: { ...s.location, milesTraveled: Math.max(0, s.location.milesTraveled - 8) } },
        'Detoured around the flood. Lost 8 mi.'
      )
    }
  ]
};

EVENTS.push(donner_rumor, gold_rush_news, cholera_peak_1852, mormon_handcart, pony_express, spring_flood);

// --- Situation-triggered events (gated by flags set elsewhere in the engine) ---

// Burial — fires the day after any party member dies (reapDead sets _burialPending).
// High weight so it's essentially guaranteed to be picked from the eligible pool.
const burial: GameEvent = {
  id: 'personal_burial',
  category: 'personal',
  title: 'A burial on the trail',
  body: 'The party halts to lay the dead to rest. A proper grave gives the living a moment of grace before pressing on.',
  bodyKey: 'personal_burial.body',
  weight: 9999,
  gate: (s) => !!s.flags._burialPending,
  choices: [
    {
      id: 'dig_grave',
      label: 'Dig a proper grave (requires shovel)',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        const hasShovel = (s.inventory.shovel ?? 0) > 0;
        if (hasShovel) {
          return logLine(
            { ...s, flags, morale: Math.min(100, s.morale + 2) },
            'A grave was dug. The party said their farewells with some comfort. Morale +2.'
          );
        }
        const penalty = deathMoralePenalty(s, 4);
        return logLine(
          { ...s, flags, morale: Math.max(0, s.morale - penalty) },
          `Without a shovel, the body was covered with stones. A hard farewell. Morale −${penalty}.`
        );
      }
    },
    {
      id: 'moment_of_silence',
      label: "Just a moment's silence — press on",
      silentLog: true,
      apply: (s) => {
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        const penalty = deathMoralePenalty(s, 3);
        return logLine(
          { ...s, flags, morale: Math.max(0, s.morale - penalty) },
          `The party moved on with only a brief silence. Heavy hearts. Morale −${penalty}.`
        );
      }
    }
  ]
};

// Wagon stuck in mud — rare random event, uses the shovel.
const stuck_in_mud: GameEvent = {
  id: 'wagon_stuck',
  category: 'wagon',
  title: 'The wagon is stuck in mud',
  body: 'A soft patch of trail turned to muck under the wheels. The oxen strain against the yoke; nothing budges.',
  bodyKey: 'wagon_stuck.body',
  weight: 2,
  gate: inTerrain('prairie', 'forest'),
  choices: [
    {
      id: 'dig_out',
      label: 'Dig out with the shovel',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const hasShovel = (s.inventory.shovel ?? 0) > 0;
        if (hasShovel) {
          return logLine(s, 'Dug the wagon free. Half a day lost but no damage.');
        }
        return logLine(
          { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 15) } },
          'Without a shovel the wagon was pried loose with levers and rope. Wagon condition −15.'
        );
      }
    },
    {
      id: 'force',
      label: 'Force the oxen through — whip and shout',
      silentLog: true,
      apply: (s, rng) => {
        const fatigueHit = rng.int(12, 25);
        const oxen = s.oxen.map((o) => ({ ...o, fatigue: Math.min(100, o.fatigue + fatigueHit) }));
        return logLine(
          { ...s, oxen },
          `Forced through the mud. The oxen are wrecked (+${fatigueHit} fatigue each).`
        );
      }
    },
    {
      id: 'camp_wait',
      label: 'Camp here and wait for it to dry',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Camped a day waiting out the mud. Good rest, but a day lost. Morale −1.'
      )
    }
  ]
};

EVENTS.push(burial, stuck_in_mud);
