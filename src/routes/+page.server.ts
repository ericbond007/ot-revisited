import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getScenario } from '$lib/dev/scenarios';

export const actions: Actions = {
  // Dev-only: load a named scenario, save it to a dedicated slot, then
  // jump to /play. Hard-gated on `dev` so production builds reject the
  // request even if the UI button somehow leaked through.
  loadScenario: async ({ request, locals }) => {
    if (!dev) throw error(404, 'Not found');

    const fd = await request.formData();
    const id = fd.get('scenario')?.toString();
    if (!id) throw error(400, 'scenario id required');

    const scenario = getScenario(id);
    if (!scenario) throw error(400, `unknown scenario: ${id}`);

    const slot = `dev-${id}`;
    const state = scenario.build();
    await locals.repo.save(locals.deviceId, slot, state);
    throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
  }
};
