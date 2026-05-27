import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getScenario, SCENARIOS } from '$lib/dev/scenarios';

// #1173 — GET-based scenario perma URL. Mirrors the POST `loadScenario`
// action on `/+page.server.ts` but lets a browser, curl, or an AI
// design reviewer hit a stable link and land in a specific game state
// without a form submit.
//
// Hitting the URL twice rebuilds the slot from the scenario's `build()`,
// so a fresh repro is one reload away.
//
// URL form: `/dev/scenario/at_kearny` → `/play?slot=dev-at_kearny`.
//
// Open in production by design — these routes drop the user into a
// pre-built save in their own session and don't bypass any auth.
// Dave's ot.ericbond.net deployment needs them reachable for design
// review and bug-repro links shared with collaborators.

export const load: PageServerLoad = async ({ params, locals }) => {
  const id = params.id;
  if (!id) {
    throw error(400, `scenario id required. Available: ${SCENARIOS.map((s) => s.id).join(', ')}`);
  }
  const scenario = getScenario(id);
  if (!scenario) {
    throw error(400, `unknown scenario: ${id}. Available: ${SCENARIOS.map((s) => s.id).join(', ')}`);
  }
  const slot = `dev-${id}`;
  const state = scenario.build();
  await locals.repo.save(locals.deviceId, slot, state);
  throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
};
