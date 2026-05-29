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
  //
  // (Time-of-day wash removed: travel-scene pacing is days, not hours.
  //  Weather is the multi-day mood lever — see BackdropPainting.)
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

  // Ground shadows under wagon + ox team (#956)
  import WagonShadows from './WagonShadows.svelte';

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
    /** Backdrop variant 0..N-1; only used in raster mode. Defaults to a
     *  random pick at mount inside BackdropPainting if not provided. */
    backdropVariant?: number;
    /** Dev-only: merge extra flags into the wagon addons (e.g.
     *  useBlenderDriver). Lets the dev viewer toggle them without
     *  touching game state. */
    addonsOverride?: Partial<import('./wagon-svg/wagon-tokens').WagonAddons>;
    /** Dev-only: override the scene-placement constants normally baked
     *  into this component (wagon X, ground-offset for the rendered
     *  wagon model, tongue-tip math). Lets /dev/wagon-view drive
     *  sliders. Unset fields fall back to the production defaults. */
    tuning?: {
      wagonX?: number;
      wagonGroundOffset?: number;
      tongueBase?: number;
      tonguePerPair?: number;
      shadowOffsetX?: number;
      shadowOffsetY?: number;
      shadowPairOffsetX?: number;
      shadowWagonRx?: number;
      shadowWagonRy?: number;
      shadowPairRx?: number;
      shadowPairRy?: number;
      shadowOpacity?: number;
      shadowBlur?: number;
    };
  }

  let { state: gameState, timeOfDay = 'day', paused = false, backdropVariant, addonsOverride, tuning }: Props = $props();

  // ---------- backdrop mode flags ----------
  // Default: BackdropPainting — single 3072×768 horizon-vista painting per
  // biome+variant (5 variants), opaque, parallax-scrolled. The painting
  // contains its own sky/horizon/foreground, so SkyGradient + SkyAccent +
  // CloudLayer are suppressed.
  //
  // Override via URL query:
  //   ?svg=1          — legacy SVG Far/Mid/Near trio with sky elements
  //                     rendered on top. Stylistic fallback.
  //   ?groundraster=1 — raster ground strip instead of the SVG gradient.
  const useSvgLayers = $derived(page.url.searchParams.get('svg') === '1');

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
  // Rough-terrain shudder for the wagon body specifically — independent
  // of teamBob (which the ox team shares). Sum of three incommensurate
  // sines gives a non-repeating jitter that reads as "rolling over rocks
  // and ruts" rather than a clean cycle. Amplitudes tuned subtle —
  // total ≤ 0.3 SVG units; bigger reads as cartoonishly bumpy.
  const roughTerrainBounce = $derived(
    paused
      ? 0
      : (Math.sin(tEff * 4.0 * Math.PI * 2) * 0.05
        + Math.sin(tEff * 6.7 * Math.PI * 2) * 0.03
        + Math.sin(tEff * 11.3 * Math.PI * 2) * 0.02)
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
  // Tunables — current values are the "saved fit" from /dev/wagon-detail
  // (2026-05-12). Previous values in parens for easy revert.
  const DEFAULT_WAGON_GROUND_OFFSET: Record<WagonModelId, number> = {
    light: 9.2,
    prairie_schooner: 3.75,  // was 12, briefly 13 — Dave's dialed-in fit 2026-05-12 b: drops the wagon flush with the textured-ground band
    heavy: 14.5
  };
  const DEFAULT_WAGON_X = 905;   // was 920 / briefly 1170 — Dave's dialed-in fit 2026-05-12 b
  const SCENE_SCALE = 4;

  // Tuning overrides (set by /dev/wagon-view sliders) take precedence.
  const WAGON_X = $derived(tuning?.wagonX ?? DEFAULT_WAGON_X);
  const wagonGroundOffset = $derived(
    tuning?.wagonGroundOffset ?? DEFAULT_WAGON_GROUND_OFFSET[gameState.wagon.model]
  );

  const wagonRender = $derived(WAGON_RENDER[gameState.wagon.model]);
  const wagonY = $derived(GROUND_Y - wagonGroundOffset * SCENE_SCALE);

  // ---------- ox team placement ----------
  // OxTeam draws its pole tip at its own (0, -11.5). The wrapping
  // <g translate(wagonTongueTipSceneX, GROUND_Y) scale(SCENE_SCALE)>
  // puts that pole tip at the wagon's tongue-tip; pairs extend
  // leftward (negative x). Origin convention changed in #158 — the
  // team no longer takes anchorX/wagonHookX, just wraps in a translate.
  const liveOxen = $derived(gameState.oxen.filter((o) => o.health > 0));
  const deadCount = $derived(gameState.party.filter((m) => m.dead).length);
  const oxCount = $derived(Math.max(1, Math.min(6, liveOxen.length)));
  const isMule = $derived(liveOxen.length > 0 && liveOxen[0].kind === 'mule');

  // Tongue tip in wagon-local X, computed from the dev-view "saved fit"
  // (/dev/wagon-detail, 2026-05-12). The chain stretches with team size:
  // each ox pair adds one TONGUE_PER_PAIR step to the lead anchor. For
  // a 4-ox team (2 pairs) the tip lands at -36 — empirically the right
  // spot to attach the rear pair to the wagon's painted tongue while
  // the lead pair walks ahead.
  const DEFAULT_TONGUE_BASE = 10.5;   // was -12 — Dave's dialed-in fit 2026-05-12 b
  const DEFAULT_TONGUE_PER_PAIR = -12;
  const tongueBase = $derived(tuning?.tongueBase ?? DEFAULT_TONGUE_BASE);
  const tonguePerPair = $derived(tuning?.tonguePerPair ?? DEFAULT_TONGUE_PER_PAIR);
  const numPairs = $derived(Math.ceil(oxCount / 2));
  const wagonTongueTipWagonX = $derived(tongueBase + tonguePerPair * numPairs);
  const wagonTongueTipSceneX = $derived(WAGON_X + wagonTongueTipWagonX * SCENE_SCALE);

  // ---------- addons ----------
  const addons = $derived({
    // Blender-rendered wagon body / driver / ox-team are the production
    // default (matches /dev/wagon-view's checkbox defaults). The dev
    // viewer can still toggle them off via addonsOverride for SVG-mode
    // debugging.
    useBlenderBody: true,
    useBlenderDriver: true,
    useBlenderTeam: true,
    driver: true,
    kegs: wagonRender.defaultKegs,
    coop: gameState.inventory.chicken ?? 0,
    // WagonShadows handles ground shadows for the whole composite in
    // WagonScene (#956). Suppress PrairieSchooner's inline ellipse so we
    // don't double-shadow. Dev sandboxes that mount the wagon SVG without
    // WagonScene still get the inline shadow via their own addons.
    showGroundShadow: false,
    ...(addonsOverride ?? {})
  });

  const WagonComponent = $derived(wagonRender.Component);

  // Note: time-of-day washes (the flat alpha rect for night / dusk) were
  // removed because the travel scene's pacing is days, not hours — cycling
  // sky tints across travel ticks felt jittery. Weather is the multi-day
  // mood lever; see BackdropPainting's WEATHER_VARIANT_MAP. The
  // `timeOfDay` prop is still threaded through for SVG-mode SkyGradient /
  // SkyAccent (dev-viewer fallback only).
</script>

<div class="status panel">
  <div class="landscape">
    <!-- Hero viewBox (#212): 400 SVG-units of vertical content matched
         to the 1280:400 container aspect — preserveAspectRatio="none" no
         longer stretches anything since SVG aspect now equals container
         aspect. Vertical band y 200..600 in scene coords:
           sky        y=200..380  (45%)
           horizon    y=380..480  (25%)
           wagon      y=480..540  (15%)
           ground     y=540..600  (15%)
         Sun (y=410) sits ~52% from top; ground band visible past wagon. -->
    <svg viewBox="0 200 {SCENE_W} 400" preserveAspectRatio="none">
      <defs>
        <SkyGradient id="ws-sky" terrain={gameState.location.terrain} {timeOfDay} />
      </defs>

      {#if useSvgLayers}
        <!-- 1. sky gradient — SVG mode only. The painted backdrop and the
             4-layer rig both contain their own sky; this rect would be
             hidden under them. -->
        <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill="url(#ws-sky)" />

        <!-- 2. sun / moon — left side (clear of wagon) at y=410.
             SVG mode only; painting modes have the sun painted in. -->
        <SkyAccent kind={weatherKind} x={SCENE_W * 0.18} y={410} t={tEff} />

        <!-- 3. clouds — SVG mode only; painting modes have clouds painted in. -->
        <CloudLayer kind={weatherKind} {scrollX} w={SCENE_W} skyH={HORIZON_Y} bandY={400} />
      {/if}

      <!-- 4. backdrop — two modes:
             default: BackdropPainting (single horizon-vista painting)
             ?svg=1:  SVG Far + Mid + Near layers (legacy fallback) -->
      {#if useSvgLayers}
        <FarLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} />
      {:else}
        <BackdropPainting terrain={gameState.location.terrain}
                          weather={gameState.weather}
                          {scrollX} horizonY={HORIZON_Y} groundY={GROUND_Y}
                          variant={backdropVariant} />
      {/if}

      <!-- 5. landmarks — game-progress markers. Currently SVG-mode only.
           TODO (approach-backdrop concept): wire landmarks back into the
           painting path as visible features. The vision is bespoke
           painted backdrops loaded when the wagon is near a named
           landmark, so the landmark appears in the horizon / mid-distance
           of the painted scene itself rather than as an SVG overlay.
           Suppressed in painting + 4-layer modes for now (the SVG glyphs
           clash against painted backdrops; a couple were "popping in"
           during scroll). -->
      {#if useSvgLayers}
        <LandmarkLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} />
      {/if}

      {#if useSvgLayers}
        <!-- 6. mid parallax — SVG mode only -->
        <MidLayer terrain={gameState.location.terrain} {scrollX} horizonY={HORIZON_Y} groundY={GROUND_Y} />
      {/if}

      <!-- 7. ground band — always rendered. Sits on top of the painted
           backdrop's own ground in painting mode; the visible separation
           between painted backdrop and the SVG ground band is intentional
           (the wagon plants on the ground band, not the painting). The
           `?groundtex=1` toggle (TODO #32 Phase A) replaces the gradient
           with a seamless biome texture; scrollX drives the pattern
           translate so the ground reads as moving with the wagon. -->
      <GroundBand terrain={gameState.location.terrain} groundY={GROUND_Y}
                  h={SCENE_H - GROUND_Y} w={SCENE_W} {scrollX} idPrefix="ws"
                  milesTraveled={gameState.location.milesTraveled}
                  deathCount={deadCount} />

      {#if useSvgLayers}
        <!-- 8. near parallax — SVG mode only -->
        <NearLayer terrain={gameState.location.terrain} {scrollX} groundY={GROUND_Y} />
      {/if}

      <!-- 8.5. wagon + ox ground shadows (#956). Drawn ON TOP of the
           painted ground band + near parallax, UNDER the wagon + ox
           composite (#9). Shadows stay planted on GROUND_Y while the
           wagon/ox bodies bob via teamBob. -->
      <WagonShadows wagonX={WAGON_X} tongueTipX={wagonTongueTipSceneX}
                    {oxCount} groundY={GROUND_Y} sceneScale={SCENE_SCALE}
                    offsetX={tuning?.shadowOffsetX}
                    offsetY={tuning?.shadowOffsetY}
                    pairOffsetX={tuning?.shadowPairOffsetX}
                    wagonRx={tuning?.shadowWagonRx}
                    wagonRy={tuning?.shadowWagonRy}
                    pairRx={tuning?.shadowPairRx}
                    pairRy={tuning?.shadowPairRy}
                    opacity={tuning?.shadowOpacity}
                    blurStdDev={tuning?.shadowBlur} />

      <!-- 9. wagon — rides the team bob via a y-offset on the translate,
           so it settles together with the hitched mass. Drawn BEFORE
           the ox team so the rear oxen visually cover the tongue tip
           and harness hitching where they overlap. -->
      <g transform="translate({WAGON_X} {wagonY + teamBob * SCENE_SCALE}) scale({SCENE_SCALE})">
        <WagonComponent
          angle={wheelAngle}
          bounce={roughTerrainBounce}
          health={gameState.wagon.condition}
          t={tEff}
          {addons}
        />
      </g>

      <!-- 10. ox/mule team — pole tip lands at wagonTongueTipSceneX.
           Drawn AFTER the wagon so the oxen sit on top of the tongue. -->
      <g transform="translate({wagonTongueTipSceneX} {GROUND_Y}) scale({SCENE_SCALE})">
        <OxTeam
          count={oxCount}
          {isMule}
          {gaitPhase}
          gait={paused ? 'stopped' : 'walking'}
          useBlenderTeam={addons.useBlenderTeam}
        />
      </g>

      <!-- 11. precipitation + 12. storm vignette -->
      <PrecipOverlays t={tEff} w={SCENE_W} h={SCENE_H} groundY={GROUND_Y}
                      showRain={weatherKind === 'rainy'}
                      showSnow={weatherKind === 'snowy'}
                      {showLightning} />
      <StormVignette kind={weatherKind} isStorm={showLightning} w={SCENE_W} h={SCENE_H} />
    </svg>
  </div>
</div>

<style>
  .status {
    display: flex;
    flex-direction: column;
    padding: 0.4em 0.5em;
    border: var(--bw-2) solid var(--of-ink-soft);
    border-radius: var(--r-sm);
    background: var(--of-paper-soft);
    gap: 0.35em;
  }
  /* Hero strip (#212): 1280:400 (~3.2:1) so the wagon scene reads as
     the page's star, not a thin band. SVG viewBox now matches at
     1280:400 (0 200 1280 400) so preserveAspectRatio="none" doesn't
     visibly stretch anything — content is shown at its natural ratio.
     Bespoke art (3072×960 painted backdrops sized for the hero) is
     queued under #156/#157/#159. */
  .landscape {
    position: relative;
    width: 100%;
    aspect-ratio: 1280 / 400;
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
