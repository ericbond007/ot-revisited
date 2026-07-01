<script lang="ts">
  // Visual-diff harness for the wagon SVG port — mirrors
  // docs/handoff/travel-scene/Wagon Showcase.html.
  //
  // Three stages (Light / Prairie / Heavy) plus a 5-step damage row
  // for the Prairie Schooner. One requestAnimationFrame tick drives
  // the wheel rotation and a small bounce. Pure dev tool — not
  // mounted from any production route.
  import { onMount } from 'svelte';
  import LightWagon from '$lib/ui/wagon/wagon-svg/LightWagon.svelte';
  import PrairieSchooner from '$lib/ui/wagon/wagon-svg/PrairieSchooner.svelte';
  import HeavyFreighter from '$lib/ui/wagon/wagon-svg/HeavyFreighter.svelte';

  // Shared animation tick — seconds since mount.
  let t = $state(0);
  onMount(() => {
    const t0 = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      t = (now - t0) / 1000;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  // Per-card animation rates (matches the showcase HTML).
  const angleAt = (rate: number) => (t * rate * 90) % 360;
  const bounceAt = (rate: number) => Math.sin(t * rate * Math.PI * 2.3) * 0.08;

  // Damage progression cells.
  const damageStates = [
    { h: 100, label: 'pristine' },
    { h: 75,  label: 'wear' },
    { h: 50,  label: 'patched' },
    { h: 25,  label: 'battered' },
    { h: 0,   label: 'ruined' }
  ];
</script>

<svelte:head>
  <title>Wagon Showcase — dev</title>
</svelte:head>

<div class="page">
  <header>
    <h1 class="brand-title">Wagon Showcase</h1>
    <p class="subtitle">Visual-diff harness for the three wagon SVG ports.</p>
  </header>

  <section class="cards">
    <div class="card">
      <div class="eyebrow">Light wagon</div>
      <h2 class="card-title">Express cart</h2>
      <p class="card-blurb">Short bed, low arched canvas, 4-spoke wheels.</p>
      <div class="stage">
        <svg viewBox="-22 -16 44 22" preserveAspectRatio="xMidYMax meet">
          <g opacity="0.42">
            <line x1="-21" y1="5.6" x2="21" y2="5.6" stroke="#5a3a1a" stroke-width="0.18" stroke-dasharray="0.9 0.7" />
            <line x1="-21" y1="5.9" x2="21" y2="5.9" stroke="#3a1a08" stroke-width="0.14" stroke-dasharray="0.6 1.1" />
          </g>
          <ellipse cx="0" cy="2.4" rx="14" ry="0.55" fill="#3a1a08" opacity="0.32" />
          <g transform={`translate(0 ${2 + bounceAt(1.6)}) scale(1)`}>
            <LightWagon angle={angleAt(1.6)} bounce={0} health={100}
                        addons={{ driver: true, kegs: 1, coop: 0 }} />
          </g>
        </svg>
      </div>
    </div>

    <div class="card">
      <div class="eyebrow">Prairie schooner</div>
      <h2 class="card-title">The classic</h2>
      <p class="card-blurb">Flared sideboards, big arched canvas, mismatched wheels.</p>
      <div class="stage">
        <svg viewBox="-34 -22 64 30" preserveAspectRatio="xMidYMax meet">
          <g opacity="0.42">
            <line x1="-33" y1="7.6" x2="29" y2="7.6" stroke="#5a3a1a" stroke-width="0.18" stroke-dasharray="0.9 0.7" />
            <line x1="-33" y1="7.9" x2="29" y2="7.9" stroke="#3a1a08" stroke-width="0.14" stroke-dasharray="0.6 1.1" />
          </g>
          <ellipse cx="0" cy="1.4" rx="20" ry="0.55" fill="#3a1a08" opacity="0.32" />
          <g transform={`translate(0 ${1 + bounceAt(1.4)}) scale(1)`}>
            <PrairieSchooner angle={angleAt(1.4)} bounce={0} health={100}
                             addons={{ driver: true, kegs: 2, coop: 1 }} />
          </g>
        </svg>
      </div>
    </div>

    <div class="card">
      <div class="eyebrow">Heavy freighter</div>
      <h2 class="card-title">Conestoga</h2>
      <p class="card-blurb">Swayback bed, tall canopy with slack, 6-ox team.</p>
      <div class="stage">
        <svg viewBox="-32 -22 64 28" preserveAspectRatio="xMidYMax meet">
          <g opacity="0.42">
            <line x1="-31" y1="5.6" x2="31" y2="5.6" stroke="#5a3a1a" stroke-width="0.18" stroke-dasharray="0.9 0.7" />
            <line x1="-31" y1="5.9" x2="31" y2="5.9" stroke="#3a1a08" stroke-width="0.14" stroke-dasharray="0.6 1.1" />
          </g>
          <ellipse cx="0" cy="2.4" rx="20" ry="0.55" fill="#3a1a08" opacity="0.32" />
          <g transform={`translate(0 ${2 + bounceAt(1.2)}) scale(1)`}>
            <HeavyFreighter angle={angleAt(1.2)} bounce={0} health={100}
                            addons={{ driver: true, kegs: 2, coop: 1 }} />
          </g>
        </svg>
      </div>
    </div>
  </section>

  <section class="damage">
    <h2>Damage progression</h2>
    <p class="card-blurb">healthToDamage thresholds — canvas patch &lt;80, tear &lt;60, big rip &lt;40, shredded &lt;20; dirt streaks &lt;70 &amp; &lt;30; rear wheel breaks &lt;25, front &lt;12.</p>
    <div class="damage-row">
      {#each damageStates as s (s.h)}
        <div class="damage-cell">
          <div class="stage small">
            <svg viewBox="-34 -22 64 30" preserveAspectRatio="xMidYMax meet">
              <ellipse cx="0" cy="1.4" rx="20" ry="0.55" fill="#3a1a08" opacity="0.32" />
              <g transform={`translate(0 ${1 + bounceAt(1.0)}) scale(1)`}>
                <PrairieSchooner angle={angleAt(1.0)} bounce={0} health={s.h}
                                 addons={{ driver: true, kegs: s.h > 30 ? 1 : 0, coop: s.h > 50 ? 1 : 0 }} />
              </g>
            </svg>
          </div>
          <div class="health-tag">
            <span class="health-num">{s.h}%</span>
            <span class="health-state s-{s.h}">{s.label}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--of-s-6) var(--of-s-4);
  }
  header { margin-bottom: var(--of-s-6); }
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
    margin: 0;
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--of-s-4);
    margin-bottom: var(--of-s-8);
  }
  @media (max-width: 900px) {
    .cards { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--of-paper-soft);
    border: 2px solid var(--of-ink-soft);
    border-radius: var(--of-r-sm);
    padding: var(--of-s-3);
  }
  .eyebrow {
    color: var(--of-ink-soft);
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: var(--of-s-1);
  }
  .card-title {
    font-family: var(--of-display);
    font-size: 22px;
    color: var(--of-ink);
    margin: 0 0 var(--of-s-2) 0;
  }
  .card-blurb {
    font-family: var(--of-body);
    color: var(--of-ink);
    font-size: 13px;
    line-height: 1.55;
    margin: 0 0 var(--of-s-3) 0;
  }

  .stage {
    background: linear-gradient(180deg, #6da7d4 0%, #b3d4e8 60%, #b8a05a 100%);
    border: 1px solid var(--of-ink);
    border-radius: var(--of-r-xs);
    overflow: hidden;
    aspect-ratio: 64 / 30;
  }
  .stage.small { aspect-ratio: 64 / 30; }
  .stage svg { width: 100%; height: 100%; display: block; }

  .damage h2 {
    font-family: var(--of-display);
    font-size: 30px;
    color: var(--of-ink);
    margin: 0 0 var(--of-s-2) 0;
  }
  .damage-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--of-s-3);
    margin-top: var(--of-s-3);
  }
  @media (max-width: 900px) {
    .damage-row { grid-template-columns: repeat(2, 1fr); }
  }
  .damage-cell {
    background: var(--of-paper-soft);
    border: 1px solid var(--of-rule);
    border-radius: var(--of-r-sm);
    padding: var(--of-s-2);
  }
  .health-tag {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: var(--of-s-2);
    font-family: var(--of-mono);
    font-size: 12px;
  }
  .health-num { color: var(--of-ink); font-weight: 700; }
  .health-state.s-100 { color: var(--of-good); }
  .health-state.s-75  { color: var(--of-good); }
  .health-state.s-50  { color: var(--of-warn); }
  .health-state.s-25  { color: var(--of-rust); }
  .health-state.s-0   { color: var(--of-bad); }
</style>
