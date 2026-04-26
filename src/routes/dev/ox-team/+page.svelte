<script lang="ts">
  // Visual-diff harness for the ox + mule team port.
  //
  // Renders teams of 1 / 2 / 4 / 6 oxen plus a 4-mule team in
  // separate cards, each at the same sceneScale=4 the wagon uses.
  // A single rAF tick drives gaitPhase so all teams walk in step
  // (modulo the per-pair phase offset baked into OxTeam).
  import { onMount } from 'svelte';
  import OxTeam from '$lib/ui/wagon/ox-team/OxTeam.svelte';

  // Team sample matrix (label, count, isMule).
  const samples: Array<{ label: string; count: number; isMule: boolean }> = [
    { label: '1 ox',  count: 1, isMule: false },
    { label: '2 oxen', count: 2, isMule: false },
    { label: '4 oxen', count: 4, isMule: false },
    { label: '6 oxen', count: 6, isMule: false },
    { label: '4 mules', count: 4, isMule: true }
  ];

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

  // 1.6 Hz stride per the wagon-scene README spec.
  const gaitPhase = $derived((t * 1.6) % 1);
</script>

<svelte:head>
  <title>Ox Team Showcase — dev</title>
</svelte:head>

<div class="page">
  <header>
    <h1 class="brand-title">Ox Team Showcase</h1>
    <p class="subtitle">Pied working oxen + mule variant. Profile view, sceneScale 4×, walk cycle off a single tick.</p>
  </header>

  <section class="grid">
    {#each samples as s (s.label)}
      <div class="card">
        <div class="eyebrow">{s.label}</div>
        <div class="stage">
          <svg viewBox="0 -90 400 110" preserveAspectRatio="xMidYMax meet">
            <!-- ground line -->
            <line x1="0" y1="0" x2="400" y2="0" stroke="#5a3a1a" stroke-width="0.5" stroke-dasharray="1.4 1.6" opacity="0.6" />
            <g transform="translate(50 0) scale(4)">
              <OxTeam
                count={s.count}
                isMule={s.isMule}
                {gaitPhase}
                anchorX={0}
                wagonHookX={s.count > 1 ? 26 + (Math.ceil(s.count / 2) - 1) * 22 : 16}
                y={0}
              />
              <!-- decorative wagon-tongue stub so the chain has somewhere to terminate -->
              <line x1={s.count > 1 ? 26 + (Math.ceil(s.count / 2) - 1) * 22 : 16} y1="-6"
                    x2={s.count > 1 ? 36 + (Math.ceil(s.count / 2) - 1) * 22 : 26} y2="-3"
                    stroke="#5a3a1a" stroke-width="1" stroke-linecap="round" />
            </g>
          </svg>
        </div>
      </div>
    {/each}
  </section>
</div>

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
    margin: 0;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--s-4);
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
  .stage {
    background: linear-gradient(180deg, #b3d4e8 0%, #d8e4ee 60%, #b8a05a 100%);
    border: var(--bw-1) solid var(--c-ink);
    border-radius: var(--r-xs);
    overflow: hidden;
    aspect-ratio: 400 / 110;
  }
  .stage svg { width: 100%; height: 100%; display: block; }
</style>
