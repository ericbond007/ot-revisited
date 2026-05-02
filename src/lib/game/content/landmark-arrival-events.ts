import type { GameState } from '../types';
import type { GameEvent } from './events';

// Arrival vignettes for iconic scenic landmarks. When the party reaches
// one of these on a travel day, the engine pauses and fires the event
// instead of just logging "Passed X." Trading posts, rivers, and the
// finish line have their own dedicated stages — they don't get arrival
// events (yet); this file is for the landmarks that previously rolled
// past silently.
//
// Each event mirrors the road-event shape (title, body, choices). The
// engine treats them identically to trail events.
//
// Visual-only landmarks: scenic landmarks WITHOUT an entry in
// LANDMARK_ARRIVAL_EVENTS (e.g. Guernsey Ruts, Farewell Bend,
// Courthouse Rock, Blue Mountains) render on the map for flavor and
// log "Passed X." when the party crosses them — no pause, no modal.
// They're first-class map content; the decision to omit an arrival
// event is editorial (minor geographic marker vs. moment-worthy stop),
// not structural. Adding one later is just appending a record here.

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

const chimneyRock: GameEvent = {
  id: 'arrival_chimney_rock',
  category: 'historical',
  title: 'Chimney Rock rises on the horizon',
  body: 'A spire of clay and sandstone juts five hundred feet from the plain. Emigrants have been talking about it for weeks; now you can see it for yourself.',
  weight: 1,
  choices: [
    {
      id: 'press_on',
      label: 'Take it in as you pass',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 2) },
        'Chimney Rock — passed in awe. Morale +2.'
      )
    },
    {
      id: 'pause',
      label: 'Pause an hour to sketch and stare',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 4) },
        'Stopped at Chimney Rock — sketches in journals, hats off. Morale +4.'
      )
    }
  ]
};

const independenceRock: GameEvent = {
  id: 'arrival_independence_rock',
  category: 'historical',
  title: 'Independence Rock',
  body: 'A great granite turtle squatting alone on the prairie — covered in names. The custom is to leave yours, in axle grease, charcoal, or chisel.',
  weight: 1,
  choices: [
    {
      id: 'sign_axle_grease',
      label: 'Sign in axle grease',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 4) },
        'Smeared your names on Independence Rock. A piece of you on the trail forever. Morale +4.'
      )
    },
    {
      id: 'carve',
      label: 'Take an hour to carve it deep',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 6) },
        'Carved your names into Independence Rock — meant to outlast you. Morale +6.'
      )
    },
    {
      id: 'pass',
      label: 'Press on without stopping',
      silentLog: true,
      apply: (s) => logLine(
        s,
        'Passed Independence Rock without leaving a mark.'
      )
    }
  ]
};

