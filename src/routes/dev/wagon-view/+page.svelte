<script lang="ts">
  // Standalone preview for the wagon travel view. Pick terrain / weather /
  // time-of-day / wagon model / ox count / pause and see WagonScene render
  // immediately with no save-game machinery in the way. Default is the
  // single-painting backdrop; `?svg=1` falls back to legacy SVG layers.
  import { page } from '$app/state';
  import { createInitialState } from '$lib/game/engine';
  import WagonScene from '$lib/ui/wagon/WagonScene.svelte';
  import type { Terrain, Weather } from '$lib/game/types';
  import type { WagonModelId } from '$lib/game/content/wagons';
  import type { TimeOfDay } from '$lib/ui/wagon/terrain';

  const TERRAINS: Terrain[] = ['prairie', 'forest', 'desert', 'mountains', 'river'];
  const WEATHERS: Weather[] = [
    'clear', 'overcast', 'rain', 'storm', 'snow', 'heat', 'fog', 'frost'
  ];
  const TIMES: TimeOfDay[] = ['day', 'dusk', 'night'];
  const WAGONS: WagonModelId[] = ['light', 'prairie_schooner', 'heavy'];

  let terrain = $state<Terrain>('prairie');
  let weather = $state<Weather>('clear');
  let timeOfDay = $state<TimeOfDay>('day');
  let wagonModel = $state<WagonModelId>('prairie_schooner');
  let oxCount = $state(4);
  let isMule = $state(false);
  let paused = $state(false);
  let variant = $state(0);

  const VARIANTS = [0, 1, 2, 3, 4];

  // Bumping `restartKey` remounts WagonScene with a fresh t=0 — the
  // rAF tick in the scene tracks scroll position internally, so this
  // is the cleanest way to rewind the parallax and gait cycle.
  let restartKey = $state(0);
  function restart() {
    restartKey += 1;
  }

  const useSvgLayers = $derived(page.url.searchParams.get('svg') === '1');
  const useFourLayer = $derived(page.url.searchParams.get('fourlayer') === '1');
  const useGroundRaster = $derived(page.url.searchParams.get('groundraster') === '1');
  const useGroundTex = $derived(page.url.searchParams.get('groundtex') === '1');
  // Default = painted backdrop (no flags). Either override turns it off.
  const usePainting = $derived(!useSvgLayers && !useFourLayer);

  const previewState = $derived.by(() => {
    const base = createInitialState({
      seed: 'dev-wagon-view',
      leader: { name: 'Dave', profession: 'farmer', sex: 'male' },
      companions: [
        { name: 'Ellen', profession: 'doctor', sex: 'female' },
        { name: 'Samuel', profession: 'hunter', sex: 'male' }
      ],
      startDate: { year: 1848, month: 4, day: 15 },
      wagonModel
    });
    return {
      ...base,
      weather,
      location: { ...base.location, terrain },
      wagon: { ...base.wagon, model: wagonModel, condition: 100 },
      oxen: Array.from({ length: oxCount }, (_, i) => ({
        id: `ox-${i}`,
        health: 100,
        fatigue: 0,
        shod: true,
        kind: isMule ? ('mule' as const) : ('ox' as const)
      }))
    };
  });

  function toggleQueryFlag(flag: 'svg' | 'fourlayer' | 'groundraster' | 'groundtex') {
    const url = new URL(window.location.href);
    const isOn = url.searchParams.get(flag) === '1';
    if (isOn) url.searchParams.delete(flag);
    else url.searchParams.set(flag, '1');
    // Full reload so SvelteKit's `page` store re-reads the URL — replaceState
    // alone doesn't notify in Svelte 5.
    window.location.search = url.search;
  }
</script>

