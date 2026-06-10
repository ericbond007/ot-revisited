// #288 — NPC wagon crisis events. Interactive player-facing modals
// triggered by NPC-wagon state transitions (food bottoming out, future
// crises like wagon breakdown / sick child / lost ox). Each event
// carries the target wagon id so the choice's `apply` can mutate the
// right companion.
//
// These events surface through the existing `pendingEvent` plumbing
// in `tickDayPausable` / `applyPendingChoice` — same UX path as
// player-targeted events, just with a wagon-train-resolution body.

import type { GameState, NpcWagonState } from '../types';
import type { GameEvent, EventChoice } from '../content/events';

// Three share scales — the player picks based on their own surplus
// and how much they want to commit. Period reality: emigrant diaries
// describe gifts as "a few pounds of flour" or "a quarter-barrel" or
// "half what we had." We mirror that with small/medium/large.
const SHARE_TIERS: Record<'small' | 'medium' | 'large', { flour: number; bacon: number }> = {
  small: { flour: 10, bacon: 3 },
  medium: { flour: 30, bacon: 10 },
  large: { flour: 60, bacon: 20 }
};
// Sale price when the player sells food at trail rates. Matches period
// "desperate trail prices" — Helen Carpenter (1857) describes flour at
// $20/barrel mid-trail, ~$0.50/lb (vs $0.05/lb in Missouri). Bacon
// roughly 2× flour.
const SELL_FLOUR_PER_LB = 0.5;
const SELL_BACON_PER_LB = 1.0;

// Morale scales with share size — small gifts buy small thanks; a
// big haul buys real loyalty. Refusal cost is fixed (it's a posture,
// not a quantity).
const SHARE_PLAYER_MORALE: Record<keyof typeof SHARE_TIERS, number> = {
  small: 2,
  medium: 4,
  large: 7
};
const HELP_NPC_MORALE: Record<keyof typeof SHARE_TIERS, number> = {
  small: 5,
  medium: 12,
  large: 20
};
const REFUSE_PLAYER_MORALE = -6;
const SELL_PLAYER_MORALE = -2;
const SELL_NPC_MORALE = 4;
const REFUSE_NPC_MORALE = -10;

function findWagon(state: GameState, wagonId: string): NpcWagonState | null {
  if (!state.wagonTrain) return null;
  return state.wagonTrain.companions.find((c) => c.id === wagonId) ?? null;
}

function withWagonUpdated(
  state: GameState,
  wagonId: string,
  update: (w: NpcWagonState) => NpcWagonState
): GameState {
  if (!state.wagonTrain) return state;
  return {
    ...state,
    wagonTrain: {
      ...state.wagonTrain,
      companions: state.wagonTrain.companions.map((c) =>
        c.id === wagonId ? update(c) : c
      )
    }
  };
}

function logBoth(
  state: GameState,
  wagonId: string,
  text: string
): GameState {
  // Mirror the entry into both the player's eventLog and the wagon's
  // own eventLog. Player sees it on the train ledger; the wagon
  // carries its own history (#280d view will surface it).
  const next = withWagonUpdated(state, wagonId, (w) => ({
    ...w,
    eventLog: [...w.eventLog, { day: state.day, text }]
  }));
  return {
    ...next,
    eventLog: [...next.eventLog, { day: state.day, text }]
  };
}

/** Build the "wagon X is out of food" pending event. The event's
 *  choices apply effects against both the player and the target
 *  wagon (food transfer, morale, cash, log entries). Returns a
 *  GameEvent that surfaces in the existing modal infrastructure. */
