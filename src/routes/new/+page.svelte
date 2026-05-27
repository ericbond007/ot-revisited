<script lang="ts">
  import { MALE_NAMES, FEMALE_NAMES } from '$lib/game/content/historical-names';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';
  import ProfessionPicker from '$lib/ui/ProfessionPicker.svelte';
  import { ICON } from '$lib/data/icon-dictionary';
  import { LAUNCH_PROFILES, type BotProfile } from '$lib/game/content/bot-profiles';
  import ProfileCard from '$lib/ui/ProfileCard.svelte';

  let { data, form } = $props();

  type Member = { name: string; profession: string; sex: 'male' | 'female' };
  let members = $state<Member[]>([
    { name: MALE_NAMES[0],   profession: 'farmer', sex: 'male' },
    { name: FEMALE_NAMES[0], profession: 'doctor', sex: 'female' }
  ]);

  // When the player flips sex, swap to a matching historical name if the
  // current one belongs to the opposite list (so they don't end up with a
  // Sarah who's male unless they typed that deliberately).
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
    // Clear profession if it was female-only and we're flipping to male.
    const selected = data.professions.find((p) => p.id === m.profession);
    if (selected?.femaleOnly && sex === 'male') m.profession = 'farmer';
  }

  let year = $state(1848);
  let month = $state(4);
  let day = $state(15);

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

  // #1137 — roll a random period name that ISN'T the current one. Sex-aware:
  // pulls from the gender's pool. Clicking the dice never returns the same
  // name twice in a row (avoids the "did anything happen?" UX dud).
  function rollName(i: number) {
    const m = members[i];
    const pool = m.sex === 'female' ? FEMALE_NAMES : MALE_NAMES;
    const candidates = pool.filter((n) => n !== m.name);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    m.name = pick;
  }

  function addMember() {
    if (members.length >= 6) return;
    const nextSex = members.length % 2 === 0 ? 'male' : 'female';
    const pool = nextSex === 'male' ? MALE_NAMES : FEMALE_NAMES;
    members.push({ name: pool[members.length], profession: 'hunter', sex: nextSex });
  }
  function removeMember(i: number) {
    if (members.length <= 2) return;
    if (i === 0) return; // leader can't be removed
    members.splice(i, 1);
  }
</script>