<div class="page">
  <header>
    <h1>Wagon View — dev preview</h1>
    <p class="hint">Standalone WagonScene with controls. Default is the single-painting backdrop; toggle <code>?svg=1</code> for the legacy SVG layers fallback.</p>
  </header>

  <section class="controls">
    <label>
      <span>Terrain</span>
      <select bind:value={terrain}>
        {#each TERRAINS as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>Weather</span>
      <select bind:value={weather}>
        {#each WEATHERS as w}
          <option value={w}>{w}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>Time of day</span>
      <select bind:value={timeOfDay}>
        {#each TIMES as t}
          <option value={t}>{t}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>Backdrop variant</span>
      <select bind:value={variant} disabled={useSvgLayers}>
        {#each VARIANTS as n}
          <option value={n}>{n}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>Wagon</span>
      <select bind:value={wagonModel}>
        {#each WAGONS as w}
          <option value={w}>{w}</option>
        {/each}
      </select>
    </label>

    <label>
      <span>Oxen</span>
      <input type="number" min="1" max="6" bind:value={oxCount} />
    </label>

    <label class="cb">
      <input type="checkbox" bind:checked={isMule} />
      <span>Mules (instead of oxen)</span>
    </label>

    <label class="cb">
      <input type="checkbox" bind:checked={paused} />
      <span>Pause animation</span>
    </label>

    <button type="button" class="restart" onclick={restart}>↺ Restart</button>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useSvgLayers} onchange={() => toggleQueryFlag('svg')} />
      <span>Legacy SVG layers (<code>?svg=1</code>) — Far/Mid/Near trio fallback</span>
    </label>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useFourLayer} onchange={() => toggleQueryFlag('fourlayer')} />
      <span>4-layer painted backdrop (<code>?fourlayer=1</code>) — sky/far/mid/close stack (scaffolding)</span>
    </label>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useGroundRaster} onchange={() => toggleQueryFlag('groundraster')} />
      <span>Raster ground (<code>?groundraster=1</code>)</span>
    </label>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useGroundTex} onchange={() => toggleQueryFlag('groundtex')} />
      <span>Textured ground (<code>?groundtex=1</code>) — seamless biome texture, scrolling pattern</span>
    </label>
  </section>

  <section class="stage">
    {#key restartKey}
      <WagonScene state={previewState} {timeOfDay} {paused} backdropVariant={variant} />
    {/key}
  </section>

  <footer>
    <p class="hint">
      Backdrop: <strong>{useFourLayer ? `4-layer v${variant}` : (useSvgLayers ? 'svg layers' : `painting v${variant}`)}</strong> |
      Ground: <strong>{useGroundRaster ? 'raster' : 'svg'}</strong> |
      Terrain: <strong>{terrain}</strong> |
      Weather: <strong>{weather}</strong> |
      ToD: <strong>{timeOfDay}</strong> |
      Wagon: <strong>{wagonModel}</strong> |
      Team: <strong>{oxCount}× {isMule ? 'mule' : 'ox'}</strong>
    </p>
  </footer>
</div>

<style>
  .page {
    max-width: 1280px;
    margin: 1em auto;
    padding: 0 1em;
    font-family: var(--font-body, sans-serif);
    color: var(--c-tan, #e7d8b8);
  }
  header h1 {
    margin: 0 0 0.2em 0;
    color: var(--c-rust, #c25a32);
    font-size: 1.4em;
  }
  .hint {
    margin: 0.2em 0 0.6em 0;
    color: var(--c-wood, #aa8a5a);
    font-size: 0.85em;
    font-style: italic;
  }
  .hint code {
    background: var(--c-bg-raised, #2a1a08);
    padding: 0.05em 0.3em;
    border-radius: 2px;
    font-style: normal;
  }
  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.4em 0.8em;
    margin: 0.8em 0;
    padding: 0.8em;
    background: var(--c-bg-raised, #2a1a08);
    border: 2px solid var(--c-wood, #aa8a5a);
    border-radius: 4px;
  }
  .controls label {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    font-size: 0.78em;
    letter-spacing: 0.06em;
    color: var(--c-wood, #aa8a5a);
    text-transform: uppercase;
  }
  .controls label.cb {
    flex-direction: row;
    align-items: center;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.9em;
    color: var(--c-tan, #e7d8b8);
  }
  .controls label.raster-toggle {
    grid-column: 1 / -1;
    justify-self: start;
    border-top: 1px dashed var(--c-wood, #aa8a5a);
    padding-top: 0.5em;
    margin-top: 0.2em;
  }
  .controls select,
  .controls input[type='number'] {
    padding: 0.3em 0.5em;
    background: var(--c-panel, #1a0e08);
    color: var(--c-tan, #e7d8b8);
    border: 1px solid var(--c-wood, #aa8a5a);
    border-radius: 3px;
    font-family: inherit;
  }
  .controls input[type='number'] {
    width: 5em;
  }
  .restart {
    align-self: end;
    padding: 0.4em 0.8em;
    background: var(--c-bg-raised, #2a1a08);
    color: var(--c-rust, #c25a32);
    border: 2px solid var(--c-rust, #c25a32);
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.9em;
    letter-spacing: 0.04em;
    cursor: pointer;
  }
  .restart:hover {
    background: var(--c-rust, #c25a32);
    color: var(--c-bg-raised, #2a1a08);
  }
  .stage {
    margin: 0.8em 0;
  }
  footer .hint {
    text-align: center;
  }
  footer strong {
    color: var(--c-tan, #e7d8b8);
    font-style: normal;
    font-weight: normal;
  }
</style>
