// #282 — Wagon-train events bank. Phase 2 of #176. Events that only
// fire while the player is in a train (`state.wagonTrain != null`).
// Period grounding for each event below; the bank is intentionally
// flavor-heavy: a captaincy without daily texture (#285) is just a
// flag, and a wagon-train without small social moments is just a
// list of side wagons.
//
// Pattern: each event gates on `s.wagonTrain != null`, picks a random
// in-progress companion to anchor the narrative when it needs a name,
// and writes morale shifts on either the player or a specific companion
// (or both). Sunday-meeting + music events have profession gates
// (preacher / fiddle player) so the train composition shapes the
// surface.

import type { GameState } from '../types';
import type { GameEvent } from './events';
import type { Rng } from '../rng';
import { hasLivePreacher } from '../professions/predicates';
import { isSunday } from '../utils/calendar';
import { tradeWithCompanion } from '../actions/trade-companion';
import type { CompanionTradeOffer, TradeLine } from '../actions/trade-companion';

function logLine(s: GameState, text: string): GameState {
  return { ...s, eventLog: [...s.eventLog, { day: s.day, text }] };
}

/** Bumps a single companion's morale (clamped 0-100) and returns the
 *  new state. No-op when the wagon isn't found or has departed. */
function bumpCompanionMorale(s: GameState, wagonId: string, delta: number): GameState {
  if (!s.wagonTrain) return s;
  return {
    ...s,
    wagonTrain: {
      ...s.wagonTrain,
      companions: s.wagonTrain.companions.map((c) =>
        c.id === wagonId
          ? { ...c, morale: Math.max(0, Math.min(100, c.morale + delta)) }
          : c
      )
    }
  };
}

/** Bumps every in-progress companion by `delta`. Used for train-wide
 *  morale events (Sunday meeting, fiddle night). */
function bumpAllCompanionMorale(s: GameState, delta: number): GameState {
  if (!s.wagonTrain) return s;
  return {
    ...s,
    wagonTrain: {
      ...s.wagonTrain,
      companions: s.wagonTrain.companions.map((c) =>
        c.outcome === 'in-progress'
          ? { ...c, morale: Math.max(0, Math.min(100, c.morale + delta)) }
          : c
      )
    }
  };
}

/** Pick a random in-progress companion. Returns null if none — gates
 *  using this should also include `companions.some(in-progress)`. */
function pickCompanion(s: GameState, rng: Rng) {
  if (!s.wagonTrain) return null;
  const live = s.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
  if (live.length === 0) return null;
  return live[Math.floor(rng.next() * live.length)];
}

/** Common gate: player is in a train with at least one in-progress
 *  companion. Without companions there's no "train" left to draw events
 *  from. */
function inActiveTrain(s: GameState): boolean {
  return !!s.wagonTrain && s.wagonTrain.companions.some((c) => c.outcome === 'in-progress');
}

// --- Campfire story (Helen Carpenter 1857: nightly storytelling was
// the company's main evening entertainment; Joel Palmer 1845 mentions
// tall tales of the country ahead). ---
const train_campfire_story: GameEvent = {
  id: 'train_campfire_story',
  category: 'encounter',
  title: 'A story by the fire',
  body: "After supper, one of the wagons in the company starts up a tale — the kind that gets longer with each pass of the coffeepot. Half the camp drifts over, the other half pretends not to listen.",
  weight: 3,
  gate: inActiveTrain,
  choices: [
    {
      id: 'listen',
      icon: '🔥',
      label: 'Sit with them and listen',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const c = pickCompanion(s, rng);
        const name = c?.name ?? 'a companion family';
        const next = bumpAllCompanionMorale(
          { ...s, morale: Math.min(100, s.morale + 2) },
          1
        );
        return logLine(next, `Sat by the fire with ${name} and listened to a story late into the night. Morale +2.`);
      }
    },
    {
      id: 'turn_in',
      icon: '🛏️',
      label: 'Turn in early — the road tomorrow is long',
      silentLog: true,
      apply: (s) => logLine(s, 'Turned in before the story was done. Slept the better for it.')
    }
  ]
};

