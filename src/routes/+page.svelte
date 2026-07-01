<script lang="ts">
  import { onMount } from 'svelte';
  import BrandLockup from '$lib/ui/BrandLockup.svelte';
  import NewJourneyWizard from '$lib/ui/NewJourneyWizard.svelte';
  import { page } from '$app/stores';
  let { data, form } = $props();
  const hasSaves = $derived(data.saves.length > 0);

  // #1166 — wizard open state. Auto-opens when:
  //   - user clicks the Start button (via openWizard())
  //   - URL has ?start=1 (deep-link / redirect from /new)
  //   - form action returned an error (so we re-show with the error message)
  let wizardOpen = $state(false);
  let formError = $state<string | null>(null);

  $effect(() => {
    if (form && 'error' in form && form.error) {
      formError = form.error as string;
      wizardOpen = true;
    }
  });

  onMount(() => {
    if (new URL(window.location.href).searchParams.get('start') === '1') {
      wizardOpen = true;
    }
  });

  function openWizard() {
    formError = null;
    wizardOpen = true;
  }
  function closeWizard() {
    wizardOpen = false;
    formError = null;
  }
</script>

<div class="container landing">
  <h1 class="brand"><BrandLockup /></h1>
  <p class="subtitle">The OT: Oregon Trail Revisited</p>
  <p class="tagline">
    A single-player journey along the Oregon Trail, 1841–1869.
  </p>

  <div class="cta-stack">
    <button type="button" class="cta" onclick={openWizard}>Start a New Journey</button>
    <a href="/load" aria-disabled={!hasSaves}>
      <button class="cta btn-ghost" disabled={!hasSaves}>
        Load a Saved Game {hasSaves ? `(${data.saves.length})` : ''}
      </button>
    </a>
  </div>
</div>

{#if wizardOpen}
  <NewJourneyWizard
    professions={data.professions}
    {formError}
    onclose={closeWizard}
  />
{/if}

<style>
  .landing { padding-top: 2em; }
  .brand {
    margin: 0 0 0.1em 0;
    color: var(--of-rust);
    height: 4.4em;
    line-height: 1;
  }
  .brand :global(.lockup) { height: 100%; }
  .subtitle {
    margin: 0 0 0.4em 0;
    color: var(--of-ink-soft);
    font-size: 1.1em;
    font-style: italic;
    letter-spacing: 0.04em;
  }
  .tagline {
    color: var(--of-ink-soft);
    font-size: 1.1em;
    margin: 0 0 var(--of-s-5) 0;
  }
  .cta-stack {
    display: flex;
    flex-direction: column;
    gap: var(--of-s-3);
    max-width: 400px;
  }
  .cta {
    width: 100%;
    padding: 1em;
  }
</style>
