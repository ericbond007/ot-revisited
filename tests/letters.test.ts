import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { maybeDeliverLetter } from '../src/lib/game/systems/letters';
import { getLandmark, type Landmark } from '../src/lib/game/content/landmarks';
import { LETTERS } from '../src/lib/game/content/letters';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';
import type { PendingLetter } from '../src/lib/game/systems/letters';

function newGame(): GameState {
  return createInitialState({
    seed: 'letters',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'doctor' }],
    startDate: { year: 1849, month: 6, day: 15 }
  });
}

describe('letter delivery', () => {
  const ftLaramie = getLandmark('ft_laramie'); // gossip-service post

  it('does nothing at posts without gossip / mail service', () => {
    // Every shipping trading_post in LANDMARKS includes gossip, so
    // synthesize a mail-less landmark to exercise the gate. Realistic
    // future: a wayside ranch / way station with no clerk.
    const noMail: Landmark = {
      ...ftLaramie,
      id: 'no_mail_synthetic',
      services: ['blacksmith']
    };
    const s = newGame();
    let delivered = false;
    for (let i = 0; i < 30 && !delivered; i++) {
      const next = maybeDeliverLetter(s, noMail, makeRng(`r-${i}`));
      if (next.flags._pendingLetter) delivered = true;
    }
    expect(delivered).toBe(false);
  });

  it('delivers at most once per post (subsequent visits no-op)', () => {
    let s = newGame();
    // Force a delivery: try seeds until one fires.
    let firstDeliveryHit = false;
    for (let i = 0; i < 30 && !firstDeliveryHit; i++) {
      const next = maybeDeliverLetter(s, ftLaramie, makeRng(`first-${i}`));
      if (next.flags._pendingLetter) {
        s = next;
        firstDeliveryHit = true;
      }
    }
    expect(firstDeliveryHit).toBe(true);

    // Clear the modal flag (simulating ackLetter) but leave
    // _lettersDeliveredAt in place — that's the per-post dedup.
    s = { ...s, flags: { ...s.flags, _pendingLetter: undefined as never } };

    // Now no seed should deliver again at Fort Laramie.
    for (let i = 0; i < 30; i++) {
      const next = maybeDeliverLetter(s, ftLaramie, makeRng(`second-${i}`));
      expect(next.flags._pendingLetter).toBeUndefined();
    }
  });

  it('a delivered letter applies its morale delta and is JSON-safe', () => {
    let s = { ...newGame(), morale: 50 };
    // Hammer seeds until a delivery fires.
    let next: GameState | null = null;
    for (let i = 0; i < 60; i++) {
      const candidate = maybeDeliverLetter(s, ftLaramie, makeRng(`apply-${i}`));
      if (candidate.flags._pendingLetter) {
        next = candidate;
        break;
      }
    }
    expect(next).not.toBeNull();
    s = next!;
    const pending = s.flags._pendingLetter as unknown as PendingLetter;
    const template = LETTERS.find((l) => l.id === pending.id)!;
    expect(template).toBeTruthy();
    expect(s.morale).toBe(50 + template.moraleDelta);
    // Whole flags blob round-trips — no functions snuck in.
    const round = JSON.parse(JSON.stringify(s.flags));
    expect(round._pendingLetter.id).toBe(pending.id);
  });

  it('exhausts the pool gracefully — no double-deal even after every letter is read', () => {
    // Pre-populate _lettersRead with every letter id so pickLetter
    // returns null. Delivery should no-op even on a forced-chance seed.
    let s = newGame();
    s = {
      ...s,
      flags: {
        ...s.flags,
        _lettersRead: LETTERS.map((l) => l.id) as unknown as Record<string, unknown>
      }
    };
    // Try many seeds — none should deliver because the fresh pool is empty.
    for (let i = 0; i < 50; i++) {
      const next = maybeDeliverLetter(s, ftLaramie, makeRng(`empty-${i}`));
      expect(next.flags._pendingLetter).toBeUndefined();
    }
  });
});
