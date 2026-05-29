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
  let useBlenderDriver = $state(true);
  let useBlenderBody = $state(true);
  let useBlenderTeam = $state(true);
  // Scene-placement tuning knobs (defaults match the production
  // constants baked into WagonScene 2026-05-12 fit b). Slide to retune.
  let wagonX = $state(905);
  let wagonGroundOffset = $state(3.75);  // for prairie_schooner
  let tongueBase = $state(10.5);
  let tonguePerPair = $state(-12);
  // Shadow tuning (#956). Defaults match WagonShadows' production-locked
  // values; slide to retune in wagon-local units, scaled by SCENE_SCALE
  // when rendered.
  let shadowOffsetX = $state(16.5);
  let shadowOffsetY = $state(7.5);
  let shadowPairOffsetX = $state(-12);  // pair-shadow-only X shift — tunes gap between wagon and pair shadows
  let shadowWagonRx = $state(17);     // "wheelbase" — wagon-shadow half-width
  let shadowWagonRy = $state(3.7);    // wagon-shadow half-height
  let shadowPairRx = $state(11.5);    // "length" — ox-pair-shadow half-width
  let shadowPairRy = $state(2.9);     // ox-pair-shadow half-height
  let shadowOpacity = $state(0.98);   // "darkness"
  let shadowBlur = $state(8);         // "weight" — Gaussian blur sigma

  // Mule-team tuning (#216). Only affects the Blender mule team (toggle
  // "Mules" on). Sprite size/position + the reused ox single-yoke.
  let muleScale = $state(1.1);
  let muleDx = $state(5.75);
  let muleDy = $state(0);
  // -1 → "auto" (no explicit override → BackdropPainting picks based on
  // weather → fallback random). 0..4 → forced variant.
  let variant = $state<number>(-1);

  const VARIANTS = [-1, 0, 1, 2, 3, 4];
  const variantLabel = (n: number) => (n === -1 ? 'auto (weather-driven)' : String(n));

  // Bumping `restartKey` remounts WagonScene with a fresh t=0 — the
  // rAF tick in the scene tracks scroll position internally, so this
  // is the cleanest way to rewind the parallax and gait cycle.
  let restartKey = $state(0);
  function restart() {
    restartKey += 1;
  }

  const useSvgLayers = $derived(page.url.searchParams.get('svg') === '1');
  const useGroundRaster = $derived(page.url.searchParams.get('groundraster') === '1');
  const useGroundTex = $derived(page.url.searchParams.get('groundtex') === '1');
  const useGroundStrip = $derived(page.url.searchParams.get('groundstrip') === '1');

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

  function toggleQueryFlag(flag: 'svg' | 'groundraster' | 'groundtex' | 'groundstrip') {
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
          <option value={n}>{variantLabel(n)}</option>
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

    <label class="cb">
      <input type="checkbox" bind:checked={useBlenderBody} />
      <span>Blender wagon body + animated wheels</span>
    </label>

    <label class="cb">
      <input type="checkbox" bind:checked={useBlenderTeam} />
      <span>Blender ox team (animated frames)</span>
    </label>

    <label class="cb">
      <input type="checkbox" bind:checked={useBlenderDriver} />
      <span>Blender driver (cowboy PNG)</span>
    </label>

    <button type="button" class="restart" onclick={restart}>↺ Restart</button>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useSvgLayers} onchange={() => toggleQueryFlag('svg')} />
      <span>Legacy SVG layers (<code>?svg=1</code>) — Far/Mid/Near trio fallback</span>
    </label>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useGroundRaster} onchange={() => toggleQueryFlag('groundraster')} />
      <span>Raster ground (<code>?groundraster=1</code>)</span>
    </label>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useGroundTex} onchange={() => toggleQueryFlag('groundtex')} />
      <span>Textured ground (<code>?groundtex=1</code>) — seamless biome texture, scrolling pattern</span>
    </label>

    <label class="cb raster-toggle">
      <input type="checkbox" checked={useGroundStrip} onchange={() => toggleQueryFlag('groundstrip')} />
      <span>Painted ground strip (<code>?groundstrip=1</code>) — SDXL+LoRA painted side-view trail, parallax-scrolled</span>
    </label>
  </section>

  <section class="tuning">
    <h2>Scene tuning</h2>
    <label class="range">
      <span>Wagon X</span>
      <input type="range" min="600" max="1280" step="5" bind:value={wagonX} />
      <span class="val">{wagonX}</span>
    </label>
    <label class="range">
      <span>Wagon ground-offset</span>
      <input type="range" min="0" max="24" step="0.25" bind:value={wagonGroundOffset} />
      <span class="val">{wagonGroundOffset}</span>
    </label>
    <label class="range">
      <span>Tongue base</span>
      <input type="range" min="-30" max="30" step="0.5" bind:value={tongueBase} />
      <span class="val">{tongueBase}</span>
    </label>
    <label class="range">
      <span>Tongue per pair</span>
      <input type="range" min="-25" max="0" step="0.5" bind:value={tonguePerPair} />
      <span class="val">{tonguePerPair}</span>
    </label>
    <p class="hint-sm">Tongue tip wagon-X = {tongueBase} + {tonguePerPair} × {Math.ceil(oxCount/2)} pair(s) = <strong>{(tongueBase + tonguePerPair * Math.ceil(oxCount/2)).toFixed(1)}</strong></p>
  </section>

  <section class="tuning">
    <h2>Shadow tuning (#956)</h2>
    <label class="range">
      <span>Position X (offset)</span>
      <input type="range" min="-20" max="20" step="0.5" bind:value={shadowOffsetX} />
      <span class="val">{shadowOffsetX}</span>
    </label>
    <label class="range">
      <span>Position Y (offset)</span>
      <input type="range" min="-10" max="10" step="0.25" bind:value={shadowOffsetY} />
      <span class="val">{shadowOffsetY}</span>
    </label>
    <label class="range">
      <span>Pair X (gap from wagon)</span>
      <input type="range" min="-30" max="30" step="0.5" bind:value={shadowPairOffsetX} />
      <span class="val">{shadowPairOffsetX}</span>
    </label>
    <label class="range">
      <span>Wheelbase (wagon Rx)</span>
      <input type="range" min="4" max="24" step="0.5" bind:value={shadowWagonRx} />
      <span class="val">{shadowWagonRx}</span>
    </label>
    <label class="range">
      <span>Wagon height (Ry)</span>
      <input type="range" min="0.5" max="6" step="0.1" bind:value={shadowWagonRy} />
      <span class="val">{shadowWagonRy}</span>
    </label>
    <label class="range">
      <span>Pair length (Rx)</span>
      <input type="range" min="3" max="18" step="0.5" bind:value={shadowPairRx} />
      <span class="val">{shadowPairRx}</span>
    </label>
    <label class="range">
      <span>Pair height (Ry)</span>
      <input type="range" min="0.5" max="4" step="0.1" bind:value={shadowPairRy} />
      <span class="val">{shadowPairRy}</span>
    </label>
    <label class="range">
      <span>Darkness (opacity)</span>
      <input type="range" min="0" max="1" step="0.02" bind:value={shadowOpacity} />
      <span class="val">{shadowOpacity}</span>
    </label>
    <label class="range">
      <span>Weight (blur σ)</span>
      <input type="range" min="0" max="8" step="0.25" bind:value={shadowBlur} />
      <span class="val">{shadowBlur}</span>
    </label>
  </section>

  <section class="tuning">
    <h2>Mule tuning (#216) — toggle “Mules” on</h2>
    <label class="range">
      <span>Mule size (scale)</span>
      <input type="range" min="0.4" max="2" step="0.02" bind:value={muleScale} />
      <span class="val">{muleScale}</span>
    </label>
    <label class="range">
      <span>Mule X (offset)</span>
      <input type="range" min="-20" max="20" step="0.25" bind:value={muleDx} />
      <span class="val">{muleDx}</span>
    </label>
    <label class="range">
      <span>Mule Y (offset)</span>
      <input type="range" min="-20" max="20" step="0.25" bind:value={muleDy} />
      <span class="val">{muleDy}</span>
    </label>
  </section>

  <section class="stage">
    {#key restartKey}
      <WagonScene state={previewState} {timeOfDay} {paused}
                  backdropVariant={variant === -1 ? undefined : variant}
                  addonsOverride={{ driver: useBlenderDriver, useBlenderDriver, useBlenderBody, useBlenderTeam }}
                  tuning={{
                    wagonX, wagonGroundOffset, tongueBase, tonguePerPair,
                    shadowOffsetX, shadowOffsetY, shadowPairOffsetX,
                    shadowWagonRx, shadowWagonRy,
                    shadowPairRx, shadowPairRy,
                    shadowOpacity, shadowBlur,
                    muleScale, muleDx, muleDy,
                  }} />
    {/key}
  </section>

  <footer>
    <p class="hint">
      Backdrop: <strong>{useSvgLayers ? 'svg layers' : `painting v${variant}`}</strong> |
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
    color: var(--of-ink, #e7d8b8);
  }
  header h1 {
    margin: 0 0 0.2em 0;
    color: var(--of-rust, #c25a32);
    font-size: 1.4em;
  }
  .hint {
    margin: 0.2em 0 0.6em 0;
    color: var(--of-ink-soft, #aa8a5a);
    font-size: 0.85em;
    font-style: italic;
  }
  .hint code {
    background: var(--of-paper, #2a1a08);
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
    background: var(--of-paper, #2a1a08);
    border: 2px solid var(--of-ink-soft, #aa8a5a);
    border-radius: 4px;
  }
  .controls label {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    font-size: 0.78em;
    letter-spacing: 0.06em;
    color: var(--of-ink-soft, #aa8a5a);
    text-transform: uppercase;
  }
  .controls label.cb {
    flex-direction: row;
    align-items: center;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.9em;
    color: var(--of-ink, #e7d8b8);
  }
  .controls label.raster-toggle {
    grid-column: 1 / -1;
    justify-self: start;
    border-top: 1px dashed var(--of-ink-soft, #aa8a5a);
    padding-top: 0.5em;
    margin-top: 0.2em;
  }
  .controls select,
  .controls input[type='number'] {
    padding: 0.3em 0.5em;
    background: var(--of-paper-soft, #1a0e08);
    color: var(--of-ink, #e7d8b8);
    border: 1px solid var(--of-ink-soft, #aa8a5a);
    border-radius: 3px;
    font-family: inherit;
  }
  .controls input[type='number'] {
    width: 5em;
  }
  .restart {
    align-self: end;
    padding: 0.4em 0.8em;
    background: var(--of-paper, #2a1a08);
    color: var(--of-rust, #c25a32);
    border: 2px solid var(--of-rust, #c25a32);
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.9em;
    letter-spacing: 0.04em;
    cursor: pointer;
  }
  .restart:hover {
    background: var(--of-rust, #c25a32);
    color: var(--of-paper, #2a1a08);
  }
  .stage {
    margin: 0.8em 0;
  }
  .tuning {
    margin: 0.8em 0;
    padding: 0.6em 0.8em;
    background: var(--of-paper, #2a1a08);
    border: 1px solid var(--of-ink-soft, #aa8a5a);
    border-radius: 4px;
  }
  .tuning h2 {
    margin: 0 0 0.4em 0;
    font-size: 0.85em;
    color: var(--of-ink-soft, #aa8a5a);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .tuning label.range {
    display: grid;
    grid-template-columns: 11em 1fr 4em;
    align-items: center;
    gap: 0.6em;
    font-size: 0.85em;
    color: var(--of-ink, #e7d8b8);
    text-transform: none;
    letter-spacing: 0;
    margin: 0.25em 0;
  }
  .tuning label.range .val {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--of-ink-soft, #aa8a5a);
  }
  .tuning .hint-sm {
    margin: 0.4em 0 0 0;
    font-size: 0.8em;
    color: var(--of-ink-soft, #aa8a5a);
    font-style: italic;
  }
  .tuning .hint-sm strong {
    color: var(--of-ink, #e7d8b8);
    font-style: normal;
  }
  footer .hint {
    text-align: center;
  }
  footer strong {
    color: var(--of-ink, #e7d8b8);
    font-style: normal;
    font-weight: normal;
  }
</style>