// 4th of July at the Rock (#227) — date-gated set-piece. Period
// reality: emigrants aimed to reach Independence Rock by July 4 and
// hold the date there; companies converging for sunrise gun-salutes,
// fiddle dances after dark, antelope-feast suppers, toasts to the
// Republic. Bruff (1849) and Porter (1860) describe it in detail.
// Replaces the regular sign-the-rock event WHEN AND ONLY WHEN the
// arrival lands on July 4.
const independenceRockJuly4: GameEvent = {
  id: 'arrival_independence_rock_july4',
  category: 'historical',
  title: 'Independence Rock — the Fourth of July',
  body: 'Wagons from a half-dozen companies are circled around the Rock. A flag flies from the summit. Fiddles tune up. Someone is roasting an antelope. By tradition, this is the day a westbound party celebrates here — and prays the Sierras stay clear of snow until you reach them.',
  weight: 1,
  choices: [
    {
      id: 'salute_and_feast',
      icon: '🎆',
      label: 'Fire a 30-gun salute and join the feast',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        // Period detail: the salutes consumed real powder/lead/caps —
        // diaries record companies pooling ammunition for the volleys.
        const have = (id: string) => s.inventory[id] ?? 0;
        const cost = 5;
        if (have('gunpowder') < cost || have('lead_balls') < cost || have('percussion_caps') < cost) {
          return logLine(
            { ...s, morale: Math.min(100, s.morale + 8) },
            'No powder to spare for the salute. Joined the feast and the dancing instead. Morale +8.'
          );
        }
        const inventory = {
          ...s.inventory,
          gunpowder: have('gunpowder') - cost,
          lead_balls: have('lead_balls') - cost,
          percussion_caps: have('percussion_caps') - cost
        };
        return logLine(
          { ...s, inventory, morale: Math.min(100, s.morale + 10) },
          `30-gun sunrise salute, fiddles after dark, antelope feast — the trail's best day. Powder/balls/caps −${cost} each. Morale +10.`
        );
      }
    },
    {
      id: 'sign_and_celebrate',
      icon: '🎶',
      label: 'Sign the Rock and dance the night',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 8) },
        'Carved the year on the Rock and danced till the fiddle gave out. Morale +8.'
      )
    },
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Press on — every day matters',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 3) },
        'Tipped your hat to the Rock and the dancers and rolled west. Morale +3.'
      )
    }
  ]
};

const devilsGate: GameEvent = {
  id: 'arrival_devils_gate',
  category: 'historical',
  title: "Devil's Gate",
  body: 'The Sweetwater has cut a slot through solid rock — three hundred feet deep, narrow enough to throw a stone across. The wagon trail skirts wide; the gap is for hikers and the foolhardy.',
  weight: 1,
  choices: [
    {
      id: 'hike',
      label: 'Hike up to the cleft',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 4) },
        "Stood at the lip of Devil's Gate. The river roars below. Morale +4."
      )
    },
    {
      id: 'pass',
      label: 'Skirt the gap and keep moving',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 1) },
        "Skirted Devil's Gate. Morale +1."
      )
    }
  ]
};

const southPass: GameEvent = {
  id: 'arrival_south_pass',
  category: 'historical',
  title: 'South Pass — the Continental Divide',
  body: 'The plains have given way to a long, gentle saddle in the Rockies. Water on the east flows to the Atlantic; ahead, every stream runs to the Pacific. You are crossing into Oregon Country.',
  weight: 1,
  choices: [
    {
      id: 'celebrate',
      label: 'Celebrate the crossing — fire, songs, full rations',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 8) },
        'Crossed the Continental Divide. The party celebrated by firelight. Morale +8.'
      )
    },
    {
      id: 'press',
      label: 'Press on with quiet pride',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 4) },
        'Crossed South Pass. The land tilts west now. Morale +4.'
      )
    }
  ]
};

const sodaSprings: GameEvent = {
  id: 'arrival_soda_springs',
  category: 'historical',
  title: 'Soda Springs',
  body: 'The ground hisses with carbonated water bubbling up from a hundred small craters. It tastes like beer, like medicine, like nothing the children have ever drunk before.',
  weight: 1,
  choices: [
    {
      id: 'drink',
      label: 'Drink your fill — the kids first',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const upset = rng.chance(0.18);
        if (upset) {
          // Pick a random alive party member and dock 4 HP — no condition,
          // just a brief uncomfortable night. Soft punishment, real risk.
          const alive = s.party.filter((m) => !m.dead);
          if (alive.length > 0) {
            const victim = alive[rng.int(0, alive.length - 1)];
            return logLine(
              {
                ...s,
                morale: Math.min(100, s.morale + 3),
                party: s.party.map((m) =>
                  m.id === victim.id ? { ...m, health: Math.max(0, m.health - 4) } : m
                )
              },
              `Drank from Soda Springs. ${victim.name} got a sour stomach (-4 HP). Morale +3.`
            );
          }
        }
        return logLine(
          { ...s, morale: Math.min(100, s.morale + 5) },
          'Drank from Soda Springs. Strange and delightful. Morale +5.'
        );
      }
    },
    {
      id: 'bottle',
      label: 'Bottle some for the trail',
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 2),
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + 5)
          }
        },
        'Bottled 5 gal of Soda Springs water. Morale +2.'
      )
    },
    {
      id: 'skip',
      label: 'Steer clear of the strange water',
      silentLog: true,
      apply: (s) => logLine(s, 'Passed Soda Springs without drinking.')
    }
  ]
};

