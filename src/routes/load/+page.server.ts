import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const saves = await locals.repo.list(locals.deviceId);
  return {
    saves: saves.map((s) => ({
      id: s.id,
      slotName: s.slotName,
      summary: s.summary,
      updatedAt: s.updatedAt.toISOString()
    }))
  };
};

export const actions: Actions = {
  load: async ({ request, locals }) => {
    const fd = await request.formData();
    const slotName = fd.get('slotName')?.toString();
    if (!slotName) throw error(400, 'slotName required');
    const state = await locals.repo.load(locals.deviceId, slotName);
    if (!state) throw error(404, `No save in slot "${slotName}"`);
    throw redirect(303, `/play?slot=${encodeURIComponent(slotName)}`);
  },
  delete: async ({ request, locals }) => {
    const fd = await request.formData();
    const slotName = fd.get('slotName')?.toString();
    if (!slotName) throw error(400, 'slotName required');
    await locals.repo.delete(locals.deviceId, slotName);
    throw redirect(303, '/load');
  }
};