// --- Lend a doctor's hand to a companion's lame ox (Marcy 1859: "he
// who lent freely was lent freely in turn"). Bandages used as a
// universal first-aid stand-in for any animal-doctoring favor. ---
const train_companion_ox_lame: GameEvent = {
  id: 'train_companion_ox_lame',
  category: 'wagon',
  title: "A companion's ox went lame",
  body: "One of the company's oxen pulled up favoring a foot during the morning yoke. The wagon's people are kneeling in the dust looking at it. Their kit doesn't run to bandages.",
  weight: 2,
  gate: inActiveTrain,
  choices: [
    {
      id: 'lend_bandage',
      icon: '🩹',
      label: 'Lend bandages and a hand',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'bandages', icon: '🩹', reason: 'No bandages on hand' },
      apply: (s, rng) => {
        const c = pickCompanion(s, rng);
        const name = c?.name ?? 'the family';
        const next: GameState = {
          ...s,
          inventory: { ...s.inventory, bandages: Math.max(0, (s.inventory.bandages ?? 0) - 1) },
          morale: Math.min(100, s.morale + 1)
        };
        const after = c ? bumpCompanionMorale(next, c.id, 8) : next;
        return logLine(after, `Wrapped the ox's foot for ${name}. They'll remember it. Bandages −1, morale +1.`);
      }
    },
    {
      id: 'wave_off',
      icon: '👎',
      label: 'Leave them to it — your kit is your own',
      silentLog: true,
      apply: (s, rng) => {
        const c = pickCompanion(s, rng);
        const name = c?.name ?? 'the family';
        const after = c ? bumpCompanionMorale(s, c.id, -4) : s;
        return logLine(
          { ...after, morale: Math.max(0, s.morale - 1) },
          `${name} watched you walk past their lame ox. They will not forget. Morale −1.`
        );
      }
    }
  ]
};

// --- Wagon-arrangement dispute (Bryant 1846: marching order rotated so
// no one wagon ate dust forever; disputes happened when a wagon wanted
// out of order). ---
const train_column_dispute: GameEvent = {
  id: 'train_column_dispute',
  category: 'encounter',
  title: 'A dispute over marching order',
  body: "One of the company's drivers comes over before the morning yoke and asks — politely, then less so — if your wagon would take their place at the rear of the column. They've eaten dust three days running.",
  weight: 2,
  gate: inActiveTrain,
  choices: [
    {
      id: 'yield',
      icon: '🤝',
      label: 'Yield your place — fair is fair',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const c = pickCompanion(s, rng);
        const name = c?.name ?? 'them';
        const after = c ? bumpCompanionMorale(s, c.id, 6) : s;
        return logLine(
          { ...after, morale: Math.max(0, s.morale - 1) },
          `Took the rear of the column for ${name}. The dust is bad. Morale −1, but the company saw it.`
        );
      }
    },
    {
      id: 'hold_ground',
      icon: '✋',
      label: 'Hold your place — let them rotate fair',
      silentLog: true,
      apply: (s, rng) => {
        const c = pickCompanion(s, rng);
        const name = c?.name ?? 'them';
        const after = c ? bumpCompanionMorale(s, c.id, -5) : s;
        return logLine(
          { ...after, morale: Math.min(100, s.morale + 1) },
          `Held your place. ${name} grumbled — the rotation is the captain's call, not yours. Morale +1.`
        );
      }
    }
  ]
};

// --- Sunday meeting (Catherine Sager 1844; Whitman missions; Donner
// Party held prayer meetings even in extremis). Gated on Sunday + a
// live preacher in the player's party OR any train wagon. ---
function trainHasPreacher(s: GameState): boolean {
  if (hasLivePreacher(s)) return true;
  if (!s.wagonTrain) return false;
  return s.wagonTrain.companions.some(
    (c) => c.outcome === 'in-progress' && c.leaderProfession === 'preacher'
  );
}

