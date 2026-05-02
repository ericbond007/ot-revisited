import type { GameState } from '../types';
import type { GameEvent } from './events';
import { hasLivePreacher } from '../professions/predicates';

// #225 — Nooning event slot. Period reality: the standard 4-stage
// trail day was dawn-yoke / morning travel / NOON STOP / afternoon
// travel / evening camp. The noon hour was non-negotiable for the
// animals (Marcy 1859 explicit) and was the trail's most-described
// social moment — passing trains chatted, native riders stopped by,
// news traveled, occasional encounters surprised the party.
//
// We don't model the noon stop as a player choice (that would slow
// the game to a crawl). Instead these events fire from the existing
// 30%-chance road-event roll, joining the morning event pool. Most
// are small flavor + ±1 morale; a couple have light mechanical hooks.
// The implicit fatigue benefit of nooning is already baked into the
// existing ox-fatigue calibration — these events are the visible
// surface of a daily rhythm that's otherwise invisible.

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

const noon_passing_train: GameEvent = {
  id: 'noon_passing_train',
  category: 'encounter',
  title: 'Another train at the noon stop',
  body: "You unyoke and another company's wagons are already there. Their captain walks over with a tin cup of coffee and asks how the road's been east of here. Half an hour of news and weather pass. The kids run circles around both camps.",
  weight: 2,
  choices: [
    {
      id: 'visit',
      icon: '👋',
      label: 'Trade news with the other train',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 2) },
        'Traded news at the noon stop. The other train was four days out from Ft. Laramie. Morale +2.'
      )
    },
    {
      id: 'eat_quietly',
      icon: '🍴',
      label: 'Keep to your own supper',
      silentLog: true,
      apply: (s) => logLine(s, 'Ate quickly, kept your own counsel. Yoked and rolled before they did.')
    }
  ]
};

const noon_native_rider: GameEvent = {
  id: 'noon_native_rider',
  category: 'native',
  title: 'A rider at the noon stop',
  body: "A lone rider — bare-chested, painted, on a paint pony — stops at the edge of the camp during your cold meal. He raises a hand in greeting and waits. The kids stare. The captain reaches for the tobacco pouch.",
  weight: 2,
  choices: [
    {
      id: 'tobacco',
      icon: '🌿',
      label: 'Offer a twist of tobacco',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'tobacco', icon: '🌿', reason: 'No tobacco on hand' },
      apply: (s) => logLine(
        {
          ...s,
          inventory: { ...s.inventory, tobacco: Math.max(0, (s.inventory.tobacco ?? 0) - 1) },
          morale: Math.min(100, s.morale + 1)
        },
        'Offered a tobacco twist. The rider accepted, nodded, rode on. Morale +1.'
      )
    },
    {
      id: 'wave',
      icon: '✋',
      label: 'Wave him off — keep eating',
      silentLog: true,
      apply: (s) => logLine(s, 'Waved the rider off. He turned and rode west without a word.')
    }
  ]
};

const noon_roadside_grave: GameEvent = {
  id: 'noon_roadside_grave',
  category: 'historical',
  title: 'A fresh marker',
  body: "You unyoke beside a small wooden cross hand-carved with a name and date — three weeks ago. Whoever was buried here came past with a train ahead of yours. The captain reads the name aloud, hat in hand.",
  weight: 1,
  choices: [
    {
      id: 'pay_respects',
      icon: '🪦',
      label: 'Pause to read the inscription',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Read the inscription aloud. The party ate quietly. Morale -1.'
      )
    },
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Eat fast and roll on',
      silentLog: true,
      apply: (s) => logLine(s, 'Took a short noon and got back on the road.')
    }
  ]
};

const noon_clear_spring: GameEvent = {
  id: 'noon_clear_spring',
  category: 'finds',
  title: 'A clear spring at the noon stop',
  body: "While watering the oxen at midday you find a small spring rising clean from the bank. Cold and sweet. The party fills every keg.",
  weight: 2,
  choices: [
    {
      id: 'fill_kegs',
      icon: '💧',
      label: 'Fill the water kegs',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const cap = s.resources.waterCap;
        const before = s.resources.water;
        const water = Math.min(cap, before + 8);
        return logLine(
          { ...s, resources: { ...s.resources, water }, morale: Math.min(100, s.morale + 1) },
          `Filled the kegs at a clear spring. Water +${water - before}, morale +1.`
        );
      }
    }
  ]
};

const noon_circuit_preacher: GameEvent = {
  id: 'noon_circuit_preacher',
  category: 'historical',
  title: 'A circuit-rider at noon',
  body: "A traveling preacher on a tired mule comes up while you eat. He's a Methodist circuit-rider working his way west. Asks if you'd like a brief word and a prayer over the meal.",
  weight: 1,
  choices: [
    {
      id: 'accept',
      icon: '🙏',
      label: 'Accept his prayer',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const bump = hasLivePreacher(s) ? 3 : 2;
        return logLine(
          { ...s, morale: Math.min(100, s.morale + bump) },
          `Heard a brief sermon and a prayer over the bread. Morale +${bump}.`
        );
      }
    },
    {
      id: 'decline',
      icon: '✋',
      label: 'Politely decline — too much road ahead',
      silentLog: true,
      apply: (s) => logLine(s, 'Thanked the rider, declined the service. He nodded and rode on.')
    }
  ]
};

