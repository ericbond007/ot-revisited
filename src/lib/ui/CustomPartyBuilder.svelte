<script lang="ts">
  // #1166 — extracted from /new/+page.svelte. Custom-party form fragment
  // used inside NewJourneyWizard. Renders member rows + add-companion +
  // starter-kit toggle. Form field names match what +page.server.ts
  // `depart` action parses (member_0_name / _profession / _sex,
  // include_starter_kit).
  import { MALE_NAMES, FEMALE_NAMES } from '$lib/game/content/historical-names';
  import ProfessionPicker from '$lib/ui/ProfessionPicker.svelte';
  import { ICON } from '$lib/data/icon-dictionary';

  interface Profession {
    id: string;
    name: string;
    bonusSummary: string;
    femaleOnly: boolean;
  }

  let { professions }: { professions: Profession[] } = $props();

  type Member = { name: string; profession: string; sex: 'male' | 'female' };
  let members = $state<Member[]>([
    { name: MALE_NAMES[0], profession: 'farmer', sex: 'male' },
    { name: FEMALE_NAMES[0], profession: 'doctor', sex: 'female' }
  ]);

  function setSex(i: number, sex: 'male' | 'female') {
    const m = members[i];
    if (m.sex === sex) return;
    const currentInMale = MALE_NAMES.includes(m.name);
    const currentInFemale = FEMALE_NAMES.includes(m.name);
    if ((sex === 'male' && currentInFemale) || (sex === 'female' && currentInMale)) {
      const pool = sex === 'male' ? MALE_NAMES : FEMALE_NAMES;
      m.name = pool[i % pool.length];
    }
    m.sex = sex;
    const selected = professions.find((p) => p.id === m.profession);
    if (selected?.femaleOnly && sex === 'male') m.profession = 'farmer';
  }

  function rollName(i: number) {
    const m = members[i];
    const pool = m.sex === 'female' ? FEMALE_NAMES : MALE_NAMES;
    const candidates = pool.filter((n) => n !== m.name);
    m.name = candidates[Math.floor(Math.random() * candidates.length)];
  }

  function addMember() {
    if (members.length >= 6) return;
    const nextSex = members.length % 2 === 0 ? 'male' : 'female';
    const pool = nextSex === 'male' ? MALE_NAMES : FEMALE_NAMES;
    members.push({ name: pool[members.length], profession: 'hunter', sex: nextSex });
  }
  function removeMember(i: number) {
    if (members.length <= 2) return;
    if (i === 0) return;
    members.splice(i, 1);
  }
</script>

<div class="members">
  {#each members as m, i}
    <div class="panel member-card">
      <div class="member-head">
        <input type="text" name="member_{i}_name" bind:value={m.name} placeholder="Name" class="name-input" />
        <button type="button" class="name-dice" onclick={() => rollName(i)} title="Roll a random period name" aria-label="Roll a random name">🎲</button>
        <input type="hidden" name="member_{i}_sex" value={m.sex} />
        <div class="sex-toggle" role="radiogroup" aria-label="Sex">
          <button type="button" class="sex-btn" class:selected={m.sex === 'male'} onclick={() => setSex(i, 'male')} title="Male" aria-pressed={m.sex === 'male'}>♂</button>
          <button type="button" class="sex-btn" class:selected={m.sex === 'female'} onclick={() => setSex(i, 'female')} title="Female" aria-pressed={m.sex === 'female'}>♀</button>
        </div>
        {#if i === 0}
          <span class="required-tag" title="The party leader cannot be removed">{ICON.status.leader} LEADER</span>
        {:else}
          <button type="button" onclick={() => removeMember(i)} class="remove-btn" title="Remove companion">{ICON.status.close}</button>
        {/if}
      </div>
      <ProfessionPicker
        name="member_{i}_profession"
        bind:value={m.profession}
        professions={professions.filter((p) => !p.femaleOnly || m.sex === 'female')}
      />
    </div>
  {/each}
</div>

{#if members.length < 6}
  <button type="button" class="btn-ghost add-companion" onclick={addMember}>+ Add companion</button>
{/if}

<label class="kit-toggle">
  <input type="checkbox" name="include_starter_kit" checked />
  <span class="kit-toggle-text">
    <strong>Include starter kit</strong>
    <small>
      Food, medicine, rifle, tent, and clothing for the party.
      Uncheck to start with $250 extra cash and provision yourself at the outfitter.
    </small>
  </span>
</label>

<style>
  .members {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    margin-bottom: 1em;
  }
  .member-card {
    padding: 0.6em 0.8em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .member-head {
    display: flex;
    gap: 0.5em;
    align-items: center;
  }
  .name-input {
    flex: 1;
    font-weight: 700;
  }
  .remove-btn {
    padding: 0.3em 0.7em;
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
  }
  .name-dice {
    padding: 0.25em 0.5em;
    background: var(--c-bg-raised);
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    font-size: 1.1em;
    cursor: pointer;
    transition: background 0.1s, transform 0.1s;
    line-height: 1;
  }
  .name-dice:hover { background: var(--c-panel); transform: rotate(-15deg); }
  .name-dice:active { transform: rotate(15deg) scale(0.95); }
  .required-tag {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-rust);
    font-weight: 700;
    padding: 0.3em 0.6em;
  }
  .sex-toggle {
    display: inline-flex;
    border: 2px solid var(--c-wood);
    border-radius: 3px;
    overflow: hidden;
  }
  .sex-btn {
    padding: 0.25em 0.55em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: 0;
    font-size: 1.1em;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .sex-btn:hover:not(.selected) { background: var(--c-panel); }
  .sex-btn.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
  }
  .add-companion { margin-bottom: 0.8em; }
  .kit-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.6em;
    margin: 0.5em 0 0;
    padding: 0.7em 0.9em;
    border: 1px solid var(--c-wood-soft, rgba(120,80,40,0.25));
    border-radius: 4px;
    background: var(--c-paper, rgba(255,250,240,0.4));
    cursor: pointer;
  }
  .kit-toggle input[type="checkbox"] { margin-top: 0.2em; flex-shrink: 0; }
  .kit-toggle-text { display: flex; flex-direction: column; gap: 0.2em; }
  .kit-toggle-text small {
    color: var(--c-wood, #6a4a28);
    font-size: 0.85em;
    line-height: 1.3;
  }
</style>
