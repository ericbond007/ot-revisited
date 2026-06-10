import type { GameState } from '../types';
import type { Rng } from '../rng';
import { and, inTerrain, milesBetween, monthIs, weatherIs, yearAtLeast, yearBetween } from './event-gating';
import { applyStampedeToPlayer, applyStampedeToNpc, rollStormWindLoss } from '../systems/item-loss';
import { consumeWagonPart, deathMoralePenalty } from '../professions/bonuses';
import { randomChildName } from './historical-names';
// #939j — shared cannibalism math (BURIAL_CANNIBALISM_* + freshness +
// food-presence predicates) now lives in systems/cannibal.ts so the
// burial event, the cannibalism_corpse camp action, and tickNpcWagon
// all read from the same place.
import {
  applyCannibalize,
  findFreshUnconsumedCorpse,
  hasFoodOnHand
} from '../systems/cannibal';
import { resolveWheelBreak } from '../systems/wheel-break';

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
  // Optional action glyph rendered at the left edge of the choice button —
  // intended for thematic cues (🐂 push through, ⛺ pitch camp, ⚒️ fix it,
  // etc.). When `requires.icon` is also set, the requires icon takes
  // precedence (item-gate is a stronger signal than action flavor).
  // Populating this across the full event catalog is a follow-up.
  icon?: string;
  // Optional required-item gate. When set, the choice renders disabled in
  // the modal if the party is missing the item, with a hint stating why.
  // The item's icon is also surfaced alongside the label.
  requires?: { itemId: string; icon?: string; reason?: string };
  // Optional state-predicate gate. When set and returns false, the choice
  // is filtered out of the modal entirely (vs `requires` which renders
  // disabled). Use for desperation choices that shouldn't even be visible
  // outside their narrow context (e.g. "Eat the body" — only when the
  // party is starving).
  hidden?: (state: GameState) => boolean;
  // Optional state-predicate enabled gate. When set and returns false,
  // the choice renders disabled in the modal. Unlike `requires`, this
  // accepts an arbitrary state predicate rather than a named item ID.
  // Useful when the gate condition spans multiple fields (e.g. count > 0).
  enabled?: (state: GameState) => boolean;
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
  // Optional fire-time hook (#282 / #289 integration). Runs once when
  // the event is selected, after rollEvent / arrival / approach
  // returns it. Use it to stash dynamic context the choices will read
  // back at apply time — e.g., a randomly picked companion + barter
  // offer for the train-companion-barter event. Should set
  // `flags._pendingEventBody` if the body needs to be dynamic. The
  // engine wires this in alongside bodyKey resolution.
  //
  // **Mutual exclusion with `bodyKey`**: pick one. The engine resolves
  // `bodyKey` first, then runs `prepare` — if both write
  // `_pendingEventBody`, prepare wins. A dev-mode console warning
  // fires in `prepareEventForSurfacing` if an event sets both.
  prepare?: (state: GameState, rng: Rng) => GameState;
  /** #939i — when true, this event is excluded from `NPC_ELIGIBLE_EVENTS`
   *  even if its category is in the NPC allow-list. Use for events whose
   *  `apply()` reads player-only state the wagon-synth doesn't bridge. */
  npcSkip?: boolean;
  /** #1279 — set on NPC-crisis events built by buildStarvationCrisisEvent;
   *  identifies the target companion wagon so the surfacing driver can mark
   *  crisisAskedDay on it. */
  npcWagonId?: string;
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
  gate: weatherIs('storm'),
  choices: [
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Press on',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        let next: GameState = {
          ...s,
          morale: Math.max(0, s.morale - 2),
          wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 2) }
        };
        // #306 phase 2 — wind-loss roll. Period: Bryant 1846 "the wind
        // took the canvas and our flour barrel" — items not lashed
        // tight blew off when the wagon kept moving. ~20% chance per
        // press-through-the-storm; takes one item from WIND_VICTIMS.
        const windResult = rollStormWindLoss(next, rng);
        next = windResult.state;
        return logLine(next, 'Pushed through the storm. Morale −2, wagon condition −2.');
      }
    },
    {
      id: 'shelter',
      icon: '⛺',
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
  gate: and(weatherIs('heat'), inTerrain('prairie', 'desert')),
  choices: [
    {
      id: 'endure',
      icon: '😤',
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
  gate: weatherIs('fog'),
  choices: [
    {
      id: 'wait',
      icon: '⛺',
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
  gate: and(weatherIs('snow'), monthIs(9, 10, 11)),
  choices: [
    {
      id: 'push_through',
      icon: '💪',
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
      id: 'spare',
      icon: '⚙️',
      label: 'Mount the spare wheel',
      enabled: (s) => (s.inventory.wheel ?? 0) > 0,
      silentLog: true,
      apply: (s, rng) => {
        const { state, log } = resolveWheelBreak(s, rng, 'spare');
        return logLine(state, log);
      }
    },
    {
      id: 'rebuild',
      icon: '🔨',
      label: 'Rebuild the wheel trailside (2 days, 1 if Blacksmith)',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const { state, log } = resolveWheelBreak(s, rng, 'rebuild');
        return logLine(state, log);
      }
    },
    {
      id: 'push_on',
      icon: '🐎',
      label: 'Push on — limp to the next post',
      silentLog: true,
      apply: (s, rng) => {
        const { state, log } = resolveWheelBreak(s, rng, 'push_on');
        return logLine(state, log);
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
      icon: '🏕️',
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
      icon: '⚒️',
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
      icon: '⚒️',
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
      icon: '⚒️',
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
          { ...s, wagon: { ...s.wagon, canvas: Math.max(0, s.wagon.canvas - 15) }, morale: Math.max(0, s.morale - 1) },
          'No spare canvas. Tied off the tear with rope — canvas −15, morale −1.'
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
      icon: '🔍',
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

// Axle break (#201) — historically frequent everywhere on the trail:
// heat-split in dry summer, shock damage at fords, overload anywhere,
// long descents. Not gated by terrain — emigrant journals show axles
// breaking in the prairie as often as in the rocks.
const axle_breaks: GameEvent = {
  id: 'wagon_axle',
  category: 'wagon',
  title: 'The axle splits',
  body: 'A loud crack from beneath the wagon — the lead axle has broken.',
  bodyKey: 'wagon_axle.body',
  weight: 2,
  choices: [
    {
      id: 'replace',
      icon: '⚒️',
      label: 'Fit the spare axle',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const have = s.inventory.axle ?? 0;
        if (have > 0) {
          const { state: after, saved } = consumeWagonPart(s, rng, 'axle');
          const log = saved
            ? 'The carpenter fished the broken axle and saved the spare.'
            : 'Mounted the spare axle. Heavy work but it holds.';
          return logLine(after, log);
        }
        // No spare → catastrophic. Emigrant solution was to fish (splice)
        // the broken axle with a hardwood pole and keep moving slowly.
        return logLine(
          { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 25) } },
          'No spare axle. Fished the break with a hardwood pole — wagon condition −25.'
        );
      }
    }
  ]
};

// Ox bow cracks (#215) — load-bearing U-loop on the yoke gives way.
// Period reality: the most-broken hitch part on the trail (Marcy 1859
// prescribed 2 spares per wagon — more than for any other part). The
// weight 4 here matches that — bows crack more often than wheels (3)
// or tongues (2). Yokes by contrast are rarely broken; no event for
// them, in line with the historical record.
const ox_bow_cracks: GameEvent = {
  id: 'ox_bow',
  category: 'wagon',
  title: 'An ox bow splits',
  body: 'The hickory cracks with a sound like a gunshot. The lead ox lurches sideways before the team halts.',
  bodyKey: 'ox_bow.body',
  weight: 4,
  choices: [
    {
      id: 'replace',
      icon: '⚒️',
      label: 'Fit a spare ox bow',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const have = s.inventory.ox_bow ?? 0;
        if (have > 0) {
          const { state: after, saved } = consumeWagonPart(s, rng, 'ox_bow');
          const log = saved
            ? 'The carpenter steamed and re-bent the cracked bow — the spare was kept.'
            : 'Fitted the spare bow. Spare ox bow −1.';
          return logLine(after, log);
        }
        // No spare: lash with rope. The team limps with one ox under-
        // hitched until the next post. Wagon condition shrug-off; this
        // is more about pace than frame damage.
        return logLine(
          { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 5) } },
          'No spare bow. Lashed the cracked one with rope — wagon condition −5, the team will limp.'
        );
      }
    }
  ]
};

// --- #306 Buffalo stampede ---
// Period anchor: Marcy 1859 *The Prairie Traveler* — "buffalo running
// through camp at night will smash any cookware not stowed inside the
// wagon." Pre-1860s Platte corridor herds were enormous; a startled
// herd at dusk could trample a whole company's tinware. One-shot per
// game (`_stampedeFiredYear` flag scoped per year). Gates on prairie
// terrain + Platte miles (200-700) + summer months when herds were
// thickest. Train-wide damage when in a wagon train — period: a
// stampede took the whole camp, not one wagon.
const buffalo_stampede: GameEvent = {
  id: 'buffalo_stampede',
  category: 'encounter',
  title: 'Buffalo through the camp',
  body: 'Just past sundown a wall of dust rises to the south. The ground starts to tremble. A herd, spooked by something — wolves, lightning, a careless rifle shot — comes through camp at full run. The wagons hold; the iron laid out around the cookfire does not.',
  weight: 3,
  gate: and(
    inTerrain('prairie'),
    monthIs(4, 5, 6, 7, 8),
    milesBetween(200, 700),
    (s) => !s.flags[`_stampedeFiredYear_${s.date.year}`]
  ),
  choices: [
    {
      id: 'pick_up_pieces',
      icon: '🦬',
      label: 'Pick up the pieces at dawn',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        // Mark the flag first so re-entry can't double-fire this year.
        let next: GameState = {
          ...s,
          flags: { ...s.flags, [`_stampedeFiredYear_${s.date.year}`]: true }
        };
        next = applyStampedeToPlayer(next, rng);
        // Train-wide propagation — period: stampedes hit the whole
        // camp, every wagon. Each in-progress companion takes the
        // same crushed-tinware roll and the player gets a one-line
        // bubble-up summary per affected wagon.
        if (next.wagonTrain) {
          const playerLogs: string[] = [];
          const updated = next.wagonTrain.companions.map((c) => {
            const npcResult = applyStampedeToNpc(c, rng, next.day);
            if (npcResult.playerLog) playerLogs.push(npcResult.playerLog);
            return npcResult.wagon;
          });
          next = {
            ...next,
            wagonTrain: { ...next.wagonTrain, companions: updated },
            eventLog: [
              ...next.eventLog,
              ...playerLogs.map((text) => ({ day: next.day, text }))
            ]
          };
        }
        return next;
      }
    }
  ]
};

