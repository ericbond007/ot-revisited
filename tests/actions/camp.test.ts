import { describe, it, expect } from 'vitest';
import { camp } from '../../src/lib/game/actions/camp';
import { createInitialState } from '../../src/lib/game/engine';

function newGame() {
  const s = createInitialState({
    seed: 'camp-test',
    leader: { name: 'A', profession: 'farmer' },
    companions: [{ name: 'B', profession: 'preacher' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, inventory: { ...s.inventory, bible: 1 } as Record<string, number>, oxen: [
    { id: 'o1', health: 100, fatigue: 40, shod: true },
    { id: 'o2', health: 100, fatigue: 40, shod: true }
  ] };
}

describe('camp', () => {
  it('advances the day counter by 1', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.day).toBe(s.day + 1);
  });

  it('consumes one day of food and water', () => {
    const s = newGame();
    const startingFlour = s.inventory.flour ?? 0;
    const c = camp(s, {});
    expect(c.inventory.flour).toBeLessThan(startingFlour);
  });

  it('recovers some ox fatigue (less than rest)', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.oxen[0].fatigue).toBeLessThan(40);
    expect(c.oxen[0].fatigue).toBeGreaterThan(20);
  });

  it('does not advance trail position', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.location.milesTraveled).toBe(s.location.milesTraveled);
  });

  it('triggers a fire attempt and sets hadFireLastNight', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(typeof c.flags.hadFireLastNight).toBe('boolean');
  });

  it('appends a camp log entry', () => {
    const s = newGame();
    const c = camp(s, {});
    expect(c.eventLog[c.eventLog.length - 1].text).toMatch(/camp/i);
  });

  it('rejects overspend on shovel actions (budget > 12 hours)', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 } };
    expect(() =>
      camp(s, { shovelActions: ['dig_well', 'dig_well', 'dig_well'] })
    ).toThrow(/budget/i);
  });

  it('throws when shovel actions requested without a shovel', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 0 } };
    expect(() =>
      camp(s, { shovelActions: ['dig_well'] })
    ).toThrow(/shovel/i);
  });

  it('logs a dig_well outcome', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 }, resources: { water: 0, waterCap: 20 } };
    const c = camp(s, { shovelActions: ['dig_well'] });
    const anyWell = c.eventLog.some((e) => /well/i.test(e.text));
    expect(anyWell).toBe(true);
  });

  it('dig_well resources remain a number', () => {
    const s = { ...newGame(), inventory: { ...newGame().inventory, shovel: 1 }, resources: { water: 0, waterCap: 20 } };
    const c = camp(s, { shovelActions: ['dig_well'] });
    expect(typeof c.resources.water).toBe('number');
  });

  it('is deterministic', () => {
    const a = camp(newGame(), {});
    const b = camp(newGame(), {});
    expect(a).toEqual(b);
  });
});