<div class="new-wrap">

  <!-- Left rail: profession quick reference + tips -->
  <aside class="side-rail">
    <section class="panel tips-panel">
      <div class="panel-head">TIPS</div>
      <ul class="tips">
        <li><strong>Stacks matter.</strong> Multiple doctors don't stack — pick diverse professions.</li>
        <li><strong>Hunter + Gunsmith</strong> → +40% meat per hunt.</li>
        <li><strong>Merchant + Banker</strong> → −25% buy / +30% sell at posts.</li>
        <li><strong>Doctor</strong> is near-mandatory for 1848–52 starts (cholera years).</li>
        <li><strong>Departure date:</strong> too early = no grass for the oxen; too late = Rockies in winter.</li>
      </ul>
    </section>

    <section class="panel prof-ref">
      <div class="panel-head">PROFESSION BONUSES</div>
      <div class="prof-list">
        {#each data.professions as p}
          <div class="prof-row">
            <strong class="prof-name">
              {p.name}
              {#if p.femaleOnly}<span class="fem-tag">♀</span>{/if}
            </strong>
            <p class="prof-bonus">{p.bonusSummary}</p>
          </div>
        {/each}
      </div>
    </section>
  </aside>

  <!-- Main column -->
  <div class="main-col">

  <header class="page-head panel">
    <h1>Assemble your party</h1>
    <p class="lede">2 to 6 adults. Pick a profession for each — stacks matter.</p>
  </header>

  {#if form?.error}
    <div class="panel form-error">{form.error}</div>
  {/if}

  <section class="panel cards-panel">
    <div class="panel-head">CHOOSE YOUR PARTY</div>
    <div class="card-grid">
      {#each playerProfiles as p}
        <ProfileCard profile={p} selected={selectedCardId === p.id} onselect={() => selectCard(p.id)} />
      {/each}
      <ProfileCard profile={null} selected={selectedCardId === 'custom'} onselect={() => selectCard('custom')} />
    </div>
  </section>

  <form
    method="POST"
    action={selectedProfile ? '?/loadProfile' : '?/depart'}
    class="new-form"
  >
    <div class="scroll-area">

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
      <div style="display: flex; flex-direction: column; gap: 0.8em; margin-bottom: 1.5em;">
        {#each members as m, i}
          <div class="panel member-card">
            <div class="member-head">
              <input type="text" name="member_{i}_name" bind:value={m.name} placeholder="Name" class="name-input" />
              <button
                type="button"
                class="name-dice"
                onclick={() => rollName(i)}
                title="Roll a random period name"
                aria-label="Roll a random name"
              >🎲</button>
              <input type="hidden" name="member_{i}_sex" value={m.sex} />
              <div class="sex-toggle" role="radiogroup" aria-label="Sex">
                <button
                  type="button"
                  class="sex-btn"
                  class:selected={m.sex === 'male'}
                  onclick={() => setSex(i, 'male')}
                  title="Male"
                  aria-pressed={m.sex === 'male'}
                >♂</button>
                <button
                  type="button"
                  class="sex-btn"
                  class:selected={m.sex === 'female'}
                  onclick={() => setSex(i, 'female')}
                  title="Female"
                  aria-pressed={m.sex === 'female'}
                >♀</button>
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
              professions={data.professions.filter((p) => !p.femaleOnly || m.sex === 'female')}
            />
          </div>
        {/each}
      </div>

      {#if members.length < 6}
        <button type="button" class="btn-ghost add-companion" onclick={addMember}>+ Add companion</button>
      {/if}

      <!-- #888b — starter-kit toggle. Default ON. Veterans who want to
           provision themselves at the outfitter uncheck and get +$250
           cash refund. -->
      <label class="kit-toggle">
        <input type="checkbox" name="include_starter_kit" checked />
        <span class="kit-toggle-text">
          <strong>Include starter kit</strong>
          <small>
            Food, medicine, rifle, tent, and clothing for the party.
            Uncheck to start with $250 extra cash and provision yourself
            at the outfitter.
          </small>
        </span>
      </label>
    {/if}

    <!-- Departure date row stays visible in BOTH branches -->
    <h2>When do we set out?</h2>

    <div class="date-pickers">
      <div class="field">
        <span class="field-label">Year</span>
        <NumberStepper name="year" bind:value={year} min={1836} max={1869} ariaLabel="Year" />
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

    {#if selectedProfile}
      <input type="hidden" name="profileId" value={selectedProfile.id} />
    {/if}

    </div><!-- /.scroll-area -->

    <div class="action-bar panel">
      <button type="submit" class="depart-btn">Depart</button>
      <a href="/" class="cancel">Cancel</a>
    </div>
  </form>

  </div><!-- /.main-col -->
</div>

<style>
  .add-companion { margin-bottom: 1.5em; }
  /* #888b — starter-kit toggle. Compact period-styled checkbox row. */
  .kit-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.6em;
    margin: 1em 0 0.5em;
    padding: 0.7em 0.9em;
    border: 1px solid var(--c-wood-soft, rgba(120,80,40,0.25));
    border-radius: 4px;
    background: var(--c-paper, rgba(255,250,240,0.4));
    cursor: pointer;
  }
  .kit-toggle input[type="checkbox"] {
    margin-top: 0.2em;
    flex-shrink: 0;
  }
  .kit-toggle-text {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }
  .kit-toggle-text small {
    color: var(--c-wood, #6a4a28);
    font-size: 0.85em;
    line-height: 1.3;
  }
  /* Full-viewport layout with a tips + profession-ref sidebar. Matches the
     outfit screen's grid. Falls back to stacked flow below 900px. */
  .new-wrap {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 0.6em;
    height: 100vh;
    padding: 0.6em;
    overflow: hidden;
  }

  .side-rail {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.2em;
  }
  .tips-panel, .prof-ref { padding: 0.7em 0.9em; }
  .panel-head {
    font-size: 0.7em;
    letter-spacing: 0.15em;
    color: var(--c-wood);
    font-weight: 700;
    margin-bottom: 0.4em;
  }
  .tips {
    list-style: disc;
    padding-left: 1.1em;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    font-size: 0.85em;
    color: var(--c-tan);
    line-height: 1.4;
  }
  .tips strong { color: var(--c-rust); }

  .prof-list {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }
  .prof-row {
    padding: 0.3em 0 0.3em 0;
    border-bottom: 1px dashed rgba(138, 90, 42, 0.18);
  }
  .prof-row:last-child { border-bottom: 0; }
  .prof-name {
    color: var(--c-rust);
    font-size: 0.88em;
    letter-spacing: 0.02em;
  }
  .fem-tag {
    color: var(--c-rust);
    font-size: 0.9em;
    margin-left: 0.2em;
  }
  .prof-bonus {
    margin: 0.15em 0 0 0;
    font-size: 0.78em;
    color: var(--c-tan);
    line-height: 1.35;
  }

  .main-col {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    min-height: 0;
  }
  .page-head {
    padding: 0.6em 0.9em;
    display: flex;
    align-items: baseline;
    gap: 0.9em;
    flex-wrap: wrap;
  }
  .page-head h1 {
    margin: 0;
    color: var(--c-rust);
    font-size: 1.3em;
    letter-spacing: 0.05em;
  }
  .lede {
    margin: 0;
    color: var(--c-wood);
    font-size: 0.88em;
    font-style: italic;
  }
  .form-error {
    padding: 0.7em 0.9em;
    border-color: #e85a4a;
    color: #e85a4a;
    font-weight: 700;
  }

  .cards-panel {
    padding: 0.7em 0.9em;
  }
  .cards-panel .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.6rem;
  }
  @media (max-width: 884px) {
    .cards-panel .card-grid { grid-template-columns: 1fr 1fr; }
  }

  .new-form {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    flex: 1;
    min-height: 0;
  }
  .scroll-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.3em;
  }
  .action-bar {
    display: flex;
    gap: 0.8em;
    align-items: center;
    padding: 0.7em 0.9em;
    border-color: var(--c-rust);
  }
  .depart-btn {
    font-size: 1.05em;
    padding: 0.7em 1.4em;
  }
  .cancel {
    color: var(--c-wood);
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .new-wrap {
      grid-template-columns: 1fr;
      height: auto;
      overflow: visible;
      padding: 1em;
    }
    .side-rail, .scroll-area { overflow-y: visible; }
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
  /* Themed native select — matches NumberStepper's visual weight. */
  .date-pickers select {
    min-height: 2.4em;
    padding: 0.3em 2em 0.3em 0.7em;
    background-color: var(--c-parchment);
    color: var(--c-ink);
    border: 2px solid var(--c-ink);
    border-radius: 4px;
    font-family: var(--f-mono);
    font-size: 1em;
    font-weight: 700;
    letter-spacing: 0.03em;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    /* Custom chevron so the native OS arrow doesn't leak through */
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4.5l4 4 4-4' fill='none' stroke='%231a0f08' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 0.55em center;
    background-size: 0.9em;
    transition: border-color 0.12s, box-shadow 0.12s;
  }
  .date-pickers select:hover {
    border-color: var(--c-rust);
  }
  .date-pickers select:focus {
    outline: none;
    border-color: var(--c-rust);
    box-shadow: 0 0 0 2px rgba(201, 106, 42, 0.25);
  }
  .date-pickers select option {
    background: var(--c-parchment);
    color: var(--c-ink);
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
  /* #1137 — Roll-a-name dice. Visual sibling of .sex-btn but standalone. */
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
  .name-dice:hover {
    background: var(--c-panel);
    transform: rotate(-15deg);
  }
  .name-dice:active {
    transform: rotate(15deg) scale(0.95);
  }
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
  .sex-btn:hover:not(.selected) {
    background: var(--c-panel);
  }
  .sex-btn.selected {
    background: var(--c-rust);
    color: var(--c-tan-bright);
  }

  .preview-panel {
    padding: 0.7em 0.9em;
    margin-bottom: 0.5em;
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
</style>