EVENTS.push(storm, heat_wave, fog, early_snow, broken_wheel, ox_lame, ox_threw_shoe, tongue_snaps, canvas_tear, axle_breaks, ox_wanders, ox_bow_cracks, buffalo_stampede);

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
      icon: '🥤',
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
      icon: '💧',
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
      icon: '🩹',
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
      icon: '🤲',
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
      icon: '🤲',
      label: 'Take everything',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const flour = rng.int(20, 60);
        const shots = rng.int(5, 15);
        return logLine(
          {
            ...s,
            inventory: {
              ...s.inventory,
              flour: (s.inventory.flour ?? 0) + flour,
              gunpowder:       (s.inventory.gunpowder ?? 0) + shots,
              lead_balls:      (s.inventory.lead_balls ?? 0) + shots,
              percussion_caps: (s.inventory.percussion_caps ?? 0) + shots
            }
          },
          `Picked the cache clean. Flour +${flour}, ${shots} shots' worth of powder/lead/caps.`
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
      icon: '💧',
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
      icon: '💬',
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
      icon: '🤲',
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
      icon: '🚶',
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
      id: 'take_in',
      icon: '🤍',
      label: 'Take them in',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        // Decide sex + age + name from the seeded rng so replays are deterministic.
        const sex: 'male' | 'female' = rng.chance(0.5) ? 'male' : 'female';
        const age = rng.int(5, 13);
        const name = randomChildName(sex, rng.int(0, 999));
        const id = `c${s.day}-${rng.int(1000, 9999)}`;
        const child = {
          id, name, sex, kind: 'adult' as const, // placeholder — real kind set below
          isLeader: false, age, health: 100, conditions: [], dead: false
        };
        // Set kind to 'child' explicitly (TS narrowing through the literal above).
        const childMember = { ...child, kind: 'child' as const };
        return logLine(
          { ...s, party: [...s.party, childMember], morale: Math.min(100, s.morale + 3) },
          `Took in ${name}, a ${sex === 'female' ? 'girl' : 'boy'} of ${age}. Morale +3.`
        );
      }
    },
    {
      id: 'leave',
      icon: '🚫',
      label: 'Leave them — you can barely feed your own',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 4) },
        'Left the child by the trail. The party is silent for a long while. Morale −4.'
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
      icon: '💬',
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
      icon: '🙏',
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
      icon: '⚠️',
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
      icon: '🚶',
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
      icon: '🚶',
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
      icon: '💬',
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
      icon: '👋',
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
      icon: '🗺️',
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
//
// Body handling (#205): the body's fate is decided right here on the
// popup. Three outcomes — bury proper (with shovel), build a stone
// mound (no shovel), or eat the body (only when starving). All three
// clear _burialPending and close that body's story; cannibalism
// marks the corpse `consumed` so the party member is no longer
// counted in the alive list. Period reality on the third path: the
// Donner Party precedent — when survivors are starving, fresh meat
// is fresh meat regardless of how the deceased died.
// #939j — BURIAL_CANNIBALISM_MEAT_LBS / BURIAL_CANNIBALISM_MORALE
// removed; live as CANNIBAL_ADULT_MEAT_LB / CANNIBAL_ADULT_MORALE_HIT
// in systems/cannibal.ts. The burial event uses applyCannibalize for
// the actual mutation now.

