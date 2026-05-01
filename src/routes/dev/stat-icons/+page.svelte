<script lang="ts">
  // Visual-diff harness for the stat-icon set. Renders every kind in
  // ICON.stats at 16/24/32 px on dark wood, plus a "in context"
  // sample showing how the icon sits beside typography in the top-bar
  // readout. Unported kinds render the "?" fallback.
  import StatIcon, { hasStatIcon } from '$lib/ui/stat-icons/StatIcon.svelte';
  import type { StatIconKind } from '$lib/ui/stat-icons/stat-icon-tokens';

  const KINDS: StatIconKind[] = [
    'day', 'date', 'pace', 'rations', 'morale',
    'health', 'cash', 'water', 'keg', 'leg', 'weather'
  ];

  // Sample top-bar readout values, one per kind, for context preview.
  const SAMPLES: Record<StatIconKind, string> = {
    day:     'DAY 47',
    date:    'JUL 14',
    pace:    'STEADY',
    rations: '142 LB',
    morale:  'HIGH',
    health:  '82',
    cash:    '$248',
    water:   'FULL',
    keg:     '18 / 30 GAL',
    leg:     'III',
    weather: 'CLEAR'
  };
</script>

<div class="page">
  <header class="head">
    <h1>Stat Icons — Specimen</h1>
    <p class="meta">
      {KINDS.filter((k) => hasStatIcon(k)).length} of {KINDS.length} ported.
      Remaining kinds render the "?" fallback until the bulk port lands.
    </p>
  </header>

  <section class="grid">
    {#each KINDS as k (k)}
      <article class="cell" class:unported={!hasStatIcon(k)}>
        <div class="row">
          <StatIcon kind={k} size={32} title={k} />
          <StatIcon kind={k} size={24} />
          <StatIcon kind={k} size={16} />
        </div>
        <div class="context">
          <StatIcon kind={k} size={16} />
          <span class="ctx-text">{SAMPLES[k]}</span>
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
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
  }
  .cell {
    background: #2a1a08;
    border: 1px solid #4a3320;
    border-radius: 4px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
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
  .context {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Special Elite', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    color: #f5e6c8;
    background: #1a0f08;
    padding: 4px 8px;
    border-radius: 2px;
  }
  .ctx-text {
    line-height: 1;
  }
  .kind {
    font-size: 10px;
    color: #6a4a1a;
    font-family: 'Special Elite', monospace;
  }
</style>
