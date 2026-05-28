<script lang="ts">
  // #ui-redesign PR0 — design-system specimen. Visual reference for the
  // 1840s-broadsheet paper palette established in the handoff. Diff target
  // for every surface-port PR. Source: docs/handoff/ui-redesign/Design System.html.
  const palette: Array<[string, string]> = [
    ['--of-paper', 'base rag-paper'],
    ['--of-paper-soft', 'card surface'],
    ['--of-paper-deep', 'section head'],
    ['--of-paper-edge', 'shadowed edge'],
    ['--of-ink', 'body text'],
    ['--of-ink-soft', 'secondary'],
    ['--of-ink-faded', 'tertiary'],
    ['--of-rust', 'primary action'],
    ['--of-rust-dark', 'pressed rust'],
    ['--of-good', 'good'],
    ['--of-warn', 'warn'],
    ['--of-bad', 'bad']
  ];
  const typeScale: Array<[string, string]> = [
    ['--of-fs-h1', 'Display H1 — Rye'],
    ['--of-fs-h2', 'Heading H2 — Rye'],
    ['--of-fs-h3', 'Heading H3 — Rye'],
    ['--of-fs-body', 'Body — IM Fell English'],
    ['--of-fs-sub', 'Sub — IM Fell English'],
    ['--of-fs-label', 'Label — IM Fell English SC'],
    ['--of-fs-eyebrow', 'Eyebrow — IM Fell English SC']
  ];
</script>

<div class="spec">
  <h1 class="brand">OT<span class="dot">.</span>IO Design System</h1>
  <p class="ds-eyebrow">Specimen · paper-broadsheet · PR0 foundation</p>

  <section class="panel">
    <h2>Palette</h2>
    <div class="swatches">
      {#each palette as [token, label]}
        <div class="swatch">
          <div class="chip" style="background: var({token})"></div>
          <code>{token}</code>
          <span class="ds-eyebrow">{label}</span>
        </div>
      {/each}
    </div>
  </section>

  <section class="panel">
    <h2>Typography</h2>
    {#each typeScale as [token, label]}
      <div style="font-size: var({token}); font-family: {label.includes('Rye') ? 'var(--of-display)' : label.includes('SC') ? 'var(--of-sc)' : 'var(--of-body)'};">
        {label}
      </div>
    {/each}
    <p style="font-family: var(--of-mono)">Special Elite numerals — 0123456789 · $1,240 · 142 LB</p>
  </section>

  <section class="panel">
    <h2>Controls</h2>
    <div class="row">
      <button>Default</button>
      <button class="btn-strong">Primary</button>
      <button class="btn-ghost">Ghost</button>
      <button class="btn-danger">Danger</button>
      <button disabled>Disabled</button>
    </div>
    <div class="row">
      <input placeholder="text input" />
      <select><option>select option</option></select>
    </div>
    <div class="row">
      <span class="ds-stepper"><button class="ds-stepper-btn">−</button><span class="ds-stepper-val">12</span><button class="ds-stepper-btn">+</button></span>
      <span class="ds-bulk-chip">×5</span>
    </div>
    <div class="ds-progress" style="max-width:320px"><div class="ds-progress-fill" style="width:62%"></div></div>
  </section>
</div>

<style>
  .spec { max-width: 900px; margin: 0 auto; padding: var(--of-s-8) var(--of-s-4); display: flex; flex-direction: column; gap: var(--of-s-6); }
  .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--of-s-3); }
  .swatch { display: flex; flex-direction: column; gap: 2px; }
  .chip { height: 44px; border-radius: var(--of-r-sm); border: 1px solid var(--of-ink-soft); }
  .swatch code { font-family: var(--of-mono); font-size: var(--of-fs-chip); }
  .row { display: flex; gap: var(--of-s-3); align-items: center; flex-wrap: wrap; margin-bottom: var(--of-s-3); }
</style>