// #260 — single 3-rifle volley over the grave. Period reality: when
// emigrants buried a man (especially a veteran or train officer), the
// custom was three rifles fired together as a salute. The 1846+ ammo
// system splits each shot into gunpowder + lead_balls + percussion_caps,
// so the cost is 3 of each — small but not free. Caps were the period
// bottleneck (fulminate-of-mercury chemistry couldn't be done on the
// trail), so this gate naturally ties to whether the party can spare
// honors.
const SALUTE_SHOTS = 3;
function canFireSalute(state: GameState): boolean {
  return (state.inventory.gunpowder ?? 0) >= SALUTE_SHOTS
    && (state.inventory.lead_balls ?? 0) >= SALUTE_SHOTS
    && (state.inventory.percussion_caps ?? 0) >= SALUTE_SHOTS;
}

// #939j — `hasNoFoodAtBurial` + `freshUnconsumedDead` parallel impls
// removed. Replaced by `!hasFoodOnHand` + `findFreshUnconsumedCorpse`
// from systems/cannibal.ts (which also adds deathCause-casing tolerance
// for 'Starvation' / 'starvation' / 'attrition' / 'cannibalism_volunteered').
function hasNoFoodAtBurial(state: GameState): boolean {
  return !hasFoodOnHand(state);
}

