<script lang="ts">
  // Prairie schooner — the iconic Oregon Trail wagon. Longer bed (~30
  // wide), big arched canvas, 10-spoke front and 12-spoke rear wheels
  // (front is smaller), flared sideboards, sloped ends.
  //
  // Surfaces use raster pattern fills (option 4 per
  // docs/historical-pass/10-wagon-format-decision.md):
  //   - bed sides → blue-paint texture (when addons.painted) over a
  //     wood underlayer; otherwise weathered-wood for bare 1840s wagon
  //   - tongue, axle, reach, jockey box, feed trough, accessory pails →
  //     weathered-wood (unpainted structural wood)
  //   - canvas (in CanvasTop) → flat fill (separate component)
  //   - rust-iron used for wear-overlay layers, not fresh-state iron
  //
  // Side-of-wagon hardware checklist (doc 06 §3, doc 08):
  //   * jockey toolbox at front of bed (iron-banded)
  //   * water keg(s) on the side (delegated to WaterKeg.svelte)
  //   * tar bucket dangling on a chain from the rear axle
  //   * butter pail SLUNG UNDER between axles (when butterChurn > 0)
  //   * feed trough folded against the rear bed during travel
  //   * doubletree at the tongue tip (iron-banded crosspiece)
  //   * milk-cow placeholder anchor behind the wagon (when milkCow > 0)
  //   * driver figure on the bench seat (delegated to Driver.svelte)
  //   * chicken coop strapped to the rear (delegated to ChickenCoop.svelte)
  //
  // Wear-overlay group at the end renders patches/rust-streaks/mud-cake
  // shapes scaled by `dmg.canvas` (0..4) and `dmg.dirt` (0..2).
  import {
    healthToDamage,
    W_INK,
    W_IRON,
    W_RUST,
    W_WOOD,
    W_WOOD_DARK,
    W_WOOD_LIGHT,
    W_CANVAS_PATCH,
    type WagonAddons
  } from './wagon-tokens';
  import HistoricalWheel from './HistoricalWheel.svelte';
  import CanvasTop from './CanvasTop.svelte';
  import Driver from './Driver.svelte';
  import WaterKeg from './WaterKeg.svelte';
  import ChickenCoop from './ChickenCoop.svelte';
  import CoopFeathers from './CoopFeathers.svelte';

  interface Props {
    angle?: number;
    bounce?: number;
    health?: number;
    addons?: WagonAddons;
    /** Animation tick in seconds. Drives feather emission off the coop
     *  (and any future time-driven animation in the wagon body). */
    t?: number;
    /** Render the canvas top? Defaults true. The dev viewer turns it
     *  off so you can see what's inside the wagon (water kegs etc). */
    showCanvas?: boolean;
    /** Use the FLUX-rendered painterly raster body instead of the
     *  hand-authored SVG bed+canvas+wheels. Hybrid+ approach: maximum
     *  visual fidelity for the wagon body, with SVG overlays handling
     *  the animated parts (butter pail swing, coop feathers, ox team).
     *  Defaults false (legacy SVG path) for fallback compatibility. */
    useFluxBody?: boolean;
  }

  let {
    angle = 0,
    bounce = 0,
    health = 100,
    addons = {},
    t = 0,
    showCanvas = true,
    useFluxBody = false
  }: Props = $props();

  const dmg = $derived(healthToDamage(health));
  const painted = $derived(addons.painted === true);
  const tarBucketOn = $derived(addons.tarBucket !== false);

  // Pattern sizes in user-space SVG units. Smaller = more visible tiling
  // but more readable features per tile; larger = less obvious tiling
  // but features get compressed. 8 SVG units works as a balance for
  // both wood and paint patterns at the wagon's typical render scale.
  const PAT_SIZE = 8;
  const PAT_SIZE_SM = 5;

  const bedW = 30;
  // bedH = 8 (was 5 → 7 → 8) — period 1840s prairie schooners had
  // bed-side panels that descended TO the axle line itself; the wheel
  // hub sits at the bed-bottom edge. Wheel center is at wheelY=6, so
  // bedH=8 with bedY=-2 gives bedBotY=6, putting the bed bottom flush
  // with the axle (Hansen replicas, Scotts Bluff photos confirm).
  const bedH = 8;
  const bedX = -bedW / 2;
  const bedY = -2;

  // Flared sides: top of bed is wider than bottom (classic schooner).
  const flare = 1.2;
  const bedTopL = bedX - flare;
  const bedTopR = bedX + bedW + flare;
  const bedTopY = bedY;
  const bedBotY = bedY + bedH;

  const wheelFrontR = 4.4;
  const wheelBackR = 6.0;
  const wheelY = 6;

  // Tongue endpoint (front of clevis), reused by tongue line + doubletree.
  const tongueTipX = bedX - 16;
  const tongueTipY = bedY + 5.5;
  const tongueRootX = bedX + 5;
  const tongueRootY = wheelY + 0.2;

  // Plank seam x-coords (ratios match the JSX original).
  const seamRatios = [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88];
  const hlRatios = [0.13, 0.23, 0.33, 0.43, 0.53, 0.63, 0.73, 0.83];
  const boltRatios = [0.33, 0.66];

  type Seam = { topX: number; topY: number; px: number; idx: number };
  const seamLines = $derived.by<Seam[]>(() => {
    return seamRatios.map((t, i) => {
      const px = bedX + bedW * t;
      const topX = bedTopL + (bedTopR - bedTopL) * (px - bedX) / bedW;
      const topY = bedTopY - 0.3 + Math.abs(t - 0.5) * 0.3;
      return { topX, topY, px, idx: i };
    });
  });
  type Hl = { topX: number; px: number; idx: number };
  const hlLines = $derived.by<Hl[]>(() =>
    hlRatios.map((t, i) => {
      const px = bedX + bedW * t;
      const topX = bedTopL + (bedTopR - bedTopL) * (px - bedX) / bedW;
      return { topX, px, idx: i };
    })
  );

  // Wear-overlay distributions. Patches are irregular quads scattered
  // across the bed sides + canvas-adjacent areas; counts approximate
  // doc 09's wear-progression cues (1/3/6/many at canvas levels 1..4).
  type Patch = { d: string; idx: number };
  const patchShapes = $derived.by<Patch[]>(() => {
    const allPatches: string[] = [
      // Each path is an irregular quad anchored relative to the bed.
      // (Authored by hand — these positions look "scattered organic"
      // rather than evenly distributed.)
      `M${bedX + bedW * 0.18} ${bedTopY + 1.2} l1.6 -0.3 l0.4 1.4 l-1.7 0.5 z`,
      `M${bedX + bedW * 0.42} ${bedTopY + 0.7} l2.0 0.2 l-0.2 1.6 l-2.1 -0.1 z`,
      `M${bedX + bedW * 0.62} ${bedTopY + 1.6} l1.4 -0.4 l0.5 1.3 l-1.3 0.6 z`,
      `M${bedX + bedW * 0.78} ${bedTopY + 0.9} l1.7 0.1 l-0.1 1.5 l-1.8 0.0 z`,
      `M${bedX + bedW * 0.30} ${bedTopY + 2.6} l1.5 -0.2 l0.3 1.3 l-1.5 0.3 z`,
      `M${bedX + bedW * 0.55} ${bedTopY + 2.9} l1.8 0.3 l-0.2 1.2 l-1.7 -0.2 z`,
      `M${bedX + bedW * 0.10} ${bedTopY + 2.1} l1.4 0.0 l0.2 1.5 l-1.5 0.1 z`,
      `M${bedX + bedW * 0.86} ${bedTopY + 2.4} l1.3 -0.2 l0.4 1.4 l-1.3 0.4 z`
    ];
    const count =
      dmg.canvas === 0 ? 0 :
      dmg.canvas === 1 ? 1 :
      dmg.canvas === 2 ? 3 :
      dmg.canvas === 3 ? 6 :
      allPatches.length;
    return allPatches.slice(0, count).map((d, idx) => ({ d, idx }));
  });

  // Rust streaks — short downward strokes from each iron mid-band /
  // corner-strap origin. Show progressively at canvas level >= 2.
  type Streak = { d: string; idx: number };
  const rustStreaks = $derived.by<Streak[]>(() => {
    if (dmg.canvas < 2) return [];
    const origins: Array<{ x: number; y: number; len: number }> = [
      { x: bedX + bedW * 0.33, y: bedTopY + 0.3, len: 1.4 },
      { x: bedX + bedW * 0.66, y: bedTopY + 0.3, len: 1.6 },
      { x: bedX + 0.5,         y: bedTopY + 0.6, len: 1.2 },
      { x: bedX + bedW - 0.5,  y: bedTopY + 0.6, len: 1.3 }
    ];
    const out: Streak[] = [];
    const max = dmg.canvas === 2 ? 2 : dmg.canvas === 3 ? 3 : 4;
    origins.slice(0, max).forEach((o, idx) => {
      out.push({
        d: `M${o.x} ${o.y} q-0.05 ${o.len * 0.5} 0.05 ${o.len} q0.1 0.4 -0.05 0.6`,
        idx
      });
    });
    return out;
  });

  // Mud cake — thick smear along the lower bed at dirt level >= 1, with
  // an extra layer of crud at level 2.
  const mudPathLight = $derived(
    `M${bedX + 0.5} ${bedBotY - 0.7}
     q2 0.4 4 0.0
     q2 -0.3 4 0.1
     q2 0.5 4 0.2
     q2 -0.4 4 0.0
     q2 0.4 4 0.1
     q2 -0.2 4 0.3
     q2 0.5 4 0.0
     l0.5 0.6 l-29 0.2 z`
  );
  const mudPathHeavy = $derived(
    `M${bedX} ${bedBotY - 1.4}
     q3 1.0 6 0.2
     q3 -0.6 6 0.3
     q3 0.7 6 0.0
     q3 -0.4 6 0.4
     q3 0.5 6 0.1
     l0 1.7 l-30 0 z`
  );

  // Butter pail anchor — slung between axles, hung on a rope from
  // the bed underside. Sits in the narrow gap between bed bottom and
  // ground. churnPailY is the pail's TOP (rope ends there). With
  // bedBotY=6 and wheel bottom at 12, position pail at y≈7..8.5
  // (just below bed, well above ground).
  const churnX = $derived(bedX + bedW * 0.5);
  const churnTopY = $derived(bedBotY + 0.1);
  const churnPailY = $derived(bedBotY + 1.0);

  // Tar bucket anchor — hung from the rear axle stub by a short chain
  // (~6 inch / 0.8 SVG units). The bucket sits AT axle level (wheelY),
  // not dangling far below — period photos show it close to the axle
  // for accessibility during hub-greasing stops.
  const tarX = $derived(bedX + bedW + 2.0);
  const tarTopY = $derived(wheelY - 0.4);
  const tarBucketY = $derived(wheelY + 0.2);

  // Butter pail swing — the wagon's motion churns the milk into butter
  // by rocking the pail from side to side. Pendulum motion, slow period
  // (~1.6s), small amplitude (~6°). Driven by the parent's `t` tick.
  // Frozen when paused (t doesn't advance).
  const churnSwingDeg = $derived(Math.sin(t * Math.PI * 1.25) * 6);

  // Milk-cow anchor (placeholder rect — to be replaced by MilkCow.svelte).
  const cowX = $derived(bedTopR + 6.5);
  const cowY = $derived(wheelY + 1.0);
