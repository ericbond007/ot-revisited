<script lang="ts">
  // Visual-diff harness for the profession-icon set. Renders every
  // profession at 24/32/48 px on dark wood, both bare and badged
  // (warm tone). Unported ids render the "?" fallback.
  import ProfessionIcon, { hasProfessionIcon } from '$lib/ui/profession-icons/ProfessionIcon.svelte';
  import type { ProfessionIconKind } from '$lib/ui/profession-icons/profession-icon-tokens';

  const KINDS: ProfessionIconKind[] = [
    'banker', 'farmer', 'carpenter', 'doctor', 'blacksmith',
    'hunter', 'teamster', 'merchant', 'whore', 'scout',
    'preacher', 'indian_trader', 'gunsmith'
  ];
</script>

<div class="page">
  <header class="head">
    <h1>Profession Icons — Specimen</h1>
    <p class="meta">
      {KINDS.filter((k) => hasProfessionIcon(k)).length} of {KINDS.length} ported.
      Each cell shows: bare (24/32/48 px) on top, badge=warm (24 px) below.
    </p>
  </header>

  <section class="grid">
    {#each KINDS as k (k)}
      <article class="cell" class:unported={!hasProfessionIcon(k)}>
        <div class="row">
          <ProfessionIcon id={k} size={48} title={k} />
          <ProfessionIcon id={k} size={32} />
          <ProfessionIcon id={k} size={24} />
        </div>
        <div class="badge-row">
          <ProfessionIcon id={k} size={32} badge="warm" />
          <ProfessionIcon id={k} size={24} badge="warm" />
        </div>
        <code class="kind">{k}</code>
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
    gap: 12px;
    align-items: center;
    background: #f0deb6;
    padding: 8px 10px;
    border-radius: 3px;
  }
  .badge-row {
    display: flex;
    gap: 8px;
    align-items: center;
    background: #1a0f08;
    padding: 4px 8px;
    border-radius: 2px;
  }
  .kind {
    font-size: 10px;
    color: #6a4a1a;
    font-family: 'Special Elite', monospace;
  }
</style>