function freshUnconsumedDead(state: GameState): GameState['party'][number] | null {
  return findFreshUnconsumedCorpse(state);
}

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
      icon: '⛏️',
      label: 'Dig a proper grave',
      isDefault: true,
      silentLog: true,
      requires: {
        itemId: 'shovel',
        icon: '⛏️',
        reason: 'No shovel in the wagon'
      },
      apply: (s) => {
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        return logLine(
          { ...s, flags, morale: Math.min(100, s.morale + 2) },
          'A grave was dug. The party said their farewells with some comfort. Morale +2.'
        );
      }
    },
    {
      id: 'stone_mound',
      icon: '🪨',
      label: 'Build a stone mound',
      // Default if no shovel; otherwise the dig_grave choice takes the default.
      silentLog: true,
      apply: (s) => {
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        const penalty = deathMoralePenalty(s, 4);
        return logLine(
          { ...s, flags, morale: Math.max(0, s.morale - penalty) },
          `Built a stone mound over the body. A hard farewell. Morale −${penalty}.`
        );
      }
    },
    {
      id: 'rifle_salute',
      icon: '💥',
      label: 'Fire a 3-rifle salute over the grave',
      silentLog: true,
      hidden: (s) => !canFireSalute(s),
      apply: (s) => {
        // Defensive: if hidden somehow lapses, fall through to stone-mound.
        if (!canFireSalute(s)) {
          const flags = { ...s.flags };
          delete (flags as Record<string, unknown>)._burialPending;
          const penalty = deathMoralePenalty(s, 4);
          return logLine(
            { ...s, flags, morale: Math.max(0, s.morale - penalty) },
            `Built a stone mound over the body. A hard farewell. Morale −${penalty}.`
          );
        }
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        return logLine(
          {
            ...s,
            flags,
            inventory: {
              ...s.inventory,
              gunpowder: (s.inventory.gunpowder ?? 0) - SALUTE_SHOTS,
              lead_balls: (s.inventory.lead_balls ?? 0) - SALUTE_SHOTS,
              percussion_caps: (s.inventory.percussion_caps ?? 0) - SALUTE_SHOTS
            },
            morale: Math.min(100, s.morale + 4)
          },
          'Three rifles spoke as one over the grave. Morale +4.'
        );
      }
    },
    {
      id: 'eat_the_body',
      icon: '🍖',
      label: 'Eat the body',
      silentLog: true,
      // Hidden unless the party has nothing left to eat. Period reality:
      // Donner Party precedent — survivors only turned to this when
      // there was no food left.
      hidden: (s) => !hasNoFoodAtBurial(s),
      apply: (s, rng) => {
        // Defensive: the hidden predicate gates UI visibility, but if
        // a non-starving state somehow reaches here (dev tools, replay,
        // race), fall back to stone-mound semantics so we never grant
        // unearned meat.
        if (!hasNoFoodAtBurial(s)) {
          const flags = { ...s.flags };
          delete (flags as Record<string, unknown>)._burialPending;
          const penalty = deathMoralePenalty(s, 4);
          return logLine(
            { ...s, flags, morale: Math.max(0, s.morale - penalty) },
            `Built a stone mound over the body. A hard farewell. Morale −${penalty}.`
          );
        }
        const corpse = freshUnconsumedDead(s);
        if (!corpse) {
          const flags = { ...s.flags };
          delete (flags as Record<string, unknown>)._burialPending;
          return logLine({ ...s, flags }, 'Burial — but no body was fresh enough.');
        }
        // #939j — applyCannibalize handles meat/morale/_cannibalismCount;
        // we wrap it with the burial-pending clear so the modal closes.
        const flags = { ...s.flags };
        delete (flags as Record<string, unknown>)._burialPending;
        const { state, log } = applyCannibalize({ ...s, flags }, corpse.id, rng);
        return logLine(state, log);
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
      icon: '⛏️',
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
      icon: '💪',
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
      icon: '⛺',
      label: 'Camp here and wait for it to dry',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Camped a day waiting out the mud. Good rest, but a day lost. Morale −1.'
      )
    },
    {
      // #306 phase 2 — Joel Palmer 1845: "had to leave the cookware to
      // get the wagon out of the slough." Marcy 1859 calls the discard
      // pattern "lining the trail with iron." Player choice — never the
      // default; only pick this when other options aren't enough.
      //
      // #936b — two-step: don't auto-dump for the player. Set a flag;
      // the play route opens MudAbandonModal so the player picks which
      // heavy gear to jettison. NPC/bot wagons resolve the flag
      // immediately via the persona-driven auto path (npc-engine /
      // bot runner) — they never see a modal.
      id: 'abandon_load',
      icon: '🪦',
      label: 'Lighten the load — abandon heavy gear',
      silentLog: true,
      apply: (s) => ({ ...s, flags: { ...s.flags, _mudAbandonPending: true } })
    }
  ]
};