</script>

<g transform="translate(0 {bounce})">
{#if addons.useBlenderBody}
  <!-- BLENDER BODY MODE — render Blender-rendered body PNG (no wheels)
       and overlay an animated wheel-frame PNG on top. 12 wheel frames
       cycle through one rotation; selected by `angle` (0-360°). -->
  {#if addons.showGroundShadow !== false}
    <ellipse cx="0" cy="11.8" rx={bedW / 2 + 6} ry="1.6" fill={W_INK} opacity="0.32" />
  {/if}
  <!-- 24 wheel frames cover a full 360° rotation (15°/frame). Wrap is
       lossless (frame 24 = frame 0 exact rotation) so there's no
       symmetry-based loop snap. Union 1430×571 (aspect 2.50).
       ?v=5 cache-bust — bump on re-renders. -->
  <image href="/wagon-bg/wagon-blender/prairie-schooner-body--nowheels.png?v=5"
         x="-32" y="-13" width="65" height="26.0"
         preserveAspectRatio="xMidYMid meet" />
  {#if addons.showWheels !== false}
    {@const wheelFrame = String(Math.floor(((angle % 360 + 360) % 360) / 360 * 24) % 24).padStart(2, '0')}
    <image href="/wagon-bg/wagon-blender/prairie-schooner-wheels-frames/wheel--{wheelFrame}.png?v=5"
           x="-32" y="-13" width="65" height="26.0"
           preserveAspectRatio="xMidYMid meet" />
  {/if}
  {#if addons.driver}
    <!-- Blender-driver default offsets (dialed in 2026-05-07): the
         cowboy PNG's hip anchor lands ~20 wagon-units ahead and ~2.6
         above bedTopL/bedTopY, scaled 1.8× for human-to-wagon ratio.
         Override via addons.driverDx/Dy/Scale. -->
    <Driver x={bedTopL - 2} y={bedTopY - 0.2} variant="schooner"
            useBlender={addons.useBlenderDriver}
            dx={addons.driverDx ?? (addons.useBlenderDriver ? 19.7 : 0)}
            dy={addons.driverDy ?? (addons.useBlenderDriver ? -2.6 : 0)}
            scale={addons.driverScale ?? (addons.useBlenderDriver ? 1.8 : 1)} />
  {/if}
{:else if useFluxBody}
  <!-- HYBRID+ FLUX BODY MODE — painterly raster sprite covers the wagon
       bed, canvas, wheels, tongue, and doubletree. Animated overlays
       (butter pail, coop feathers) and game-state-driven addons (driver,
       chicken coop, milk cow) still render as SVG ON TOP of this image. -->
  <ellipse cx="0" cy="11.8" rx={bedW / 2 + 6} ry="1.6" fill={W_INK} opacity="0.32" />

  <!-- The FLUX body sprite is 1536×640 (2.4:1). Composited at width=50,
       height=21 to roughly match the wagon's full horizontal span (tongue
       tip to rear) and vertical span (canvas top to wheel bottom).
       preserveAspectRatio="xMidYMid meet" preserves the painted aspect
       within those bounds. -->
  <image href="/wagon-bg/wagon-body/prairie-schooner--fresh.png"
         x="-32" y="-10" width="50" height="22"
         preserveAspectRatio="xMidYMid meet" />

  <!-- Butter pail swing — SVG overlay so the swing animation works. -->
  {#if (addons.butterChurn ?? 0) > 0}
    <g transform="rotate({churnSwingDeg} {churnX} {churnTopY})">
      <line x1={churnX - 0.6} y1={churnTopY} x2={churnX - 0.6} y2={churnPailY - 0.2}
            stroke={W_WOOD_DARK} stroke-width="0.18" />
      <line x1={churnX + 0.6} y1={churnTopY} x2={churnX + 0.6} y2={churnPailY - 0.2}
            stroke={W_WOOD_DARK} stroke-width="0.18" />
      <rect x={churnX - 1.0} y={churnPailY - 0.2} width="2.0" height="1.7"
            fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.3" rx="0.15" />
      <line x1={churnX - 1.0} y1={churnPailY + 0.1} x2={churnX + 1.0} y2={churnPailY + 0.1}
            stroke={W_IRON} stroke-width="0.18" />
      <line x1={churnX - 1.0} y1={churnPailY + 1.2} x2={churnX + 1.0} y2={churnPailY + 1.2}
            stroke={W_IRON} stroke-width="0.18" />
      <rect x={churnX - 1.05} y={churnPailY - 0.45} width="2.1" height="0.35"
            fill={W_WOOD_DARK} stroke={W_INK} stroke-width="0.2" />
      <rect x={churnX - 1.0} y={churnPailY - 0.2} width="2.0" height="1.7"
            fill="url(#ps-pail-shade)" rx="0.15" />
    </g>
  {/if}

  <!-- Chicken coop + feathers (game-state visible) -->
  {#if (addons.coop ?? 0) > 0}
    <ChickenCoop x={bedX + bedW + 4.0} y={bedBotY - 0.5} size="md"
                 chickens={Math.min(5, addons.coop ?? 0)} />
    <CoopFeathers x={bedX + bedW + 4.0} y={bedBotY - 0.5 - 3.5} {t}
                  chickens={addons.coop ?? 0} />
  {/if}

  <!-- Milk cow placeholder -->
  {#if (addons.milkCow ?? 0) > 0}
    <g>
      <rect x={cowX - 2.5} y={cowY - 1.5} width="5" height="3"
            fill="#7a4a2a" stroke={W_INK} stroke-width="0.3" rx="0.4" />
      <circle cx={cowX - 2.8} cy={cowY - 1.0} r="1.0"
              fill="#7a4a2a" stroke={W_INK} stroke-width="0.3" />
      <line x1={cowX - 1.5} y1={cowY + 1.5} x2={cowX - 1.5} y2={cowY + 3.5}
            stroke={W_INK} stroke-width="0.5" />
      <line x1={cowX + 1.5} y1={cowY + 1.5} x2={cowX + 1.5} y2={cowY + 3.5}
            stroke={W_INK} stroke-width="0.5" />
      <line x1={bedTopR + 0.5} y1={bedBotY + 0.2} x2={cowX - 2.0} y2={cowY - 0.5}
            stroke="#8a6a3a" stroke-width="0.2" />
    </g>
  {/if}
{:else}
  <defs>
    <!-- Painterly pattern fills. PNG sources at static/wagon-bg/wagon-tex-flux/. -->
    <pattern id="ps-blue-paint" patternUnits="userSpaceOnUse"
             x="0" y="0" width={PAT_SIZE} height={PAT_SIZE}>
      <image href="/wagon-bg/wagon-tex-flux/blue-paint.png"
             x="0" y="0" width={PAT_SIZE} height={PAT_SIZE}
             preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <pattern id="ps-wood" patternUnits="userSpaceOnUse"
             x="0" y="0" width={PAT_SIZE} height={PAT_SIZE}>
      <image href="/wagon-bg/wagon-tex-flux/weathered-wood.png"
             x="0" y="0" width={PAT_SIZE} height={PAT_SIZE}
             preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <!-- Smaller-tile wood for chunk-y accessories (jockey box, pails). -->
    <pattern id="ps-wood-sm" patternUnits="userSpaceOnUse"
             x="0" y="0" width={PAT_SIZE_SM} height={PAT_SIZE_SM}>
      <image href="/wagon-bg/wagon-tex-flux/weathered-wood.png"
             x="0" y="0" width={PAT_SIZE_SM} height={PAT_SIZE_SM}
             preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <pattern id="ps-rust" patternUnits="userSpaceOnUse"
             x="0" y="0" width={PAT_SIZE_SM} height={PAT_SIZE_SM}>
      <image href="/wagon-bg/wagon-tex-flux/rust-iron.png"
             x="0" y="0" width={PAT_SIZE_SM} height={PAT_SIZE_SM}
             preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <pattern id="ps-leather" patternUnits="userSpaceOnUse"
             x="0" y="0" width={PAT_SIZE_SM} height={PAT_SIZE_SM}>
      <image href="/wagon-bg/wagon-tex-flux/leather-harness.png"
             x="0" y="0" width={PAT_SIZE_SM} height={PAT_SIZE_SM}
             preserveAspectRatio="xMidYMid slice" />
    </pattern>

    <!-- Subtle vertical shading on the bed: top is hit by sunlight,
         bottom is in self-shadow. Layered ON TOP of the wood/paint
         pattern fill so the wagon reads dimensional. -->
    <linearGradient id="ps-bed-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.18" />
      <stop offset="40%"  stop-color="#ffffff" stop-opacity="0.0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.32" />
    </linearGradient>
    <!-- Round-pail vertical shade for accessory pails (tar, butter). -->
    <linearGradient id="ps-pail-shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.45" />
      <stop offset="35%"  stop-color="#000000" stop-opacity="0.0" />
      <stop offset="65%"  stop-color="#ffffff" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.32" />
    </linearGradient>
    <!-- Clip mask — anything inside this rect is visible; anything
         below bedTopY (i.e. inside the bed walls) is clipped out.
         Used by the in-cargo water kegs so their bodies are hidden by
         the bed wall and only the keg heads poke above the rail. -->
    <clipPath id="ps-above-rail">
      <rect x="-50" y="-50" width="100" height={50 + bedTopY} />
    </clipPath>
  </defs>

  <ellipse cx="0" cy="11.8" rx={bedW / 2 + 6} ry="1.6" fill={W_INK} opacity="0.32" />

  <!-- TONGUE (forward-extending pole for hitching team) -->
  <line x1={tongueRootX} y1={tongueRootY} x2={tongueTipX} y2={tongueTipY}
        stroke={W_WOOD_DARK} stroke-width="1" stroke-linecap="round" />
  <line x1={tongueRootX} y1={tongueRootY} x2={tongueTipX} y2={tongueTipY}
        stroke={W_INK} stroke-width="0.4" stroke-linecap="round" opacity="0.6" />

  <!-- DOUBLETREE — iron-bound crosspiece at the tongue tip. Two
       singletrees pivot off it; the team's chains attach there, not
       directly to the tongue. (doc 06 §2) -->
  <g>
    <!-- iron clevis socket where the tongue meets the doubletree -->
    <rect x={tongueTipX - 0.7} y={tongueTipY - 0.4} width="1.4" height="0.9"
          fill={W_IRON} stroke={W_INK} stroke-width="0.18" />
    <!-- doubletree wood crossbar (vertical from team's POV; we see it edge-on) -->
    <rect x={tongueTipX - 1.2} y={tongueTipY - 1.6} width="0.9" height="3.6"
          fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.25" />
    <!-- iron bands around the doubletree ends -->
    <rect x={tongueTipX - 1.25} y={tongueTipY - 1.6} width="1.0" height="0.35" fill={W_IRON} />
    <rect x={tongueTipX - 1.25} y={tongueTipY + 1.65} width="1.0" height="0.35" fill={W_IRON} />
    <!-- two singletree pivots (small wood bars hanging off doubletree
         endpoints, where each lead-pair chain attaches) -->
    <rect x={tongueTipX - 2.6} y={tongueTipY - 1.5} width="1.5" height="0.55"
          fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.2" />
    <rect x={tongueTipX - 2.6} y={tongueTipY + 1.0} width="1.5" height="0.55"
          fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.2" />
    <!-- pivot bolts -->
    <circle cx={tongueTipX - 1.0} cy={tongueTipY - 1.25} r="0.22" fill={W_IRON} />
    <circle cx={tongueTipX - 1.0} cy={tongueTipY + 1.25} r="0.22" fill={W_IRON} />
    <!-- hookpoints for team chain on each singletree -->
    <circle cx={tongueTipX - 2.5} cy={tongueTipY - 1.25} r="0.2" fill={W_IRON} />
    <circle cx={tongueTipX - 2.5} cy={tongueTipY + 1.25} r="0.2" fill={W_IRON} />
  </g>

  <!-- (Underbody beams omitted for this rendering: axle is perpendicular
       to the wagon length so it appears edge-on / invisible from a side
       view; the reach beam connecting front and rear axles is mostly
       obscured by the deep bed extending down to nearly axle level.
       Earlier renders drew both as horizontal lines between the wheels
       which looked like a car driveshaft — wagons didn't have those.) -->

  <!-- BUTTER PAIL — slung underneath between axles (period detail; doc
       08 §5). Rendered HERE so the wheel & bed sit on top of the rope.
       Visible only when butterChurn > 0 (the player has the item). -->
  {#if (addons.butterChurn ?? 0) > 0}
    <!-- The whole pail+ropes group rotates around the anchor at
         (churnX, churnTopY) — that's where the rope attaches to the
         bed underside. Pendulum swing churns the milk into butter
         (period "wagon-churned butter trick"). -->
    <g transform="rotate({churnSwingDeg} {churnX} {churnTopY})">
      <!-- rope -->
      <line x1={churnX - 0.6} y1={churnTopY} x2={churnX - 0.6} y2={churnPailY - 0.2}
            stroke={W_WOOD_DARK} stroke-width="0.18" />
      <line x1={churnX + 0.6} y1={churnTopY} x2={churnX + 0.6} y2={churnPailY - 0.2}
            stroke={W_WOOD_DARK} stroke-width="0.18" />
      <!-- pail body (covered, ~1.6 wide × 1.5 tall) -->
      <rect x={churnX - 1.0} y={churnPailY - 0.2} width="2.0" height="1.7"
            fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.3"
            rx="0.15" />
      <!-- iron hoops -->
      <line x1={churnX - 1.0} y1={churnPailY + 0.1} x2={churnX + 1.0} y2={churnPailY + 0.1}
            stroke={W_IRON} stroke-width="0.18" />
      <line x1={churnX - 1.0} y1={churnPailY + 1.2} x2={churnX + 1.0} y2={churnPailY + 1.2}
            stroke={W_IRON} stroke-width="0.18" />
      <!-- lid (the period covered-pail trick) -->
      <rect x={churnX - 1.05} y={churnPailY - 0.45} width="2.1" height="0.35"
            fill={W_WOOD_DARK} stroke={W_INK} stroke-width="0.2" />
      <!-- side shading -->
      <rect x={churnX - 1.0} y={churnPailY - 0.2} width="2.0" height="1.7"
            fill="url(#ps-pail-shade)" rx="0.15" />
    </g>
  {/if}

  <!-- TAR BUCKET — dangling on a chain from the rear axle, between/behind
       the rear wheels. Iconic period detail (doc 08 §2). Always rendered
       unless explicitly suppressed. -->
  {#if tarBucketOn}
    <g>
      <!-- iron chain (short series of dashes) -->
      <line x1={tarX} y1={tarTopY} x2={tarX} y2={tarBucketY - 0.1}
            stroke={W_IRON} stroke-width="0.28" stroke-dasharray="0.25 0.18" />
      <!-- iron handle bow -->
      <path d={`M${tarX - 0.7} ${tarBucketY - 0.05}
                Q${tarX} ${tarBucketY - 0.45} ${tarX + 0.7} ${tarBucketY - 0.05}`}
            stroke={W_IRON} stroke-width="0.25" fill="none" />
      <!-- pail body — squat, dark wood (tar-stained) -->
      <path d={`M${tarX - 0.85} ${tarBucketY}
                L${tarX + 0.85} ${tarBucketY}
                L${tarX + 0.7}  ${tarBucketY + 1.5}
                L${tarX - 0.7}  ${tarBucketY + 1.5} Z`}
            fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.28"
            stroke-linejoin="round" />
      <!-- iron hoops -->
      <line x1={tarX - 0.83} y1={tarBucketY + 0.25} x2={tarX + 0.83} y2={tarBucketY + 0.25}
            stroke={W_IRON} stroke-width="0.18" />
      <line x1={tarX - 0.74} y1={tarBucketY + 1.2} x2={tarX + 0.74} y2={tarBucketY + 1.2}
            stroke={W_IRON} stroke-width="0.18" />
      <!-- tar-stain darken on the lower belly -->
      <path d={`M${tarX - 0.78} ${tarBucketY + 0.6}
                L${tarX + 0.78} ${tarBucketY + 0.6}
                L${tarX + 0.7}  ${tarBucketY + 1.5}
                L${tarX - 0.7}  ${tarBucketY + 1.5} Z`}
            fill={W_INK} opacity="0.45" />
    </g>
  {/if}

  <!-- WAGON BED — flared sides, plank construction.
       Layering: wood pattern as base → optional blue paint pattern on
       top → shading gradient → plank seams → iron bands as filled
       rects on top (no longer just strokes). -->
  <g>
    <!-- BASE WOOD LAYER (always present — paint sits on top) -->
    <path d={`M${bedTopL} ${bedTopY + 0.4}
              Q${bedTopL + 2} ${bedTopY - 0.6} ${bedTopL + 5} ${bedTopY - 0.3}
              L${bedTopR - 5} ${bedTopY - 0.3}
              Q${bedTopR - 2} ${bedTopY - 0.6} ${bedTopR} ${bedTopY + 0.4}
              L${bedX + bedW} ${bedBotY}
              L${bedX} ${bedBotY} Z`}
          fill="url(#ps-wood)" stroke={W_INK} stroke-width="0.7" stroke-linejoin="round" />

    <!-- PAINT LAYER — when painted, blue paint sits over the wood, with
         the underlying grain showing through paint-flake (the texture
         already has flake; lower opacity reveals more wood underneath
         as a weathered look). -->
    {#if painted}
      <path d={`M${bedTopL} ${bedTopY + 0.4}
                Q${bedTopL + 2} ${bedTopY - 0.6} ${bedTopL + 5} ${bedTopY - 0.3}
                L${bedTopR - 5} ${bedTopY - 0.3}
                Q${bedTopR - 2} ${bedTopY - 0.6} ${bedTopR} ${bedTopY + 0.4}
                L${bedX + bedW} ${bedBotY}
                L${bedX} ${bedBotY} Z`}
            fill="url(#ps-blue-paint)"
            opacity={dmg.canvas >= 2 ? 0.78 : 0.92} />
    {/if}

    <!-- SHADING GRADIENT — vertical sun/shadow on the bed -->
    <path d={`M${bedTopL} ${bedTopY + 0.4}
              Q${bedTopL + 2} ${bedTopY - 0.6} ${bedTopL + 5} ${bedTopY - 0.3}
              L${bedTopR - 5} ${bedTopY - 0.3}
              Q${bedTopR - 2} ${bedTopY - 0.6} ${bedTopR} ${bedTopY + 0.4}
              L${bedX + bedW} ${bedBotY}
              L${bedX} ${bedBotY} Z`}
          fill="url(#ps-bed-shade)" />

    <!-- Top edge cap — slightly lighter band along the top of the sideboard -->
    <path d={`M${bedTopL + 0.2} ${bedTopY + 0.3}
              Q${bedTopL + 2} ${bedTopY - 0.4} ${bedTopL + 5} ${bedTopY - 0.1}
              L${bedTopR - 5} ${bedTopY - 0.1}
              Q${bedTopR - 2} ${bedTopY - 0.4} ${bedTopR - 0.2} ${bedTopY + 0.3}`}
          stroke={W_WOOD_LIGHT} stroke-width="0.4" fill="none" opacity="0.85" />

    <!-- (Manual plank seam + highlight strokes removed: the FLUX
         weathered-wood pattern fill already shows plank-grain detail,
         and the explicit strokes on top read as decorative stripes
         rather than as construction. seamLines + hlLines arrays are
         kept in script for future damage-overlay reuse.) -->

    <!-- iron corner straps — now filled rects on top of the wood,
         not just strokes. Each strap traces from top of the flared
         edge down to the bottom corner, pinched along the diagonal. -->
    <path d={`M${bedTopL + 0.1} ${bedTopY + 0.1}
              L${bedTopL + 0.6} ${bedTopY + 0.1}
              L${bedX + 0.55}   ${bedBotY - 0.05}
              L${bedX + 0.05}   ${bedBotY - 0.05} Z`}
          fill={W_IRON} stroke={W_INK} stroke-width="0.18" />
    <path d={`M${bedTopR - 0.6} ${bedTopY + 0.1}
              L${bedTopR - 0.1} ${bedTopY + 0.1}
              L${bedX + bedW - 0.05} ${bedBotY - 0.05}
              L${bedX + bedW - 0.55} ${bedBotY - 0.05} Z`}
          fill={W_IRON} stroke={W_INK} stroke-width="0.18" />
    <!-- corner-strap rivets -->
    <circle cx={bedTopL + 0.4} cy={bedTopY + 0.4} r="0.14" fill={W_IRON} stroke={W_INK} stroke-width="0.05" />
    <circle cx={bedX + 0.32}   cy={bedBotY - 0.4} r="0.14" fill={W_IRON} stroke={W_INK} stroke-width="0.05" />
    <circle cx={bedTopR - 0.4} cy={bedTopY + 0.4} r="0.14" fill={W_IRON} stroke={W_INK} stroke-width="0.05" />
    <circle cx={bedX + bedW - 0.32} cy={bedBotY - 0.4} r="0.14" fill={W_IRON} stroke={W_INK} stroke-width="0.05" />

    <!-- iron mid-bands — now FILLED RECTS over the wood, not strokes. -->
    <rect x={bedX + bedW * 0.33 - 0.28} y={bedTopY + 0.1}
          width="0.56" height={bedH - 0.2} fill={W_IRON}
          stroke={W_INK} stroke-width="0.12" />
    <rect x={bedX + bedW * 0.66 - 0.28} y={bedTopY + 0.1}
          width="0.56" height={bedH - 0.2} fill={W_IRON}
          stroke={W_INK} stroke-width="0.12" />
    <!-- mid-band rivets at top + bottom of each band -->
    {#each boltRatios as t, i (i)}
      <circle cx={bedX + bedW * t} cy={bedTopY + 0.5} r="0.18" fill={W_INK} />
      <circle cx={bedX + bedW * t} cy={bedBotY - 0.5} r="0.18" fill={W_INK} />
    {/each}

    <!-- JOCKEY TOOLBOX — at front of bed, just behind / under the
         driver's seat, iron-banded wood (doc 08 §4). The bench seat
         shape sits on top of it. -->
    <g>
      <!-- box body, slightly trapezoidal (sloped front) -->
      <path d={`M${bedTopL - 0.2} ${bedTopY + 0.2}
                L${bedTopL - 3.6} ${bedTopY + 1.0}
                L${bedTopL - 3.6} ${bedTopY + 3.4}
                L${bedTopL - 0.2} ${bedTopY + 3.0} Z`}
            fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.35"
            stroke-linejoin="round" />
      <!-- iron banding (top, middle, bottom) — fills, not strokes -->
      <path d={`M${bedTopL - 0.2} ${bedTopY + 0.5}
                L${bedTopL - 3.6} ${bedTopY + 1.3}
                L${bedTopL - 3.6} ${bedTopY + 1.6}
                L${bedTopL - 0.2} ${bedTopY + 0.8} Z`}
            fill={W_IRON} />
      <path d={`M${bedTopL - 0.2} ${bedTopY + 2.5}
                L${bedTopL - 3.6} ${bedTopY + 3.0}
                L${bedTopL - 3.6} ${bedTopY + 3.3}
                L${bedTopL - 0.2} ${bedTopY + 2.8} Z`}
            fill={W_IRON} />
      <!-- iron lid latch (small dark blob) -->
      <rect x={bedTopL - 1.2} y={bedTopY + 0.45} width="0.5" height="0.4" fill={W_IRON} />
      <!-- corner reinforcement -->
      <rect x={bedTopL - 3.8} y={bedTopY + 0.95} width="0.35" height="2.5" fill={W_IRON} />
      <!-- small shading on the front face -->
      <path d={`M${bedTopL - 0.2} ${bedTopY + 0.2}
                L${bedTopL - 3.6} ${bedTopY + 1.0}
                L${bedTopL - 3.6} ${bedTopY + 3.4}
                L${bedTopL - 0.2} ${bedTopY + 3.0} Z`}
            fill={W_INK} opacity="0.18" />
    </g>

    <!-- DRIVER BENCH SEAT — single wood plank sitting ON TOP of the
         jockey box, sloping slightly forward. Period prairie schooners
         typically had no backrest; the driver leaned against the front
         of the bed itself. Hansen + Scotts Bluff replica photos confirm. -->
    <path d={`M${bedTopL - 0.4} ${bedTopY - 0.4}
              L${bedTopL - 3.6} ${bedTopY + 0.4}
              L${bedTopL - 3.6} ${bedTopY + 0.85}
              L${bedTopL - 0.4} ${bedTopY + 0.1} Z`}
          fill="url(#ps-wood-sm)" stroke={W_INK} stroke-width="0.35"
          stroke-linejoin="round" />

    <!-- FEED TROUGH — folded up against the rear of the bed during
         travel. Thin wood strip across the rear panel with two iron
         hinge knuckles (doc 08 §8). -->
    <g>
      <rect x={bedX + bedW - 4.2} y={bedTopY + 3.4}
            width="4.0" height="1.2" fill="url(#ps-wood-sm)"
            stroke={W_INK} stroke-width="0.3" />
      <!-- two hinge knuckles -->
      <rect x={bedX + bedW - 4.0} y={bedTopY + 3.3} width="0.5" height="0.3" fill={W_IRON} />
      <rect x={bedX + bedW - 0.7} y={bedTopY + 3.3} width="0.5" height="0.3" fill={W_IRON} />
      <!-- center latch (folded-up state) -->
      <rect x={bedX + bedW - 2.4} y={bedTopY + 3.6} width="0.6" height="0.35" fill={W_IRON} />
      <!-- subtle shading -->
      <rect x={bedX + bedW - 4.2} y={bedTopY + 4.2}
            width="4.0" height="0.5" fill={W_INK} opacity="0.22" />
    </g>

    <!-- MISSING PLANK damage cue — kept from original component -->
    {#if dmg.plank >= 0}
      <rect x={bedX + bedW * 0.4} y={bedTopY + 0.5} width="2.5" height={bedH - 1.2}
            fill={W_INK} opacity="0.7" />
    {/if}
  </g>

  <!-- ADDONS — period-correct mounting points per doc 08:
        - water kegs: STRAPPED TO THE SIDE of the wagon, mid-section.
          Visible from our side-on view as cylinders against the bed
          face (overlapping the bed wood/paint), not floating above
          the cargo area
        - chicken coop: STRAPPED TO THE REAR at bed-height (period
          diaries note rear-mount = gentler ride, fewer dead chickens).
          Extends out PAST the rear panel
        - driver: on the bench seat at the front
   -->
  {#if addons.driver}
    <Driver x={bedTopL - 2} y={bedTopY - 0.2} variant="schooner"
            useBlender={addons.useBlenderDriver}
            dx={addons.driverDx ?? (addons.useBlenderDriver ? 19.7 : 0)}
            dy={addons.driverDy ?? (addons.useBlenderDriver ? -2.6 : 0)}
            scale={addons.driverScale ?? (addons.useBlenderDriver ? 1.8 : 1)} />
  {/if}
  {#if (addons.kegs ?? 0) >= 1}
    <!-- Water kegs sit INSIDE the wagon's cargo area, on top of stacked
         cargo so their HEADS poke just above the bed-top rail. The
         clip-path hides the keg body below the rail (occluded by the
         bed wall in real life). Canvas drawn AFTER kegs covers the
         peeking heads when present; uncheck "Show canvas top" in the
         dev viewer to inspect. -->
    <g clip-path="url(#ps-above-rail)">
      <WaterKeg x={bedX + bedW * 0.45} y={bedTopY + 2.5} />
    </g>
  {/if}
  {#if (addons.kegs ?? 0) >= 2}
    <g clip-path="url(#ps-above-rail)">
      <WaterKeg x={bedX + bedW * 0.62} y={bedTopY + 2.5} />
    </g>
  {/if}
  {#if (addons.coop ?? 0) > 0}
    <!-- Coop strapped to the REAR of the wagon. Position pushed FURTHER
         back (was bedX+bedW+2.5) so the coop center clears the canvas
         rear-overhang at bedTopR+overhang ≈ 18. With overhang=2 and
         bedTopR=16.2, the canvas reaches ~18.2; coop center at +4 =
         19 puts it visibly past the bonnet's shadow. -->
    <ChickenCoop x={bedX + bedW + 4.0} y={bedBotY - 0.5} size="md"
                 chickens={Math.min(5, addons.coop ?? 0)} />
    <!-- coop strap (lashing rope from coop to rear panel) — extends
         a bit further now to reach the relocated coop. -->
    <line x1={bedX + bedW - 0.2} y1={bedTopY + 1.5}
          x2={bedX + bedW + 2.5} y2={bedTopY + 1.0}
          stroke="#8a6a3a" stroke-width="0.25" />
    <line x1={bedX + bedW - 0.2} y1={bedTopY + 3.0}
          x2={bedX + bedW + 2.5} y2={bedTopY + 3.5}
          stroke="#8a6a3a" stroke-width="0.25" />
    <!-- Feathers emit from the coop top center — now clearly behind
         the canvas overhang so they read as coming out of the COOP,
         not out from under the wagon's bonnet. -->
    <CoopFeathers x={bedX + bedW + 4.0} y={bedBotY - 0.5 - 3.5} {t}
                  chickens={addons.coop ?? 0} />
  {/if}

  <!-- CANVAS TOP — drawn LAST so its overhang sits in front of bed top.
       arch=7 puts the bonnet height ≈ 1.4× bed depth, matching the
       period 4-ft-bonnet over 3-ft-bed proportion (doc 06 §1, doc 11 §5).
       Marcy 1859 / Hansen replica photos confirm. Toggleable via the
       `showCanvas` prop so /dev/wagon-detail can hide it to inspect
       the cargo interior (water kegs, etc). -->
  {#if showCanvas}
    <CanvasTop {bedX} bedY={bedTopY - 0.2} {bedW}
               arch={7} ribs={6} overhang={2.0} drape={0.6}
               damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />
  {/if}

  <!-- WHEELS — front noticeably smaller than rear -->
  <HistoricalWheel cx={bedX + 5} cy={wheelY + 0.5} r={wheelFrontR} angle={angle * 1.36}
                   spokes={10} broken={dmg.wheelFront} />
  <HistoricalWheel cx={bedX + bedW - 5} cy={wheelY} r={wheelBackR} {angle}
                   spokes={12} broken={dmg.wheelBack} />

  <!-- MILK COW ANCHOR — placeholder rect tied to the rear of the wagon.
       Gets replaced by a dedicated MilkCow.svelte component later; the
       wagon component is responsible only for the anchor coords + the
       tether rope from rear of bed back to her halter. (doc 08 §7) -->
  {#if (addons.milkCow ?? 0) > 0}
    <g>
      <!-- tether rope from bed rear to cow head -->
      <path d={`M${bedX + bedW + 0.5} ${bedTopY + 2.6}
                Q${bedX + bedW + 3.5} ${bedTopY + 3.5} ${cowX - 1.6} ${cowY - 1.5}`}
            stroke={W_WOOD_DARK} stroke-width="0.22" fill="none" stroke-linecap="round" />
      <!-- placeholder cow body — to be replaced by MilkCow.svelte:
           a brown rounded rect roughly the silhouette of a small heifer,
           ~3.2 wide × 2.0 tall. Walks BEHIND the wagon at rope's end. -->
      <rect x={cowX - 1.6} y={cowY - 1.5} width="3.2" height="2.0"
            rx="0.4" fill={W_WOOD} stroke={W_INK} stroke-width="0.4" opacity="0.7" />
      <!-- placeholder head -->
      <circle cx={cowX - 1.9} cy={cowY - 1.2} r="0.7" fill={W_WOOD} stroke={W_INK} stroke-width="0.3" opacity="0.7" />
      <!-- placeholder legs -->
      <line x1={cowX - 1.2} y1={cowY + 0.5} x2={cowX - 1.2} y2={cowY + 2.5}
            stroke={W_INK} stroke-width="0.3" />
      <line x1={cowX + 1.0} y1={cowY + 0.5} x2={cowX + 1.0} y2={cowY + 2.5}
            stroke={W_INK} stroke-width="0.3" />
    </g>
  {/if}

  <!-- ============================================================
       WEAR-OVERLAY GROUP — runs LAST so it stamps on top of the
       hardware. Patches, rust streaks, mud cake. Distribution
       counts come from `dmg.canvas` (0..4) and `dmg.dirt` (0..2),
       calibrated against doc 09's five-stop wear progression.
       ============================================================ -->
  <g>
    <!-- mud cake: lower band of crud builds up on the bed sides as the
         wagon picks up creek-ford dirt + Platte dust. -->
    {#if dmg.dirt >= 1}
      <path d={mudPathLight} fill={W_WOOD_DARK} opacity="0.55" />
    {/if}
    {#if dmg.dirt >= 2}
      <path d={mudPathHeavy} fill={W_INK} opacity="0.5" />
    {/if}

    <!-- mismatched fabric/wood patches — irregular quads filled with
         the canvas-patch token. (Strictly these are sewn on the canvas
         in real life; on the bed sides we get away with calling them
         "tacked-on hide patches" — common late-trail repair.) -->
    {#each patchShapes as p (p.idx)}
      <path d={p.d} fill={W_CANVAS_PATCH} stroke={W_INK} stroke-width="0.22"
            opacity="0.85" />
      <path d={p.d} fill="none" stroke={W_INK} stroke-width="0.16"
            opacity="0.7" stroke-dasharray="0.25 0.3" />
    {/each}

    <!-- rust streaks — short downward smears running off the iron
         banding hardware into the wood (doc 09: "rust runs down the
         wood" at the worn/ragged stops). -->
    {#each rustStreaks as r (r.idx)}
      <path d={r.d} fill="none" stroke={W_RUST} stroke-width="0.45"
            opacity="0.6" stroke-linecap="round" />
      <path d={r.d} fill="none" stroke={W_INK} stroke-width="0.18"
            opacity="0.45" stroke-linecap="round" />
    {/each}
  </g>
{/if}
</g>
