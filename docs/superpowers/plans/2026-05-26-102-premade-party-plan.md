# VK #102 Pre-made Party Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the 10 existing historical bot profiles as a player choice on `/new` (cards-first layout), with one card for the custom-party builder. Premade choice auto-fills the historical year on the date row.

**Architecture:** Extend `BotProfile` in place with `difficulty` + `playerEligible` (Approach A). Add a single converter `profileToNewGameOptions(profile, startDate, seed): NewGameOptions`. Reorganize `/new` around a card grid; reuse the existing custom-party builder inside an `{#if}` gate.

**Tech Stack:** SvelteKit 5 runes, TypeScript strict, drizzle/sqlite (existing save plumbing), vitest. No new dependencies.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/game/content/bot-profiles.ts` | Modify | Add `difficulty` + `playerEligible` to interface + all 10 profiles; new `profileToNewGameOptions` helper; remove stale #322 comment |
| `src/lib/ui/ProfileCard.svelte` | Create | One card. Renders historical profile OR custom-party stand-in. Emits `select` event |
| `src/routes/new/+page.svelte` | Modify | Cards-first grid; collapse/expand custom builder; date row auto-fills from chosen profile |
| `src/routes/new/+page.server.ts` | Modify | New `loadProfile` form action mirroring `default` (custom-party) submit |
| `tests/bot-profile-converter-102.test.ts` | Create | Unit tests for `profileToNewGameOptions` |
| `tests/new-page-premade-102.test.ts` | Create | Integration: pick Donners → resulting GameState has the right party + kit |

---

## Task 1: Extend BotProfile interface + author difficulty/playerEligible

**Files:**
- Modify: `src/lib/game/content/bot-profiles.ts`

**Why this task:** Schema commitment first. Required fields force the value-authoring discipline; downstream code can't compile without them. Also removes the stale `#322 follow-up` comment that misled today's brainstorm.

- [ ] **Step 1: Write a failing test** that the interface requires the two fields and that LAUNCH_PROFILES has exactly one `playerEligible: false`.

Create `tests/bot-profile-schema-102.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LAUNCH_PROFILES } from '../src/lib/game/content/bot-profiles';

describe('#102 BotProfile schema additions', () => {
  it('every profile has a difficulty rating', () => {
    for (const p of LAUNCH_PROFILES) {
      expect(['easy', 'normal', 'hard', 'legendary']).toContain(p.difficulty);
    }
  });
  it('every profile declares playerEligible', () => {
    for (const p of LAUNCH_PROFILES) {
      expect(typeof p.playerEligible).toBe('boolean');
    }
  });
  it('Hastings is the only profile gated playerEligible:false', () => {
    const gated = LAUNCH_PROFILES.filter((p) => !p.playerEligible);
    expect(gated.map((p) => p.id)).toEqual(['lansford-hastings']);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** with a compile error (difficulty/playerEligible don't exist on BotProfile yet).

Run: `npx vitest run tests/bot-profile-schema-102.test.ts`
Expected: TypeScript error — fields missing.

- [ ] **Step 3: Add the two fields to the interface.**

In `src/lib/game/content/bot-profiles.ts`, locate the `BotProfile` interface (around line 36) and add immediately after the `kit?: Record<string, number>;` field:

```ts
  /** Player-facing difficulty signal. Authored by hand per profile.
   *  Drives the card badge on /new; does NOT modify game balance. */
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary';
  /** Whether this profile is surfaced as a player option on /new.
   *  False = NPC-only (incomplete kit, special-case data, or not
   *  yet vetted for player balance). #102 ships with Hastings as the
   *  only `playerEligible: false`; flip after his kit lands (#887). */
  playerEligible: boolean;