EVENTS.push(burial, stuck_in_mud);

// --- Dog events (task #142) --------------------------------------------
// Gate on whether the party has a dog. Loss events require `state.dog`;
// gain events require `!state.dog`. Events clear or set `state.dog`
// directly — this is how the player loses and re-acquires a companion.

const dog_snakebite: GameEvent = {
  id: 'dog_snakebite',
  category: 'personal',
  title: 'A rattlesnake strike',
  body: "Coiled in the shade by the trail. Your dog got there first.",
  weight: 2,
  gate: (s) => !!s.dog && ['prairie', 'mountains'].includes(s.location.terrain),
  choices: [
    {
      id: 'tend_wound',
      icon: '🩹',
      label: 'Tend the wound through the night',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'laudanum', icon: '💊', reason: 'Need laudanum' },
      apply: (s, rng) => {
        const dogName = s.dog?.name ?? 'The dog';
        const inventory = { ...s.inventory, laudanum: Math.max(0, (s.inventory.laudanum ?? 0) - 1) };
        if (rng.chance(0.6)) {
          return logLine(
            { ...s, inventory, morale: Math.max(0, s.morale - 2) },
            `${dogName} survived the snakebite, weak but breathing. Morale −2 from the scare.`
          );
        }
        return logLine(
          { ...s, inventory, dog: undefined, morale: Math.max(0, s.morale - 8) },
          `${dogName} did not make it through the night. Morale −8.`
        );
      }
    },
    {
      id: 'accept_loss',
      icon: '🪦',
      label: 'Nothing to be done',
      silentLog: true,
      apply: (s) => {
        const dogName = s.dog?.name ?? 'The dog';
        return logLine(
          { ...s, dog: undefined, morale: Math.max(0, s.morale - 10) },
          `${dogName} died of the snakebite within hours. Morale −10.`
        );
      }
    }
  ]
};

