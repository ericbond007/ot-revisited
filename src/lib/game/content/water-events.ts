import type { GameState } from '../types';
import type { GameEvent } from './events';
import { inTerrain } from './event-gating';

// Water events (#136) — random hazards and finds that touch the
// water supply directly. Plug into the EVENTS pool from events.ts
// like encounters/party events. Each event speaks in clean/dirty
// terms; the InventoryPanel collapses the two for pre-knowledge
// players, so the labels you see in the log remain "water" agnostic
// of pool type.

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// --- Hazards ---

const foul_water: GameEvent = {
  id: 'water_foul',
  category: 'finds',
  title: 'A stream goes foul',
  body: 'A creek you took water from runs past a dead carcass upstream. The barrels you topped from it are spoiled.',
  weight: 3,
  // Only when there's actually water to spoil.
  gate: (s) => s.resources.water >= 5,
  choices: [
    {
      id: 'press_on',
      icon: '🚶',
      label: "Push on, hope for the best",
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const tainted = clamp(Math.floor(s.resources.water * 0.4), 5, 25);
        const water = s.resources.water - tainted;
        const dirtyWater = (s.resources.dirtyWater ?? 0) + tainted;
        return logLine(
          { ...s, resources: { ...s.resources, water, dirtyWater } },
          `${tainted} gal of water gone foul.`
        );
      }
    },
    {
      id: 'dump',
      icon: '🪣',
      label: 'Dump the bad water entirely',
      silentLog: true,
      apply: (s) => {
        const tainted = clamp(Math.floor(s.resources.water * 0.4), 5, 25);
        const water = s.resources.water - tainted;
        return logLine(
          { ...s, resources: { ...s.resources, water } },
          `Dumped ${tainted} gal of suspect water on the ground.`
        );
      }
    }
  ]
};

const alkali_pond: GameEvent = {
  id: 'water_alkali',
  category: 'finds',
  title: 'An alkali pond',
  body: 'White-rimmed water, looking cool and inviting in the heat. The first ox to drink starts foaming at the mouth.',
  weight: 2,
  gate: inTerrain('desert', 'prairie'),
  choices: [
    {
      id: 'pull_them_back',
      icon: '💪',
      label: 'Whip the team back from the water',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        // Quick reaction — only the lead ox got a sip. Mild fatigue.
        const oxen = s.oxen.map((o, i) =>
          i === 0 ? { ...o, fatigue: Math.min(100, o.fatigue + 10) } : o
        );
        return logLine(
          { ...s, oxen, morale: Math.max(0, s.morale - 1) },
          'Whipped the team back. Lead ox a little sick. Morale -1.'
        );
      }
    },
    {
      id: 'too_late',
      icon: '💧',
      label: 'Let them finish — water is water',
      silentLog: true,
      apply: (s) => {
        // Several oxen take real fatigue + a small health hit.
        const oxen = s.oxen.map((o) => ({
          ...o,
          fatigue: Math.min(100, o.fatigue + 25),
          health: Math.max(0, o.health - 8)
        }));
        return logLine(
          { ...s, oxen, morale: Math.max(0, s.morale - 3) },
          'The team drank deep. Several stagger after — fatigue +25, health -8 each. Morale -3.'
        );
      }
    }
  ]
};

const keg_breaks: GameEvent = {
  id: 'water_keg_breaks',
  category: 'wagon',
  title: 'A water keg splits',
  body: 'A barrel hoop snaps and the wagon-bed soaks through. Most of one keg drains into the dust.',
  weight: 2,
  gate: (s) => s.resources.water >= 8,
  choices: [
    {
      id: 'salvage',
      icon: '🤲',
      label: 'Salvage what you can',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const lost = Math.min(s.resources.water, clamp(Math.floor(s.resources.water * 0.4), 8, 20));
        return logLine(
          { ...s, resources: { ...s.resources, water: s.resources.water - lost } },
          `${lost} gal of water lost to a split keg.`
        );
      }
    }
  ]
};

const water_spill: GameEvent = {
  id: 'water_spill',
  category: 'wagon',
  title: 'A water spill',
  body: 'The wagon hit a rut hard. Water sloshed up the keg, over the lid, onto the prairie.',
  weight: 2,
  gate: (s) => s.resources.water >= 5,
  choices: [
    {
      id: 'shrug',
      icon: '🚶',
      label: 'Tighten the lid and roll on',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const lost = Math.min(s.resources.water, rng.int(5, 12));
        return logLine(
          { ...s, resources: { ...s.resources, water: s.resources.water - lost } },
          `Spilled ${lost} gal — kegs only fully sealed when stopped.`
        );
      }
    }
  ]
};

// --- Bonuses ---

const clear_spring: GameEvent = {
  id: 'water_clear_spring',
  category: 'finds',
  title: 'A clear spring',
  body: 'Cool water bubbles out of the rocks. Clean enough to drink straight from the basin.',
  weight: 2,
  choices: [
    {
      id: 'drink',
      icon: '💧',
      label: 'Top off the kegs',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const room = Math.max(0, s.resources.waterCap - s.resources.water);
        const gal = Math.min(room, 25);
        return logLine(
          { ...s, resources: { ...s.resources, water: s.resources.water + gal }, morale: Math.min(100, s.morale + 2) },
          `Filled ${gal} gal of clean spring water. Morale +2.`
        );
      }
    }
  ]
};

export const WATER_EVENTS: readonly GameEvent[] = [
  foul_water,
  alkali_pond,
  keg_breaks,
  water_spill,
  clear_spring
];
