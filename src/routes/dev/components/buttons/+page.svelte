<script lang="ts">
  // Visual-diff harness for the global button styles in theme.css.
  // Reference: docs/handoff/components/src/buttons.html (primary +
  // disabled rows; ghost/danger come from the README and are previewed
  // here even though the prototype HTML doesn't include them).
</script>

<svelte:head><title>Buttons Showcase — dev</title></svelte:head>

<div class="page">
  <h1 class="brand-title">Buttons Showcase</h1>
  <p class="subtitle">
    Diff against <code>docs/handoff/components/src/buttons.html</code>.
  </p>

  <section class="row">
    <div class="eyebrow">PRIMARY · default · hover · disabled</div>
    <button>Rest</button>
    <button class="hover-sim">Rest · Hover</button>
    <button disabled>Disabled</button>
  </section>

  <section class="row">
    <div class="eyebrow">GHOST · secondary CTA</div>
    <button class="btn-ghost">Cancel</button>
    <button class="btn-ghost" disabled>Disabled</button>
  </section>

  <section class="row">
    <div class="eyebrow">DANGER · irreversible</div>
    <button class="btn-danger">Delete Save</button>
    <button class="btn-danger" disabled>Disabled</button>
  </section>

  <section class="row stack">
    <div class="eyebrow">CHOICE CARD · primary border + secondary border</div>
    <button class="choice primary">
      <span class="ico">🛶</span><span class="label">Ford the river</span>
    </button>
    <button class="choice secondary" disabled>
      <span class="ico">💵</span>
      <span class="label">Hire ferry ($4)</span>
      <span class="reason">no cash</span>
    </button>
  </section>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--s-6) var(--s-4);
  }
  .brand-title {
    font-family: var(--f-display);
    font-size: var(--fs-3xl);
    color: var(--c-rust);
    letter-spacing: var(--ls-medium);
    margin: 0 0 var(--s-2) 0;
  }
  .subtitle { color: var(--c-tan); font-family: var(--f-body); margin: 0 0 var(--s-4) 0; }
  code { background: var(--c-bg-raised); padding: 0 .25em; border-radius: 2px; }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s-2);
    align-items: center;
    margin-bottom: var(--s-4);
  }
  .row.stack { flex-direction: column; align-items: stretch; max-width: 480px; }
  .eyebrow {
    color: var(--c-wood);
    font-size: var(--fs-xs);
    letter-spacing: var(--ls-loose);
    text-transform: uppercase;
    width: 100%;
  }
  .hover-sim { background: var(--c-rust); }

  /* Choice-card preview — mirrors EventModal's .choice-card without
     pulling in that component. */
  .choice {
    display: flex;
    align-items: center;
    gap: 0.8em;
    width: 100%;
    padding: 0.8em 1em;
    background: var(--c-bg-raised);
    color: var(--c-tan);
    border: var(--bw-2) solid var(--c-wood);
    border-radius: var(--r-sm);
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0.02em;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
  .choice.primary { border-color: var(--c-rust); }
  .choice.secondary { border-color: var(--c-wood); }
  .ico { font-size: 1.2em; }
  .choice:disabled .ico { filter: grayscale(1); }
  .label { flex: 1; }
  .reason { font-size: 0.78em; font-style: italic; color: var(--c-danger); font-weight: 400; }
</style>
