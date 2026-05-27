import { describe, it, expect } from 'vitest';
import { LAUNCH_PROFILES } from '../src/lib/game/content/bot-profiles';

describe('#102 BotProfile schema additions', () => {
  it('every profile has a difficulty rating', () => {
    for (const p of LAUNCH_PROFILES) {
      expect(['easy', 'normal', 'hard', 'legendary']).toContain(p.difficulty);
    }
  });
  it('every profile has exactly one leader in its party', () => {
    for (const p of LAUNCH_PROFILES) {
      const leaders = p.party.filter((m) => m.role === 'leader');
      expect(leaders.length, `${p.id} should have exactly one leader`).toBe(1);
    }
  });
  it('solo profiles + Hastings are gated playerEligible:false', () => {
    const gated = LAUNCH_PROFILES.filter((p) => !p.playerEligible);
    expect(gated.map((p) => p.id)).toEqual(['joe-meek', 'tabitha-brown', 'joel-palmer', 'lansford-hastings']);
  });
});
