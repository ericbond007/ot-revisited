import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SCENARIOS } from '$lib/dev/scenarios';

// #1173 — Dev-only index of every scenario perma URL. Land here to
// see the full list with one-click links into each game state.
export const load: PageServerLoad = async () => {
  if (!dev) throw error(404, 'Not found');
  return {
    scenarios: SCENARIOS.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description
    }))
  };
};