```

- [ ] **Step 4: Fill in the two fields on each of the 10 profiles.** Per the spec's draft difficulty table:

| Profile id | difficulty | playerEligible |
|---|---|---|
| `sager-family` | `'normal'` | `true` |
| `donner-family` | `'legendary'` | `true` |
| `reed-family` | `'hard'` | `true` |
| `joe-meek` | `'easy'` | `true` |
| `whitman-mission` | `'hard'` | `true` |
| `tabitha-brown` | `'hard'` | `true` |
| `meeker-family` | `'normal'` | `true` |
| `bidwell-party` | `'hard'` | `true` |
| `joel-palmer` | `'easy'` | `true` |
| `lansford-hastings` | `'legendary'` | `false` |

Add a line `difficulty: 'normal',` (etc.) and `playerEligible: true,` (or `false` for Hastings) to each profile object. Place them near `kit:` for grouping.

- [ ] **Step 5: Remove the stale comment block** at lines 49-50 (or wherever the "no `lawyer` for Hastings yet — banker stand-in until ProfessionId is expanded with attorney-class roles, see #322 follow-up" text lives). Replace with a single line:

```ts
// Slice A scope: registry + 10 launch profiles + roster-allocation helper.
```

- [ ] **Step 6: Run tests + typecheck.**

Run: `npm run verify`
Expected: 0 type errors; `bot-profile-schema-102.test.ts` passes; nothing else regresses.

- [ ] **Step 7: Commit.**

```bash
jj describe -m "feat(102): add difficulty + playerEligible to BotProfile

Schema commitment for the player premade-party card grid. Hastings is
the only playerEligible:false — his kit lands in #887 and we flip then.
Also drops the stale #322 comment (lawyer profession already shipped in
#317a; Hastings's profile uses it)."
```

---

## Task 2: profileToNewGameOptions converter

**Files:**
- Modify: `src/lib/game/content/bot-profiles.ts` (add export at bottom)
- Create: `tests/bot-profile-converter-102.test.ts`

**Why this task:** Single helper that takes a profile + date + seed and produces the existing `NewGameOptions` shape. Keeps the engine untouched.

- [ ] **Step 1: Write failing tests.**

Create `tests/bot-profile-converter-102.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getBotProfile, profileToNewGameOptions } from '../src/lib/game/content/bot-profiles';
import { createInitialState } from '../src/lib/game/engine';

