<script lang="ts">
  import { MALE_NAMES, FEMALE_NAMES } from '$lib/game/content/historical-names';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';

  let { data, form } = $props();

  type Member = { name: string; profession: string };
  let members = $state<Member[]>([
    { name: MALE_NAMES[0], profession: 'farmer' },
    { name: FEMALE_NAMES[0], profession: 'doctor' }
  ]);

  let year = $state(1848);
  let month = $state(4);
  let day = $state(15);

  // Three historically-common Oregon Trail departures. Each was a peak-travel
  // moment with distinct flavor; Plan 3b's year-gated events key off these years.
  const presets = [
    {
      label: 'The Classic Trail',
      year: 1848, month: 4, day: 15,
      tagline: 'April 15, 1848 — pre-Gold Rush, grass is up, trail not yet crowded.'
    },
    {
      label: 'Gold Rush Spring',
      year: 1849, month: 4, day: 20,
      tagline: 'April 20, 1849 — wagons thick with forty-niners; trail chaos, high prices.'
    },
    {
      label: 'Peak Migration',
      year: 1852, month: 5, day: 1,
      tagline: 'May 1, 1852 — the heaviest travel year. Cholera stalks the wagons.'
    }
  ];

  function applyPreset(p: typeof presets[number]) {
    year = p.year;
    month = p.month;
    day = p.day;
  }

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

    <div class="presets">
      {#each presets as p}
        {@const selected = year === p.year && month === p.month && day === p.day}
        <button
          type="button"
          class="preset"
          class:selected
          onclick={() => applyPreset(p)}
        >
          <div class="preset-label">{p.label}</div>
          <div class="preset-tagline">{p.tagline}</div>
        </button>
      {/each}
    </div>

    <div class="date-pickers">
      <div class="field">
        <span class="field-label">Year</span>
        <NumberStepper name="year" bind:value={year} min={1841} max={1869} ariaLabel="Year" />
      </div>
      <div class="field">
        <span class="field-label">Month</span>
        <select name="month" bind:value={month}>
          <option value={3}>March</option>
          <option value={4}>April</option>
          <option value={5}>May</option>
          <option value={6}>June</option>
        </select>
      </div>
      <div class="field">
        <span class="field-label">Day</span>
        <NumberStepper name="day" bind:value={day} min={1} max={30} ariaLabel="Day" />
      </div>
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

<style>
  .presets {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6em;
    margin-bottom: 1.2em;
  }
  @media (max-width: 700px) {
    .presets { grid-template-columns: 1fr; }
  }

  .preset {
    /* Override default button chrome for these larger cards */
    text-align: left;
    text-transform: none;
    letter-spacing: 0;
    font-weight: normal;
    padding: 0.8em 1em;
    background: var(--c-panel);
    color: var(--c-tan);
    border: 2px solid var(--c-wood);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .preset:hover {
    border-color: var(--c-rust);
    background: var(--c-bg-raised);
  }
  .preset.selected {
    border-color: var(--c-rust);
    background: var(--c-rust-dark);
    color: var(--c-tan-bright);
  }
  .preset-label {
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--c-rust);
    margin-bottom: 0.3em;
  }
  .preset.selected .preset-label {
    color: var(--c-tan-bright);
  }
  .preset-tagline {
    font-size: 0.85em;
    line-height: 1.4;
    color: var(--c-wood);
  }
  .preset.selected .preset-tagline {
    color: var(--c-tan);
  }

  .date-pickers {
    display: flex;
    gap: 1.2em;
    margin-bottom: 2em;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }
  .field-label {
    font-size: 0.8em;
    color: var(--c-wood);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .date-pickers select {
    min-height: 2.4em;
    padding: 0 0.6em;
  }
</style>
