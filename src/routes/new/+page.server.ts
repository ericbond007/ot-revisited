import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// #1166 — /new is retired. The new-journey UI is now a modal on /.
// Anyone hitting /new (bookmark, in-product link, test fixture) is
// redirected to /?start=1, which auto-opens the wizard.
export const load: PageServerLoad = async () => {
  throw redirect(302, '/?start=1');
};
