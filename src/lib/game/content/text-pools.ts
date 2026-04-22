// Flavor-text registry.
//
// Each key maps to an array of variant strings. The engine picks one by seeded
// rng so the same journey reads consistently on replay, but different journeys
// (or different events of the same kind on the same journey) read differently.
//
// This is NOT i18n — there's no locale layer. It's a one-to-many map:
// "this event has these possible flavor lines, pick one."
//
// Naming convention: '<event_id>.body' for the event's prose body,
//                    '<event_id>.<choice_id>.<outcome>' for log variants.

import type { Rng } from '../rng';

export const TEXT_POOLS: Record<string, readonly string[]> = {
  // Pools land here as events get migrated. Empty registry is fine — pickText
  // throws on unknown key, so misspelled or missing pools are caught loudly.
};

/**
 * Pick a text variant by key. Throws on unknown key.
 *
 * Pass `fallback` to opt out of the throw — useful while migrating events
 * incrementally so an unmigrated event doesn't crash the engine.
 */
export function pickText(key: string, rng: Rng, fallback?: string): string {
  const pool = TEXT_POOLS[key];
  if (!pool || pool.length === 0) {
    if (fallback !== undefined) return fallback;
    throw new Error(`text-pool: no entries for key "${key}"`);
  }
  return rng.pick(pool);
}

/**
 * Format a template like "Found {qty} lb of {item}." with values.
 * Missing keys render as the empty string. Numbers stringify naturally.
 */
export function formatText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = values[k];
    return v === undefined ? '' : String(v);
  });
}
