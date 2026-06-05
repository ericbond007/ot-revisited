<script lang="ts">
  // #1166 — New-journey wizard modal. Two steps:
  //   1. Cards: pick a historical party or "Build custom"
  //   2. Confirm: preview/builder + date row + Confirm button
  // Submits via standard form POST to ?/loadProfile (premade) or
  // ?/depart (custom). Closes on Esc / backdrop click / Cancel button.
  import { onMount } from 'svelte';
  import { LAUNCH_PROFILES, type BotProfile } from '$lib/game/content/bot-profiles';
  import ProfileCard from '$lib/ui/ProfileCard.svelte';
  import CustomPartyBuilder from '$lib/ui/CustomPartyBuilder.svelte';
  import NumberStepper from '$lib/ui/NumberStepper.svelte';

  interface Profession {
    id: string;
    name: string;
    bonusSummary: string;
    femaleOnly: boolean;
  }

  let {
    professions,
    formError = null,
    onclose
  }: {
    professions: Profession[];
    formError?: string | null;
    onclose: () => void;
  } = $props();

  type Step = 'cards' | 'confirm';
  let step = $state<Step>('cards');
  let selectedCardId = $state<string | null>(null);

  let year = $state(1848);
  let month = $state(4);
  let day = $state(15);

  const playerProfiles: BotProfile[] = $derived(LAUNCH_PROFILES.filter((p) => p.playerEligible));
  const selectedProfile: BotProfile | null = $derived(
    selectedCardId && selectedCardId !== 'custom'
      ? (LAUNCH_PROFILES.find((p) => p.id === selectedCardId) ?? null)
      : null
  );

  $effect(() => {
    if (selectedProfile) {
      year = selectedProfile.year;
      month = 4;
      day = 15;
    } else if (selectedCardId === 'custom') {
      year = 1848;
      month = 4;
      day = 15;
    }
  });

  function pickCard(id: string) {
    selectedCardId = id;
    step = 'confirm';
  }
  function back() {
    step = 'cards';
  }
  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose();
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  });
</script>

