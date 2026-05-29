<script lang="ts">
  // Visual-diff harness for the terrain port. Renders the five biomes
  // side-by-side at full scene scale (1280×720), each with its sky
  // gradient + parallax bands + ground. A single rAF tick drives
  // scrollX so all five scroll in unison.
  import { onMount } from 'svelte';
  import type { Terrain } from '$lib/game/types';
  import SkyGradient from '$lib/ui/wagon/terrain/SkyGradient.svelte';
  import FarLayer from '$lib/ui/wagon/terrain/FarLayer.svelte';
  import MidLayer from '$lib/ui/wagon/terrain/MidLayer.svelte';
  import NearLayer from '$lib/ui/wagon/terrain/NearLayer.svelte';
  import GroundBand from '$lib/ui/wagon/terrain/GroundBand.svelte';
  import { SCENE_W, SCENE_H, HORIZON_Y, GROUND_Y, type TimeOfDay } from '$lib/ui/wagon/terrain';
  import SkyAccent, { type SkyAccentKind } from '$lib/ui/wagon/weather/SkyAccent.svelte';
  import CloudLayer from '$lib/ui/wagon/weather/CloudLayer.svelte';
  import PrecipOverlays from '$lib/ui/wagon/weather/PrecipOverlays.svelte';
  import StormVignette from '$lib/ui/wagon/weather/StormVignette.svelte';
  import LandmarkLayer from '$lib/ui/wagon/landmarks/LandmarkLayer.svelte';

  const terrains: Terrain[] = ['prairie', 'mountains', 'forest', 'desert', 'river'];
  const times: TimeOfDay[] = ['day', 'dusk', 'night'];
  const weathers: SkyAccentKind[] = ['sunny', 'partly', 'cloudy', 'rainy', 'snowy', 'night'];

  let t = $state(0);
  let timeOfDay = $state<TimeOfDay>('day');
  let weatherKind = $state<SkyAccentKind>('sunny');

  // Show lightning automatically when weather is rainy (storm).
  const showLightning = $derived(weatherKind === 'rainy');
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
    <div class="time-picker">
      <span class="eyebrow">Weather</span>
      {#each weathers as wk (wk)}
        <button class:active={weatherKind === wk} onclick={() => (weatherKind = wk)}>{wk}</button>
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
            <SkyAccent kind={weatherKind} x={SCENE_W * 0.85} y={SCENE_H * 0.15} {t} />
            <CloudLayer kind={weatherKind} {scrollX} w={SCENE_W} skyH={HORIZON_Y} />
            <FarLayer {terrain} {scrollX} horizonY={HORIZON_Y} />
            <LandmarkLayer {terrain} {scrollX} horizonY={HORIZON_Y} />
            <MidLayer {terrain} {scrollX} horizonY={HORIZON_Y} groundY={GROUND_Y} />
            <GroundBand {terrain} {scrollX} groundY={GROUND_Y} h={SCENE_H - GROUND_Y} w={SCENE_W}
                        idPrefix="dev-{terrain}" />
            <NearLayer {terrain} {scrollX} groundY={GROUND_Y} />
            <PrecipOverlays {t} w={SCENE_W} h={SCENE_H} groundY={GROUND_Y}
                            showRain={weatherKind === 'rainy'}
                            showSnow={weatherKind === 'snowy'}
                            {showLightning} />
            <StormVignette kind={weatherKind} w={SCENE_W} h={SCENE_H} />
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
    color: var(--of-rust);
    letter-spacing: var(--ls-medium);
    margin: 0 0 var(--s-2) 0;
  }
  .subtitle {
    color: var(--of-ink);
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
    background: var(--of-paper);
  }
  .time-picker button.active {
    background: var(--of-rust);
    color: var(--of-ink);
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
    background: var(--of-paper-soft);
    border: var(--bw-2) solid var(--of-ink-soft);
    border-radius: var(--r-sm);
    padding: var(--s-2);
  }
  .eyebrow {
    color: var(--of-ink-soft);
    font-size: var(--fs-xs);
    letter-spacing: var(--ls-loose);
    text-transform: uppercase;
    margin-bottom: var(--s-2);
  }
  .stage {
    aspect-ratio: 1280 / 720;
    border: var(--bw-1) solid var(--of-ink);
    border-radius: var(--r-xs);
    overflow: hidden;
    background: var(--of-paper);
  }
  .stage svg { width: 100%; height: 100%; display: block; }
</style>
