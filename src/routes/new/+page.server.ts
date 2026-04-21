import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createInitialState } from '$lib/game/engine';
import { PROFESSIONS } from '$lib/game/content/professions';
import type { ProfessionId } from '$lib/game/types';

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
}

function parseMembers(fd: FormData): PartyFormMember[] {
  const members: PartyFormMember[] = [];
  for (let i = 0; i < 6; i++) {
    const name = fd.get(`member_${i}_name`)?.toString();
    const profession = fd.get(`member_${i}_profession`)?.toString() as ProfessionId | undefined;
    if (!name || !profession) continue;
    members.push({ name, profession });
  }
  return members;
}

export const actions: Actions = {
  depart: async ({ request, locals }) => {
    const fd = await request.formData();
    const members = parseMembers(fd);
    if (members.length < 2) return fail(400, { error: 'Party must have at least 2 adults.' });
    if (members.length > 6) return fail(400, { error: 'Party must have at most 6 adults.' });

    const year = parseInt(fd.get('year')?.toString() ?? '1848', 10);
    const month = parseInt(fd.get('month')?.toString() ?? '4', 10);
    const day = parseInt(fd.get('day')?.toString() ?? '15', 10);

    const seed = `${locals.deviceId}-${Date.now()}`;
    const state = createInitialState({
      seed,
      leader: members[0],
      companions: members.slice(1),
      startDate: { year, month, day }
    });

    const slotName = `Journey ${new Date().toLocaleDateString()}`;
    await locals.repo.save(locals.deviceId, slotName, state);

    throw redirect(303, `/?created=${encodeURIComponent(slotName)}`);
  }
};