const dog_wolves: GameEvent = {
  id: 'dog_wolves',
  category: 'encounter',
  title: 'Wolves at the camp edge',
  body: 'Yellow eyes catch the firelight. Your dog bristles, low and growling.',
  weight: 2,
  gate: (s) => !!s.dog && ['forest', 'mountains'].includes(s.location.terrain),
  choices: [
    {
      id: 'stand_with_dog',
      icon: '🛡️',
      label: 'Stand watch alongside the dog',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const dogName = s.dog?.name ?? 'The dog';
        const roll = rng.int(1, 100);
        // 60% — repelled: morale boost. 30% — dog wounded but alive.
        // 10% — dog killed in the fight.
        if (roll <= 60) {
          return logLine(
            { ...s, morale: Math.min(100, s.morale + 4) },
            `${dogName} drove the wolves off into the dark. Morale +4.`
          );
        }
        if (roll <= 90) {
          return logLine(
            { ...s, morale: Math.max(0, s.morale - 2) },
            `${dogName} took a bite to the flank but kept the wolves back. Limping for now. Morale −2.`
          );
        }
        return logLine(
          { ...s, dog: undefined, morale: Math.max(0, s.morale - 12) },
          `${dogName} killed one wolf but fell to the rest. The party was saved. Morale −12.`
        );
      }
    },
    {
      id: 'call_inside',
      icon: '🚪',
      label: 'Call the dog in and hope they pass',
      silentLog: true,
      apply: (s, rng) => {
        const dogName = s.dog?.name ?? 'The dog';
        if (rng.chance(0.5)) {
          // Wolves take a yoke / spare part off the wagon bed.
          return logLine(
            { ...s, morale: Math.max(0, s.morale - 3) },
            `${dogName} came inside. The wolves circled, then moved on — but something was gnawed on the wagon. Morale −3.`
          );
        }
        return logLine(s, `${dogName} came inside. The wolves never came close.`);
      }
    }
  ]
};

const dog_stolen: GameEvent = {
  id: 'dog_stolen',
  category: 'personal',
  title: 'Your dog is missing',
  body: "You wake to an empty bedroll. A neighbor's camp mentions someone leading a dog away before dawn.",
  weight: 1,
  gate: (s) => !!s.dog,
  choices: [
    {
      id: 'pay_reward',
      icon: '💵',
      label: 'Offer a reward for their return ($5)',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const dogName = s.dog?.name ?? 'The dog';
        if (s.cash < 5) {
          return logLine(
            { ...s, dog: undefined, morale: Math.max(0, s.morale - 8) },
            `Not enough cash to post a reward. ${dogName} is gone. Morale −8.`
          );
        }
        if (rng.chance(0.7)) {
          return logLine(
            { ...s, cash: s.cash - 5 },
            `${dogName} came trotting back by evening, wagging as if nothing had happened.`
          );
        }
        return logLine(
          { ...s, cash: s.cash - 5, dog: undefined, morale: Math.max(0, s.morale - 6) },
          `The reward didn't bring ${dogName} back. Morale −6.`
        );
      }
    },
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Press on without them',
      silentLog: true,
      apply: (s) => {
        const dogName = s.dog?.name ?? 'The dog';
        return logLine(
          { ...s, dog: undefined, morale: Math.max(0, s.morale - 10) },
          `${dogName} did not come back. Morale −10.`
        );
      }
    }
  ]
};