export function buildStarvationCrisisEvent(target: NpcWagonState): GameEvent {
  const wagonId = target.id;
  const wagonName = target.name;

  function buildShareChoice(tier: keyof typeof SHARE_TIERS): EventChoice {
    const amounts = SHARE_TIERS[tier];
    const playerMorale = SHARE_PLAYER_MORALE[tier];
    const npcMorale = HELP_NPC_MORALE[tier];
    const tierIcon = tier === 'small' ? '🥄' : tier === 'medium' ? '🤝' : '🎁';
    return {
      id: `starvation_share_${tier}`,
      icon: tierIcon,
      label: `Share ${amounts.flour} lb flour + ${amounts.bacon} lb bacon`,
      // Medium is the default — small is stingy, large is generous.
      isDefault: tier === 'medium',
      silentLog: true,
      requires: { itemId: 'flour', icon: '🌾', reason: `Need ${amounts.flour} lb flour` },
      apply: (s) => {
        const playerFlour = s.inventory.flour ?? 0;
        const playerBacon = s.inventory.bacon ?? 0;
        const flourGiven = Math.min(amounts.flour, playerFlour);
        const baconGiven = Math.min(amounts.bacon, playerBacon);
        let next: GameState = {
          ...s,
          inventory: {
            ...s.inventory,
            flour: playerFlour - flourGiven,
            bacon: playerBacon - baconGiven
          },
          morale: Math.min(100, s.morale + playerMorale)
        };
        next = withWagonUpdated(next, wagonId, (w) => ({
          ...w,
          inventory: {
            ...w.inventory,
            flour: (w.inventory.flour ?? 0) + flourGiven,
            bacon: (w.inventory.bacon ?? 0) + baconGiven
          },
          morale: Math.min(100, w.morale + npcMorale)
        }));
        return logBoth(
          next,
          wagonId,
          `Shared ${flourGiven} lb flour and ${baconGiven} lb bacon with ${wagonName}. Morale +${playerMorale}.`
        );
      }
    };
  }
  const shareSmall = buildShareChoice('small');
  const shareMedium = buildShareChoice('medium');
  const shareLarge = buildShareChoice('large');

  // Sell uses the medium tier scale.
  const SELL_AMOUNTS = SHARE_TIERS.medium;
  const sellChoice: EventChoice = {
    id: 'starvation_sell',
    icon: '💰',
    label: `Sell ${SELL_AMOUNTS.flour} lb flour + ${SELL_AMOUNTS.bacon} lb bacon at trail prices`,
    silentLog: true,
    requires: { itemId: 'flour', icon: '🌾', reason: `Need ${SELL_AMOUNTS.flour} lb flour` },
    apply: (s) => {
      const playerFlour = s.inventory.flour ?? 0;
      const playerBacon = s.inventory.bacon ?? 0;
      const flourGiven = Math.min(SELL_AMOUNTS.flour, playerFlour);
      const baconGiven = Math.min(SELL_AMOUNTS.bacon, playerBacon);
      const askedPrice = Math.round(
        flourGiven * SELL_FLOUR_PER_LB + baconGiven * SELL_BACON_PER_LB
      );
      // Cap at the wagon's available cash — they can only pay what
      // they have. Below that, the rest goes ungranted (effectively
      // a partial sale).
      const targetWagon = findWagon(s, wagonId);
      const npcCash = targetWagon?.cash ?? 0;
      const paid = Math.min(askedPrice, npcCash);
      let next: GameState = {
        ...s,
        cash: s.cash + paid,
        inventory: {
          ...s.inventory,
          flour: playerFlour - flourGiven,
          bacon: playerBacon - baconGiven
        },
        morale: Math.max(0, s.morale + SELL_PLAYER_MORALE)
      };
      next = withWagonUpdated(next, wagonId, (w) => ({
        ...w,
        cash: Math.max(0, w.cash - paid),
        inventory: {
          ...w.inventory,
          flour: (w.inventory.flour ?? 0) + flourGiven,
          bacon: (w.inventory.bacon ?? 0) + baconGiven
        },
        morale: Math.min(100, w.morale + SELL_NPC_MORALE)
      }));
      return logBoth(
        next,
        wagonId,
        `Sold ${flourGiven} lb flour and ${baconGiven} lb bacon to ${wagonName} for $${paid}. They paid what they had. Morale ${SELL_PLAYER_MORALE > 0 ? '+' : ''}${SELL_PLAYER_MORALE}.`
      );
    }
  };

  const refuseChoice: EventChoice = {
    id: 'starvation_refuse',
    icon: '👋',
    label: 'Refuse — push on alone',
    silentLog: true,
    apply: (s) => {
      let next: GameState = {
        ...s,
        morale: Math.max(0, s.morale + REFUSE_PLAYER_MORALE)
      };
      next = withWagonUpdated(next, wagonId, (w) => ({
        ...w,
        morale: Math.max(0, w.morale + REFUSE_NPC_MORALE)
      }));
      // #285 phase 2 — refusing a starving wagon is a captaincy
      // crisis. The company gathers at the next camp and calls for a
      // new vote (consumed by tickDayPausable on the next tick). Only
      // arms the trigger when the player is actually in a train and
      // currently captain — refusing as a non-captain doesn't get
      // pinned on you the same way.
      if (s.wagonTrain && s.wagonTrain.leaderId === 'player') {
        next = {
          ...next,
          flags: {
            ...next.flags,
            _pendingCaptaincyVote: { reason: 'refused-starvation-share' }
          }
        };
      }
      return logBoth(
        next,
        wagonId,
        `Refused ${wagonName} food — they continue without. Morale ${REFUSE_PLAYER_MORALE}.`
      );
    }
  };

  return {
    id: `npc_starvation_${wagonId}`,
    category: 'personal',
    title: `${wagonName} is out of food`,
    body: `${wagonName} hasn't a pound of flour or bacon left. Their wagon caught up to yours at the noon halt; the children look hollow. The leader asks if you can spare anything.`,
    weight: 0,
    // Never fires from the regular event roller — only from
    // advanceTrain's pendingEvent return. The gate would never
    // be true via random selection.
    gate: () => false,
    choices: [shareSmall, shareMedium, shareLarge, sellChoice, refuseChoice],
    // #1279 — identifies the target wagon so tickDayPausable can mark
    // crisisAskedDay on the right companion at the surfacing site.
    npcWagonId: wagonId
  };
}