const alcoveSpring: GameEvent = {
  id: 'arrival_alcove_spring',
  category: 'historical',
  title: 'Alcove Spring',
  body: 'A clear pool under a sandstone alcove, cottonwoods shading the water. Emigrants have carved their names into the soft rock above — the Donner party passed this way only two years ago, half of them dead now in the Sierras.',
  weight: 1,
  choices: [
    {
      id: 'carve',
      label: 'Carve your name in the sandstone',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 4),
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + 10)
          }
        },
        'Carved your names at Alcove Spring. Water +10, morale +4.'
      )
    },
    {
      id: 'refill',
      label: 'Refill water and press on',
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 2),
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + 15)
          }
        },
        'Filled the barrels at Alcove Spring. Water +15, morale +2.'
      )
    }
  ]
};

const ashHollow: GameEvent = {
  id: 'arrival_ash_hollow',
  category: 'historical',
  title: 'Windlass Hill & Ash Hollow',
  body: 'The trail drops 300 feet down Windlass Hill — the first serious descent since Independence. At the bottom, Ash Hollow: a grove of cedar and ash, spring water, the first real shade in weeks.',
  weight: 1,
  choices: [
    {
      id: 'rope_down',
      label: 'Lower the wagons carefully with rope',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'rope', icon: '🪢', reason: 'Need rope to belay the wagons' },
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 5),
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + 15)
          }
        },
        'Roped the wagons down Windlass Hill and camped in Ash Hollow. Water +15, morale +5.'
      )
    },
    {
      id: 'brake',
      label: 'Lock the wheels and skid down',
      silentLog: true,
      apply: (s, rng) => {
        const mishap = rng.chance(0.35);
        if (mishap) {
          const dmg = rng.int(8, 18);
          return logLine(
            {
              ...s,
              morale: Math.max(0, s.morale - 1),
              wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - dmg) },
              resources: {
                ...s.resources,
                water: Math.min(s.resources.waterCap, s.resources.water + 10)
              }
            },
            `Skidded down Windlass Hill — a wheel took a beating. Wagon -${dmg}, water +10, morale -1.`
          );
        }
        return logLine(
          {
            ...s,
            morale: Math.min(100, s.morale + 2),
            resources: {
              ...s.resources,
              water: Math.min(s.resources.waterCap, s.resources.water + 10)
            }
          },
          'Braked the wheels and slid down Windlass Hill. No damage. Water +10, morale +2.'
        );
      }
    }
  ]
};

const scottsBluff: GameEvent = {
  id: 'arrival_scotts_bluff',
  category: 'historical',
  title: 'Scotts Bluff',
  body: 'Eight hundred feet of weathered sandstone — the largest bluff you\'ve seen on the trail. The wagon road winds through Mitchell Pass beneath its shadow.',
  weight: 1,
  choices: [
    {
      id: 'climb',
      label: 'Climb up for the view',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 4) },
        'Climbed Scotts Bluff. The plains stretch out forever. Morale +4.'
      )
    },
    {
      id: 'press',
      label: 'Admire it from the wagon seat',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 2) },
        'Passed through Mitchell Pass in Scotts Bluff\'s shadow. Morale +2.'
      )
    }
  ]
};

