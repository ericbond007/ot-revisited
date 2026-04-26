<script lang="ts">
  import BrandLockup from '$lib/ui/BrandLockup.svelte';
  let { data } = $props();
  const hasSaves = $derived(data.saves.length > 0);
</script>

<div class="container landing">
  <h1 class="brand"><BrandLockup /></h1>
  <p class="subtitle">The OT: Oregon Trail Revisited</p>
  <p style="color: var(--c-wood); font-size: 1.1em; margin-bottom: 2em;">
    A single-player journey along the Oregon Trail, 1841–1869.
  </p>

  <div style="display: flex; flex-direction: column; gap: 1em; max-width: 400px;">
    <a href="/new">
      <button style="width: 100%; padding: 1em;">Start a New Journey</button>
    </a>
    <a href="/load" aria-disabled={!hasSaves}>
      <button style="width: 100%; padding: 1em;" disabled={!hasSaves}>
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
</style>
