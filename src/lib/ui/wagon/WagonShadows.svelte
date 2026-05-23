<script lang="ts">
  // Ground-shadow ellipses for the wagon + ox team composite. Renders
  // BETWEEN the ground band (#7) and the wagon (#9) so the wagon and
  // oxen visually stand ON their shadows. One ellipse per ox pair plus
  // one wider ellipse under the wagon body. Shadows DO NOT bob with
  // the teamBob — they stay planted while the bodies rise and fall.
  //
  // Sized in wagon-scene local coords, scaled by SCENE_SCALE via the
  // wrapping <g> in WagonScene.
  import { PAIR_SPACE } from './ox-team/ox-team-tokens';

  interface Props {
    /** Scene-X of the wagon center (wagonX in WagonScene). */
    wagonX: number;
    /** Scene-X of the front of the ox team (wagonTongueTipSceneX). */
    tongueTipX: number;
    /** Number of live oxen (1..6). */
    oxCount: number;
    /** Ground Y in scene coords. */
    groundY: number;
    /** Same scale factor WagonScene uses for body transforms. */
    sceneScale: number;
  }

  let { wagonX, tongueTipX, oxCount, groundY, sceneScale }: Props = $props();

  // Wagon shadow: ellipse under the wagon body footprint. The wagon's
  // wheel-to-wheel span is ~26 scene-local units (matches PrairieSchooner
  // viewBox), so rx ~= 13 * SCENE_SCALE. Squash via low ry to read as a
  // ground projection rather than a bubble.
  const WAGON_SHADOW_RX = 13 * sceneScale;
  const WAGON_SHADOW_RY = 2.5 * sceneScale;

  // Ox pair shadow: one ellipse covering both oxen in a pair. PAIR_SPACE
  // is 24 wagon-local units — slightly narrower (rx ~= 9) keeps the
  // shadow under the oxen's hooves without bleeding outward.
  const PAIR_SHADOW_RX = 9 * sceneScale;
  const PAIR_SHADOW_RY = 1.6 * sceneScale;

  // Match the OX_INK color (#3a1a08) used in the SVG ox path. Opacity
  // bumped above the SVG-ox baseline (0.34) because the painted ground
  // strip's flower/grass/trail detail competes with a darker shadow —
  // the SVG-mode flat gradient ground was a more contrasty backdrop.
  const SHADOW_FILL = '#1a0904';
  const SHADOW_OPACITY = 0.55;

  // Compute one shadow per ox pair. OxTeam lays out pairs at local x =
  // -(p * PAIR_SPACE) - PAIR_SPACE * 0.5, then the whole team is
  // translated to tongueTipX. We mirror that math here so the shadow
  // lands directly under each pair regardless of team size.
  const numPairs = $derived(Math.ceil(Math.max(1, Math.min(6, oxCount)) / 2));
  const pairs = $derived(
    Array.from({ length: numPairs }, (_, p) => {
      const localX = -(p * PAIR_SPACE) - PAIR_SPACE * 0.5;
      return tongueTipX + localX * sceneScale;
    })
  );
</script>

<defs>
  <!-- Soft gaussian blur so the ellipse edge fades into the ground
       instead of presenting a hard cartoon outline against the painted
       trail surface. Std-dev tuned at SCENE_SCALE=4. -->
  <filter id="wagon-shadow-blur" x="-20%" y="-50%" width="140%" height="200%">
    <feGaussianBlur stdDeviation="3" />
  </filter>
</defs>

<g filter="url(#wagon-shadow-blur)">
  <!-- wagon body shadow — sits under the wagon center -->
  <ellipse
    cx={wagonX}
    cy={groundY}
    rx={WAGON_SHADOW_RX}
    ry={WAGON_SHADOW_RY}
    fill={SHADOW_FILL}
    opacity={SHADOW_OPACITY}
  />
  <!-- one shadow per ox pair -->
  {#each pairs as cx (cx)}
    <ellipse
      {cx}
      cy={groundY}
      rx={PAIR_SHADOW_RX}
      ry={PAIR_SHADOW_RY}
      fill={SHADOW_FILL}
      opacity={SHADOW_OPACITY}
    />
  {/each}
</g>
