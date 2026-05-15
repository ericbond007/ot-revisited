import { describe, it, expect } from 'vitest';
import { LANDMARKS, getLandmark, isLandmarkAbandoned } from '../src/lib/game/content/landmarks';
import { POST_THEME } from '../src/lib/data/post-theme';

const whitman = getLandmark('whitman_mission');

describe('#206 Whitman Mission — post conversion', () => {
  it('is now a trading_post (not just a landmark)', () => {
    expect(whitman.kind).toBe('trading_post');
  });

  it('has postKind=mission', () => {
    expect(whitman.postKind).toBe('mission');
  });

  it('still in the LANDMARKS table at the same position', () => {
    expect(LANDMARKS.find((l) => l.id === 'whitman_mission')).toBeDefined();
    // #1040 historical pass: grande_ronde→whitman re-anchored 60→85.
    expect(whitman.milesFromPrevious).toBe(85);
  });

  it('has a sparse stock (modest stockScale)', () => {
    expect(whitman.stockScale).toBeLessThan(0.7);
    expect(whitman.stockScale).toBeGreaterThanOrEqual(0.4);
  });

  it('stock includes farm staples (period reality)', () => {
    expect(whitman.stock).toContain('flour');
    expect(whitman.stock).toContain('beans');
    expect(whitman.stock).toContain('butter');
    expect(whitman.stock).toContain('cheese');
  });

  it('stock includes the Bible', () => {
    expect(whitman.stock).toContain('bible');
  });

  it('stock does NOT include luxuries / commercial trade goods', () => {
    expect(whitman.stock).not.toContain('whiskey');
    expect(whitman.stock).not.toContain('china_tea_set');
    expect(whitman.stock).not.toContain('grandfather_clock');
    expect(whitman.stock).not.toContain('feather_mattress');
    expect(whitman.stock).not.toContain('fiddle');
    expect(whitman.stock).not.toContain('mirror');
    expect(whitman.stock).not.toContain('vermilion');
  });

  it('stock does NOT include heavy ammunition (missionaries, not traders)', () => {
    expect(whitman.stock).not.toContain('gunpowder');
    expect(whitman.stock).not.toContain('lead_pig');
    expect(whitman.stock).not.toContain('percussion_caps');
  });

  it('offers gossip + inn + blacksmith services', () => {
    expect(whitman.services).toContain('gossip');
    expect(whitman.services).toContain('inn');
    expect(whitman.services).toContain('blacksmith');
  });

  it('does NOT offer commercial services (gambling / brothel / guide)', () => {
    expect(whitman.services).not.toContain('gambling');
    expect(whitman.services).not.toContain('brothel');
    expect(whitman.services).not.toContain('guide');
  });
});

describe('#206 Whitman Mission — year-gating (1843-1847 only)', () => {
  it('active in 1843', () => {
    expect(isLandmarkAbandoned(whitman, 1843)).toBe(false);
  });

  it('active in 1846', () => {
    expect(isLandmarkAbandoned(whitman, 1846)).toBe(false);
  });

  it('active in 1847 (massacre was November)', () => {
    expect(isLandmarkAbandoned(whitman, 1847)).toBe(false);
  });

  it('abandoned in 1848 (post-massacre)', () => {
    expect(isLandmarkAbandoned(whitman, 1848)).toBe(true);
  });

  it('abandoned in 1860', () => {
    expect(isLandmarkAbandoned(whitman, 1860)).toBe(true);
  });
});

describe('#206 mission post-theme', () => {
  it('has a registered theme entry', () => {
    expect(POST_THEME.mission).toBeDefined();
    expect(POST_THEME.mission.tag).toBe('Mission');
    expect(POST_THEME.mission.glyph).toBeTruthy();
    expect(POST_THEME.mission.accent).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
