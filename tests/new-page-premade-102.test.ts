import { describe, it, expect } from 'vitest';
import { getBotProfile, profileToNewGameOptions, applyProfileKit } from '../src/lib/game/content/bot-profiles';
import { createInitialState } from '../src/lib/game/engine';

describe('#102 premade-party end-to-end', () => {
  it('picking Donners → GameState with George + Tamzene + 5 children + Donner kit', () => {
    const profile = getBotProfile('donner-family');
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 'donner-test');
    let state = createInitialState(opts);

    // Party preserved
    expect(state.party.map((m) => m.name)).toEqual(profile.party.map((m) => m.given));

    // Children flagged correctly
    const children = state.party.filter((m) => m.kind === 'child');
    expect(children.length).toBe(profile.party.filter((m) => m.role === 'child').length);

    // Kit reflects profile (not BASE_KIT) — pick one item the profile's kit
    // declares and verify it lands. If profile.kit is undefined this test
    // skips; #887 will populate them.
    // NOTE: profileToNewGameOptions uses includeStarterKit:false; the profile
    // kit injection via NewGameOptions is wired in #887. Until then, only
    // assert items that the engine already places (yokes, per-soul clothing
    // added by buildStarterKit regardless of includeStarterKit).
    // Apply the profile kit (mirrors the server action's loadProfile flow).
    state = applyProfileKit(state, profile);

    // Kit items must land in inventory (or cash field for 'cash').
    if (profile.kit) {
      for (const [key, qty] of Object.entries(profile.kit)) {
        if (key === 'cash') continue; // cash lands on state.cash, not inventory
        expect(state.inventory[key]).toBeGreaterThanOrEqual(qty);
      }
    }
  });

  it('picking Sagers in a non-historical year still works', () => {
    const profile = getBotProfile('sager-family');
    const opts = profileToNewGameOptions(profile, { year: 1850, month: 5, day: 1 }, 'sager-1850');
    const state = createInitialState(opts);
    expect(state.date).toEqual({ year: 1850, month: 5, day: 1 });
    expect(state.party[0].name).toBe('Henry');
  });
});
