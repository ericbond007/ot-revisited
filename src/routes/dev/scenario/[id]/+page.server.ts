import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getScenario, SCENARIOS } from '$lib/dev/scenarios';

// #1173 — GET-based scenario perma URL. Mirrors the POST `loadScenario`
// action on `/+page.server.ts` but lets a browser, curl, or an AI
// design reviewer hit a stable link and land in a specific game state
// without a form submit. Same dev-gate; same `dev-<id>` slot; same
// redirect target. Hitting the URL twice in a row deterministically
// rebuilds the slot from the scenario's `build()`, so a fresh repro
// is one reload away.
//
// URL form: `/dev/scenario/at_kearny` → `/play?slot=dev-at_kearny`.
//
// Use cases (from the ticket):
//   - bug reports with a one-link repro
//   - design review (Claude Design visits, screenshots, critiques)
//   - demo links shared in chat / docs

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!dev) throw error(404, 'Not found');
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
