import type { Handle } from '@sveltejs/kit';
import { getRepo } from '$lib/server/db';

const COOKIE_NAME = 'ht_device';
const ONE_YEAR = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
  const repo = getRepo();
  let deviceId = event.cookies.get(COOKIE_NAME);
  if (!deviceId) {
    deviceId = await repo.createDevice();
    event.cookies.set(COOKIE_NAME, deviceId, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax', httpOnly: true });
  }
  event.locals.deviceId = deviceId;
  event.locals.repo = repo;
  return resolve(event);
};
