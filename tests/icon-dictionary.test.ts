import { describe, it, expect } from 'vitest';
import { ICON, icon } from '../src/lib/data/icon-dictionary';
import { LANDMARKS } from '../src/lib/game/content/landmarks';

describe('icon-dictionary', () => {
  it('declares every advertised category', () => {
    const required = [
      'actions',
      'stats',
      'pace_options',
      'rations_options',
      'inventory_categories',
      'event_categories',
      'people',
      'camp_scene',
      'landmarks'
    ] as const;
    for (const cat of required) {
      expect(ICON[cat]).toBeDefined();
      expect(Object.keys(ICON[cat]).length).toBeGreaterThan(0);
    }
  });

  it('every glyph is a non-empty string', () => {
    for (const [cat, group] of Object.entries(ICON)) {
      for (const [key, glyph] of Object.entries(group)) {
        expect(typeof glyph, `${cat}.${key}`).toBe('string');
        expect(glyph.length, `${cat}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('landmark keys correspond to real landmark ids', () => {
    const realIds = new Set(LANDMARKS.map((l) => l.id));
    for (const key of Object.keys(ICON.landmarks)) {
      expect(realIds.has(key), `landmark "${key}" is not a real LANDMARKS id`).toBe(true);
    }
  });
});

describe('icon() helper', () => {
  it('returns the expected glyph for a known key', () => {
    expect(icon('actions', 'travel')).toBe('🚶');
    expect(icon('stats', 'health')).toBe('❤️');
    expect(icon('landmarks', 'oregon_city')).toBe('🏁');
  });

  it('rejects unknown keys at the type level', () => {
    // Compile-time only — never executed. The `@ts-expect-error` directives
    // are the assertion: if these calls became valid, the test file would
    // fail to compile.
    if (false as boolean) {
      // @ts-expect-error — 'nonexistent' is not a valid actions key
      icon('actions', 'nonexistent');
      // @ts-expect-error — 'fake_category' is not a valid category
      icon('fake_category', 'travel');
    }
    expect(true).toBe(true);
  });
});