describe('#102 profileToNewGameOptions', () => {
  it('maps the leader as PartyPick #0', () => {
    const profile = getBotProfile('donner-family');
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 'test-seed');
    expect(opts.leader.name).toBe('George'); // Donner profile leader
    expect(opts.leader.profession).toBe(profile.leaderProfession);
    expect(opts.leader.sex).toBe('male');
  });

  it('maps remaining members as companions, preserving order', () => {
    const profile = getBotProfile('sager-family');
    const opts = profileToNewGameOptions(profile, { year: 1844, month: 4, day: 15 }, 'sager-seed');
    expect(opts.companions.length).toBe(profile.party.length - 1);
    expect(opts.companions[0].name).toBe('Naomi'); // spouse second
  });

  it('disables BASE_KIT (profile.kit is authoritative)', () => {
    const profile = getBotProfile('reed-family');
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 'reed-seed');
    expect(opts.includeStarterKit).toBe(false);
  });

  it('passes through the supplied startDate verbatim', () => {
    const profile = getBotProfile('joe-meek');
    const opts = profileToNewGameOptions(profile, { year: 1849, month: 5, day: 1 }, 's');
    expect(opts.startDate).toEqual({ year: 1849, month: 5, day: 1 });
  });

  it('produces a GameState that createInitialState accepts', () => {
    const profile = getBotProfile('meeker-family');
    const opts = profileToNewGameOptions(profile, { year: 1852, month: 4, day: 15 }, 'meeker');
    const state = createInitialState(opts);
    expect(state.party.length).toBe(profile.party.length);
    expect(state.party[0].name).toBe(profile.party[0].given);
  });

  it('forwards member kind (children stay children)', () => {
    const profile = getBotProfile('sager-family');
    const opts = profileToNewGameOptions(profile, { year: 1844, month: 4, day: 15 }, 's');
    const childPicks = opts.companions.filter((c) => c.kind === 'child');
    expect(childPicks.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Verify tests fail.**

Run: `npx vitest run tests/bot-profile-converter-102.test.ts`
Expected: import error — `profileToNewGameOptions` not exported.

- [ ] **Step 3: Implement the converter.** Append to `src/lib/game/content/bot-profiles.ts` (after `getBotProfile`, before `pickProfilesForRoster`):

```ts
import type { NewGameOptions, PartyPick } from '../engine';
import type { GameDate } from '../types';

/** #102 — Convert a BotProfile to the NewGameOptions shape the
 *  player-side `createInitialState` accepts. Maps members 1:1 to
 *  PartyPicks (leader first), forces `includeStarterKit: false`
 *  (the profile's `kit` is the kit; BASE_KIT would double-up). */
export function profileToNewGameOptions(
  profile: BotProfile,
  startDate: GameDate,
  seed: string
): NewGameOptions {
  const memberToPick = (m: BotProfileMember): PartyPick => ({
    name: m.given,
    profession: m.role === 'leader' ? profile.leaderProfession : 'farmer', // bland default; children\u2019 profession is stripped by makeMember
    sex: m.sex,
    kind: m.role === 'child' ? 'child' : 'adult',
    age: m.age
  });

  const [leaderMember, ...rest] = profile.party;
  return {
    seed,
    leader: memberToPick(leaderMember),
    companions: rest.map(memberToPick),
    startDate,
    includeStarterKit: false
  };
}
```

- [ ] **Step 4: Run tests, verify pass.**

Run: `npm run verify`
Expected: all green.

- [ ] **Step 5: Commit.**

```bash
jj describe -m "feat(102): profileToNewGameOptions converter

Maps BotProfile → NewGameOptions for player premade-party path.
Leader is members[0]; companions preserve order; includeStarterKit
false so the profile's kit doesn't get BASE_KIT'd on top."
```

---

## Task 3: ProfileCard component

**Files:**
- Create: `src/lib/ui/ProfileCard.svelte`

**Why this task:** One card, one shape. Both the historical-profile case and the "Build custom party" case render through this component. The new-page glue (Task 4) iterates over a list of cards without branching.

- [ ] **Step 1: Create the component.**

```svelte
<script lang="ts">
  import type { BotProfile } from '$lib/game/content/bot-profiles';

  interface Props {
    profile: BotProfile | null;
    selected: boolean;
    onselect: () => void;
  }
  let { profile, selected, onselect }: Props = $props();

  const DIFFICULTY_LABEL = {
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    legendary: 'Legendary'
  } as const;

  const compositionSummary = (p: BotProfile): string => {
    const adults = p.party.filter((m) => m.role !== 'child').length;
    const children = p.party.filter((m) => m.role === 'child').length;
    if (adults === 1 && children === 0) return 'solo';
    if (children === 0) return `${adults} adults`;
    return `${adults} adults + ${children} ${children === 1 ? 'child' : 'children'}`;
  };
</script>

<button
  type="button"
  class="profile-card"
  class:selected
  class:custom={!profile}
  onclick={onselect}
>
  {#if profile}
    <div class="card-head">
      <span class="card-title">{profile.displayName}</span>
      <span class="badge badge-{profile.difficulty}">{DIFFICULTY_LABEL[profile.difficulty]}</span>
    </div>
    <div class="card-meta">{profile.year} · {compositionSummary(profile)} · {profile.leaderProfession}</div>
    <div class="card-trait">{profile.trait}</div>
  {:else}
    <div class="card-head">
      <span class="card-title">Build a custom party</span>
    </div>
    <div class="card-meta">Pick your own crew + departure date.</div>
    <div class="card-trait">No historical fate attached.</div>
  {/if}
</button>

<style>
  .profile-card {
    text-align: left;
    background: var(--card-bg, #fff8ef);
    border: 1px solid var(--card-border, #c9bba0);
    border-radius: 6px;
    padding: 0.75rem 0.9rem;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: border-color 120ms, background 120ms, transform 120ms;
  }
  .profile-card:hover { border-color: #990000; transform: translateY(-1px); }
  .profile-card.selected { border-color: #990000; background: #eeedeb; box-shadow: 0 0 0 2px rgba(153,0,0,0.2); }
  .profile-card.custom { background: #eeedeb; font-style: italic; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
  .card-title { font-weight: 600; font-size: 1.05em; }
  .card-meta { font-size: 0.85em; color: #555; margin-bottom: 0.25rem; }
  .card-trait { font-size: 0.85em; line-height: 1.3; color: #333; }
  .badge { font-size: 0.7em; padding: 0.1em 0.5em; border-radius: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  .badge-easy { background: #d6e9c6; color: #3c763d; }
  .badge-normal { background: #fcf8e3; color: #8a6d3b; }
  .badge-hard { background: #f2dede; color: #a94442; }
  .badge-legendary { background: #2b2b2b; color: #eeedeb; }
</style>
```

- [ ] **Step 2: Type-check.**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit.**

```bash
jj describe -m "feat(102): ProfileCard component

Single card type for both historical profiles + the 'custom party'
slot. Difficulty badge color-coded; trait line carries the historical
hook. Hover/selected states use the project's crimson accent."
```

---

## Task 4: Reorganize /new page to cards-first

**Files:**
- Modify: `src/routes/new/+page.svelte`

**Why this task:** Replace the always-on member-row form with the card grid. The existing custom-party builder is preserved verbatim, gated behind `{#if selectedCardId === 'custom'}`. A new `{#if selectedProfile}` block shows the historical-profile preview + date row.

- [ ] **Step 1: Add the state + imports at the top of `<script>`.**

```svelte
<script lang="ts">
  // ... existing imports ...
  import { LAUNCH_PROFILES, getBotProfile, type BotProfile } from '$lib/game/content/bot-profiles';
  import ProfileCard from '$lib/ui/ProfileCard.svelte';

  // ... existing state ...

  // #102 — cards-first state. 'custom' = build-your-own; any other string
  // = a BotProfile.id. Default to 'custom' to preserve the v1 landing
  // experience for first-time players unfamiliar with the historical names.
  let selectedCardId = $state<string>('custom');
  const playerProfiles: BotProfile[] = $derived(
    LAUNCH_PROFILES.filter((p) => p.playerEligible)
  );
  const selectedProfile: BotProfile | null = $derived(
    selectedCardId === 'custom' ? null : (LAUNCH_PROFILES.find((p) => p.id === selectedCardId) ?? null)
  );

  // When a historical card is picked, auto-fill the date row to that
  // profile's year (April 15 default). Stays editable.
  $effect(() => {
    if (selectedProfile) {
      year = selectedProfile.year;
      month = 4;
      day = 15;
    }
  });

  function selectCard(id: string) { selectedCardId = id; }
</script>
```

- [ ] **Step 2: Replace the form's body** with the card grid + conditional builder. Locate the existing `<div class="new-wrap">` content area (after the side rail) and replace the central column's existing member-row + presets layout with:

```svelte
<section class="panel cards-panel">
  <div class="panel-head">CHOOSE YOUR PARTY</div>
  <div class="card-grid">
    {#each playerProfiles as p}
      <ProfileCard profile={p} selected={selectedCardId === p.id} onselect={() => selectCard(p.id)} />
    {/each}
    <ProfileCard profile={null} selected={selectedCardId === 'custom'} onselect={() => selectCard('custom')} />
  </div>
</section>

{#if selectedProfile}
  <section class="panel preview-panel">
    <div class="panel-head">{selectedProfile.displayName.toUpperCase()}</div>
    <ul class="preview-roster">
      {#each selectedProfile.party as m}
        <li>
          <strong>{m.given}</strong> · {m.role === 'leader' ? selectedProfile.leaderProfession : m.role} · age {m.age} · {m.sex}
        </li>
      {/each}
    </ul>
    <p class="preview-trait">{selectedProfile.trait}</p>
    <p class="preview-source"><a href={selectedProfile.source} target="_blank" rel="noopener">historical source</a></p>
  </section>
{:else}
  <!-- existing custom-party builder -->
  <section class="panel builder-panel">
    <!-- ... existing member-row markup, unchanged ... -->
  </section>
{/if}

<!-- Departure date row stays visible in BOTH branches -->
<section class="panel date-panel">
  <div class="panel-head">DEPARTURE DATE</div>
  <!-- ... existing year/month/day NumberSteppers ... -->
</section>

<!-- Begin button — submits to either the default action OR loadProfile -->
<form method="POST" action={selectedProfile ? '?/loadProfile' : '?/default'} use:enhance>
  {#if selectedProfile}
    <input type="hidden" name="profileId" value={selectedProfile.id} />
  {:else}
    <!-- existing hidden inputs for custom party members -->
  {/if}
  <input type="hidden" name="year" value={year} />
  <input type="hidden" name="month" value={month} />
  <input type="hidden" name="day" value={day} />
  <button type="submit" class="begin-btn">Begin Journey</button>
</form>
```

The exact existing markup for the member row, the date NumberSteppers, and the submit form is preserved — only the gating and the form-action toggle are new. The old `presets` date row (`Classic Trail`/`Gold Rush`/`Peak Migration`) is removed: profile-driven year auto-fill replaces it.

- [ ] **Step 3: Add CSS for the new panels.** Append to the existing `<style>` block:

```css
.cards-panel .card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem;
}
@media (max-width: 884px) {
  .cards-panel .card-grid { grid-template-columns: 1fr 1fr; }
}
.preview-panel .preview-roster {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem 1rem;
}
.preview-panel .preview-roster li { font-size: 0.9em; }
.preview-trait { font-style: italic; margin: 0.5rem 0; color: #444; }
.preview-source { font-size: 0.8em; margin: 0; }
.preview-source a { color: #990000; }
.begin-btn {
  background: #990000; color: #eeedeb; border: none; padding: 0.6em 1.2em;
  border-radius: 4px; font-size: 1em; font-weight: 600; cursor: pointer;
}
.begin-btn:hover { background: #7a0000; }
```

- [ ] **Step 4: Type-check + run existing tests.**

Run: `npm run verify`
Expected: 0 errors; existing tests still pass.

- [ ] **Step 5: Commit.**

```bash
jj describe -m "feat(102): cards-first /new page with historical-profile picker

Replace the always-on member row with a card grid: 9 playerEligible
profiles + a 'Build custom party' card. Selecting a historical card
shows a read-only preview + source link; selecting custom expands the
existing builder. Departure date row auto-fills from the profile's
year but stays editable. Mobile (Z Fold 4 ~884px) collapses to 2 cols.

Submit branches to ?/loadProfile or the existing ?/default action."
```

---

## Task 5: loadProfile server action

**Files:**
- Modify: `src/routes/new/+page.server.ts`

**Why this task:** Mirror the existing default action — accept the form data, build a NewGameOptions, persist to the save slot, redirect to /play.

- [ ] **Step 1: Read the existing default action** so the new one mirrors its persistence + redirect plumbing.

Run: `Read src/routes/new/+page.server.ts`

- [ ] **Step 2: Write a failing integration test.**

Create `tests/new-page-premade-102.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getBotProfile, profileToNewGameOptions } from '../src/lib/game/content/bot-profiles';
import { createInitialState } from '../src/lib/game/engine';

describe('#102 premade-party end-to-end', () => {
  it('picking Donners → GameState with George + Tamzene + 5 children + Donner kit', () => {
    const profile = getBotProfile('donner-family');
    const opts = profileToNewGameOptions(profile, { year: 1846, month: 4, day: 14 }, 'donner-test');
    const state = createInitialState(opts);

    // Party preserved
    expect(state.party.map((m) => m.name)).toEqual(profile.party.map((m) => m.given));

    // Children flagged correctly
    const children = state.party.filter((m) => m.kind === 'child');
    expect(children.length).toBe(profile.party.filter((m) => m.role === 'child').length);

    // Kit reflects profile (not BASE_KIT) — pick one item the profile's kit
    // declares and verify it lands. If profile.kit is undefined this test
    // skips; #887 will populate them.
    if (profile.kit) {
      for (const [key, qty] of Object.entries(profile.kit)) {
        if (key === 'cash') continue;
        expect(state.inventory[key]).toBe(qty);
      }
    }
  });

  it('picking Sagers in a non-historical year still works', () => {
    const profile = getBotProfile('sager-family');
    const opts = profileToNewGameOptions(profile, { year: 1850, month: 5, day: 1 }, 'sager-1850');
    const state = createInitialState(opts);
    expect(state.date).toEqual({ year: 1850, month: 5, day: 1 });
    expect(state.party[0].name).toBe('Henry');
  });
});
```

- [ ] **Step 3: Verify test fails or passes.** If the existing converter already covers this, the test passes immediately — that's fine, it doubles as a regression gate for the action.

Run: `npx vitest run tests/new-page-premade-102.test.ts`
Expected: passes (converter shipped in Task 2).

- [ ] **Step 4: Add the loadProfile action.** In `src/routes/new/+page.server.ts`, add to the `actions` export:

```ts
import { LAUNCH_PROFILES, profileToNewGameOptions, getBotProfile } from '$lib/game/content/bot-profiles';

export const actions = {
  default: async ({ request, locals }) => {
    // ... existing custom-party submit, unchanged ...
  },

  loadProfile: async ({ request, locals }) => {
    const form = await request.formData();
    const profileId = String(form.get('profileId') ?? '');
    const year = Number(form.get('year') ?? 1848);
    const month = Number(form.get('month') ?? 4);
    const day = Number(form.get('day') ?? 15);

    // Validate. If the id isn't in LAUNCH_PROFILES or isn't playerEligible,
    // bounce with a fail() — the UI shouldn't allow this but defense in depth.
    const profile = LAUNCH_PROFILES.find((p) => p.id === profileId && p.playerEligible);
    if (!profile) {
      return fail(400, { error: `Unknown or NPC-only profile: ${profileId}` });
    }

    const seed = `${profileId}-${Date.now()}`;
    const opts = profileToNewGameOptions(profile, { year, month, day }, seed);
    const state = createInitialState(opts);

    // Persist + redirect — mirror whatever the default action does for
    // these two lines. (Existing default uses locals.savesRepo.save(slot, state)
    // then throw redirect(303, `/play?slot=${slot}`) per the patterns we've
    // already shipped.)
    const slot = `premade-${profileId}-${Date.now().toString(36)}`;
    await locals.savesRepo.save(slot, state);
    throw redirect(303, `/play?slot=${encodeURIComponent(slot)}`);
  }
};
```

(The exact persistence call signature must match the existing default action — read it in Step 1 and adapt verbatim. If the existing path uses a different repo method or different redirect URL, follow that.)

- [ ] **Step 5: Run full verify.**

Run: `npm run verify`
Expected: all green.

- [ ] **Step 6: Commit.**

```bash
jj describe -m "feat(102): loadProfile server action

Mirrors the default action's persistence + redirect, but takes a
profileId + date override and runs the result through
profileToNewGameOptions. Validates playerEligible defensively even
though the UI doesn't render NPC-only cards."
```

---

## Task 6: Manual UI verification (per memory feedback_verify_ui_myself)

**Files:** None modified — verification only.

**Why this task:** Per the standing rule, the controller verifies UI changes in a browser before claiming the feature is done. Type-check + tests pass ≠ rendered DOM correct.

- [ ] **Step 1: Start the dev server.**

```bash
npm run dev
# wait for "Local: http://localhost:5173"
```

- [ ] **Step 2: Open `/new` in Playwright + visual check.**

Use the `playwright` MCP tools (already configured at `/home/eric/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js`):
- Navigate to `http://localhost:5173/new`
- `browser_snapshot` to confirm the 9-card grid renders
- `browser_resize` to 884×1024 and snapshot again (Z Fold 4 mobile target)
- Click on the Donners card; confirm preview panel renders + date row pre-fills to 1846
- Click on the "Build custom party" card; confirm existing member-row UI shows
- Click on Hastings — confirm he does NOT appear in the grid (playerEligible:false)

- [ ] **Step 3: Submit each path once.**

- Pick Donners → click Begin Journey → confirm `/play?slot=premade-donner-family-...` loads with the Donners' party listed
- Go back, pick Custom → fill the form normally → confirm legacy path still works

- [ ] **Step 4: Report findings inline.** If any rendering issue, file as a sub-step and fix before moving on. If all good, advance.

- [ ] **Step 5: Stop the dev server.**

---

## Task 7: Cross-cutting full verify + PR

**Files:** None modified — gating step.

- [ ] **Step 1: Full `npm run verify` from clean.**

Run: `npm run verify`
Expected: svelte-check 0 errors; vitest all green; the four new test files (`bot-profile-schema-102`, `bot-profile-converter-102`, `new-page-premade-102`) all green.

- [ ] **Step 2: Push and open PR.**

```bash
jj bookmark set spec/102-premade-party -r @
jj git push --bookmark spec/102-premade-party
gh pr create --head spec/102-premade-party --base master \
  --title "feat(102): premade historical party choice on /new" \
  --body "$(cat <<'EOF'
## Summary

Closes VK #102.

Surfaces the 10 historical bot profiles (Sagers, Donners, Reeds, Joe
Meek, Whitman party, Tabitha Brown, Meekers, Bidwell, Joel Palmer) as
player choices on /new. Plus a "Build custom party" card that preserves
the existing flow. Lansford Hastings is gated (\`playerEligible: false\`)
until his kit lands in #887 — follow-up #1158 tracks that.

## What's in this PR

- \`BotProfile\` gains \`difficulty\` + \`playerEligible\`; all 10 profiles authored
- New \`profileToNewGameOptions\` converter in \`bot-profiles.ts\`
- New \`ProfileCard\` Svelte component (one card type, both modes)
- \`/new\` reorganized cards-first; existing custom builder gated behind \`{#if}\`
- New \`?/loadProfile\` server action
- Three new test files (\`bot-profile-schema-102\`, \`bot-profile-converter-102\`, \`new-page-premade-102\`)

## Cross-cutting concerns

- **NPC parity:** untouched. NPC wagons still pick from all 10 profiles via \`pickProfilesForRoster\` (the \`playerEligible\` filter is UI-only).
- **Game-AI:** untouched. Player premades use \`createInitialState\`; the company-decision layer never sees this code path.
- **Save migration:** none required. Premade picks produce a regular \`GameState\` indistinguishable from a custom-party save on disk.
- **Mobile:** 9-card grid collapses to 2 cols at 884px (Z Fold 4 target).

## Test plan

- [x] \`npm run verify\` green
- [x] Playwright pass on desktop + Z Fold 4 viewport
- [x] Donners pick → \`/play\` loads with George + Tamzene + 5 children
- [x] Custom pick → existing flow unbroken
- [x] Hastings NOT visible in card grid

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Watch CI, merge when green.**

Per the project's "PR not shipped until merged" rule, merge yourself once CI passes:

```bash
gh pr checks <PR>  # confirm pass
gh pr merge <PR> --merge --delete-branch --repo ericbond007/ot-revisited
```

- [ ] **Step 4: Close VK #102 + leave #1158 (Hastings activation) open in Backlog.**

```python
# Full-body POST per VK v2.3 quirk
VIKUNJA_TOKEN=... python3 -c "
import os, json, urllib.request
H = {'Authorization': f'Bearer {os.environ[\"VIKUNJA_TOKEN\"]}', 'Content-Type': 'application/json'}
def http(m, p, b=None):
    d = json.dumps(b).encode() if b else None
    return json.loads(urllib.request.urlopen(urllib.request.Request(f'https://projects.ericbond.net/api/v1{p}', data=d, headers=H, method=m)).read())
t = http('GET', '/tasks/102')
t['done'] = True
http('POST', '/tasks/102', t)
"
```

Confirm #1158 stays in Backlog (don't touch it — it's the placeholder for the post-#887 Hastings activation).
