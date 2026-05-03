// #280c — NPC wagon events. Trail hazards that fire on companion
// wagons: wheel breaks, lame oxen, snakebites, cholera, member
// injuries. Each NPC rolls daily for at most one event; results
// bubble up to the player's eventLog as one-line news ("a wheel
// broke on the Reed wagon") so the player sees the train's life
// happening alongside their own.
//
// These events are deliberately independent of the player's event
// bank (`content/events.ts`). The player's events are interactive
// (modals, choices, multi-effect resolutions); NPC events are
// one-shot mechanical mutations. Future iteration may extract a
// shared "passive event" subset, but for #280c minimal, fresh.

import type { Rng } from '../rng';
import type { NpcWagonState, PartyMember } from '../types';
import type { NpcTickContext } from './npc-engine';

export interface NpcEventResult {
  wagon: NpcWagonState;
  /** One-line news entry surfaced to the player. Optional — some
   *  events are silent (small inventory drift not worth a log). */
  playerLog?: string;
}

interface NpcEvent {
  id: string;
  /** Selection weight when applicable. */
  weight: number;
  /** Returns true when the event can fire on this wagon today. */
  canFire(wagon: NpcWagonState, ctx: NpcTickContext): boolean;
  /** Apply the event — mutate the wagon, optionally produce a
   *  player-visible news entry. */
  apply(wagon: NpcWagonState, ctx: NpcTickContext, rng: Rng): NpcEventResult;
}

// ---- per-day roll ----

/** Per-day event probability per wagon. ~6% → roughly one event
 *  every 17 days per wagon. With a 10-wagon train, the player sees
 *  roughly one news entry every other day, which reads as "the train
 *  is alive" without being a firehose. */
const NPC_EVENT_DAILY_CHANCE = 0.06;

// ---- helpers ----

function pickAliveMember(
  wagon: NpcWagonState,
  rng: Rng,
  filter?: (m: PartyMember) => boolean
): PartyMember | null {
  const pool = wagon.party.filter((m) => !m.dead && (filter ? filter(m) : true));
  if (pool.length === 0) return null;
  return pool[rng.int(0, pool.length - 1)];
}

function aliveOxenIds(wagon: NpcWagonState): string[] {
  return wagon.oxen.filter((o) => o.health > 0).map((o) => o.id);
}

function applyConditionToMember(
  wagon: NpcWagonState,
  memberId: string,
  conditionId: 'cholera' | 'dysentery' | 'typhoid' | 'measles' | 'broken_leg'
): NpcWagonState {
  return {
    ...wagon,
    party: wagon.party.map((m) =>
      m.id === memberId
        ? { ...m, conditions: [...m.conditions, { id: conditionId, daysSinceOnset: 0 }] }
        : m
    )
  };
}

// ---- the events ----