const stray_dog_follows: GameEvent = {
  id: 'stray_dog_follows',
  category: 'finds',
  title: 'A dog has been trailing us',
  body: 'A lean hound has shadowed the wagon for a full day, keeping back but never leaving. No collar.',
  weight: 2,
  // Only meaningful if you don't already have a dog.
  gate: (s) => !s.dog,
  choices: [
    {
      id: 'take_in',
      icon: '🐕',
      label: 'Feed it through the night',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const names = ['Scout', 'Jasper', 'Tip', 'Sandy', 'Patch', 'Ranger', 'Shep', 'Biscuit'];
        const name = names[rng.int(0, names.length - 1)];
        return logLine(
          { ...s, dog: { name }, morale: Math.min(100, s.morale + 3) },
          `The stray settled by the fire. The children called her ${name}. Morale +3.`
        );
      }
    },
    {
      id: 'shoo_away',
      icon: '🚫',
      label: 'Shoo it off — we have enough mouths',
      silentLog: true,
      apply: (s) => logLine(s, 'You chased the hound off. It watched from a rise before turning back the way you came.')
    }
  ]
};

const abandoned_wagon_dog: GameEvent = {
  id: 'abandoned_wagon_dog',
  category: 'finds',
  title: 'A wagon left beside the trail',
  body: 'The canvas is gone, the bed stripped — and a rail-thin dog still waits in its shadow. Nothing else for miles.',
  weight: 1,
  gate: (s) => !s.dog,
  choices: [
    {
      id: 'take_dog',
      icon: '🐕',
      label: 'Whistle it over',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const names = ['Old Blue', 'Traveler', 'Duke', 'Boss', 'Cap', 'Major'];
        const name = names[rng.int(0, names.length - 1)];
        return logLine(
          { ...s, dog: { name }, morale: Math.min(100, s.morale + 4) },
          `The dog hesitated, then came. ${name}, you decided. Morale +4.`
        );
      }
    },
    {
      id: 'leave_dog',
      icon: '🚶',
      label: 'Leave it — not your burden',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 3) },
        'You kept moving. The dog watched the wagon roll away. Morale −3.'
      )
    }
  ]
};

EVENTS.push(dog_snakebite, dog_wolves, dog_stolen, stray_dog_follows, abandoned_wagon_dog);

// --- Chicken events (task #138) -----------------------------------------
// Gated on having live chickens. Predators (coyote / hawk / stray dog)
// try the coop at night. A dog scares them off — which is part of why
// emigrants kept one.

const chicken_predator: GameEvent = {
  id: 'chicken_predator',
  category: 'encounter',
  title: 'Something at the coop',
  body: 'A scuff of feathers, a ruckus in the dark. Something is after the chickens.',
  weight: 2,
  gate: (s) => (s.inventory.chicken ?? 0) > 0,
  choices: [
    {
      id: 'rush_out',
      icon: '🏃',
      label: 'Rush out with a lantern',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        // Dog present → predator driven off, no loss.
        if (s.dog) {
          return logLine(
            s,
            `${s.dog.name} lunged past you into the dark, barking. The coop was untouched by morning.`
          );
        }
        // No dog → 1–2 chickens taken.
        const current = s.inventory.chicken ?? 0;
        const lost = Math.min(current, rng.int(1, 2));
        return logLine(
          { ...s, inventory: { ...s.inventory, chicken: current - lost } },
          `By the time you got there, ${lost} ${lost === 1 ? 'hen was' : 'hens were'} already gone into the brush.`
        );
      }
    },
    {
      id: 'stay_in_wagon',
      icon: '🚪',
      label: 'Stay in the wagon — could be anything',
      silentLog: true,
      apply: (s, rng) => {
        if (s.dog) {
          return logLine(
            s,
            `${s.dog.name} worked the coop corner until morning. Nothing got through.`
          );
        }
        const current = s.inventory.chicken ?? 0;
        const lost = Math.min(current, rng.int(1, 3));
        return logLine(
          { ...s, inventory: { ...s.inventory, chicken: current - lost } },
          `In the morning, ${lost} ${lost === 1 ? 'hen was' : 'hens were'} missing from the coop.`
        );
      }
    }
  ]
};

EVENTS.push(chicken_predator);

// --- Mule events (task #14) --------------------------------------------
// Mules were stolen more often than oxen — easier to lead away, more
// valuable per head. Dog presence halves the roll (barks at intruders).

