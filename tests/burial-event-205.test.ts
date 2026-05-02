import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/lib/game/engine';
import { resolveEvent } from '../src/lib/game/systems/events';
import { EVENTS } from '../src/lib/game/content/events';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(over: Partial<GameState> = {}): GameState {
  const s = createInitialState({
    seed: 'burial-205',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [
      { name: 'Mary', profession: 'doctor' },
      { name: 'Tom', profession: 'hunter' }
    ],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, ...over };
}

function withDeadMember(s: GameState): GameState {
  return {
    ...s,
    day: 5,
    party: s.party.map((m, i) =>
      i === 1
        ? { ...m, dead: true, health: 0, deathCause: 'Cholera', deathDay: 4 }
        : m
    ),
    flags: { ...s.flags, _burialPending: true }
  };
}

const burialEvent = EVENTS.find((e) => e.id === 'personal_burial')!;

describe('personal_burial event (#205)', () => {
  describe('three choices on the popup', () => {
    it('exposes dig_grave / stone_mound / rifle_salute / eat_the_body', () => {
      // rifle_salute (#260) added as a 4th choice; salute and eat_the_body
      // are both hidden by default (ammo-gated and starvation-gated
      // respectively), so the casual player still sees just dig + mound.
      expect(burialEvent.choices.map((c) => c.id)).toEqual([
        'dig_grave',
        'stone_mound',
        'rifle_salute',
        'eat_the_body'
      ]);
    });

    it('eat_the_body is hidden when the party has food', () => {
      const s = withDeadMember(newGame({ inventory: { flour: 50 } }));
      const choice = burialEvent.choices.find((c) => c.id === 'eat_the_body')!;
      expect(choice.hidden!(s)).toBe(true);
    });

    it('eat_the_body is visible when the party has no food', () => {
      const s = withDeadMember(newGame({ inventory: {} }));
      const choice = burialEvent.choices.find((c) => c.id === 'eat_the_body')!;
      expect(choice.hidden!(s)).toBe(false);
    });
  });

  describe('dig_grave (proper burial)', () => {
    it('+2 morale, clears _burialPending, body stays NOT consumed', () => {
      const before = withDeadMember(newGame({ inventory: { shovel: 1 }, morale: 50 }));
      const after = resolveEvent(before, burialEvent, 'dig_grave', makeRng('dg'));
      expect(after.morale).toBe(52);
      expect(after.flags._burialPending).toBeUndefined();
      const dead = after.party.find((m) => m.name === 'Mary');
      expect(dead?.consumed).toBeFalsy();
    });
  });

  describe('stone_mound (no shovel fallback)', () => {
    it('-4 morale, clears _burialPending, body NOT consumed', () => {
      const before = withDeadMember(newGame({ inventory: {}, morale: 50 }));
      const after = resolveEvent(before, burialEvent, 'stone_mound', makeRng('sm'));
      expect(after.morale).toBe(46);
      expect(after.flags._burialPending).toBeUndefined();
      const dead = after.party.find((m) => m.name === 'Mary');
      expect(dead?.consumed).toBeFalsy();
    });

    it('preacher halves the stone-mound penalty', () => {
      const base = withDeadMember(newGame({ inventory: {}, morale: 50 }));
      const withPreacher = {
        ...base,
        party: base.party.map((m, i) => (i === 0 ? { ...m, profession: 'preacher' as const } : m))
      };
      const after = resolveEvent(withPreacher, burialEvent, 'stone_mound', makeRng('p'));
      // Preacher rounds up the (1/2) cut → ceil(4 * 0.5) = 2.
      expect(after.morale).toBe(48);
    });
  });

  describe('eat_the_body (starving cannibalism)', () => {
    it('grants 50 lb game_meat, marks consumed, -18 morale, +1 guilt', () => {
      const before = withDeadMember(newGame({ inventory: {}, morale: 50 }));
      const after = resolveEvent(before, burialEvent, 'eat_the_body', makeRng('eat'));
      expect(after.inventory.game_meat).toBe(50);
      expect(after.morale).toBe(32);
      expect(after.flags._cannibalismCount).toBe(1);
      expect(after.flags._burialPending).toBeUndefined();
      const dead = after.party.find((m) => m.name === 'Mary');
      expect(dead?.consumed).toBe(true);
    });

    it('falls back to stone-mound semantics if invoked while not starving', () => {
      // Defensive: even if the UI somehow lets the choice through.
      const before = withDeadMember(newGame({ inventory: { flour: 50 }, morale: 50 }));
      const after = resolveEvent(before, burialEvent, 'eat_the_body', makeRng('def'));
      // No meat granted, no guilt logged, body not consumed.
      expect(after.inventory.game_meat ?? 0).toBe(0);
      expect(after.flags._cannibalismCount).toBeUndefined();
      const dead = after.party.find((m) => m.name === 'Mary');
      expect(dead?.consumed).toBeFalsy();
      // Morale dropped to the no-shovel mound penalty.
      expect(after.morale).toBe(46);
    });
  });
});
