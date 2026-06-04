import type { GameState } from '../types';
import type { GameEvent } from './events';
import { midTempF } from '../systems/temperature';

// Spoilage events (approach 3) — the layer on top of the temperature
// spoilage curve (#temp-spoil / #224). Temperature already handles the
// heat/cold aging of fresh piles; these events cover what it can't:
//   • MOISTURE — rain/damp molds the dried staples (flour, cornmeal,
//     hardtack) that otherwise never spoil.
//   • PESTS — weevils in the meal, blowflies in the meat.
//   • ACUTE spikes — a scorching still day that turns the bacon.
//   • a POSITIVE — a hard freeze that lets fresh meat keep longer.
//
// Each speaks through a real choice (mitigate vs press on), per the
// "activities resolve via choices" rule. All are category 'finds' so they
// run per-wagon on NPC companions too (parity): a storm dampens every
// wagon's flour, heat turns each wagon's bacon. projectWagonDeltas carries
// the inventory / morale / spoil-clock effects back to each NpcWagonState.
// NPCs auto-pick the isDefault choice via pickNpcEventChoice's fallback.

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function dropMorale(s: GameState, by: number): GameState {
  return { ...s, morale: clamp(s.morale - by, 0, 100) };
}
const isWet = (s: GameState) => s.weather === 'rain' || s.weather === 'storm';
const isFreezing = (s: GameState) => s.weather === 'frost' || s.weather === 'snow';
const mealLb = (s: GameState) => (s.inventory.flour ?? 0) + (s.inventory.cornmeal ?? 0);

/** Remove `lb` from the meal staples, flour first then cornmeal. */
function takeMeal(s: GameState, lb: number): GameState {
  const flour = s.inventory.flour ?? 0;
  const fromFlour = Math.min(flour, lb);
  const fromCorn = Math.min(s.inventory.cornmeal ?? 0, lb - fromFlour);
  return {
    ...s,
    inventory: {
      ...s.inventory,
      flour: flour - fromFlour,
      cornmeal: (s.inventory.cornmeal ?? 0) - fromCorn
    }
  };
}

// --- Moisture: damp in the meal sacks ---
const damp_meal: GameEvent = {
  id: 'spoil_damp_meal',
  category: 'finds',
  title: 'Damp in the meal sacks',
  body: 'Days of wet weather worked into the flour. The top of the sacks has gone to a green-grey crust of mould.',
  weight: 4,
  gate: (s) => isWet(s) && mealLb(s) >= 10,
  choices: [
    {
      id: 'dry_it',
      icon: '☀️',
      label: 'Spread it to dry at the next halt',
      silentLog: true,
      apply: (s) => {
        const lost = clamp(Math.round(mealLb(s) * 0.08), 2, 20);
        return logLine(takeMeal(s, lost), `Dried the meal in the sun — only ${lost} lb spoiled past saving.`);
      }
    },
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Press on and hope it keeps',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const lost = clamp(Math.round(mealLb(s) * 0.18), 4, 40);
        return logLine(takeMeal(s, lost), `${lost} lb of mouldy meal had to be thrown out.`);
      }
    }
  ]
};

// --- Pests: weevils in the hardtack / meal ---
const weevils: GameEvent = {
  id: 'spoil_weevils',
  category: 'finds',
  title: 'Weevils in the hardtack',
  body: 'The warm stores have bred weevils. The hardtack is alive with them and the flour is shot through.',
  weight: 4,
  gate: (s) => midTempF(s) >= 72 && ((s.inventory.hardtack ?? 0) + mealLb(s)) >= 10,
  choices: [
    {
      id: 'sift',
      icon: '🪤',
      label: 'Sift and pick them out',
      silentLog: true,
      apply: (s) => {
        const ht = s.inventory.hardtack ?? 0;
        const htLost = clamp(Math.round(ht * 0.06), 1, 12);
        const mealLost = clamp(Math.round(mealLb(s) * 0.05), 1, 10);
        let next = takeMeal({ ...s, inventory: { ...s.inventory, hardtack: ht - htLost } }, mealLost);
        next = dropMorale(next, 2);
        return logLine(next, `Sifted the weevils out — lost ${htLost + mealLost} lb of stores, and appetites with them.`);
      }
    },
    {
      id: 'eat_them',
      icon: '😖',
      label: 'Eat them, weevils and all',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const ht = s.inventory.hardtack ?? 0;
        const htLost = clamp(Math.round(ht * 0.03), 0, 6);
        let next: GameState = { ...s, inventory: { ...s.inventory, hardtack: ht - htLost } };
        next = dropMorale(next, 6);
        return logLine(next, 'Ate the hardtack weevils and all — "extra meat," someone muttered. Morale sank.');
      }
    }
  ]
};

