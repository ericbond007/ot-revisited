import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  const saves = await locals.repo.list(locals.deviceId);
  return json({ saves: saves.map((s) => ({ slotName: s.slotName, summary: s.summary, updatedAt: s.updatedAt })) });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
  const slotName = url.searchParams.get('slot');
  if (!slotName) throw error(400, 'slot parameter required');
  await locals.repo.delete(locals.deviceId, slotName);
  return new Response(null, { status: 204 });
};