const NPC_EVENTS: NpcEvent[] = [
  // Wheel break — wagon condition damage. Period: every wagon train
  // saw multiple wheel cracks; emigrants carried spare spokes for
  // exactly this. Mild damage in this version (#280c minimal) —
  // future polish (#280c+) ties spare-wheel inventory into recovery.
  {
    id: 'wheel_break',
    weight: 4,
    canFire: (w) => w.outcome === 'in-progress' && w.wagon.condition > 30,
    apply: (w) => {
      const next: NpcWagonState = {
        ...w,
        wagon: { ...w.wagon, condition: Math.max(0, w.wagon.condition - 10) }
      };
      return {
        wagon: next,
        playerLog: `A wheel cracked on ${w.name}'s wagon.`
      };
    }
  },

  // Ox lame — picks a healthy ox and drops it to 80 fatigue + 50 hp.
  // Lame oxen still pull but slow the wagon — period reality, captains
  // had to decide whether to swap lame oxen at the next post.
  {
    id: 'ox_lame',
    weight: 5,
    canFire: (w) => w.outcome === 'in-progress' && aliveOxenIds(w).length > 0,
    apply: (w, _ctx, rng) => {
      const ids = aliveOxenIds(w);
      const pickedId = ids[rng.int(0, ids.length - 1)];
      const oxen = w.oxen.map((o) =>
        o.id === pickedId
          ? { ...o, health: Math.min(o.health, 50), fatigue: Math.max(o.fatigue, 80) }
          : o
      );
      return {
        wagon: { ...w, oxen },
        playerLog: `${w.name}'s lead ox went lame.`
      };
    }
  },

  // Snake bite (ox) — kills an ox outright. Period reality: rattlesnake
  // strikes on the prairie were common, and a struck ox usually died.
  {
    id: 'ox_snakebite',
    weight: 2,
    canFire: (w, ctx) =>
      w.outcome === 'in-progress'
      && aliveOxenIds(w).length > 0
      && (ctx.terrain === 'prairie' || ctx.terrain === 'desert'),
    apply: (w, _ctx, rng) => {
      const ids = aliveOxenIds(w);
      const pickedId = ids[rng.int(0, ids.length - 1)];
      const oxen = w.oxen.map((o) =>
        o.id === pickedId ? { ...o, health: 0 } : o
      );
      return {
        wagon: { ...w, oxen },
        playerLog: `A rattlesnake struck an ox in ${w.name}'s team — it didn't make it.`
      };
    }
  },

  // Member sickness — cholera. Heavy daily drain (10/day, doctor 30%
  // relief, treatment items halve + 25% cure). Period: cholera was
  // the trail's #1 killer.
  {
    id: 'member_cholera',
    weight: 3,
    canFire: (w) =>
      w.outcome === 'in-progress'
      && w.party.some((m) => !m.dead && !m.conditions.some((c) => c.id === 'cholera')),
    apply: (w, _ctx, rng) => {
      const m = pickAliveMember(w, rng, (mem) => !mem.conditions.some((c) => c.id === 'cholera'));
      if (!m) return { wagon: w };
      return {
        wagon: applyConditionToMember(w, m.id, 'cholera'),
        playerLog: `Cholera struck ${w.name}'s wagon — ${m.name} taken sick.`
      };
    }
  },

  // Member sickness — dysentery. Lighter than cholera (3/day) but
  // chronic without treatment.
  {
    id: 'member_dysentery',
    weight: 4,
    canFire: (w) =>
      w.outcome === 'in-progress'
      && w.party.some((m) => !m.dead && !m.conditions.some((c) => c.id === 'dysentery')),
    apply: (w, _ctx, rng) => {
      const m = pickAliveMember(w, rng, (mem) => !mem.conditions.some((c) => c.id === 'dysentery'));
      if (!m) return { wagon: w };
      return {
        wagon: applyConditionToMember(w, m.id, 'dysentery'),
        playerLog: `Dysentery in ${w.name}'s wagon — ${m.name} laid up.`
      };
    }
  },

  // Member injury — broken leg. Common period mishap (kicked by ox,
  // fell from a moving wagon, slipped on a wet bank). 5/day drain
  // until treated with bandages + laudanum.
  {
    id: 'member_injury',
    weight: 3,
    canFire: (w) =>
      w.outcome === 'in-progress'
      && w.party.some((m) => !m.dead && !m.conditions.some((c) => c.id === 'broken_leg')),
    apply: (w, _ctx, rng) => {
      const m = pickAliveMember(w, rng, (mem) => !mem.conditions.some((c) => c.id === 'broken_leg'));
      if (!m) return { wagon: w };
      const phrasing = m.kind === 'child'
        ? `${m.name} fell from ${w.name}'s wagon — broken leg.`
        : `${m.name} took a kick from an ox — broken leg.`;
      return {
        wagon: applyConditionToMember(w, m.id, 'broken_leg'),
        playerLog: phrasing
      };
    }
  },

  // Food spoilage — flour or bacon goes bad. Period reality: damp
  // weather + jolting wagons ruined emigrant food regularly.
  {
    id: 'food_spoilage',
    weight: 4,
    canFire: (w) => {
      if (w.outcome !== 'in-progress') return false;
      return (w.inventory.flour ?? 0) >= 20 || (w.inventory.bacon ?? 0) >= 10;
    },
    apply: (w, _ctx, rng) => {
      const item = rng.chance(0.6) ? 'flour' : 'bacon';
      const lost = item === 'flour' ? rng.int(10, 25) : rng.int(5, 15);
      const have = w.inventory[item] ?? 0;
      const taken = Math.min(have, lost);
      const inventory = { ...w.inventory, [item]: have - taken };
      return {
        wagon: { ...w, inventory },
        playerLog: `${w.name}'s wagon lost ${taken} lb of ${item} to damp.`
      };
    }
  },

  // Lucky find — small food bonus. Period: emigrant diaries describe
  // berry patches, occasional buffalo windfall, fish from streams.
  // Hunter-led wagons get a stronger weight (they're actively scouting).
  {
    id: 'lucky_find',
    weight: 3,
    canFire: (w) => w.outcome === 'in-progress',
    apply: (w, _ctx, rng) => {
      const isHunter = w.leaderProfession === 'hunter';
      const meatGain = isHunter ? rng.int(20, 40) : rng.int(5, 15);
      const inventory = {
        ...w.inventory,
        game_meat: (w.inventory.game_meat ?? 0) + meatGain
      };
      return {
        wagon: { ...w, inventory },
        playerLog: isHunter
          ? `${w.name}'s hunter brought down a deer — fresh meat for their table.`
          : `${w.name}'s wagon found a berry patch and a wandering buffalo calf.`
      };
    }
  },

  // Child mortality — tragic but period-realistic. Diaries (Sager
  // family 1844, Donner Party) cluster childhood mortality at
  // disease + accident peaks. Low weight; children's wagon-specific
  // — only fires if there's a child member.
  {
    id: 'child_dies',
    weight: 1,
    canFire: (w) =>
      w.outcome === 'in-progress'
      && w.party.some((m) => !m.dead && m.kind === 'child'),
    apply: (w, ctx, rng) => {
      const m = pickAliveMember(w, rng, (mem) => mem.kind === 'child');
      if (!m) return { wagon: w };
      const party = w.party.map((p) =>
        p.id === m.id
          ? { ...p, dead: true, health: 0, deathDay: ctx.day, deathCause: 'illness' }
          : p
      );
      return {
        wagon: {
          ...w,
          party,
          eventLog: [...w.eventLog, { day: ctx.day, text: `${m.name} died — too young for the trail.` }]
        },
        playerLog: `Tragedy in ${w.name}'s wagon — ${m.name} passed in the night.`
      };
    }
  }
];

function pickWeighted(events: NpcEvent[], rng: Rng): NpcEvent {
  const total = events.reduce((sum, e) => sum + e.weight, 0);
  let r = rng.next() * total;
  for (const e of events) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return events[0];
}

/** Roll for an NPC event on this wagon. Returns null if no event
 *  fired (the common case — most days are quiet). */
export function rollNpcEvent(
  wagon: NpcWagonState,
  ctx: NpcTickContext,
  rng: Rng
): NpcEventResult | null {
  if (wagon.outcome !== 'in-progress') return null;
  if (!rng.chance(NPC_EVENT_DAILY_CHANCE)) return null;
  const applicable = NPC_EVENTS.filter((e) => e.canFire(wagon, ctx));
  if (applicable.length === 0) return null;
  const event = pickWeighted(applicable, rng);
  return event.apply(wagon, ctx, rng);
}

// Re-export for tests + future #280d view.
export { NPC_EVENTS };
