<script lang="ts">
  // Visual-diff harness for the trail-map port.
  //
  // Renders TrailMapSnippet at the snippet's reference mileage
  // (currentMileage = 580 — the Ft. Kearny → Ft. Laramie leg from
  // docs/handoff/trail-map/src/trail-snippet.html). A button below
  // opens the modal so we can diff the modal state too.
  import TrailMapSnippet from '$lib/ui/trail-map/TrailMapSnippet.svelte';
  import TrailMapModal from '$lib/ui/trail-map/TrailMapModal.svelte';

  let modalOpen = $state(true);
  let mileage = $state(580);
</script>

<svelte:head>
  <title>Trail Map Showcase — dev</title>
</svelte:head>

<div class="page">
  <header>
    <h1 class="brand-title">Trail Map Showcase</h1>
    <p class="subtitle">
      Snippet (parchment strip) and full modal. Reference mileage = 580 mi
      (snippet HTML's Ft. Kearny → Ft. Laramie leg).
    </p>
    <div class="row">
      <label>
        Mileage
        <input type="range" min="0" max="2000" step="20" bind:value={mileage} />
        <span>{mileage}</span>
      </label>
      <button onclick={() => (modalOpen = true)}>Open modal</button>
    </div>
  </header>

  <section class="card">
    <div class="eyebrow">Snippet · 350-mi window</div>
    <TrailMapSnippet
      currentMileage={mileage}
      onExpand={() => (modalOpen = true)} />
  </section>
</div>

{#if modalOpen}
  <TrailMapModal currentMileage={mileage} onClose={() => (modalOpen = false)} />
{/if}

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--s-6) var(--s-4);
  }
  header { margin-bottom: var(--s-6); }
  .brand-title {
    font-family: var(--f-display);
    font-size: var(--fs-3xl);
    color: var(--c-rust);
    letter-spacing: var(--ls-medium);
    margin: 0 0 var(--s-2) 0;
  }
  .subtitle {
    color: var(--c-tan);
    font-family: var(--f-body);
    margin: 0 0 var(--s-3) 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--s-4);
  }
  .row label {
    display: flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--c-tan);
    font-family: var(--f-mono);
    font-size: var(--fs-sm);
  }
  .card {
    background: var(--c-panel);
    border: var(--bw-2) solid var(--c-wood);
    border-radius: var(--r-sm);
    padding: var(--s-3);
  }
  .eyebrow {
    color: var(--c-wood);
    font-size: var(--fs-xs);
    letter-spacing: var(--ls-loose);
    text-transform: uppercase;
    margin-bottom: var(--s-2);
  }
</style>
