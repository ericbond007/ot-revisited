<script lang="ts">
  // Visual-diff harness for the top-bar stat readout cluster. The shape
  // already lives inline in /play (.date-readout), and the production
  // version uses StatPicker for pace/rations. This harness renders the
  // prototype's static markup so the visual rhythm (icon · LABEL · value)
  // can be diffed against docs/handoff/components/src/stat-readout.html
  // without spinning up a full game state.
  import { ICON, icon } from '$lib/data/icon-dictionary';
</script>

<svelte:head><title>StatReadout Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">StatReadout Showcase</h1>
  <p class="subtitle">
    The 4-stat top-bar cluster. Production lives inline in
    <code>/play</code>'s <code>.date-readout</code>; this harness mirrors
    <code>docs/handoff/components/src/stat-readout.html</code> for layout-only diffing.
  </p>

  <section class="card">
    <div class="readout">
      <span class="stat">
        <span class="stat-icon">{icon('stats', 'day')}</span>
        <span class="stat-label">DAY</span>
        <strong class="day-num">42</strong>
      </span>
      <span class="stat">
        <span class="stat-icon">{icon('stats', 'date')}</span>
        <span class="stat-label">DATE</span>
        <span>Jun 14, 1848</span>
      </span>
      <span class="stat">
        <span class="stat-icon">{ICON.stats.pace}</span>
        <span class="stat-label">PACE</span>
        <span class="val">Moderate ▾</span>
      </span>
      <span class="stat">
        <span class="stat-icon">{ICON.stats.rations}</span>
        <span class="stat-label">RATIONS</span>
        <span class="val">Normal ▾</span>
      </span>
    </div>
    <div class="caption">Top-of-screen readout · 4 stats stacked horizontally · click pace/rations to swap</div>
  </section>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--of-s-6) var(--of-s-4);
  }
  .brand-title {
    font-family: var(--of-display);
    font-size: 44px;
    color: var(--of-rust);
    letter-spacing: 0.10em;
    margin: 0 0 var(--of-s-2) 0;
  }
  .subtitle { color: var(--of-ink); font-family: var(--of-body); margin: 0 0 var(--of-s-4) 0; }
  code { background: var(--of-paper); padding: 0 .25em; border-radius: 2px; }

  .card {
    background: var(--of-paper-soft);
    border: 2px solid var(--of-ink-soft);
    border-radius: var(--of-r-sm);
    padding: 8px 12px;
  }

  .readout {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    color: var(--of-ink);
  }
  .stat {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    font-size: 14px;
  }
  .stat-icon { font-size: 1.1em; line-height: 1; }
  .stat-label {
    font-size: 10px;
    letter-spacing: 0.12em;
    color: var(--of-ink-soft);
    font-weight: 700;
    font-family: var(--of-mono);
  }
  .day-num, .val {
    color: var(--of-ink);
    font-weight: 700;
  }

  .caption {
    margin-top: 12px;
    font-size: 11px;
    color: var(--of-ink-soft);
    font-style: italic;
  }
</style>
