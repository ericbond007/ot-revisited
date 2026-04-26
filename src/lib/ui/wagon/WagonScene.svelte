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
  import { onMount } from 'svelte';
  import type { GameState } from '$lib/game/types';
  import type { WagonModelId } from '$lib/game/content/wagons';

  // Terrain layers
  import SkyGradient from './terrain/SkyGradient.svelte';
  import FarLayer from './terrain/FarLayer.svelte';
  import MidLayer from './terrain/MidLayer.svelte';
  import NearLayer from './terrain/NearLayer.svelte';
  import GroundBand from './terrain/GroundBand.svelte';
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
  import { PAIR_SPACE } from './ox-team/ox-team-tokens';

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

  // ---------- animation tick ----------
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

  // Holding `tEff` lets us pause the scene by snapping it to the
  // current `t` value at the moment of pause.
  const tEff = $derived(paused ? 0 : t);
  // Per the brief's animation-model section.
  const scrollX = $derived(tEff * 60);
  const gaitPhase = $derived((tEff * 1.6) % 1);
  const bounce = $derived(Math.sin(tEff * 4) * 0.5);

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
  // The ox team renders in its own scaled frame anchored at scene
  // (0, GROUND_Y). Inside that frame:
  //   * `wagonHookX` is where the trailing chain ends — converted
  //     from the scene-coord tongue tip back into ox-local units.
  //   * `anchorX` is the leftmost (lead) pair's center — calibrated
  //     so the trailing pair sits ~6 units left of the wagon hook.
  const liveOxen = $derived(gameState.oxen.filter((o) => o.health > 0));
  const oxCount = $derived(Math.max(1, Math.min(6, liveOxen.length)));
  const isMule = $derived(liveOxen.length > 0 && liveOxen[0].kind === 'mule');
  const pairCount = $derived(Math.max(1, Math.ceil(oxCount / 2)));

  const wagonHookX = $derived(wagonTongueTipSceneX / SCENE_SCALE);
  const teamAnchorX = $derived(wagonHookX - 8 - (pairCount - 1) * PAIR_SPACE);

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
    <svg viewBox="0 0 {SCENE_W} {SCENE_H}" preserveAspectRatio="xMidYMax slice">
      <defs>
        <SkyGradient id="ws-sky" terrain={gameState.location.terrain} {timeOfDay} />
      </defs>

      <!-- 1. sky -->
      <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill="url(#ws-sky)" />

      <!-- 2. sun / moon -->
      <SkyAccent kind={weatherKind} x={SCENE_W * 0.85} y={SCENE_H * 0.18} t={tEff} />

      <!-- 3. clouds -->
      <CloudLayer kind={weatherKind} t={tEff} w={SCENE_W} skyH={HORIZON_Y} />

      <!-- 4. far parallax -->
      <FarLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} />

      <!-- 5. landmarks -->
      <LandmarkLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} />

      <!-- 6. mid parallax -->
      <MidLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} groundY={GROUND_Y} />

      <!-- 7. ground band -->
      <GroundBand terrain={gameState.location.terrain} groundY={GROUND_Y}
                  h={SCENE_H - GROUND_Y} w={SCENE_W} idPrefix="ws" />

      <!-- 8. near parallax -->
      <NearLayer terrain={gameState.location.terrain} {scrollX} groundY={GROUND_Y} />

      <!-- 9. ox/mule team -->
      <g transform="translate(0 {GROUND_Y}) scale({SCENE_SCALE})">
        <OxTeam
          count={oxCount}
          {isMule}
          {gaitPhase}
          anchorX={teamAnchorX}
          {wagonHookX}
          y={0}
        />
      </g>

      <!-- 10. wagon -->
      <g transform="translate({WAGON_X} {wagonY}) scale({SCENE_SCALE})">
        <WagonComponent
          angle={(tEff * 90) % 360}
          {bounce}
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
  /* The scene is a 1280×720 viewBox internally but we render it as
     a horizontal "strip" (~16:5) in the play layout so it doesn't
     dominate the vertical space and shove TrailMap + ActionBar off
     the fold. preserveAspectRatio="xMidYMax meet" on the SVG keeps
     the wagon + ground at the bottom of the visible band, with the
     sky/clouds peeking above. */
  .landscape {
    position: relative;
    height: 220px;
    overflow: hidden;
    border-radius: var(--r-xs);
    border: 1px solid rgba(0, 0, 0, 0.35);
  }
  @media (max-width: 900px) {
    .landscape { height: 180px; }
  }
  .landscape svg { width: 100%; height: 100%; display: block; }

  @media (prefers-reduced-motion: reduce) {
    /* All motion is JS-driven (rAF). For users with reduced-motion
       preference set, freeze the scene by halting the tick — handled
       in the consumer (set paused=true). This media query is left
       as a documentation hint. */
  }
</style>