const train_sunday_meeting: GameEvent = {
  id: 'train_sunday_meeting',
  category: 'encounter',
  title: "Sunday meeting in the camp circle",
  body: "Sunday morning, and the preacher in the company calls the wagons together for a service. Hymns from open-air psalters; a sermon on Exodus and the wilderness; a long prayer for the road ahead.",
  weight: 3,
  gate: (s) => inActiveTrain(s) && isSunday(s.date) && trainHasPreacher(s),
  choices: [
    {
      id: 'attend',
      icon: '⛪',
      label: 'Bring the family and attend',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const next = bumpAllCompanionMorale(
          { ...s, morale: Math.min(100, s.morale + 4) },
          3
        );
        return logLine(next, 'Stood through the service in the camp circle. The whole train was steadier for it. Morale +4.');
      }
    },
    {
      id: 'abstain',
      icon: '🚶',
      label: 'Stay with the wagon — there is work to do',
      silentLog: true,
      apply: (s) => {
        const next = bumpAllCompanionMorale(s, 2);
        return logLine(
          { ...next, morale: Math.max(0, s.morale - 1) },
          "Worked through the service. The hymns carried on the wind anyway. Your morale −1, the rest of the train +2."
        );
      }
    }
  ]
};

// --- Trail-news pump (Bryant 1846: passing eastbound parties were the
// trail's only news source). When in a train, news from a passing
// company spreads through the whole camp before sundown. ---
const train_news_passing: GameEvent = {
  id: 'train_news_passing',
  category: 'encounter',
  title: 'News from an eastbound party',
  body: "At the noon halt a small eastbound train rolls in — three wagons, men with flat eyes and dust-grey beards. They've been on the road since Oregon City and have news of every post and crossing west of here. The captains pull off to one side to talk.",
  weight: 3,
  gate: inActiveTrain,
  choices: [
    {
      id: 'gather_news',
      icon: '📜',
      label: 'Stand close and gather what you can',
      isDefault: true,
      silentLog: true,
      apply: (s, rng) => {
        const next = bumpAllCompanionMorale(
          { ...s, morale: Math.min(100, s.morale + 2) },
          1
        );
        const reports = [
          'The grass is thin past Bridger this season.',
          "There's good water two days out at a spring the maps don't show.",
          'A wagon train was wiped by cholera at the Sweetwater — keep upstream of any camp.',
          'The Boise post is short on flour but heavy on coffee.',
          'A snake-bit man buried by a cottonwood three days west — pull up wide of the rocks.'
        ];
        const report = reports[Math.floor(rng.next() * reports.length)];
        return logLine(next, `Gathered news at the noon stop: "${report}" Morale +2.`);
      }
    },
    {
      id: 'press_on',
      icon: '🚶',
      label: 'Yoke up and roll — news travels',
      silentLog: true,
      apply: (s) => logLine(s, 'Rolled out before the talk was done. The news will reach you anyway.')
    }
  ]
};

// --- Companion-initiated barter (Helen Carpenter 1857: camp evenings
// were "a marketplace of small swaps"). The reverse-direction sibling
// of #289: instead of the player initiating a trade, a companion
// proposes one with a specific offer. Mechanically delegates to the
// same `tradeWithCompanion` engine action #289 uses, so log lines,
// morale rules, and willingness logic are identical to a player-driven
// trade. The `prepare` hook picks (companion, give, take) at fire time
// and stashes the offer in `flags._pendingTradeOffer` so both the body
// and the choice apply read the same deal.
//
// Asymmetry vs #289: here the companion approaches the player with a
// FIXED offer; player accepts or refuses but doesn't haggle. Period
// reality: most camp swaps were "I'll trade you 5 lb of my flour for
// your needle and thread" — take it or leave it on the spot.

interface PendingTradeOffer {
  wagonId: string;
  wagonName: string;
  offer: CompanionTradeOffer;
}

// Period-typical small barters. Each entry: companion gives `theyOffer`,
// asks for `theyWant` in return. Values calibrated against `getPrice`
// to land near-fair (well within npc tolerance — they should accept).
const BARTER_TEMPLATES: Array<{ theyOffer: TradeLine; theyWant: TradeLine }> = [
  // A common camp swap — sugar for tea, sweetened up the morning pot.
  { theyOffer: { item: 'sugar', qty: 2 }, theyWant: { item: 'tea', qty: 2 } },
  // Coffee for tobacco — Bryant 1846 names this as the most common
  // single trade on the trail.
  { theyOffer: { item: 'coffee', qty: 2 }, theyWant: { item: 'tobacco', qty: 2 } },
  // Bullets for powder — hunters with one but not the other.
  { theyOffer: { item: 'lead_balls', qty: 10 }, theyWant: { item: 'gunpowder', qty: 10 } },
  // Beans for bacon — period stew-pot economics.
  { theyOffer: { item: 'beans', qty: 8 }, theyWant: { item: 'bacon', qty: 5 } },
  // Whiskey for laudanum — the medicine vs. the comfort.
  { theyOffer: { item: 'whiskey', qty: 1 }, theyWant: { item: 'laudanum', qty: 1 } }
];

