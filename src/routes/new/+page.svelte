<script lang="ts">
  import { MALE_NAMES, FEMALE_NAMES } from '$lib/game/content/historical-names';

  let { data, form } = $props();

  type Member = { name: string; profession: string };
  let members = $state<Member[]>([
    { name: MALE_NAMES[0], profession: 'farmer' },
    { name: FEMALE_NAMES[0], profession: 'doctor' }
  ]);

  let year = $state(1848);
  let month = $state(4);
  let day = $state(15);

  function addMember() {
    if (members.length >= 6) return;
    const nextName = members.length % 2 === 0 ? MALE_NAMES[members.length] : FEMALE_NAMES[members.length];
    members.push({ name: nextName, profession: 'hunter' });
  }
  function removeMember(i: number) {
    if (members.length <= 2) return;
    members.splice(i, 1);
  }
</script>

<div class="container">
  <h1>Assemble your party</h1>
  <p style="color: var(--c-wood);">2 to 6 adults. Pick a profession for each — stacks matter.</p>

  {#if form?.error}
    <div class="panel" style="border-color: var(--c-rust); margin: 1em 0;">{form.error}</div>
  {/if}

  <form method="POST" action="?/depart">
    <div style="display: flex; flex-direction: column; gap: 0.8em; margin-bottom: 1.5em;">
      {#each members as m, i}
        <div class="panel" style="display: grid; grid-template-columns: 2fr 2fr auto; gap: 0.5em; align-items: center;">
          <input type="text" name="member_{i}_name" bind:value={m.name} placeholder="Name" />
          <select name="member_{i}_profession" bind:value={m.profession}>
            {#each data.professions as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
          {#if members.length > 2}
            <button type="button" onclick={() => removeMember(i)} style="padding: 0.3em 0.7em;">✕</button>
          {:else}
            <span style="color: var(--c-wood); font-size: 0.8em;">required</span>
          {/if}
        </div>
      {/each}
    </div>

    {#if members.length < 6}
      <button type="button" onclick={addMember} style="margin-bottom: 1.5em;">+ Add companion</button>
    {/if}

    <h2>When do we set out?</h2>
    <div style="display: flex; gap: 1em; margin-bottom: 2em;">
      <label>Year
        <input type="number" name="year" bind:value={year} min="1841" max="1869" />
      </label>
      <label>Month
        <select name="month" bind:value={month}>
          <option value={3}>March</option>
          <option value={4}>April</option>
          <option value={5}>May</option>
          <option value={6}>June</option>
        </select>
      </label>
      <label>Day
        <input type="number" name="day" bind:value={day} min="1" max="30" />
      </label>
    </div>

    <button type="submit" style="font-size: 1.1em; padding: 0.8em 1.5em;">Depart</button>
    <a href="/" style="margin-left: 1em;">Cancel</a>
  </form>

  <h3 style="margin-top: 2em;">Profession bonuses</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5em;">
    {#each data.professions as p}
      <div class="panel" style="font-size: 0.9em;">
        <strong style="color: var(--c-rust);">{p.name}</strong>{#if p.femaleOnly} <span style="color: var(--c-wood); font-size: 0.8em;">(female-only)</span>{/if}
        <div>{p.bonusSummary}</div>
      </div>
    {/each}
  </div>
</div>
