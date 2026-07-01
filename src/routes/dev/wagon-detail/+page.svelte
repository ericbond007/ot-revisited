<script lang="ts">
  // Standalone wagon-component preview at large scale. No scene chrome,
  // no parallax, no scrolling — just the wagon SVG rendered big enough
  // to actually see the per-element detail (jockey toolbox iron bands,
  // tar bucket on rear axle, wear-overlay patches at low health, etc.).
  //
  // The full WagonScene render at SCENE_SCALE=4 makes the wagon ~280px
  // wide on screen, where many of the new SVG primitives are
  // sub-pixel-tiny. This page expands the same component to fill the
  // viewport so visual review is meaningful.
  import type { WagonModelId } from '$lib/game/content/wagons';
  import { WAGON_RENDER } from '$lib/ui/wagon/wagon-svg';
  import type { WagonAddons } from '$lib/ui/wagon/wagon-svg/wagon-tokens';
  import OxTeam from '$lib/ui/wagon/ox-team/OxTeam.svelte';

  const WAGONS: WagonModelId[] = ['light', 'prairie_schooner', 'heavy'];

  let wagonModel = $state<WagonModelId>('prairie_schooner');
  let health = $state(100);
  let painted = $state(false);
  let tarBucket = $state(true);
  let driver = $state(true);
  let useBlenderDriver = $state(true);
  let useBlenderBody = $state(true);
  let useBlenderTeam = $state(true);
  let showOxTeam = $state(true);
  let showWheels = $state(true);
  let showGroundShadow = $state(true);
  let driverDx = $state(19.7);
  let driverDy = $state(-2.6);
  let driverScale = $state(1.8);
  let oxDx = $state(0);
  let oxDy = $state(0);
  let oxScale = $state(1);
  let oxCount = $state<number>(4);
  // Zoom (1 = default fit, larger = zoom in)
  let zoom = $state(1);
  // panX = X coord of viewBox LEFT edge. More negative → more left margin
  // visible (ox team area), wagon shifts visually rightward in stage.
  let panX = $state(-80);
  let panY = $state(-22);
  const vbW = $derived(112 / zoom);
  const vbH = $derived(36 / zoom);
  let showAlignmentDebug = $state(true);
  // Tongue tip = wagon-front-tip + per-pair extension × number of pairs.
  // 2 oxen (1 pair) → short tongue; 6 oxen (3 pairs) → long tongue.
  let tongueBase = $state(-12);     // wagon-local x of the wagon's front edge
  let tonguePerPair = $state(-12);  // additional extension per ox pair
  const numPairs = $derived(Math.max(1, Math.ceil(oxCount / 2)));
  const tongueTipX = $derived(tongueBase + tonguePerPair * numPairs);
  let kegs = $state(2);
  let coop = $state(0);
  let butterChurn = $state(0);
  let milkCow = $state(0);
  let angle = $state(0);
  let rolling = $state(true);
  let showGrid = $state(true);
  let showCanvas = $state(true);
  let useFluxBody = $state(false);

  const wagonRender = $derived(WAGON_RENDER[wagonModel]);
  const WagonComponent = $derived(wagonRender.Component);
  const addons = $derived<WagonAddons>({
    driver, useBlenderDriver, useBlenderBody, useBlenderTeam,
    showWheels, showGroundShadow,
    driverDx, driverDy, driverScale,
    kegs, coop, butterChurn, milkCow, painted, tarBucket
  });

  // Animate wheel rotation, feather emission, rough-terrain bounce.
  // Tick is always-on so feathers + bounce can be observed even when
  // wheels aren't rolling — toggle rolling for the wheel-spin specifically.
  let t = $state(0);
  $effect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      t = (now - start) / 1000;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
  const wheelAngle = $derived(rolling ? (-t * 360) % 360 : angle);
  // Same rough-terrain shudder as WagonScene — three incommensurate
  // sines for non-repeating jitter. Subtle: total ≤ 0.3 SVG units.
  const roughTerrainBounce = $derived(
    Math.sin(t * 4.0 * Math.PI * 2) * 0.05
    + Math.sin(t * 6.7 * Math.PI * 2) * 0.03
    + Math.sin(t * 11.3 * Math.PI * 2) * 0.02
  );

  // Grid lines for measurement reference — 5-unit spacing in wagon coords.
  const GRID_X = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  const GRID_Y = [-15, -10, -5, 0, 5, 10];
</script>

