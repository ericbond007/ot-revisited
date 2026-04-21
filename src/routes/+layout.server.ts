import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const saves = await locals.repo.list(locals.deviceId);
  return {
    deviceId: locals.deviceId,
    saves: saves.map((s) => ({
      id: s.id,
      slotName: s.slotName,
      summary: s.summary,
      updatedAt: s.updatedAt.toISOString()
    }))
  };
};