const mule_theft: GameEvent = {
  id: 'mule_theft',
  category: 'encounter',
  title: 'A mule is missing at dawn',
  body: 'The picket line is one short. Tracks lead into the brush — someone worked the hitch loose in the night.',
  weight: 2,
  gate: (s) => s.oxen.some((a) => a.kind === 'mule' && a.health > 0),
  choices: [
    {
      id: 'track_thief',
      icon: '🔍',
      label: 'Track the thief at first light',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const recovered = rng.chance(s.dog ? 0.7 : 0.4);
        if (recovered) {
          return logLine(
            s,
            s.dog
              ? `${s.dog.name} found the scent — you caught up with the thief by noon. Mule recovered.`
              : 'You caught up with the thief by noon. Mule recovered, knuckles bruised.'
          );
        }
        // Lost a mule.
        const muleIdx = s.oxen.findIndex((a) => a.kind === 'mule' && a.health > 0);
        const next = muleIdx === -1 ? s : { ...s, oxen: s.oxen.filter((_, i) => i !== muleIdx) };
        return logLine(
          { ...next, morale: Math.max(0, s.morale - 4) },
          'The tracks vanished into a creekbed. The mule was gone for good. Morale −4.'
        );
      }
    },
    {
      id: 'press_on',
      icon: '🚶',
      label: "Press on — can't afford the delay",
      silentLog: true,
      apply: (s) => {
        const muleIdx = s.oxen.findIndex((a) => a.kind === 'mule' && a.health > 0);
        const next = muleIdx === -1 ? s : { ...s, oxen: s.oxen.filter((_, i) => i !== muleIdx) };
        return logLine(
          { ...next, morale: Math.max(0, s.morale - 2) },
          'You hitched up with one less mule and rolled out. Morale −2.'
        );
      }
    }
  ]
};

EVENTS.push(mule_theft);

// #127 random-encounter batch — wagon trains, natives, abandoned camps.
// Kept in a sibling file for readability; spread in here so we stay the
// single EVENTS registry.
import { ENCOUNTER_EVENTS } from './encounters';
EVENTS.push(...ENCOUNTER_EVENTS);

// #129 inter-party drama — quarrels, fistfights, reconciliation,
// romance. Same registry-merge pattern as encounters.
import { PARTY_EVENTS } from './party-events';
EVENTS.push(...PARTY_EVENTS);

// #136 water hazards — foul stream, alkali pond, keg breaks, spill,
// clear spring bonus.
import { WATER_EVENTS } from './water-events';
EVENTS.push(...WATER_EVENTS);

// Spoilage events (approach 3) — moisture/pest/heat events that hit the
// food stores the temperature curve can't reach (damp meal, weevils,
// blowflies, scorched bacon, plus a hard-freeze preserve). npcSkip for now.
import { SPOILAGE_EVENTS } from './spoilage-events';
EVENTS.push(...SPOILAGE_EVENTS);

// #225 nooning event slot — midday flavor encounters that join the
// regular road-event pool. Period reality: the noon stop was the
// trail's most-described social moment. Most events are small flavor
// + ±1 morale; the daily fatigue benefit of nooning stays implicit
// in the existing ox-fatigue calibration.
import { NOON_EVENTS } from './noon-events';
EVENTS.push(...NOON_EVENTS);

// #282 wagon-train events — only fire while in a train. Campfire
// stories, animal-doctoring favors, marching-order disputes, Sunday
// meetings, news-pump from passing parties, tool-lending, fiddle
// nights, lost children. Gated on `state.wagonTrain != null` plus
// per-event sub-gates (Sunday + preacher, fiddle in inventory, etc.).
import { TRAIN_EVENTS } from './train-events';
EVENTS.push(...TRAIN_EVENTS);

// #939i — NPC event pool. Engine events run on NPC wagons via wagon-
// synth in `tickNpcWagon`. Allow-list by category: wagon, encounter,
// personal, health, finds. Weather (train-shared) and historical
// (one-shot named) intentionally excluded. Per-event `npcSkip: true`
// further opts out events whose `apply()` reads state the synth
// doesn't bridge.
const NPC_ALLOWED_CATEGORIES: ReadonlySet<EventCategory> = new Set([
  'wagon', 'encounter', 'personal', 'health', 'finds'
]);

export const NPC_ELIGIBLE_EVENTS: readonly GameEvent[] = EVENTS.filter(
  (e) => NPC_ALLOWED_CATEGORIES.has(e.category) && e.npcSkip !== true
);
