<script lang="ts">
  // Visual-diff harness for StatBar primitive. Mirrors the 5 bars in
  // docs/handoff/components/src/stat-bars.html. Note these are *not* the
  // tick-marked HP bars from the party panel — those are a richer
  // variant that stays inline in PartyPanel.svelte.
  import StatBar from '$lib/ui/StatBar.svelte';
</script>

<svelte:head><title>StatBar Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">StatBar Showcase</h1>
  <p class="subtitle">
    Diff against <code>docs/handoff/components/src/stat-bars.html</code>.
    Threshold-colored: rust below 33%, warn below 66%, sage above.
  </p>

  <section class="card">
    <StatBar label="MORALE"    value={64}   max={100}                   />
    <StatBar label="FOOD DAYS" value={22}   max={30}   readout="22 days" />
    <StatBar label="WEIGHT"    value={2140} max={2500} readout="2,140 / 2,500" />
    <StatBar label="WARMTH"    value={42}   max={100}                   />
    <StatBar label="WAGON"     value={81}   max={100}                   />
  </section>

  <section class="card">
    <div class="eyebrow">Edge cases</div>
    <StatBar label="EMPTY"   value={0}   max={100} />
    <StatBar label="FULL"    value={100} max={100} />
    <StatBar label="OVER"    value={150} max={100} />
    <StatBar label="FORCED AMBER" value={88} max={100} color="c-warn" />
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
    padding: var(--of-s-3);
    margin-bottom: var(--of-s-3);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .eyebrow {
    color: var(--of-ink-soft);
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
</style>
