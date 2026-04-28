// Letter delivery — fired on first arrival at a major post with mail
// (any post with the `gossip` service). Mail riders carried letters
// alongside newspapers, so the gossip-service flag doubles as the
// "this place has mail" gate. ~30% chance per first arrival; second
// visits to the same post never deliver (per-post dedup via
// flags._lettersDeliveredAt).
//
// When a letter is dealt:
//   1. The morale delta is applied immediately.
//   2. flags._pendingLetter is staged with the rendered letter so the
//      LetterModal can mount.
//   3. flags._lettersDeliveredAt records the post id.
//   4. flags._lettersRead records the letter id (so a long campaign
//      doesn't deal the same letter twice).
//
// LetterModal dismisses via ?/ackLetter, which deletes _pendingLetter.

import type { GameState } from '../types';
import type { Rng } from '../rng';
import type { Landmark } from '../content/landmarks';
import { LETTERS, type LetterTemplate } from '../content/letters';

const LETTER_DELIVERY_CHANCE = 0.3;

export interface PendingLetter {
  /** Stable id of the dealt letter — for tests + telemetry. */
  id: string;
  sender: string;
  origin: string;
  body: string;
  closing: string;
  /** "Fort Laramie" — where the letter caught up with the party. */
  postName: string;
  /** Morale delta already applied; surfaced for the modal footer. */
  moraleDelta: number;
}

function readSet(state: GameState, key: '_lettersDeliveredAt' | '_lettersRead'): Set<string> {
  const arr = (state.flags[key] as unknown as string[] | undefined) ?? [];
  return new Set(arr);
}

function writeSet(
  state: GameState,
  key: '_lettersDeliveredAt' | '_lettersRead',
  set: Set<string>
): GameState {
  return {
    ...state,
    flags: { ...state.flags, [key]: [...set] as unknown as Record<string, unknown> }
  };
}

/** Pick an unread letter for this party. Returns null if every letter
 *  has been dealt (long-campaign safety). */
function pickLetter(state: GameState, rng: Rng): LetterTemplate | null {
  const read = readSet(state, '_lettersRead');
  const fresh = LETTERS.filter((l) => !read.has(l.id));
  if (fresh.length === 0) return null;
  return fresh[rng.int(0, fresh.length - 1)];
}

/** Run on first arrival at a post with mail service. No-op if the post
 *  has already delivered, the dice roll fails, or every letter has
 *  been dealt. Otherwise stages a PendingLetter on flags._pendingLetter
 *  and applies the morale delta. */
export function maybeDeliverLetter(
  state: GameState,
  here: Landmark,
  rng: Rng
): GameState {
  if (!(here.services ?? []).includes('gossip')) return state;
  const delivered = readSet(state, '_lettersDeliveredAt');
  if (delivered.has(here.id)) return state;
  if (!rng.chance(LETTER_DELIVERY_CHANCE)) return state;
  const letter = pickLetter(state, rng);
  if (!letter) return state;

  const pending: PendingLetter = {
    id: letter.id,
    sender: letter.sender,
    origin: letter.origin,
    body: letter.body,
    closing: letter.closing,
    postName: here.name,
    moraleDelta: letter.moraleDelta
  };

  let next: GameState = {
    ...state,
    morale: Math.max(0, Math.min(100, state.morale + letter.moraleDelta)),
    flags: { ...state.flags, _pendingLetter: pending as unknown as Record<string, unknown> },
    eventLog: [
      ...state.eventLog,
      {
        day: state.day,
        text: `A letter from ${letter.sender} caught up with you at ${here.name}. Morale ${letter.moraleDelta >= 0 ? '+' : ''}${letter.moraleDelta}.`
      }
    ]
  };
  delivered.add(here.id);
  next = writeSet(next, '_lettersDeliveredAt', delivered);
  const readPool = readSet(next, '_lettersRead');
  readPool.add(letter.id);
  next = writeSet(next, '_lettersRead', readPool);
  return next;
}