// --- Pests: blowflies in the fresh game meat ---
const flies_meat: GameEvent = {
  id: 'spoil_flies_meat',
  category: 'finds',
  title: 'Blowflies in the meat',
  body: 'The heat brought blowflies down on the fresh game hung off the wagon. Half of it is already crawling.',
  weight: 5,
  gate: (s) => midTempF(s) >= 78 && (s.inventory.game_meat ?? 0) >= 5,
  choices: [
    {
      id: 'salt_it',
      icon: '🧂',
      label: 'Salt and smoke what you can',
      silentLog: true,
      apply: (s) => {
        const meat = s.inventory.game_meat ?? 0;
        const hasSalt = (s.inventory.salt ?? 0) > 0;
        // Salt saves half; without it you can only smoke a little.
        const saved = hasSalt ? Math.round(meat * 0.5) : Math.round(meat * 0.2);
        const next: GameState = { ...s, inventory: { ...s.inventory, game_meat: saved } };
        return logLine(next, hasSalt
          ? `Salted down ${saved} lb before the flies took the rest.`
          : `Smoked what little you could — only ${saved} lb saved without salt.`);
      }
    },
    {
      id: 'toss',
      icon: '🪰',
      label: 'Cut your losses, dump the fly-blown meat',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const meat = s.inventory.game_meat ?? 0;
        const saved = Math.round(meat * 0.25);
        const next: GameState = { ...s, inventory: { ...s.inventory, game_meat: saved } };
        return logLine(next, `Dumped the fly-blown game — ${meat - saved} lb lost.`);
      }
    }
  ]
};

// --- Acute heat spike on cured bacon ---
const scorched_bacon: GameEvent = {
  id: 'spoil_scorched_bacon',
  category: 'finds',
  title: 'The bacon turns in the heat',
  body: 'A scorching, still day. The bacon sweated grease through its wrappings and a slab has gone rancid.',
  weight: 3,
  gate: (s) => midTempF(s) >= 88 && (s.inventory.bacon ?? 0) >= 5,
  choices: [
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Trim the turned fat and move on',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const bacon = s.inventory.bacon ?? 0;
        const base = clamp(Math.round(bacon * 0.12), 2, 12);
        const lost = s.wagon.hasBranBarrel ? Math.round(base * 0.5) : base;
        const next: GameState = { ...s, inventory: { ...s.inventory, bacon: bacon - lost } };
        return logLine(next, s.wagon.hasBranBarrel
          ? `Lost ${lost} lb of bacon to the heat — the bran barrel saved the rest.`
          : `Lost ${lost} lb of bacon to the heat.`);
      }
    }
  ]
};

// --- Positive: a hard freeze keeps the fresh meat ---
const hard_freeze_keeps: GameEvent = {
  id: 'preserve_hard_freeze',
  category: 'finds',
  title: 'A hard freeze',
  body: 'The night drops well below freezing. The game meat froze solid on the hook — it will keep far longer now.',
  weight: 3,
  gate: (s) => isFreezing(s) && (s.inventory.game_meat ?? 0) >= 5 && typeof s.flags._gameMeatSpoilDay === 'number',
  choices: [
    {
      id: 'good',
      icon: '❄️',
      label: 'Pack it in the cold',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const cur = s.flags._gameMeatSpoilDay as number;
        const next: GameState = { ...s, flags: { ...s.flags, _gameMeatSpoilDay: cur + 4 } };
        return logLine(next, 'The hard freeze will keep the game meat days longer.');
      }
    }
  ]
};

export const SPOILAGE_EVENTS: GameEvent[] = [
  damp_meal,
  weevils,
  flies_meat,
  scorched_bacon,
  hard_freeze_keeps
];
