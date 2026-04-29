<script lang="ts">
  // The composed travel scene — a single 1280×720 SVG that stacks
  // every layer in the brief's z-order:
  //
  //   1. Sky gradient (terrain × time-of-day)
  //   2. Sun / moon (SkyAccent)
  //   3. Clouds (CloudLayer)
  //   4. Far parallax (FarLayer)
  //   5. Distant landmarks (LandmarkLayer)
  //   6. Mid parallax (MidLayer)
  //   7. Ground band (GroundBand)
  //   8. Near parallax (NearLayer)
  //   9. Ox/mule team
  //  10. Wagon (with addons)
  //  11. Weather overlays (rain/snow/lightning)
  //  12. Storm vignette
  //  13. Time-of-day wash (semi-transparent over everything)
  //
  // One requestAnimationFrame tick drives `t`. All motion derives
  // from `t` — no CSS animations, no setIntervals.
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import type { GameState } from '$lib/game/types';
  import type { WagonModelId } from '$lib/game/content/wagons';

  // Terrain layers
  import SkyGradient from './terrain/SkyGradient.svelte';
  import FarLayer from './terrain/FarLayer.svelte';
  import MidLayer from './terrain/MidLayer.svelte';
  import NearLayer from './terrain/NearLayer.svelte';
  import GroundBand from './terrain/GroundBand.svelte';
  import BackdropPainting from './terrain/BackdropPainting.svelte';
  import { SCENE_W, SCENE_H, HORIZON_Y, GROUND_Y, type TimeOfDay } from './terrain';

  // Weather + sky
  import SkyAccent, { type SkyAccentKind } from './weather/SkyAccent.svelte';
  import CloudLayer from './weather/CloudLayer.svelte';
  import PrecipOverlays from './weather/PrecipOverlays.svelte';
  import StormVignette from './weather/StormVignette.svelte';

  // Landmarks
  import LandmarkLayer from './landmarks/LandmarkLayer.svelte';

  // Ox team
  import OxTeam from './ox-team/OxTeam.svelte';

  // Wagon
  import { WAGON_RENDER } from './wagon-svg';

  interface Props {
    state: GameState;
    /** Optional override for time of day. The game has no clock yet,
     *  so we default to 'day' and let the debug rig (?dawn=1, etc.)
     *  override later. */
    timeOfDay?: TimeOfDay;
    /** When true, freezes all motion (parallax, wheels, gait, weather). */
    paused?: boolean;
  }

  let { state: gameState, timeOfDay = 'day', paused = false }: Props = $props();

  // ---------- raster mode flags ----------
  // Two independent toggles via URL query so the painted-backdrop choice
  // and the trail-strip choice can be compared independently:
  //   ?raster=1       — use BackdropPainting (one painting per biome)
  //                     instead of the SVG Far/Mid/Near trio
  //   ?groundraster=1 — use the raster ground strip in GroundBand
  //                     instead of its two-stop SVG gradient
  const useBackdropRaster = $derived(page.url.searchParams.get('raster') === '1');

  // ---------- animation tick ----------
  // When `paused`, the rAF loop is fully cancelled (#164) — no
  // wasted frames between turns. `t` holds its last value so the
  // wheels + parallax freeze in place rather than snapping to t=0.
  // Resuming continues seamlessly from the frozen value.
  let t = $state(0);
  $effect(() => {
    if (paused) return;
    // Read `t` without subscribing — the rAF loop writes back to it
    // every frame, so a tracked read here would re-fire the effect
    // and tear down the loop on every tick.
    const start = performance.now() - untrack(() => t) * 1000;
    let raf = 0;
    const loop = (now: number) => {
      t = (now - start) / 1000;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });

  const tEff = $derived(t);
  // Per the brief's animation-model section. scrollX is negated so
  // parallax tiles slide LEFT→RIGHT past the camera — that reads as
  // the wagon traveling WEST (right-to-left through the world).
  // Parallax + wheels freeze at their last value when paused; gait
  // snaps to 0 (handled by OxTeam's gait="stopped" pose).
  const scrollX = $derived(-tEff * 60);
  const gaitPhase = $derived(paused ? 0 : (tEff * 1.6) % 1);
  // Negative wheel angle so wheels roll the same direction the
  // wagon is heading (counter-clockwise from viewer = westward).
  const wheelAngle = $derived((-tEff * 90) % 360);
  // Shared team bob (#158): the entire hitched mass — oxen + yoke +
  // chains + pole + wagon — settles together in one slow vertical
  // cycle. OxTeam computes the same value internally and bakes it
  // into its own translate; we mirror it on the wagon so they ride
  // together. Single-frequency only — a double-frequency bob reads
  // as trotting, not walking. Zero when paused.
  const teamBob = $derived(
    paused ? 0 : Math.sin(gaitPhase * Math.PI * 2) * 0.08
  );

  // ---------- weather mapping ----------
  // Engine has 8 states; the brief's visual vocabulary has 6. The
  // mapping below collapses heat/frost/clear → sunny etc. Lightning
  // only fires under the explicit storm state.
  const weatherKind = $derived.by<SkyAccentKind>(() => {
    if (timeOfDay === 'night') return 'night';
    switch (gameState.weather ?? 'clear') {
      case 'storm':
      case 'rain':     return 'rainy';
      case 'snow':     return 'snowy';
      case 'overcast':
      case 'fog':      return 'cloudy';
      case 'heat':
      case 'frost':
      case 'clear':
      default:         return 'sunny';
    }
  });
  const showLightning = $derived(gameState.weather === 'storm');

  // ---------- wagon placement ----------
  // Wagon's local origin sits at center-bottom-of-wheels. Each model
  // has a different wheel-ground offset; bake a small lift so the
  // wheels touch GROUND_Y exactly. Visual revisit (#156) can refine.
  const WAGON_GROUND_OFFSET: Record<WagonModelId, number> = {
    light: 9.2,
    prairie_schooner: 12,
    heavy: 14.5
  };
  const WAGON_X = 920;
  const SCENE_SCALE = 4;

  const wagonRender = $derived(WAGON_RENDER[gameState.wagon.model]);
  const wagonY = $derived(GROUND_Y - WAGON_GROUND_OFFSET[gameState.wagon.model] * SCENE_SCALE);

  // Wagon tongue tip is at x ≈ -29 in wagon-local units (per brief);
  // chain runs back to that point in scene coordinates.
  const wagonTongueTipSceneX = $derived(WAGON_X + (-29) * SCENE_SCALE);

  // ---------- ox team placement ----------
  // OxTeam draws its pole tip at its own (0, -11.5). The wrapping
  // <g translate(wagonTongueTipSceneX, GROUND_Y) scale(SCENE_SCALE)>
  // puts that pole tip at the wagon's tongue-tip; pairs extend
  // leftward (negative x). Origin convention changed in #158 — the
  // team no longer takes anchorX/wagonHookX, just wraps in a translate.
  const liveOxen = $derived(gameState.oxen.filter((o) => o.health > 0));
  const oxCount = $derived(Math.max(1, Math.min(6, liveOxen.length)));
  const isMule = $derived(liveOxen.length > 0 && liveOxen[0].kind === 'mule');

  // ---------- addons ----------
  const addons = $derived({
    driver: true,
    kegs: wagonRender.defaultKegs,
    coop: gameState.inventory.chicken ?? 0
  });

  const WagonComponent = $derived(wagonRender.Component);

  // ---------- time-of-day wash ----------
  const wash = $derived.by(() => {
    if (timeOfDay === 'night') return { fill: '#0a0a20', opacity: 0.45 };
    if (timeOfDay === 'dusk')  return { fill: '#d86a30', opacity: 0.10 };
    return null;
  });
</script>

<div class="status panel">
  <div class="status-head">DAY TRAVEL STATUS</div>
  <div class="landscape">
    <!-- Cropped viewBox: wagon (y 456..540) stays the centerpiece
         while sky takes a larger share than ground. Vertical band:
         sky 42% / wagon 47% / ground 11%. Container CSS aspect-ratio
         matches the viewBox so the SVG scales cleanly with no slice
         or letterbox at any column width. -->
    <svg viewBox="0 380 {SCENE_W} 180" preserveAspectRatio="xMidYMid meet">
      <defs>
        <SkyGradient id="ws-sky" terrain={gameState.location.terrain} {timeOfDay} />
      </defs>

      <!-- 1. sky -->
      <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill="url(#ws-sky)" />

      <!-- 2. sun / moon — left side (clear of wagon) at y=410, which
           sits in the upper third of the strip's sky band (visible
           range y=380..456). -->
      <SkyAccent kind={weatherKind} x={SCENE_W * 0.18} y={410} t={tEff} />

      <!-- 3. clouds — bandY=400 plants the cloud band a bit lower
           in the sky (spread y=400..472) so the puffs don't kiss
           the top edge of the strip. Drift is parallax-coupled to
           the same scrollX the terrain layers use, so direction
           and "stops when stopped" behavior follow ground motion. -->
      <CloudLayer kind={weatherKind} {scrollX} w={SCENE_W} skyH={HORIZON_Y} bandY={400} />

      <!-- 4. backdrop / parallax: in raster mode one painting replaces
           Far + Mid + Near; SVG mode keeps the original three layers. -->
      {#if useBackdropRaster}
        <BackdropPainting terrain={gameState.location.terrain}
                          {scrollX} horizonY={HORIZON_Y} groundY={GROUND_Y} />
      {:else}
        <FarLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} />
      {/if}

      <!-- 5. landmarks (layered on top of the backdrop, behind mid in SVG mode) -->
      <LandmarkLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} />

      {#if !useBackdropRaster}
        <!-- 6. mid parallax (SVG mode only) -->
        <MidLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} groundY={GROUND_Y} />
      {/if}

      <!-- 7. ground band -->
      <GroundBand terrain={gameState.location.terrain} groundY={GROUND_Y}
                  h={SCENE_H - GROUND_Y} w={SCENE_W} idPrefix="ws" />

      {#if !useBackdropRaster}
        <!-- 8. near parallax (SVG mode only) -->
        <NearLayer terrain={gameState.location.terrain} {scrollX} groundY={GROUND_Y} />
      {/if}

      <!-- 9. ox/mule team — pole tip lands at wagonTongueTipSceneX -->
      <g transform="translate({wagonTongueTipSceneX} {GROUND_Y}) scale({SCENE_SCALE})">
        <OxTeam
          count={oxCount}
          {isMule}
          {gaitPhase}
          gait={paused ? 'stopped' : 'walking'}
        />
      </g>

      <!-- 10. wagon — rides the team bob via a y-offset on the
           translate, so it settles together with the hitched mass. -->
      <g transform="translate({WAGON_X} {wagonY + teamBob * SCENE_SCALE}) scale({SCENE_SCALE})">
        <WagonComponent
          angle={wheelAngle}
          bounce={0}
          health={gameState.wagon.condition}
          {addons}
        />
      </g>

      <!-- 11. precipitation + 12. storm vignette -->
      <PrecipOverlays t={tEff} w={SCENE_W} h={SCENE_H} groundY={GROUND_Y}
                      showRain={weatherKind === 'rainy'}
                      showSnow={weatherKind === 'snowy'}
                      {showLightning} />
      <StormVignette kind={weatherKind} w={SCENE_W} h={SCENE_H} />

      <!-- 13. time-of-day wash -->
      {#if wash}
        <rect x="0" y="0" width={SCENE_W} height={SCENE_H}
              fill={wash.fill} opacity={wash.opacity} />
      {/if}
    </svg>
  </div>
</div>

<style>
  .status {
    display: flex;
    flex-direction: column;
    padding: 0.4em 0.5em;
    border: var(--bw-2) solid var(--c-wood);
    border-radius: var(--r-sm);
    background: var(--c-panel);
    gap: 0.35em;
  }
  .status-head {
    font-size: 0.7em;
    letter-spacing: var(--ls-loose);
    color: var(--c-rust);
    font-weight: 700;
  }
  /* Horizontal strip at 1280:180 ≈ 7.1:1 — matches the cropped
     viewBox. Wagon dominates the vertical band (~47%), sky ~42%,
     ground ~11%. The strip fills the card's full width; height
     grows proportionally with it. On wider columns this means a
     taller strip, but the proportional balance and the wagon's
     visual prominence stay the same. */
  .landscape {
    position: relative;
    width: 100%;
    aspect-ratio: 1280 / 180;
    overflow: hidden;
    border-radius: var(--r-xs);
    border: 1px solid rgba(0, 0, 0, 0.35);
  }
  .landscape svg { width: 100%; height: 100%; display: block; }

  @media (prefers-reduced-motion: reduce) {
    /* All motion is JS-driven (rAF). For users with reduced-motion
       preference set, freeze the scene by halting the tick — handled
       in the consumer (set paused=true). This media query is left
       as a documentation hint. */
  }
</style>
