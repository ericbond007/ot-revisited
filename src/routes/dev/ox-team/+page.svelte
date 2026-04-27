<script lang="ts">
  // Visual-diff harness for the ox + mule team port (#158).
  //
  // Renders teams of 1 / 2 / 4 / 6 oxen plus a 4-mule team in
  // separate cards, each at the same sceneScale=4 the wagon uses.
  // A single rAF tick drives gaitPhase so all teams walk in step
  // (modulo the per-pair phase offset baked into OxTeam).
  //
  // The "stopped" toggle exercises gait="stopped" so we can verify
  // the at-rest pose: legs vertical, no body bob, no team rocking.
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
  let stopped = $state(false);
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
  const gait = $derived<'walking' | 'stopped'>(stopped ? 'stopped' : 'walking');
</script>

<svelte:head>
  <title>Ox Team Showcase — dev</title>
</svelte:head>

<div class="page">
  <header>
    <h1 class="brand-title">Ox Team Showcase</h1>
    <p class="subtitle">
      Pied working oxen + mule fallback. Profile view, sceneScale 4×.
      Pole tip lands at the right edge of each card; pairs lay out leftward.
    </p>
    <label class="toggle">
      <input type="checkbox" bind:checked={stopped} />
      <span>gait="stopped"</span>
    </label>
  </header>

  <section class="grid">
    {#each samples as s (s.label)}
      <div class="card">
        <div class="eyebrow">{s.label}</div>
        <div class="stage">
          <svg viewBox="0 -90 400 110" preserveAspectRatio="xMidYMax meet">
            <!-- ground line -->
            <line x1="0" y1="0" x2="400" y2="0" stroke="#5a3a1a" stroke-width="0.5" stroke-dasharray="1.4 1.6" opacity="0.6" />
            <!-- Pole tip lands at scene x=350. OxTeam draws pairs leftward
                 from there; whole team rocks together via teamBob. -->
            <g transform="translate(350 0) scale(4)">
              <OxTeam
                count={s.count}
                isMule={s.isMule}
                {gait}
                {gaitPhase}
              />
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
    margin: 0 0 var(--s-3) 0;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--s-2);
    color: var(--c-tan);
    font-family: var(--f-mono);
    font-size: var(--fs-sm);
    cursor: pointer;
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