const registerCliff: GameEvent = {
  id: 'arrival_register_cliff',
  category: 'historical',
  title: 'Register Cliff',
  body: 'A long sandstone face covered in names — hundreds of emigrants have left their mark here. The earliest dates back to the fur-trade days, twenty years before the wagon trains.',
  weight: 1,
  choices: [
    {
      id: 'sign',
      label: 'Sign in axle grease',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 3) },
        'Signed the cliff. A small mark on a big rock. Morale +3.'
      )
    },
    {
      id: 'carve',
      label: 'Chisel your names deep',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 5) },
        'Chiseled your names into Register Cliff — meant to last. Morale +5.'
      )
    },
    {
      id: 'pass',
      label: 'Press on without stopping',
      silentLog: true,
      apply: (s) => logLine(s, 'Passed Register Cliff without leaving a mark.')
    }
  ]
};

const pacificSprings: GameEvent = {
  id: 'arrival_pacific_springs',
  category: 'historical',
  title: 'Pacific Springs',
  body: 'The first water you\'ve seen flowing west. From here every stream runs to the Pacific — the Atlantic is behind you for good.',
  weight: 1,
  choices: [
    {
      id: 'drink',
      label: 'Drink deeply and fill the barrels',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 5),
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + 20)
          }
        },
        'Drank from the Pacific-bound waters. Water +20, morale +5.'
      )
    },
    {
      id: 'press',
      label: 'Wet the oxen and press on',
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          morale: Math.min(100, s.morale + 2),
          resources: {
            ...s.resources,
            water: Math.min(s.resources.waterCap, s.resources.water + 10)
          }
        },
        'Topped off water at Pacific Springs. Water +10, morale +2.'
      )
    }
  ]
};

const laurelHill: GameEvent = {
  id: 'arrival_laurel_hill',
  category: 'historical',
  title: 'Laurel Hill',
  body: 'A descent so steep it\'s become legend — emigrants snubbed wagons to trees with rope, cut fresh brake saplings, sometimes just let them crash. Slick with mud when it rains.',
  weight: 1,
  choices: [
    {
      id: 'rope',
      label: 'Snub the wagons to trees and lower carefully',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'rope', icon: '🪢', reason: 'Need rope to belay the wagons' },
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 3) },
        'Roped the wagons down Laurel Hill. Nobody hurt. Morale +3.'
      )
    },
    {
      id: 'brake',
      label: 'Lock the wheels and ride it down',
      silentLog: true,
      apply: (s, rng) => {
        const crash = rng.chance(0.45);
        if (crash) {
          const dmg = rng.int(12, 25);
          return logLine(
            {
              ...s,
              morale: Math.max(0, s.morale - 3),
              wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - dmg) }
            },
            `Laurel Hill took a wheel — wagon -${dmg}, morale -3.`
          );
        }
        return logLine(
          { ...s, morale: Math.min(100, s.morale + 1) },
          'Rode the brakes down Laurel Hill. Made it in one piece. Morale +1.'
        );
      }
    }
  ]
};

export const LANDMARK_ARRIVAL_EVENTS: Record<string, GameEvent> = {
  alcove_spring: alcoveSpring,
  ash_hollow: ashHollow,
  chimney_rock: chimneyRock,
  scotts_bluff: scottsBluff,
  register_cliff: registerCliff,
  independence_rock: independenceRock,
  devils_gate: devilsGate,
  south_pass: southPass,
  pacific_springs: pacificSprings,
  soda_springs: sodaSprings,
  laurel_hill: laurelHill
};

export function getLandmarkArrivalEvent(
  landmarkId: string,
  state?: GameState
): GameEvent | undefined {
  // Date-gated set-pieces (#227) — when the arrival lands on a known
  // historical day at the right landmark, return the special variant
  // instead of the everyday event. Currently only July 4 at the Rock;
  // other landmarks could follow the same pattern (Christmas Eve at
  // Fort Hall, etc.).
  if (
    landmarkId === 'independence_rock'
    && state
    && state.date.month === 7
    && state.date.day === 4
  ) {
    return independenceRockJuly4;
  }
  return LANDMARK_ARRIVAL_EVENTS[landmarkId];
}