<div class="page">
  <header>
    <h1>Wagon Detail — dev preview</h1>
    <p class="hint">Wagon component at large scale. Viewport-sized SVG with no scene chrome — every primitive readable. Toggle controls below to test addon visibility + wear progression. Grid is 5-unit spacing in wagon coords.</p>
  </header>

  <section class="layout">
    <aside class="controls">
      <fieldset>
        <legend>Model</legend>
        <label>
          <span>Wagon</span>
          <select bind:value={wagonModel}>
            {#each WAGONS as w}
              <option value={w}>{w}</option>
            {/each}
          </select>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={painted} />
          <span>Painted (Colonial Blue)</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Wear</legend>
        <label class="range">
          <span>Health</span>
          <input type="range" min="0" max="100" bind:value={health} />
          <span class="val">{health}</span>
        </label>
        <p class="hint-sm">
          {#if health >= 80}Stop 0/1 — fresh
          {:else if health >= 60}Stop 1/2 — dusty / first patch
          {:else if health >= 40}Stop 2/3 — worn / 3 patches + first rust
          {:else if health >= 20}Stop 3 — ragged / 6 patches + rust + mud
          {:else}Stop 4 — failing / heavy patching, broken plank, broken wheel
          {/if}
        </p>
      </fieldset>

      <fieldset>
        <legend>Accessories</legend>
        <label class="cb">
          <input type="checkbox" bind:checked={driver} />
          <span>Driver</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={useBlenderDriver} disabled={!driver} />
          <span>Use Blender driver (cowboy PNG)</span>
        </label>
        <label class="range">
          <span>Driver Δx</span>
          <input type="range" min="-30" max="30" step="0.1" bind:value={driverDx} disabled={!driver} />
          <span class="val">{driverDx.toFixed(1)}</span>
        </label>
        <label class="range">
          <span>Driver Δy</span>
          <input type="range" min="-30" max="30" step="0.1" bind:value={driverDy} disabled={!driver} />
          <span class="val">{driverDy.toFixed(1)}</span>
        </label>
        <label class="range">
          <span>Driver scale</span>
          <input type="range" min="0.4" max="2.5" step="0.05" bind:value={driverScale} disabled={!driver} />
          <span class="val">{driverScale.toFixed(2)}×</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={useBlenderBody} />
          <span>Blender wagon body + animated wheels</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={showWheels} disabled={!useBlenderBody} />
          <span>Show wheel-frames overlay (off = body only)</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={showGroundShadow} disabled={!useBlenderBody} />
          <span>Show ground shadow ellipse</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={showOxTeam} />
          <span>Show ox team</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={useBlenderTeam} disabled={!showOxTeam} />
          <span>Blender ox team (animated frames)</span>
        </label>
        <label class="num">
          <span>Ox count</span>
          <input type="number" min="1" max="6" bind:value={oxCount} disabled={!showOxTeam} />
        </label>
        <label class="range">
          <span>Ox Δx</span>
          <input type="range" min="-30" max="30" step="0.1" bind:value={oxDx} disabled={!showOxTeam} />
          <span class="val">{oxDx.toFixed(1)}</span>
        </label>
        <label class="range">
          <span>Ox Δy</span>
          <input type="range" min="-30" max="30" step="0.1" bind:value={oxDy} disabled={!showOxTeam} />
          <span class="val">{oxDy.toFixed(1)}</span>
        </label>
        <label class="range">
          <span>Ox scale</span>
          <input type="range" min="0.4" max="2.5" step="0.05" bind:value={oxScale} disabled={!showOxTeam} />
          <span class="val">{oxScale.toFixed(2)}×</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={showAlignmentDebug} />
          <span>Tongue–team alignment debug</span>
        </label>
        <label class="range">
          <span>Tongue base (wagon front)</span>
          <input type="range" min="-50" max="10" step="0.5" bind:value={tongueBase} />
          <span class="val">{tongueBase.toFixed(1)}</span>
        </label>
        <label class="range">
          <span>Tongue per pair</span>
          <input type="range" min="-25" max="0" step="0.5" bind:value={tonguePerPair} />
          <span class="val">{tonguePerPair.toFixed(1)}</span>
        </label>
        <p class="hint-sm">
          Tongue tip = {tongueBase.toFixed(1)} + {tonguePerPair.toFixed(1)} × {numPairs} pair{numPairs > 1 ? 's' : ''}
          = <strong>{tongueTipX.toFixed(1)}</strong>
        </p>
        <label class="cb">
          <input type="checkbox" bind:checked={tarBucket} />
          <span>Tar bucket</span>
        </label>
        <label class="num">
          <span>Water kegs</span>
          <input type="number" min="0" max="2" bind:value={kegs} />
        </label>
        <label class="num">
          <span>Chickens (coop)</span>
          <input type="number" min="0" max="10" bind:value={coop} />
        </label>
        <label class="num">
          <span>Butter churn</span>
          <input type="number" min="0" max="2" bind:value={butterChurn} />
        </label>
        <label class="num">
          <span>Milk cows</span>
          <input type="number" min="0" max="2" bind:value={milkCow} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Animation</legend>
        <label class="cb">
          <input type="checkbox" bind:checked={rolling} />
          <span>Roll wheels</span>
        </label>
        <label class="range">
          <span>Wheel angle</span>
          <input type="range" min="0" max="360" bind:value={angle} disabled={rolling} />
          <span class="val">{angle}°</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>View</legend>
        <label class="range">
          <span>Zoom</span>
          <input type="range" min="0.3" max="5" step="0.1" bind:value={zoom} />
          <span class="val">{zoom.toFixed(1)}×</span>
        </label>
        <label class="range">
          <span>Pan X</span>
          <input type="range" min="-120" max="40" step="1" bind:value={panX} />
          <span class="val">{panX}</span>
        </label>
        <label class="range">
          <span>Pan Y</span>
          <input type="range" min="-60" max="20" step="1" bind:value={panY} />
          <span class="val">{panY}</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={showGrid} />
          <span>Show grid (5-unit spacing)</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={showCanvas} />
          <span>Show canvas top (uncheck to inspect cargo)</span>
        </label>
        <label class="cb">
          <input type="checkbox" bind:checked={useFluxBody} />
          <span>Use FLUX painterly body (Hybrid+ test)</span>
        </label>
      </fieldset>
    </aside>

    <div class="stage">
      <!-- viewBox sized to fit a max-extents wagon with margin: bed
           extents are roughly -16..16 wide × -20..12 tall. -->
      <svg viewBox="{panX} {panY} {vbW} {vbH}" preserveAspectRatio="xMidYMid meet">
        {#if showGrid}
          <g>
            {#each GRID_X as x}
              <line x1={x} y1="-22" x2={x} y2="14"
                    stroke="#eeedeb" stroke-width="0.05" opacity="0.18" />
            {/each}
            {#each GRID_Y as y}
              <line x1="-22" y1={y} x2="22" y2={y}
                    stroke="#eeedeb" stroke-width="0.05" opacity="0.18" />
            {/each}
            <line x1="0" y1="-22" x2="0" y2="14"
                  stroke="#990000" stroke-width="0.06" opacity="0.4" />
            <line x1="-22" y1="0" x2="22" y2="0"
                  stroke="#990000" stroke-width="0.06" opacity="0.4" />
          </g>
        {/if}
        <WagonComponent angle={wheelAngle} bounce={roughTerrainBounce}
                        {health} {addons} {t} {showCanvas} {useFluxBody} />

        {#if showOxTeam}
          <!-- OxTeam wraps in same translate/scale convention as
               WagonScene: pole tip at (0,0) in OxTeam coords, here
               anchored to wagon-local tongueTipX. -->
          <g transform="translate({tongueTipX} 0)">
            <OxTeam
              count={oxCount}
              gait="walking"
              gaitPhase={(t * 0.5) % 1}
              useBlenderTeam={useBlenderTeam}
              {oxDx}
              {oxDy}
              {oxScale}
            />
          </g>
        {/if}

        {#if showAlignmentDebug}
          <!-- Crimson crosshair at WAGON's tongue tip (wagon-local coords) -->
          <g>
            <line x1={tongueTipX - 1.5} y1="0" x2={tongueTipX + 1.5} y2="0"
                  stroke="#990000" stroke-width="0.15" />
            <line x1={tongueTipX} y1="-1.5" x2={tongueTipX} y2="1.5"
                  stroke="#990000" stroke-width="0.15" />
            <text x={tongueTipX + 0.3} y="-1.8" fill="#990000" font-size="0.9"
                  font-family="monospace">tongue tip ({tongueTipX})</text>
          </g>
        {/if}
      </svg>
    </div>
  </section>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    margin: 0;
    padding: 0.6em 1em;
    background: var(--of-paper-soft, #2a1a08);
    color: var(--of-ink, #eeedeb);
    font-family: var(--of-body, sans-serif);
  }
  header h1 {
    margin: 0 0 0.2em 0;
    color: var(--of-rust, #990000);
    font-size: 1.4em;
  }
  .hint {
    margin: 0 0 0.6em 0;
    color: var(--of-ink-soft, #aa8a5a);
    font-size: 0.85em;
    font-style: italic;
  }
  .hint-sm {
    margin: 0.2em 0 0 0;
    font-size: 0.78em;
    color: var(--of-ink-soft, #aa8a5a);
    font-style: italic;
  }
  .layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1em;
    flex: 1;
    min-height: 0;
  }
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.6em;
    padding: 0.6em;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 4px;
    overflow-y: auto;
    overflow-x: hidden;
    min-width: 0;
  }
  .controls label.range { min-width: 0; }
  .controls label.range input[type="range"] { min-width: 0; }
  .controls fieldset {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    padding: 0.4em 0.6em;
    margin: 0;
  }
  .controls legend {
    padding: 0 0.4em;
    font-size: 0.8em;
    color: var(--of-ink-soft, #aa8a5a);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .controls label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 0.88em;
    margin: 0.25em 0;
  }
  .controls label.range { gap: 0.4em; }
  .controls label.range input[type="range"] { flex: 1; }
  .controls label.range .val { min-width: 3em; text-align: right; font-variant-numeric: tabular-nums; }
  .controls label.num { justify-content: space-between; }
  .controls label.num input[type="number"] { width: 4em; }
  .controls select { flex: 1; }
  .stage {
    background: #1a0a04;
    border-radius: 4px;
    overflow: hidden;
    min-height: 0;
  }
  .stage svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
