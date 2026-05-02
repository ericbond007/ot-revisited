<script lang="ts">
  // Solid foreground earth band. Three render paths, each independent of
  // the backdrop renderer:
  //
  //   default            — two-stop linear gradient + horizon shadow fade.
  //   ?groundraster=1    — single per-terrain perspective tile (1024×512)
  //                        with `xMidYMax slice` showing the bottom-fg.
  //   ?groundtex=1       — hand-authored seamless wagon-trail tile
  //                        (warm dirt base + feTurbulence painterly noise +
  //                        two stroke-path wagon ruts + deterministic
  //                        pebble specks + grass tufts at top edge),
  //                        scrolled via patternTransform. Replaces an
  //                        earlier SDXL-generated texture path that kept
  //                        producing landscape strips instead of usable
  //                        side-view trail content. TODO #32 Phase A.
  //
  // Toggleable from /dev/wagon-view to compare under any backdrop renderer.
  import { page } from '$app/state';
  import type { Terrain } from '$lib/game/types';
  import { GROUND_FILL } from './terrain-tokens';

  interface Props {
    terrain: Terrain;
    groundY: number;
    h: number;
    w: number;
    /** Scene-level horizontal scroll position. Used by ?groundtex=1
     *  pattern-scroll mode; ignored by gradient + raster modes. */
    scrollX?: number;
    /** Used as the unique id prefix for the inline gradient defs. */
    idPrefix?: string;
  }

  let { terrain, groundY, h, w, scrollX = 0, idPrefix = 'gb' }: Props = $props();

  const useRaster = $derived(page.url.searchParams.get('groundraster') === '1');
  const useGroundtex = $derived(page.url.searchParams.get('groundtex') === '1');

  const gradId = $derived(`${idPrefix}-${terrain}`);
  const fadeId = $derived(`${idPrefix}-${terrain}-fade`);
  const patId = $derived(`${idPrefix}-${terrain}-pat`);
  const fills = $derived(GROUND_FILL[terrain] ?? GROUND_FILL.prairie);

  // Pattern tile width in scene-coords. 1280 / 640 = 2 horizontal repeats
  // visible across the band — keeps any per-tile detail large enough to
  // read while still hiding the wraparound seam.
  const PAT_W = 640;
  // Scroll factor — backdrop is 0.3× and the ground is closer, so it
  // should be faster, but keep moderate so it doesn't blur. scrollX is
  // negative (per WagonScene), so negate the modulo result to make the
  // pattern translate POSITIVE — that slides the texture rightward,
  // matching the painted backdrop's leftward-from-camera world motion.
  const GROUNDTEX_SCROLL_FACTOR = 0.5;
  const patOffset = $derived(-((scrollX * GROUNDTEX_SCROLL_FACTOR) % PAT_W));

  // Deterministic pebble positions. Hand-tuned to fill the tile evenly
  // without clustering at edges (pebbles never cross the seam since
  // they're small and located away from x=0 and x=PAT_W). y is a 0..1
  // fraction of band height so the same set works at any band thickness.
  const PEBBLES: { x: number; y: number; rx: number; ry: number; fill: string }[] = [
    { x:  35, y: 0.30, rx: 1.6, ry: 1.0, fill: '#6b5238' },
    { x:  88, y: 0.62, rx: 2.0, ry: 1.2, fill: '#7a6041' },
    { x: 142, y: 0.80, rx: 1.4, ry: 0.9, fill: '#574330' },
    { x: 195, y: 0.45, rx: 1.8, ry: 1.1, fill: '#8a704c' },
    { x: 247, y: 0.72, rx: 1.5, ry: 1.0, fill: '#6b5238' },
    { x: 305, y: 0.32, rx: 2.2, ry: 1.4, fill: '#7a6041' },
    { x: 358, y: 0.85, rx: 1.6, ry: 1.0, fill: '#574330' },
    { x: 410, y: 0.50, rx: 1.4, ry: 0.9, fill: '#8a704c' },
    { x: 465, y: 0.68, rx: 1.9, ry: 1.2, fill: '#6b5238' },
    { x: 522, y: 0.38, rx: 1.5, ry: 1.0, fill: '#7a6041' },
    { x: 590, y: 0.78, rx: 1.7, ry: 1.1, fill: '#574330' },
  ];

  // Sparse top-edge grass tufts — short angled strokes so the trail's
  // top edge reads as where it meets the prairie. Positions deterministic.
  const GRASS_TUFTS: { x: number; lean: number }[] = [];
  for (let i = 0; i < 28; i++) {
    const x = 8 + i * 22 + ((i * 13) % 9);
    if (x > PAT_W - 4) break;
    const lean = ((i * 7) % 5) - 2;  // -2..+2 horizontal lean
    GRASS_TUFTS.push({ x, lean });
  }
