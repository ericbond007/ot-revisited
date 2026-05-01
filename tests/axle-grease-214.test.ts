import { describe, it, expect } from 'vitest';
import { applyAxleGrease } from '../src/lib/game/systems/wagon';
import { createInitialState } from '../src/lib/game/engine';
import type { GameState } from '../src/lib/game/types';

function newGame(): GameState {
  return createInitialState({
    seed: 'grease-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

function withGrease(buckets: number, counter = 0): GameState {
  const g = newGame();
  return {
    ...g,
    inventory: { ...g.inventory, tar_bucket: buckets },
    flags: { ...g.flags, _greaseSinceLastDose: counter }
  };
}

describe('#214 axle grease consumption', () => {
  it('does nothing when no miles travelled', () => {
    const before = withGrease(2);
    const after = applyAxleGrease(before, 0);
    expect(after).toBe(before);
  });

  it('accumulates miles in the counter without consuming a bucket below threshold', () => {
    const before = withGrease(2);
    const after = applyAxleGrease(before, 100);
    expect(after.inventory.tar_bucket).toBe(2);
    expect(after.flags._greaseSinceLastDose).toBe(100);
  });

  it('consumes one bucket once miles cross 500', () => {
    const before = withGrease(2, 480);
    const after = applyAxleGrease(before, 30);
    expect(after.inventory.tar_bucket).toBe(1);
    expect(after.flags._greaseSinceLastDose).toBe(10);
  });

  it('handles a single tick that spans multiple cycles', () => {
    const before = withGrease(5);
    const after = applyAxleGrease(before, 1200);
    // 1200 / 500 = 2 full cycles, 200 mi remainder.
    expect(after.inventory.tar_bucket).toBe(3);
    expect(after.flags._greaseSinceLastDose).toBe(200);
  });

  it('saturates the counter at threshold when stockpile hits zero', () => {
    const before = withGrease(1, 0);
    // 600 mi with one bucket: consume the bucket once, then no more buckets,
    // so the leftover 100 mi accumulates but cannot consume.
    const after = applyAxleGrease(before, 600);
    expect(after.inventory.tar_bucket).toBe(0);
    expect(after.flags._greaseSinceLastDose).toBe(100);
  });

  it('saturates the counter at threshold even when overflow exceeds it', () => {
    const before = withGrease(0, 0);
    const after = applyAxleGrease(before, 5000);
    expect(after.inventory.tar_bucket).toBe(0);
    expect(after.flags._greaseSinceLastDose).toBe(500);
  });

  it('a freshly-bought bucket auto-applies on the next travel tick', () => {
    // Counter saturated at 500 from a previous dry run.
    const before = withGrease(1, 500);
    // Even just 1 mi of travel should consume the bucket because the
    // counter+miles already exceeds threshold.
    const after = applyAxleGrease(before, 1);
    expect(after.inventory.tar_bucket).toBe(0);
    expect(after.flags._greaseSinceLastDose).toBe(1);
  });

  it("logs an entry when the bucket runs dry", () => {
    const before = withGrease(1, 480);
    const after = applyAxleGrease(before, 30);
    const lastEntry = after.eventLog[after.eventLog.length - 1];
    expect(lastEntry.text).toMatch(/tar bucket runs dry/i);
  });

  it('does not log on every tick — only on the run-dry transition', () => {
    const before = withGrease(2, 480);
    const after = applyAxleGrease(before, 30);
    // Bucket consumed 2→1; supply not yet dry.
    expect(after.inventory.tar_bucket).toBe(1);
    const lastEntry = after.eventLog[after.eventLog.length - 1];
    expect(lastEntry?.text ?? '').not.toMatch(/tar bucket runs dry/i);
  });

  it('does not log when no buckets ever existed (cleared, then more travel)', () => {
    const before = withGrease(0, 0);
    const startLogLen = before.eventLog.length;
    const after = applyAxleGrease(before, 1000);
    // No bucket → no consumption → no run-dry transition.
    expect(after.eventLog.length).toBe(startLogLen);
  });
});
