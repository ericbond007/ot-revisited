import type { GameState, PartyMember } from '../types';
import type { Rng } from '../rng';
import type { GameEvent } from './events';
import { adjustGrudge, activeGrudges, hasFestering } from '../systems/grudges';

// Inter-party events (#129). Conflict, grudges, reconciliation, romance.
// Body text stays generic — specific names are revealed in the apply
// log line, picked at fire-time from the seeded rng so replays stay
// stable.

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

function aliveAdults(state: GameState): PartyMember[] {
  return state.party.filter((m) => !m.dead && m.kind === 'adult');
}

function pickPair(rng: Rng, pool: PartyMember[]): [PartyMember, PartyMember] | null {
  if (pool.length < 2) return null;
  const i = rng.int(0, pool.length - 1);
  let j = rng.int(0, pool.length - 2);
  if (j >= i) j += 1;
  return [pool[i], pool[j]];
}

/** Pick a single grudge-festering pair whose members are alive. */
function pickFesteringPair(
  state: GameState,
  rng: Rng,
  threshold: number
): [PartyMember, PartyMember] | null {
  const aliveById = new Map(state.party.filter((m) => !m.dead).map((m) => [m.id, m] as const));
  const candidates = activeGrudges(state).filter(
    (g) => g.level >= threshold && aliveById.has(g.idA) && aliveById.has(g.idB)
  );
  if (candidates.length === 0) return null;
  const pick = candidates[rng.int(0, candidates.length - 1)];
  const a = aliveById.get(pick.idA);
  const b = aliveById.get(pick.idB);
  if (!a || !b) return null;
  return [a, b];
}

function damageMember(s: GameState, id: string, hp: number): GameState {
  return {
    ...s,
    party: s.party.map((m) =>
      m.id === id && !m.dead ? { ...m, health: Math.max(0, m.health - hp) } : m
    )
  };
}

// --- Events ---

const food_hoarding: GameEvent = {
  id: 'party_food_hoarding',
  category: 'personal',
  title: 'Accusation around the cookfire',
  body: 'Voices rise at supper — one party member accuses another of holding back food. The whole camp goes quiet.',
  weight: 2,
  gate: (s) => aliveAdults(s).length >= 2,
  choices: [
    {
      id: 'mediate',
      icon: '💬',
      label: 'Step in and mediate',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const pair = pickPair(rng, aliveAdults(s));
        if (!pair) return logLine(s, 'No-one was around to argue. The accusation faded.');
        const [accuser, accused] = pair;
        let next: GameState = { ...s, morale: Math.max(0, s.morale - 1) };
        next = adjustGrudge(next, accuser.id, accused.id, 4);
        return logLine(
          next,
          `${accuser.name} accused ${accused.name} of holding back food. You stepped in. Morale -1, lasting bad blood between them.`
        );
      }
    },
    {
      id: 'ignore',
      icon: '🚫',
      label: 'Let them have it out',
      silentLog: true,
      apply: (s, rng) => {
        const pair = pickPair(rng, aliveAdults(s));
        if (!pair) return logLine(s, 'No-one was around to argue.');
        const [accuser, accused] = pair;
        let next: GameState = { ...s, morale: Math.max(0, s.morale - 3) };
        next = adjustGrudge(next, accuser.id, accused.id, 12);
        return logLine(
          next,
          `${accuser.name} and ${accused.name} screamed themselves hoarse. Morale -3, deep grudge.`
        );
      }
    }
  ]
};

const fistfight: GameEvent = {
  id: 'party_fistfight',
  category: 'personal',
  title: 'Fists fly',
  body: 'A simmering grudge boils over. The party watches, pretends not to watch, picks sides.',
  weight: 2,
  gate: (s) => hasFestering(s, 25),
  choices: [
    {
      id: 'break_up',
      icon: '🛡️',
      label: 'Pull them apart',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const pair = pickFesteringPair(s, rng, 25);
        if (!pair) return logLine(s, 'You broke it up before it started.');
        const [a, b] = pair;
        let next = damageMember(s, a.id, 4);
        next = damageMember(next, b.id, 4);
        next = { ...next, morale: Math.max(0, next.morale - 2) };
        next = adjustGrudge(next, a.id, b.id, 5);
        return logLine(
          next,
          `${a.name} and ${b.name} threw blows. You broke it up — both bruised (-4 HP). Morale -2.`
        );
      }
    },
    {
      id: 'let_settle',
      icon: '👊',
      label: "Let them settle it",
      silentLog: true,
      apply: (s, rng) => {
        const pair = pickFesteringPair(s, rng, 25);
        if (!pair) return logLine(s, 'No-one fought after all.');
        const [a, b] = pair;
        let next = damageMember(s, a.id, 10);
        next = damageMember(next, b.id, 10);
        next = { ...next, morale: Math.max(0, next.morale - 4) };
        // Letting it run sometimes resolves the grudge — sometimes deepens it.
        const resolved = rng.chance(0.4);
        next = adjustGrudge(next, a.id, b.id, resolved ? -25 : 10);
        const tail = resolved
          ? 'Afterwards they shook hands. Grudge gone.'
          : 'Hatred between them only sharper.';
        return logLine(
          next,
          `${a.name} and ${b.name} fought it out — both wrecked (-10 HP). Morale -4. ${tail}`
        );
      }
    }
  ]
};

