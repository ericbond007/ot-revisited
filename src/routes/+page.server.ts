import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getScenario } from '$lib/dev/scenarios';
import { createInitialState } from '$lib/game/engine';
import { PROFESSIONS } from '$lib/game/content/professions';
import { getBotProfile, profileToNewGameOptions, applyProfileKit } from '$lib/game/content/bot-profiles';
import type { ProfessionId, Sex } from '$lib/game/types';

export const load: PageServerLoad = async () => {
  return {
    professions: Object.values(PROFESSIONS).map((p) => ({
      id: p.id,
      name: p.name,
      bonusSummary: p.bonusSummary,
      femaleOnly: !!p.femaleOnly
    }))
  };
};

interface PartyFormMember {
  name: string;
  profession: ProfessionId;
  sex: Sex;
}

function parseMembers(fd: FormData): PartyFormMember[] {
  const members: PartyFormMember[] = [];
  for (let i = 0; i < 6; i++) {
    const name = fd.get(`member_${i}_name`)?.toString();
    const profession = fd.get(`member_${i}_profession`)?.toString() as ProfessionId | undefined;
    const rawSex = fd.get(`member_${i}_sex`)?.toString();
    if (!name || !profession) continue;
    const sex: Sex = rawSex === 'female' ? 'female' : 'male';
    members.push({ name, profession, sex });
  }
  return members;
}

export const actions: Actions = {
  // Dev-only: load a named scenario, save it to a dedicated slot, then
  // jump to /play. Hard-gated on `dev`.
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
  },

  // #1166 — custom-party submit (moved from /new). Wizard modal posts
  // here when the player picked "Build a custom party".
  depart: async ({ request, locals }) => {
    const fd = await request.formData();
    const members = parseMembers(fd);
    if (members.length < 2) return fail(400, { error: 'Party must have at least 2 adults.' });
    if (members.length > 6) return fail(400, { error: 'Party must have at most 6 adults.' });
    const year = parseInt(fd.get('year')?.toString() ?? '1848', 10);
    const month = parseInt(fd.get('month')?.toString() ?? '4', 10);
    const day = parseInt(fd.get('day')?.toString() ?? '15', 10);
    const includeStarterKit = fd.get('include_starter_kit') !== null;
    const seed = `${locals.deviceId}-${Date.now()}`;
    const state = createInitialState({
      seed,
      leader: members[0],
      companions: members.slice(1),
      startDate: { year, month, day },
      includeStarterKit
    });
    const slotName = await locals.repo.uniqueSlotName(locals.deviceId, `Journey ${new Date().toLocaleDateString()}`);
    await locals.repo.save(locals.deviceId, slotName, state);
    throw redirect(303, `/outfit?slot=${encodeURIComponent(slotName)}`);
  },

  // #102/#1166 — premade-party submit (moved from /new).
  // #1181 — anonymous in-game feedback. Capped body length, optional
  // pageUrl + UA for triage context, no auth.
  feedback: async ({ request, locals }) => {
    const fd = await request.formData();
    const body = (fd.get('body')?.toString() ?? '').trim();
    if (!body) return fail(400, { error: 'Feedback body is required.' });
    if (body.length > 4000) return fail(400, { error: 'Feedback body too long (max 4000 chars).' });
    const pageUrl = fd.get('pageUrl')?.toString().slice(0, 500) || null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null;
    await locals.repo.saveFeedback({
      deviceId: locals.deviceId ?? null,
      body,
      pageUrl,
      userAgent
    });
    return { ok: true };
  },

  loadProfile: async ({ request, locals }) => {
    const fd = await request.formData();
    const profileId = fd.get('profileId')?.toString();
    if (!profileId) return fail(400, { error: 'No profile selected.' });
    let profile;
    try {
      profile = getBotProfile(profileId);
    } catch {
      return fail(400, { error: `Unknown profile: ${profileId}` });
    }
    if (!profile.playerEligible) {
      return fail(400, { error: `Profile "${profile.displayName}" is not available for player use.` });
    }
    const year = parseInt(fd.get('year')?.toString() ?? String(profile.year), 10);
    const month = parseInt(fd.get('month')?.toString() ?? '4', 10);
    const day = parseInt(fd.get('day')?.toString() ?? '15', 10);
    const seed = `${locals.deviceId}-${Date.now()}`;
    const opts = profileToNewGameOptions(profile, { year, month, day }, seed);
    let state = createInitialState(opts);
    state = applyProfileKit(state, profile);
    const slotName = await locals.repo.uniqueSlotName(locals.deviceId, `Journey ${new Date().toLocaleDateString()}`);
    await locals.repo.save(locals.deviceId, slotName, state);
    throw redirect(303, `/outfit?slot=${encodeURIComponent(slotName)}`);
  }
};
