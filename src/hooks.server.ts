import type { Handle } from '@sveltejs/kit';
import { getRepo } from '$lib/server/db';

const COOKIE_NAME = 'ht_device';
const ONE_YEAR = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
  const repo = getRepo();
  let deviceId = event.cookies.get(COOKIE_NAME);
  // Verify the cookie's id still points at a real row — if the DB was
  // wiped (dev reset, branch swap with a different sqlite file, fresh
  // migration) the cookie outlives the data and any save() call would
  // fail with a FOREIGN KEY constraint. Re-mint the device row and
  // rewrite the cookie when that happens.
  if (deviceId && !(await repo.deviceExists(deviceId))) {
    deviceId = undefined;
  }
  if (!deviceId) {
    deviceId = await repo.createDevice();
    event.cookies.set(COOKIE_NAME, deviceId, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax', httpOnly: true });
  }
  event.locals.deviceId = deviceId;
  event.locals.repo = repo;
  return resolve(event);
};
