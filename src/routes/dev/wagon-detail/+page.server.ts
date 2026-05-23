import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PageServerLoad } from './$types';

// Dev-only standalone wagon-component preview at large scale.
// Hard-gated on `dev` so production builds 404 the route entirely.
export const load: PageServerLoad = () => {
  if (!dev) throw error(404, 'Not found');
  return {};
};