<div class="modal-backdrop" onclick={handleBackdrop} onkeydown={null} role="presentation">
  <div class="panel modal-body" role="dialog" aria-modal="true" aria-label="Start a new journey" tabindex="-1">
    <header class="modal-head">
      <div class="head-text">
        {#if step === 'cards'}
          <span class="head-tag">STEP 1 OF 2</span>
          <h2>Choose your party</h2>
        {:else if selectedProfile}
          <button type="button" class="back-link" onclick={back} aria-label="Back to party choice">← Back</button>
          <h2>{selectedProfile.displayName}</h2>
        {:else}
          <button type="button" class="back-link" onclick={back} aria-label="Back to party choice">← Back</button>
          <h2>Build a custom party</h2>
        {/if}
      </div>
      <button type="button" class="close-btn" onclick={onclose} aria-label="Close wizard">✕</button>
    </header>

    {#if formError}
      <div class="form-error">{formError}</div>
    {/if}

    {#if step === 'cards'}
      <div class="card-grid">
        {#each playerProfiles as p}
          <ProfileCard profile={p} selected={false} onselect={() => pickCard(p.id)} />
        {/each}
        <ProfileCard profile={null} selected={false} onselect={() => pickCard('custom')} />
      </div>
    {:else}
      <form method="POST" action={selectedProfile ? '?/loadProfile' : '?/depart'} class="confirm-form">
        <div class="scroll-area">
          {#if selectedProfile}
            <section class="preview-panel">
              <ul class="preview-roster">
                {#each selectedProfile.party as m}
                  <li>
                    <strong>{m.given}</strong> · {m.role === 'leader' ? selectedProfile.leaderProfession : m.role} · age {m.age} · {m.sex}
                  </li>
                {/each}
              </ul>
              <p class="preview-trait">{selectedProfile.trait}</p>
              <p class="preview-source">
                <a href={selectedProfile.source} target="_blank" rel="noopener">historical source</a>
              </p>
            </section>
          {:else}
            <CustomPartyBuilder {professions} />
          {/if}

          <h3 class="date-head">When do we set out?</h3>
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
        </div>

        <div class="action-bar">
          <button type="submit" class="confirm-btn">Confirm — depart</button>
          <button type="button" class="cancel-btn" onclick={onclose}>Cancel</button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1em;
    animation: backdrop-fade 0.2s ease-out;
  }
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .modal-body {
    max-width: 880px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    padding: 1.2em 1.4em;
    border-color: var(--of-rust);
    border-width: 3px;
    animation: card-slide 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  }
  @keyframes card-slide {
    from { transform: translateY(12px) scale(0.98); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1em;
    margin-bottom: 0.8em;
    padding-bottom: 0.6em;
    border-bottom: 1px solid rgba(138, 90, 42, 0.2);
  }
  .head-text {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
  }
  .head-tag {
    font-size: 0.7em;
    letter-spacing: 0.18em;
    color: var(--of-ink-soft);
    font-weight: 700;
  }
  .modal-head h2 {
    margin: 0;
    color: var(--of-rust);
    font-size: 1.3em;
    letter-spacing: 0.04em;
  }
  .back-link {
    align-self: flex-start;
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--of-ink-soft);
    font-size: 0.8em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    margin-bottom: 0.15em;
  }
  .back-link:hover { color: var(--of-rust); }
  .close-btn {
    background: transparent;
    border: 0;
    color: var(--of-ink-soft);
    font-size: 1.4em;
    padding: 0.1em 0.4em;
    cursor: pointer;
    line-height: 1;
  }
  .close-btn:hover { color: var(--of-rust); }
  .form-error {
    padding: 0.6em 0.9em;
    border: 2px solid var(--of-status-bad);
    color: var(--of-status-bad);
    font-weight: 700;
    margin-bottom: 0.8em;
    border-radius: 4px;
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.6rem;
    overflow-y: auto;
    padding-right: 0.3em;
    flex: 1;
    min-height: 0;
  }
  @media (max-width: 884px) {
    .card-grid { grid-template-columns: 1fr 1fr; }
    .modal-body { padding: 0.9em 1em; max-height: 95vh; }
  }
  .confirm-form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: 0.8em;
  }
  .scroll-area {
    flex: 1;
    overflow-y: auto;
    padding-right: 0.3em;
    min-height: 0;
  }
  .preview-panel {
    padding: 0.5em 0;
    margin-bottom: 0.8em;
  }
  .preview-roster {
    list-style: none;
    margin: 0 0 0.75rem;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem 1rem;
  }
  .preview-roster li { font-size: 0.9em; }
  .preview-trait { font-style: italic; margin: 0.5em 0; color: var(--of-ink-soft); }
  .preview-source { font-size: 0.8em; margin: 0; }
  .preview-source a { color: var(--of-rust); }
  .date-head {
    margin: 0.8em 0 0.4em;
    font-size: 1.05em;
    color: var(--of-rust);
    letter-spacing: 0.03em;
  }
  .date-pickers {
    display: flex;
    gap: 1.2em;
    align-items: flex-end;
    flex-wrap: wrap;
    margin-bottom: 0.6em;
  }
  .field { display: flex; flex-direction: column; gap: 0.3em; }
  .field-label {
    font-size: 0.8em;
    color: var(--of-ink-soft);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .date-pickers select {
    min-height: 2.4em;
    padding: 0.3em 2em 0.3em 0.7em;
    background-color: var(--of-paper-soft);
    color: var(--of-ink);
    border: 2px solid var(--of-ink);
    border-radius: 4px;
    font-family: var(--f-mono);
    font-size: 1em;
    font-weight: 700;
    letter-spacing: 0.03em;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M2 4.5l4 4 4-4' fill='none' stroke='%231a0f08' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>");
    background-repeat: no-repeat;
    background-position: right 0.55em center;
    background-size: 0.9em;
    transition: border-color 0.12s, box-shadow 0.12s;
  }
  .date-pickers select:hover { border-color: var(--of-rust); }
  .date-pickers select:focus {
    outline: none;
    border-color: var(--of-rust);
    box-shadow: 0 0 0 2px rgba(201, 106, 42, 0.25);
  }
  .action-bar {
    display: flex;
    gap: 0.8em;
    align-items: center;
    padding-top: 0.6em;
    border-top: 1px solid rgba(138, 90, 42, 0.2);
  }
  .confirm-btn {
    font-size: 1.05em;
    padding: 0.7em 1.4em;
  }
  .cancel-btn {
    background: transparent;
    border: 0;
    color: var(--of-ink-soft);
    text-decoration: underline;
    cursor: pointer;
  }
  .cancel-btn:hover { color: var(--of-rust); }
</style>
