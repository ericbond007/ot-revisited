<script lang="ts">
  // Visual-diff harness for the terrain port. Renders the five biomes
  // side-by-side at full scene scale (1280×720), each with its sky
  // gradient + parallax bands + ground. A single rAF tick drives
  // scrollX so all five scroll in unison.
  import { onMount } from 'svelte';
  import type { Terrain } from '$lib/game/types';
  import SkyGradient from '$lib/ui/wagon/terrain/SkyGradient.svelte';
  import ParallaxBands from '$lib/ui/wagon/terrain/ParallaxBands.svelte';
  import { SCENE_W, SCENE_H, HORIZON_Y, GROUND_Y, type TimeOfDay } from '$lib/ui/wagon/terrain';

  const terrains: Terrain[] = ['prairie', 'mountains', 'forest', 'desert', 'river'];
  const times: TimeOfDay[] = ['day', 'dusk', 'night'];

  let t = $state(0);
  let timeOfDay = $state<TimeOfDay>('day');
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

  // 60 px / sec scroll speed — fast enough that parallax is obvious
  // in a screenshot, slow enough not to be nauseating.
  const scrollX = $derived(t * 60);
</script>

<svelte:head>
  <title>Terrain Showcase — dev</title>
</svelte:head>

<div class="page">
  <header>
    <h1 class="brand-title">Terrain Showcase</h1>
    <p class="subtitle">Five biomes × three times of day. Far/mid/near parallax + ground band, no wagon.</p>
    <div class="time-picker">
      <span class="eyebrow">Time of day</span>
      {#each times as time (time)}
        <button class:active={timeOfDay === time} onclick={() => (timeOfDay = time)}>{time}</button>
      {/each}
    </div>
  </header>

  <section class="grid">
    {#each terrains as terrain (terrain)}
      <div class="cell">
        <div class="eyebrow">{terrain}</div>
        <div class="stage">
          <svg viewBox="0 0 {SCENE_W} {SCENE_H}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <SkyGradient id="sky-{terrain}" {terrain} {timeOfDay} />
            </defs>
            <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill={`url(#sky-${terrain})`} />
            <ParallaxBands {terrain} {scrollX}
                           horizonY={HORIZON_Y} groundY={GROUND_Y}
                           w={SCENE_W} h={SCENE_H}
                           idPrefix="dev-{terrain}" />
          </svg>
        </div>
      </div>
    {/each}
  </section>
</div>

<style>
  .page {
    max-width: 1400px;
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

  .time-picker {
    display: flex;
    gap: var(--s-2);
    align-items: center;
  }
  .time-picker .eyebrow { margin-right: var(--s-2); }
  .time-picker button {
    padding: 0.3em 0.8em;
    font-size: var(--fs-xs);
    background: var(--c-bg-raised);
  }
  .time-picker button.active {
    background: var(--c-rust);
    color: var(--c-tan-bright);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-4);
  }
  @media (max-width: 900px) {
    .grid { grid-template-columns: 1fr; }
  }

  .cell {
    background: var(--c-panel);
    border: var(--bw-2) solid var(--c-wood);
    border-radius: var(--r-sm);
    padding: var(--s-2);
  }
  .eyebrow {
    color: var(--c-wood);
    font-size: var(--fs-xs);
    letter-spacing: var(--ls-loose);
    text-transform: uppercase;
    margin-bottom: var(--s-2);
  }
  .stage {
    aspect-ratio: 1280 / 720;
    border: var(--bw-1) solid var(--c-ink);
    border-radius: var(--r-xs);
    overflow: hidden;
    background: var(--c-bg);
  }
  .stage svg { width: 100%; height: 100%; display: block; }
</style>