function pickBarterOffer(state: GameState, rng: Rng): PendingTradeOffer | null {
  if (!state.wagonTrain) return null;
  const live = state.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
  if (live.length === 0) return null;
  // Shuffle templates + companions deterministically from rng so the
  // pick is reproducible across the body / apply passes (both run with
  // the same daily rng seed).
  const order = [...BARTER_TEMPLATES]
    .map((t) => ({ t, k: rng.next() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.t);
  const wagons = [...live]
    .map((c) => ({ c, k: rng.next() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
  for (const c of wagons) {
    for (const tmpl of order) {
      const compHas = (c.inventory[tmpl.theyOffer.item] ?? 0) >= tmpl.theyOffer.qty;
      const playerHas = (state.inventory[tmpl.theyWant.item] ?? 0) >= tmpl.theyWant.qty;
      if (!compHas || !playerHas) continue;
      return {
        wagonId: c.id,
        wagonName: c.name,
        offer: { give: [tmpl.theyWant], take: [tmpl.theyOffer] }
      };
    }
  }
  return null;
}

/** Gate-time existence check — does ANY (companion, template) pair
 *  have the goods to swap? Doesn't pick (no rng); just answers "yes/no". */
function hasAnyBarterOffer(state: GameState): boolean {
  if (!state.wagonTrain) return false;
  const live = state.wagonTrain.companions.filter((c) => c.outcome === 'in-progress');
  for (const c of live) {
    for (const tmpl of BARTER_TEMPLATES) {
      const compHas = (c.inventory[tmpl.theyOffer.item] ?? 0) >= tmpl.theyOffer.qty;
      const playerHas = (state.inventory[tmpl.theyWant.item] ?? 0) >= tmpl.theyWant.qty;
      if (compHas && playerHas) return true;
    }
  }
  return false;
}

const train_companion_barter: GameEvent = {
  id: 'train_companion_barter',
  category: 'encounter',
  title: 'A companion proposes a swap',
  // Body is dynamic — set by `prepare` from the picked offer.
  body: 'A companion walks over with a small barter offer.',
  weight: 2,
  gate: (s) => inActiveTrain(s) && hasAnyBarterOffer(s),
  prepare: (s, rng) => {
    const pending = pickBarterOffer(s, rng);
    if (!pending) return s;
    const giveStr = (pending.offer.give ?? []).map((l) => `${l.qty} ${l.item}`).join(', ');
    const takeStr = (pending.offer.take ?? []).map((l) => `${l.qty} ${l.item}`).join(', ');
    const body = `${pending.wagonName} walks over before sundown — ${takeStr} from their stores for ${giveStr} from yours. A handshake deal, take it or leave it.`;
    return {
      ...s,
      flags: {
        ...s.flags,
        _pendingEventBody: body,
        _pendingTradeOffer: pending as unknown as Record<string, unknown>
      }
    };
  },
  choices: [
    {
      id: 'accept',
      icon: '🤝',
      label: 'Take the deal',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const pending = s.flags._pendingTradeOffer as unknown as PendingTradeOffer | undefined;
        if (!pending) return logLine(s, 'The companion drifted off before the deal could close.');
        const result = tradeWithCompanion(s, pending.wagonId, pending.offer);
        // tradeWithCompanion writes its own log line + handles morale.
        // If it declined for some defensive reason (shouldn't with our
        // calibrated offers), surface it.
        if (!result.accepted) {
          return logLine(s, `${pending.wagonName} pulled the offer back: ${result.declineReason ?? 'they thought better of it.'}`);
        }
        return result.state;
      }
    },
    {
      id: 'refuse',
      icon: '👎',
      label: 'Wave it off — your stores are your own',
      silentLog: true,
      apply: (s) => {
        const pending = s.flags._pendingTradeOffer as unknown as PendingTradeOffer | undefined;
        if (!pending) return logLine(s, 'You waved off the offer.');
        const after = bumpCompanionMorale(s, pending.wagonId, -3);
        return logLine(after, `Waved off ${pending.wagonName}'s offer. They walked back without a word.`);
      }
    }
  ]
};

// --- Music night (fiddles + harmonicas standard trail entertainment;
// many memoirs name a specific fiddler — e.g. Bryant 1846 names "old
// Wakeman" who played at every camp). Gated on someone in the train
// or party carrying a fiddle. ---
function trainHasFiddle(s: GameState): boolean {
  if ((s.inventory.fiddle ?? 0) > 0) return true;
  if (!s.wagonTrain) return false;
  return s.wagonTrain.companions.some(
    (c) => c.outcome === 'in-progress' && (c.inventory.fiddle ?? 0) > 0
  );
}

const train_fiddle_night: GameEvent = {
  id: 'train_fiddle_night',
  category: 'encounter',
  title: 'A fiddle starts up after dark',
  body: "After the supper fires die down a fiddle starts somewhere in the camp ring — first one tune, then another, then someone gets up and dances on the dust. Most of the company drifts over.",
  weight: 2,
  gate: (s) => inActiveTrain(s) && trainHasFiddle(s),
  choices: [
    {
      id: 'join',
      icon: '🎻',
      label: 'Join the dance',
      isDefault: true,
      silentLog: true,
      apply: (s) => {
        const next = bumpAllCompanionMorale(
          { ...s, morale: Math.min(100, s.morale + 3) },
          2
        );
        return logLine(next, "Danced in the dust until the fiddler's hands gave out. The whole company felt it. Morale +3.");
      }
    },
    {
      id: 'retire',
      icon: '🛏️',
      label: 'Listen from the wagon and turn in',
      silentLog: true,
      apply: (s) => {
        const next = bumpAllCompanionMorale(s, 2);
        return logLine(
          { ...next, morale: Math.min(100, s.morale + 1) },
          'Listened from the wagon. The tunes carried on the wind. Morale +1, the rest of the train +2.'
        );
      }
    }
  ]
};

// --- A child wanders into your camp (period reality: kids ran loose
// in camp, especially after supper — Catherine Sager 1844 describes it
// vividly). Tea / sugar consumed because that's the universal "small
// kindness to a child" item in the period inventory. ---
const train_lost_child: GameEvent = {
  id: 'train_lost_child',
  category: 'encounter',
  title: "A neighbor's child at the wagon",
  body: "After supper a small child from one of the company's wagons turns up by your fire — barefoot, sticky, looking up at you with the kind of openness only a five-year-old has. Their mother's voice is calling somewhere across the circle.",
  weight: 2,
  gate: (s) => inActiveTrain(s) && !!s.wagonTrain && s.wagonTrain.companions.some((c) => c.hasChildren && c.outcome === 'in-progress'),
  choices: [
    {
      id: 'indulge',
      icon: '🍯',
      label: 'Spoon them sugar and walk them back',
      isDefault: true,
      silentLog: true,
      requires: { itemId: 'sugar', icon: '🍯', reason: 'No sugar to spare' },
      apply: (s, rng) => {
        const c = pickCompanion(s, rng);
        const name = c?.name ?? "the child's family";
        const next: GameState = {
          ...s,
          inventory: { ...s.inventory, sugar: Math.max(0, (s.inventory.sugar ?? 0) - 1) },
          morale: Math.min(100, s.morale + 1)
        };
        const after = c ? bumpCompanionMorale(next, c.id, 5) : next;
        return logLine(after, `Spoonful of sugar, walked the child back to ${name}. Sugar −1, morale +1.`);
      }
    },
    {
      id: 'shoo',
      icon: '👋',
      label: 'Point them home — supper is done',
      silentLog: true,
      apply: (s) => logLine(s, 'Pointed the child back across the circle. They went, slowly.')
    }
  ]
};

export const TRAIN_EVENTS: GameEvent[] = [
  train_campfire_story,
  train_companion_ox_lame,
  train_column_dispute,
  train_sunday_meeting,
  train_news_passing,
  train_companion_barter,
  train_fiddle_night,
  train_lost_child
];
