import { describe, it, expect } from 'vitest';
import { createInitialState, tickDay } from '../src/lib/game/engine';
import { serialize, deserialize, buildSummary } from '../src/lib/game/saves';

function fresh() {
  return createInitialState({
    seed: 'sv',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
}

describe('serialize / deserialize', () => {
  it('round-trips an initial state', () => {
    const s0 = fresh();
    const json = serialize(s0);
    const s1 = deserialize(json);
    expect(s1).toEqual(s0);
  });

  it('round-trips after ticking several days', () => {
    let s = fresh();
    for (let i = 0; i < 5; i++) s = tickDay(s);
    const json = serialize(s);
    const restored = deserialize(json);
    expect(restored).toEqual(s);
  });

  it('throws on malformed JSON', () => {
    expect(() => deserialize('{not valid')).toThrow();
  });

  it('throws when required fields are missing', () => {
    expect(() => deserialize('{"day":1}')).toThrow(/invalid save/i);
  });
});

describe('buildSummary', () => {
  it('includes leader name, day, and date', () => {
    const s = fresh();
    const sum = buildSummary(s);
    expect(sum).toContain('Ezra');
    expect(sum).toContain('Day 1');
    expect(sum).toMatch(/1848/);
  });
});

describe('save format versioning', () => {
  it('serialized JSON contains a version field', () => {
    const s = fresh();
    const json = serialize(s);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.state).toBeDefined();
  });

  it('deserialize reads legacy unversioned saves', () => {
    const s = fresh();
    const legacy = JSON.stringify(s);
    const restored = deserialize(legacy);
    expect(restored).toEqual(s);
  });
});