</script>

<g>
  {#if useGroundtex}
    <defs>
      <!-- Painterly noise filter — feTurbulence + colormatrix tints
           the noise to a brown haze, blended at low alpha over the
           dirt base for surface variation. -->
      <filter id={`${patId}-noise`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.34  0 0 0 0 0.22  0 0 0 0.35 0" />
      </filter>
      <!-- Oblique-light vertical shading: slight darkening at top and
           bottom edges so the strip doesn't read as flat. -->
      <linearGradient id={`${patId}-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#000" stop-opacity="0.22" />
        <stop offset="40%"  stop-color="#000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.18" />
      </linearGradient>
      <pattern
        id={patId}
        patternUnits="userSpaceOnUse"
        x="0"
        y={groundY}
        width={PAT_W}
        height={h}
        patternTransform={`translate(${patOffset} 0)`}
      >
        <!-- 1. Warm dirt base. -->
        <rect x="0" y="0" width={PAT_W} height={h} fill="#8b6f4e" />
        <!-- 2. Painterly turbulence overlay. -->
        <rect x="0" y="0" width={PAT_W} height={h} filter={`url(#${patId}-noise)`} />
        <!-- 3. Two parallel wagon-wheel ruts. Strokes span the full
             tile width so they continue cleanly across the seam. -->
        <line x1="0" y1={h * 0.42} x2={PAT_W} y2={h * 0.42}
              stroke="#5a4226" stroke-width={Math.max(2.5, h * 0.07)}
              stroke-linecap="butt" opacity="0.5" />
        <line x1="0" y1={h * 0.72} x2={PAT_W} y2={h * 0.72}
              stroke="#5a4226" stroke-width={Math.max(2.5, h * 0.07)}
              stroke-linecap="butt" opacity="0.5" />
        <!-- 4. Pebble specks. -->
        {#each PEBBLES as p (p.x)}
          <ellipse cx={p.x} cy={p.y * h} rx={p.rx} ry={p.ry} fill={p.fill} opacity="0.65" />
        {/each}
        <!-- 5. Top-edge grass tufts — sparse short angled strokes. -->
        {#each GRASS_TUFTS as g (g.x)}
          <line x1={g.x} y1={h * 0.08} x2={g.x + g.lean} y2="0"
                stroke="#6b7a3e" stroke-width="0.8" opacity="0.6" />
        {/each}
        <!-- 6. Oblique-light vertical shade overlay. -->
        <rect x="0" y="0" width={PAT_W} height={h} fill={`url(#${patId}-shade)`} />
      </pattern>
      <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y={groundY} width={w} height={h} fill={`url(#${patId})`} />
    <!-- horizon shadow band on top of the texture -->
    <rect x="0" y={groundY} width={w} height="8" fill={`url(#${fadeId})`} opacity="0.4" />
  {:else if useRaster}
    <!-- Ground tile generated at 1024×512 (SDXL-friendly). The model
         paints a perspective view of a trail; `xMidYMax slice` shows
         only the bottom foreground portion. -->
    <image
      href="/wagon-bg/ground-{terrain}.webp"
      x="0"
      y={groundY}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMax slice"
    />
  {:else}
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={fills[0]} />
        <stop offset="100%" stop-color={fills[1]} />
      </linearGradient>
      <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y={groundY} width={w} height={h} fill={`url(#${gradId})`} />
    <!-- horizon shadow band -->
    <rect x="0" y={groundY} width={w} height="8" fill={`url(#${fadeId})`} opacity="0.4" />
  {/if}
</g>
