import { describe, it, expect } from 'vitest';
import { getBotProfile, profileToNewGameOptions } from '../src/lib/game/content/bot-profiles';
import { createInitialState } from '../src/lib/game/engine';

describe('#102 profileToNewGameOptions', () => {
  it('maps the leader as PartyPick #0', () => {
    const profile = getBotProfile('donner-family');
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 'test-seed');
    expect(opts.leader.name).toBe('George'); // Donner profile leader
    expect(opts.leader.profession).toBe(profile.leaderProfession);
    expect(opts.leader.sex).toBe('male');
  });

  it('maps remaining members as companions, preserving order', () => {
    const profile = getBotProfile('sager-family');
    const opts = profileToNewGameOptions(profile, { year: 1844, month: 4, day: 15 }, 'sager-seed');
    expect(opts.companions.length).toBe(profile.party.length - 1);
    expect(opts.companions[0].name).toBe('Naomi'); // spouse second
  });

  it('disables BASE_KIT (profile.kit is authoritative)', () => {
    const profile = getBotProfile('reed-family');
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 'reed-seed');
    expect(opts.includeStarterKit).toBe(false);
  });

  it('passes through the supplied startDate verbatim', () => {
    const profile = getBotProfile('joe-meek');
    const opts = profileToNewGameOptions(profile, { year: 1849, month: 5, day: 1 }, 's');
    expect(opts.startDate).toEqual({ year: 1849, month: 5, day: 1 });
  });

  it('produces a GameState that createInitialState accepts', () => {
    const profile = getBotProfile('meeker-family');
    const opts = profileToNewGameOptions(profile, { year: 1852, month: 4, day: 15 }, 'meeker');
    const state = createInitialState(opts);
    expect(state.party.length).toBe(profile.party.length);
    expect(state.party[0].name).toBe(profile.party[0].given);
  });

  it('forwards member kind (children stay children)', () => {
    const profile = getBotProfile('sager-family');
    const opts = profileToNewGameOptions(profile, { year: 1844, month: 4, day: 15 }, 's');
    const childPicks = opts.companions.filter((c) => c.kind === 'child');
    expect(childPicks.length).toBeGreaterThan(0);
  });
});
