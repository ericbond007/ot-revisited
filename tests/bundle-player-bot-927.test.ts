import { describe, it, expect } from 'vitest';
import { runBot } from '../src/lib/dev/bot/runner';

describe('#927 slice 2 — restWithBundle integration', () => {
  it('cautious run completes cleanly with bundled rest days', () => {
    const r = runBot({
      seed: 'b927-cautious', persona: 'cautious',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(100);
  });

  it('drinker (1,0,0,0,1) progresses cleanly through bundled rest days', () => {
    const r = runBot({
      seed: 'b927-drinker', persona: 'drinker',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(80);
  });

  it('chaos run completes (random shuffle, 12h budget invariant)', () => {
    const r = runBot({
      seed: 'b927-chaos', persona: 'chaos',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    // Chaos persona occasionally tries unavailable raid_natives / take_from_train
    // via its own shouldRaid / shouldStealFromTrain paths — unrelated to bundling.
    // Filter only bundle/rest-fallback errors which would indicate a bundling bug.
    const errors = (r as unknown as { errors?: string[] }).errors ?? [];
    const bundleErrors = errors.filter(
      (e) => e.startsWith('rest-fallback:') || e.startsWith('rest:'),
    );
    expect(bundleErrors).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(60);
  });

  it('faithful run completes cleanly (Sabbath maintenance gating)', () => {
    const r = runBot({
      seed: 'b927-faithful', persona: 'faithful',
      leaderProfession: 'farmer', partySize: 3, childCount: 0,
    });
    expect((r as unknown as { errors?: string[] }).errors ?? []).toEqual([]);
    expect(r.daysElapsed).toBeGreaterThanOrEqual(80);
  });
});
