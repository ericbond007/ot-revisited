import { describe, it, expect } from 'vitest';
import { EVENTS } from '../src/lib/game/content/events';

describe('events catalog', () => {
  it('has events in all core categories covered so far', () => {
    const cats = new Set(EVENTS.map((e) => e.category));
    expect(cats.has('weather')).toBe(true);
    expect(cats.has('wagon')).toBe(true);
  });

  it('every event has id, title, body, >=1 choice', () => {
    for (const e of EVENTS) {
      expect(e.id).toBeTruthy();
      expect(e.title).toBeTruthy();
      expect(e.body).toBeTruthy();
      expect(e.choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every event has at least one default choice', () => {
    for (const e of EVENTS) {
      const hasDefault = e.choices.some((c) => c.isDefault);
      expect(hasDefault, `event ${e.id} has no default choice`).toBe(true);
    }
  });

  it('event ids are unique', () => {
    const seen = new Set<string>();
    for (const e of EVENTS) {
      expect(seen.has(e.id), `duplicate event id ${e.id}`).toBe(false);
      seen.add(e.id);
    }
  });
});
