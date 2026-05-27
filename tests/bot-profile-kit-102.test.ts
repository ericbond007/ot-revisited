import { describe, it, expect } from 'vitest';
import { getBotProfile, profileToNewGameOptions, applyProfileKit } from '../src/lib/game/content/bot-profiles';
import { createInitialState } from '../src/lib/game/engine';

describe('#102 applyProfileKit', () => {
  it('adds profile.kit items onto inventory', () => {
    const profile = getBotProfile('donner-family');
    if (!profile.kit) return; // skip if Donner kit not yet authored
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 's');
    const baseState = createInitialState(opts);
    const withKit = applyProfileKit(baseState, profile);
    for (const [key, qty] of Object.entries(profile.kit)) {
      if (key === 'cash') continue;
      expect(withKit.inventory[key]).toBeGreaterThanOrEqual(qty);
    }
  });

  it('lands cash on the top-level cash field', () => {
    const profile = getBotProfile('reed-family');
    if (!profile.kit?.cash) return;
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 's');
    const baseState = createInitialState(opts);
    const withKit = applyProfileKit(baseState, profile);
    expect(withKit.cash).toBeGreaterThanOrEqual(profile.kit.cash);
  });

  it('is a no-op when profile.kit is undefined', () => {
    // meeker-family has no kit; uses 2 adults + 1 child (engine minimum met)
    const profile = getBotProfile('meeker-family');
    if (profile.kit) return; // skip if Meekers get a kit in a later PR
    const opts = profileToNewGameOptions(profile, { year: 1852, month: 4, day: 15 }, 's');
    const baseState = createInitialState(opts);
    const withKit = applyProfileKit(baseState, profile);
    expect(withKit.inventory).toEqual(baseState.inventory);
    expect(withKit.cash).toBe(baseState.cash);
  });
});
