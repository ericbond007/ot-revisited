<script lang="ts">
  import BrandLockup from '$lib/ui/BrandLockup.svelte';
  let { data } = $props();
  const hasSaves = $derived(data.saves.length > 0);
</script>

<div class="container landing">
  <h1 class="brand"><BrandLockup /></h1>
  <p class="subtitle">The OT: Oregon Trail Revisited</p>
  <p class="tagline">
    A single-player journey along the Oregon Trail, 1841–1869.
  </p>

  <div class="cta-stack">
    <a href="/new">
      <button class="cta">Start a New Journey</button>
    </a>
    <a href="/load" aria-disabled={!hasSaves}>
      <button class="cta btn-ghost" disabled={!hasSaves}>
        Load a Saved Game {hasSaves ? `(${data.saves.length})` : ''}
      </button>
    </a>
  </div>
</div>

<style>
  .landing {
    padding-top: 2em;
  }
  .brand {
    margin: 0 0 0.1em 0;
    color: var(--c-rust);
    height: 4.4em;
    line-height: 1;
  }
  .brand :global(.lockup) { height: 100%; }
  .subtitle {
    margin: 0 0 0.4em 0;
    color: var(--c-wood);
    font-size: 1.1em;
    font-style: italic;
    letter-spacing: 0.04em;
  }
  .tagline {
    color: var(--c-wood);
    font-size: 1.1em;
    margin: 0 0 var(--s-5) 0;
  }
  .cta-stack {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    max-width: 400px;
  }
  .cta {
    width: 100%;
    padding: 1em;
  }
</style>
