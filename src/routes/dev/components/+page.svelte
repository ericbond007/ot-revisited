<script lang="ts">
  // Index for the components-handoff visual diff harnesses. Each piece
  // gets its own subroute that mirrors the matching docs/handoff/components/
  // src/*.html prototype (state matrix, all variants visible at once) so
  // we can review without scrubbing through real game state.
</script>

<svelte:head><title>Components Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">Components Showcase</h1>
  <p class="subtitle">
    Visual diff harnesses for the design-handoff polish pass. Each entry
    mirrors its <code>docs/handoff/components/src/*.html</code> prototype.
  </p>

  <ul class="links">
    <li><a href="/dev/components/action-bar">action-bar</a> — 5 actions × 3 states</li>
    <li><a href="/dev/components/party-panel">party-panel</a> — 4 member states + sparkline + ribbon</li>
    <li><a href="/dev/components/event-modal">event-modal</a> — pill / title / body / choices</li>
    <li><a href="/dev/components/buttons">buttons</a> — primary / ghost / danger / disabled</li>
    <li><a href="/dev/components/stat-bars">stat-bars</a> — HP / morale / hunger w/ tick marks</li>
    <li><a href="/dev/components/stat-readout">stat-readout</a> — top-bar cluster</li>
  </ul>
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
  .subtitle {
    color: var(--of-ink);
    font-family: var(--of-body);
    margin: 0 0 var(--of-s-4) 0;
  }
  .links {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--of-s-2);
    color: var(--of-ink);
    font-family: var(--of-mono);
  }
  .links a { color: var(--of-rust); text-decoration: underline; }
  code { background: var(--of-paper); padding: 0 .25em; border-radius: 2px; }
</style>
