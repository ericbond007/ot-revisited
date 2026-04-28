<script lang="ts">
  // Visual-diff harness for the landmark-icon set. Shows every
  // LANDMARKS id at 24/32/48 px on dark wood, mirroring the
  // handoff bundle's Specimen Sheet layout. Unported ids render the
  // fallback "?" glyph — useful as a coverage map.
  import { LANDMARKS } from '$lib/game/content/landmarks';
  import LandmarkIcon, { hasLandmarkIcon } from '$lib/ui/landmark-icons/LandmarkIcon.svelte';
</script>

<div class="page">
  <header class="head">
    <h1>Landmark Icons — Specimen</h1>
    <p class="meta">
      {LANDMARKS.filter((l) => hasLandmarkIcon(l.id)).length} of {LANDMARKS.length} ported.
      Remaining ids render the "?" fallback until the bulk port lands.
    </p>
  </header>

  <section class="grid">
    {#each LANDMARKS as l (l.id)}
      <article class="cell" class:unported={!hasLandmarkIcon(l.id)}>
        <div class="row">
          <LandmarkIcon id={l.id} size={48} title={l.name} />
          <LandmarkIcon id={l.id} size={32} />
          <LandmarkIcon id={l.id} size={24} />
        </div>
        <div class="label">
          <span class="name">{l.name}</span>
          <span class="kind">{l.kind}</span>
        </div>
        <code class="id">{l.id}</code>
      </article>
    {/each}
  </section>
</div>

<style>
  .page {
    background: #1a0f08;
    color: #e8c89a;
    min-height: 100vh;
    padding: 24px;
    font-family: Georgia, serif;
  }
  .head h1 {
    margin: 0;
    font-size: 22px;
    letter-spacing: 0.06em;
    color: #f5e6c8;
  }
  .head .meta {
    margin: 4px 0 24px;
    font-size: 13px;
    color: #8a6a3a;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }
  .cell {
    background: #2a1a08;
    border: 1px solid #4a3320;
    border-radius: 4px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }
  .cell.unported {
    opacity: 0.5;
  }
  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    background: #f0deb6;
    padding: 8px 10px;
    border-radius: 3px;
  }
  .label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .name {
    font-size: 13px;
    color: #f5e6c8;
  }
  .kind {
    font-size: 10px;
    color: #8a6a3a;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .id {
    font-size: 10px;
    color: #6a4a1a;
    font-family: 'Special Elite', monospace;
  }
</style>
