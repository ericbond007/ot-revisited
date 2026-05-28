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
    /** Per-tunable overrides (wagon-local units). All optional; defaults
     *  match the production-locked values. /dev/wagon-view exposes
     *  sliders for each. */
    offsetX?: number;          // whole-set X nudge in wagon-local units (wagon + pair)
    offsetY?: number;          // shadow Y nudge in wagon-local units (both wagon + pair)
    pairOffsetX?: number;      // pair-shadow-ONLY extra X nudge — slide to widen
                               // or tighten the gap between wagon shadow and the
                               // ox-pair shadows. + = toward wagon, − = away
    wagonRx?: number;          // wagon-shadow half-width ("wheelbase")
    wagonRy?: number;          // wagon-shadow half-height
    pairRx?: number;           // ox-pair-shadow half-width ("length")
    pairRy?: number;           // ox-pair-shadow half-height
    opacity?: number;          // 0..1 ("darkness")
    blurStdDev?: number;       // Gaussian blur sigma ("weight" / softness)
  }

  let {
    wagonX, tongueTipX, oxCount, groundY, sceneScale,
    // Defaults are Dave's dialed-in fit (#956 sandbox 2026-05-27).
    offsetX = 16.5,
    offsetY = 7.5,
    pairOffsetX = -12,
    wagonRx = 17,
    wagonRy = 3.7,
    pairRx = 11.5,
    pairRy = 2.9,
    opacity = 0.98,
    blurStdDev = 8,
  }: Props = $props();

  // All wagon-local size values scale by SCENE_SCALE to land in scene coords.
  const wagonShadowRx = $derived(wagonRx * sceneScale);
  const wagonShadowRy = $derived(wagonRy * sceneScale);
  const pairShadowRx = $derived(pairRx * sceneScale);
  const pairShadowRy = $derived(pairRy * sceneScale);
  const shadowCx = $derived(wagonX + offsetX * sceneScale);
  const shadowCy = $derived(groundY + offsetY * sceneScale);

  // Match the OX_INK color (#3a1a08) used in the SVG ox path. Color stays
  // fixed; "darkness" is exposed via opacity.
  const SHADOW_FILL = '#1a0904';

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
       trail surface. -->
  <filter id="wagon-shadow-blur" x="-20%" y="-50%" width="140%" height="200%">
    <feGaussianBlur stdDeviation={blurStdDev} />
  </filter>
</defs>

<g filter="url(#wagon-shadow-blur)">
  <!-- wagon body shadow — sits under the wagon center -->
  <ellipse
    cx={shadowCx}
    cy={shadowCy}
    rx={wagonShadowRx}
    ry={wagonShadowRy}
    fill={SHADOW_FILL}
    {opacity}
  />
  <!-- one shadow per ox pair — pairOffsetX shifts pairs RELATIVE to the
       wagon shadow so the gap between them can be tuned independently. -->
  {#each pairs as cx (cx)}
    <ellipse
      cx={cx + (offsetX + pairOffsetX) * sceneScale}
      cy={shadowCy}
      rx={pairShadowRx}
      ry={pairShadowRy}
      fill={SHADOW_FILL}
      {opacity}
    />
  {/each}
</g>
