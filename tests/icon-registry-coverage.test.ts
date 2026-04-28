import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { LANDMARKS } from '$lib/game/content/landmarks';
import { PROFESSIONS } from '$lib/game/content/professions';
import { ICON } from '$lib/data/icon-dictionary';
import { hasLandmarkIcon } from '$lib/ui/landmark-icons/LandmarkIcon.svelte';
import { hasStatIcon } from '$lib/ui/stat-icons/StatIcon.svelte';
import { hasProfessionIcon } from '$lib/ui/profession-icons/ProfessionIcon.svelte';

// Two real bugs slipped through the element-count parity tests:
//   1. LANDMARK_COORDS used `independence` while LANDMARKS canonical was
//      renamed to `independence_mo` — trail map dropped that pin
//   2. LandmarkIcon REGISTRY used `fort_*` while LANDMARKS canonical is
//      `ft_*` — six fort pins silently fell back to "?" placeholder
//
// Both bugs share a shape: a registry / mirror keyed off the canonical
// catalog drifts from the catalog's actual ids. The element-count tests
// can't catch this because they only verify port fidelity against the
// handoff bundle, not registry-to-catalog alignment.
//
// These assertions guard the alignment layer.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('icon registry coverage — canonical → registry alignment', () => {
  it('every LANDMARKS id has a LandmarkIcon registered', () => {
    const missing = LANDMARKS.filter((l) => !hasLandmarkIcon(l.id)).map((l) => l.id);
    expect(missing, `landmarks with no icon: ${missing.join(', ')}`).toEqual([]);
  });

  it('every PROFESSIONS id has a ProfessionIcon registered', () => {
    const missing = Object.keys(PROFESSIONS).filter((id) => !hasProfessionIcon(id));
    expect(missing, `professions with no icon: ${missing.join(', ')}`).toEqual([]);
  });

  it('every ICON.stats kind has a StatIcon registered', () => {
    const missing = Object.keys(ICON.stats).filter((k) => !hasStatIcon(k));
    expect(missing, `stat kinds with no icon: ${missing.join(', ')}`).toEqual([]);
  });
});

// Inverse direction — every registered id must correspond to an actual
// canonical id. Catches the case where someone ports an icon for a
// stale or speculative id that no catalog entry references. Parsing
// the dispatcher source is symmetric with the existing element-count
// tests' approach of reading source files directly.

const LANDMARK_ICON_SOURCE = path.resolve(
  __dirname,
  '../src/lib/ui/landmark-icons/LandmarkIcon.svelte'
);
const STAT_ICON_SOURCE = path.resolve(
  __dirname,
  '../src/lib/ui/stat-icons/StatIcon.svelte'
);
const PROFESSION_ICON_SOURCE = path.resolve(
  __dirname,
  '../src/lib/ui/profession-icons/ProfessionIcon.svelte'
);

/** Extract a quoted-string list from the REGISTRY_KEYS Set literal in
 *  the dispatcher's `<script lang="ts" module>` block. Order doesn't
 *  matter for the assertions; a Set is fine. */
function extractRegistryKeys(svelteSource: string): Set<string> {
  const src = readFileSync(svelteSource, 'utf-8');
  const moduleStart = src.indexOf('<script lang="ts" module>');
  expect(moduleStart, `${svelteSource} has no module block`).toBeGreaterThan(-1);
  const moduleBlock = src.slice(moduleStart);
  const match = moduleBlock.match(/REGISTRY_KEYS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/);
  expect(match, `${svelteSource} REGISTRY_KEYS Set literal not found`).toBeTruthy();
  const keys = match![1].match(/'([^']+)'/g)?.map((s) => s.slice(1, -1)) ?? [];
  return new Set(keys);
}

describe('icon registry coverage — registry → canonical alignment', () => {
  it('every LandmarkIcon REGISTRY_KEYS entry exists in LANDMARKS', () => {
    const canonical = new Set(LANDMARKS.map((l) => l.id));
    const registered = extractRegistryKeys(LANDMARK_ICON_SOURCE);
    const stale = [...registered].filter((id) => !canonical.has(id));
    expect(stale, `LandmarkIcon REGISTRY_KEYS has stale ids: ${stale.join(', ')}`).toEqual([]);
  });

  it('every ProfessionIcon REGISTRY_KEYS entry exists in PROFESSIONS', () => {
    const canonical = new Set(Object.keys(PROFESSIONS));
    const registered = extractRegistryKeys(PROFESSION_ICON_SOURCE);
    const stale = [...registered].filter((id) => !canonical.has(id));
    expect(stale, `ProfessionIcon REGISTRY_KEYS has stale ids: ${stale.join(', ')}`).toEqual([]);
  });

  it('every StatIcon REGISTRY_KEYS entry exists in ICON.stats', () => {
    const canonical = new Set(Object.keys(ICON.stats));
    const registered = extractRegistryKeys(STAT_ICON_SOURCE);
    const stale = [...registered].filter((kind) => !canonical.has(kind));
    expect(stale, `StatIcon REGISTRY_KEYS has stale kinds: ${stale.join(', ')}`).toEqual([]);
  });
});
