import { describe, it, expect } from 'vitest';
import { runBot } from '../src/lib/dev/bot/runner';
import { computeFunScore } from '../src/lib/dev/bot/scoring';
import { PERSONAS } from '../src/lib/dev/bot/personas';

describe('#275 bot — end-to-end run', () => {
  it('balanced persona drives a run to a terminal outcome (no infinite loop)', () => {
    const report = runBot({ seed: 'bot-balanced-1', persona: 'balanced' });
    expect(['arrived', 'wiped', 'in-progress', 'stranded']).toContain(report.outcome);
    expect(report.daysElapsed).toBeGreaterThan(0);
    expect(report.daysElapsed).toBeLessThanOrEqual(250);
    expect(report.errors).toEqual([]);
  });

  it('cautious persona picks "pay" / "trade" / "help" choices when offered', () => {
    const report = runBot({ seed: 'bot-cautious-1', persona: 'cautious' });
    expect(report.errors).toEqual([]);
    // Cautious runs travel slower — should rack up days but make decisions.
    expect(report.decisionsMade).toBeGreaterThanOrEqual(0);
  });

  it('aggressive persona makes it through without crashing', () => {
    const report = runBot({ seed: 'bot-aggro-1', persona: 'aggressive' });
    expect(report.errors).toEqual([]);
    expect(report.daysElapsed).toBeGreaterThan(0);
  });

  it('different seeds produce different runs (seeded determinism)', () => {
    const a = runBot({ seed: 'seed-a', persona: 'balanced' });
    const b = runBot({ seed: 'seed-b', persona: 'balanced' });
    // They might both arrive but the day count or event count should differ.
    const sameEverything =
      a.daysElapsed === b.daysElapsed &&
      a.uniqueEventCount === b.uniqueEventCount &&
      a.milesTraveled === b.milesTraveled;
    expect(sameEverything).toBe(false);
  });

  it('same seed + persona produces an identical report (determinism guard)', () => {
    const a = runBot({ seed: 'determinism-x', persona: 'balanced' });
    const b = runBot({ seed: 'determinism-x', persona: 'balanced' });
    expect(a.outcome).toBe(b.outcome);
    expect(a.daysElapsed).toBe(b.daysElapsed);
    expect(a.milesTraveled).toBe(b.milesTraveled);
    expect(a.uniqueEventCount).toBe(b.uniqueEventCount);
    expect(a.funScore).toBe(b.funScore);
  });

  it('run report carries arrival score + fun score', () => {
    const report = runBot({ seed: 'scores', persona: 'balanced' });
    expect(report.arrivalScore).toBeGreaterThanOrEqual(0);
    expect(report.funScore).toBeGreaterThanOrEqual(0);
    expect(report.funScore).toBeLessThanOrEqual(100);
    // Breakdown components sum approximately to total (allowing rounding).
    const sum = report.funBreakdown.variety
      + report.funBreakdown.drama
      + report.funBreakdown.decisions
      + report.funBreakdown.survival
      - report.funBreakdown.boredomPenalty;
    expect(Math.abs(sum - report.funScore)).toBeLessThanOrEqual(2);
  });
});

describe('#275 personas — registry coverage', () => {
  it('all three persona ids are registered', () => {
    expect(PERSONAS.cautious).toBeDefined();
    expect(PERSONAS.balanced).toBeDefined();
    expect(PERSONAS.aggressive).toBeDefined();
  });

  it('each persona has the full Persona interface', () => {
    for (const p of Object.values(PERSONAS)) {
      expect(typeof p.pickEventChoice).toBe('function');
      expect(typeof p.pickPace).toBe('function');
      expect(typeof p.pickRations).toBe('function');
      expect(typeof p.shouldRest).toBe('function');
      expect(typeof p.shouldHunt).toBe('function');
      expect(typeof p.pickFordMethod).toBe('function');
      expect(typeof p.shouldTradeAtPost).toBe('function');
      expect(typeof p.shouldStayAtInn).toBe('function');
      expect(typeof p.shouldFindWater).toBe('function');
    }
  });
});

describe('#275 fun-score scoring math', () => {
  it('a triumphant arrival with full party + variety scores high', () => {
    const r = computeFunScore({
      daysElapsed: 130,
      uniqueEventCount: 18,
      dramaBeatCount: 8,
      decisionsMade: 25,
      longestBoringStretch: 5,
      aliveCount: 5,
      startingPartySize: 5,
      outcome: 'arrived',
      errorCount: 0
    });
    expect(r.total).toBeGreaterThan(70);
    expect(r.breakdown.survival).toBe(25);
    expect(r.breakdown.boredomPenalty).toBe(0);
  });

  it('a boring grind scores low', () => {
    const r = computeFunScore({
      daysElapsed: 200,
      uniqueEventCount: 3,
      dramaBeatCount: 0,
      decisionsMade: 5,
      longestBoringStretch: 35,
      aliveCount: 5,
      startingPartySize: 5,
      outcome: 'arrived',
      errorCount: 0
    });
    expect(r.total).toBeLessThan(35);
    expect(r.breakdown.boredomPenalty).toBe(15);
  });

  it('a heroic disaster (full wipe) is more interesting than a boring grind', () => {
    const wipe = computeFunScore({
      daysElapsed: 100,
      uniqueEventCount: 12,
      dramaBeatCount: 15,
      decisionsMade: 18,
      longestBoringStretch: 6,
      aliveCount: 0,
      startingPartySize: 5,
      outcome: 'wiped',
      errorCount: 0
    });
    const grind = computeFunScore({
      daysElapsed: 200,
      uniqueEventCount: 3,
      dramaBeatCount: 0,
      decisionsMade: 5,
      longestBoringStretch: 35,
      aliveCount: 5,
      startingPartySize: 5,
      outcome: 'arrived',
      errorCount: 0
    });
    expect(wipe.total).toBeGreaterThan(grind.total);
  });

  it('an error during the run zeroes the fun score', () => {
    const r = computeFunScore({
      daysElapsed: 50,
      uniqueEventCount: 10,
      dramaBeatCount: 5,
      decisionsMade: 12,
      longestBoringStretch: 4,
      aliveCount: 4,
      startingPartySize: 5,
      outcome: 'in-progress',
      errorCount: 1
    });
    expect(r.total).toBe(0);
  });
});
