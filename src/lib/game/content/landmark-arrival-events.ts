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

export const LANDMARK_ARRIVAL_EVENTS: Record<string, GameEvent> = {
  chimney_rock: chimneyRock,
  independence_rock: independenceRock,
  devils_gate: devilsGate,
  south_pass: southPass,
  soda_springs: sodaSprings
};

export function getLandmarkArrivalEvent(landmarkId: string): GameEvent | undefined {
  return LANDMARK_ARRIVAL_EVENTS[landmarkId];
}
