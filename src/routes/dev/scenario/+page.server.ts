import type { PageServerLoad } from './$types';
import { SCENARIOS } from '$lib/dev/scenarios';

// #1173 — Public index of every scenario perma URL. Land here to see
// the full list with one-click links into each game state.
//
// Open in production (no dev gate) so collaborators and design reviewers
// can browse the catalog at ot.ericbond.net/dev/scenario.
export const load: PageServerLoad = async () => {
  return {
    scenarios: SCENARIOS.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description
    }))
  };
};