const shared_burden: GameEvent = {
  id: 'party_shared_burden',
  category: 'personal',
  title: 'A burden shared',
  body: 'A long, cold day on the trail. Two members get through it together — fixing a wheel, watching for stragglers, splitting the last biscuit.',
  weight: 2,
  gate: (s) => aliveAdults(s).length >= 2,
  choices: [
    {
      id: 'note',
      icon: '🤝',
      label: 'Note the kindness',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const pair = pickPair(rng, aliveAdults(s));
        if (!pair) return logLine(s, 'No pair to bond.');
        const [a, b] = pair;
        let next: GameState = { ...s, morale: Math.min(100, s.morale + 3) };
        next = adjustGrudge(next, a.id, b.id, -8);
        return logLine(
          next,
          `${a.name} and ${b.name} carried each other through a hard day. Morale +3, grudge eased.`
        );
      }
    }
  ]
};

const reconciliation: GameEvent = {
  id: 'party_reconciliation',
  category: 'personal',
  title: 'A long quiet apology',
  body: 'Around the fire, two who had been at each other for weeks finally talk it out.',
  weight: 1,
  gate: (s) => hasFestering(s, 20),
  choices: [
    {
      id: 'accept',
      icon: '🤝',
      label: 'Let them have the moment',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const pair = pickFesteringPair(s, rng, 20);
        if (!pair) return logLine(s, 'No grudge needed mending.');
        const [a, b] = pair;
        let next: GameState = { ...s, morale: Math.min(100, s.morale + 4) };
        next = adjustGrudge(next, a.id, b.id, -30);
        return logLine(
          next,
          `${a.name} and ${b.name} mended things by the fire. Morale +4, grudge fading.`
        );
      }
    },
    {
      id: 'distract',
      icon: '🚶',
      label: 'Push everyone to keep working',
      silentLog: true,
      apply: (s) => logLine(
        { ...s, morale: Math.max(0, s.morale - 1) },
        'Cut off the conversation; no time for it. Morale -1.'
      )
    }
  ]
};

const romance_kindling: GameEvent = {
  id: 'party_romance',
  category: 'personal',
  title: 'A spark by the campfire',
  body: 'Glances held a beat too long. The party teases gently, looks elsewhere, leaves them to it.',
  weight: 1,
  gate: (s) => {
    const adults = aliveAdults(s);
    const men = adults.filter((m) => m.sex === 'male').length;
    const women = adults.filter((m) => m.sex === 'female').length;
    return men >= 1 && women >= 1;
  },
  choices: [
    {
      id: 'leave_be',
      icon: '❤️',
      label: 'Leave them to it',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const adults = aliveAdults(s);
        const men = adults.filter((m) => m.sex === 'male');
        const women = adults.filter((m) => m.sex === 'female');
        if (men.length === 0 || women.length === 0) return logLine(s, 'Glances faded.');
        const a = men[rng.int(0, men.length - 1)];
        const b = women[rng.int(0, women.length - 1)];
        let next: GameState = { ...s, morale: Math.min(100, s.morale + 5) };
        next = adjustGrudge(next, a.id, b.id, -15);
        return logLine(
          next,
          `${a.name} and ${b.name} got cozy by the fire. The whole camp's spirits lifted. Morale +5.`
        );
      }
    }
  ]
};

export const PARTY_EVENTS: readonly GameEvent[] = [
  food_hoarding,
  fistfight,
  shared_burden,
  reconciliation,
  romance_kindling
];