const noon_squeaky_wheel: GameEvent = {
  id: 'noon_squeaky_wheel',
  category: 'wagon',
  title: 'A squeak from the front-right wheel',
  body: "The wheel started complaining around mid-morning and the noon stop is the natural moment to look at it. A pinch of lard or a dab of tar bucket and you'll be fine.",
  weight: 2,
  choices: [
    {
      id: 'grease_lard',
      icon: '🟡',
      label: 'Grease with lard',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'lard', icon: '🟡', reason: 'No lard on hand' },
      apply: (s) => logLine(
        { ...s, inventory: { ...s.inventory, lard: Math.max(0, (s.inventory.lard ?? 0) - 1) } },
        'Greased the wheel with a dab of lard. Quiet again. Lard -1.'
      )
    },
    {
      id: 'press_through',
      icon: '🚶',
      label: 'Press through — fix at evening camp',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, wagon: { ...s.wagon, condition: Math.max(0, s.wagon.condition - 2) } },
        'Pressed on with the squeak. The wheel will hold but it cost some condition. Wagon -2.'
      )
    }
  ]
};

const noon_lost_emigrant: GameEvent = {
  id: 'noon_lost_emigrant',
  category: 'encounter',
  title: 'A lone walker at midday',
  body: "A man on foot, dust on his hat, finds your noon camp. He got separated from his company at the last river ford and has been walking alone since dawn. He asks if you can spare a meal and word of his train.",
  weight: 1,
  choices: [
    {
      id: 'feed_him',
      icon: '🍴',
      label: 'Share a noon meal',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          inventory: { ...s.inventory, flour: Math.max(0, (s.inventory.flour ?? 0) - 2) },
          morale: Math.min(100, s.morale + 2)
        },
        'Fed the walker. He pointed you to his train half a day ahead. Flour -2, morale +2.'
      )
    },
    {
      id: 'wave_off',
      icon: '✋',
      label: 'Wave him off — short on supplies',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Waved the walker off. He sat down by the trail. Morale -1.'
      )
    }
  ]
};

const noon_antelope: GameEvent = {
  id: 'noon_antelope',
  category: 'finds',
  title: 'An antelope watching',
  body: "Mid-meal, someone whispers and points. An antelope is standing at two hundred yards in the sage, head up, watching. Curious as a child. The rifle's packed.",
  weight: 1,
  choices: [
    {
      id: 'watch_back',
      icon: '🦌',
      label: 'Watch back until it bolts',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 1) },
        'Watched the antelope until it bolted into the sage. The party smiled. Morale +1.'
      )
    }
  ]
};

const noon_forgotten_pail: GameEvent = {
  id: 'noon_forgotten_pail',
  category: 'finds',
  title: 'A forgotten pail',
  body: "A tin pail sits at the edge of the trail by your noon stop, dropped or left behind by a previous train. Half a quart of rendered fat clings to the bottom. The Whithlock train passed yesterday — could be theirs.",
  weight: 1,
  choices: [
    {
      id: 'take',
      icon: '🪣',
      label: 'Take it — finders keepers',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(
        {
          ...s,
          inventory: { ...s.inventory, lard: (s.inventory.lard ?? 0) + 1 }
        },
        "Took the pail and what was in it. Lard +1."
      )
    },
    {
      id: 'leave',
      icon: '✋',
      label: 'Leave it — owner might come back',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.min(100, s.morale + 1) },
        "Left the pail where you found it. The party felt better for the choice. Morale +1."
      )
    }
  ]
};

const noon_buffalo_wallow: GameEvent = {
  id: 'noon_buffalo_wallow',
  category: 'finds',
  title: 'An old buffalo wallow',
  body: "The noon stop turns out to be an old buffalo wallow — a bowl of dust ten yards across, beaten flat by years of bison rolling. The sun's hot and the dust gets everywhere. A hundred yards on, you find a clean patch of grass.",
  weight: 1,
  choices: [
    {
      id: 'move_on',
      icon: '🚶',
      label: 'Walk the team to clean grass',
      isDefault: true,
      silentLog: true,
      apply: (s) => logLine(s, 'Moved the team out of the wallow to clean grass. Lost ten minutes; the oxen ate better.')
    }
  ]
};

export const NOON_EVENTS: GameEvent[] = [
  noon_passing_train,
  noon_native_rider,
  noon_roadside_grave,
  noon_clear_spring,
  noon_circuit_preacher,
  noon_squeaky_wheel,
  noon_lost_emigrant,
  noon_antelope,
  noon_forgotten_pail,
  noon_buffalo_wallow
];
