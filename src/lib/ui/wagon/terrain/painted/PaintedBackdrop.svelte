<script lang="ts">
  // 4-layer painted backdrop — sky / far / mid / close composited
  // back-to-front with independent parallax scroll factors.
  //
  // Plan: /home/eric/.claude/plans/2026-04-30-backdrop-4-layer.md
  //
  // Replaces BackdropPainting.svelte (single 4:1 panorama scaled to fit
  // the hero band) with a layered z-stack where each layer carries the
  // detail its position demands:
  //   - sky: weather/ToD-coded, biome-agnostic, opaque webp
  //   - far: distant ridges + horizon, alpha (sky in painting keyed out)
  //   - mid: trees / hills / silhouettes, alpha (magenta key from gen)
  //   - close: foreground specimens, alpha (magenta key from gen)
  //
  // Source webps are 3072×768 (LoRA's sweet spot); we render each layer
  // at 1600×400 in SVG coords — uniform 0.52x scale, full-bleed in the
  // 1280×400 hero viewBox (y=200..600).
  import type { Terrain, Weather } from '$lib/game/types';

  interface Props {
    terrain: Terrain;
    weather?: Weather;
    /** Scene-level horizontal scroll position (negative = world moves left). */
    scrollX: number;
    /** Per-biome variant index 0..4. Sky is weather-discriminated, not variant. */
    variant?: number;
  }

  let { terrain, weather = 'clear', scrollX, variant = 0 }: Props = $props();

  // Hero viewBox is 0 200 1280 400 in WagonScene; layers paint into that.
  const PAINT_W = 1600;
  const PAINT_H = 400;
  const VIEWBOX_TOP_Y = 200;

  // Parallax depth: distant content barely moves, foreground tracks the
  // camera. SCROLL_FACTOR is multiplied by scrollX (which is already
  // negated upstream so positive camera travel reads as westward motion).
  const SF_SKY = 0.05;
  const SF_FAR = 0.15;
  const SF_MID = 0.50;
  const SF_CLOSE = 1.00;

  // 'river' terrain only appears at landmark crossings, never on the
  // open trail — fall back to prairie there since the player approached
  // from a non-river leg.
  const t = $derived(terrain === 'river' ? 'prairie' : terrain);

  // Engine has 8 weather states; sky tile range is 6. Collapse the engine
  // states into the sky vocabulary. Frost / heat / clear all render with
  // the clear-sky tile — they'll pick up the time-of-day wash separately.
  const skyWeather = $derived.by(() => {
    switch (weather) {
      case 'rain':
      case 'storm':    return 'storm';
      case 'overcast':
      case 'fog':      return 'overcast';
      case 'snow':
      case 'frost':
      case 'heat':
      case 'clear':
      default:         return 'clear';
    }
  });

  // variant 0 keeps unsuffixed name (`far-prairie.webp`); variants 1-4
  // get a `-N` suffix. Mirrors prompts.py / generate.py output naming.
  const vSuf = $derived(variant === 0 ? '' : `-${variant}`);

  const skyUrl   = $derived(`/wagon-bg/sky-${skyWeather}.webp`);
  const farUrl   = $derived(`/wagon-bg/far-${t}${vSuf}.webp`);
  const midUrl   = $derived(`/wagon-bg/mid-${t}${vSuf}.webp`);
  const closeUrl = $derived(`/wagon-bg/close-${t}${vSuf}.webp`);

  const skyX   = $derived(-((scrollX * SF_SKY)   % PAINT_W));
  const farX   = $derived(-((scrollX * SF_FAR)   % PAINT_W));
  const midX   = $derived(-((scrollX * SF_MID)   % PAINT_W));
  const closeX = $derived(-((scrollX * SF_CLOSE) % PAINT_W));

  // Three tile copies at offsets [-PAINT_W, 0, PAINT_W] so coverage is
  // continuous regardless of where x sits in its [0, PAINT_W) cycle.
  const offsets = [-PAINT_W, 0, PAINT_W];
</script>

<defs>
  <!-- Close-band mask: BiRefNet keeps the entire painted scene as
       foreground (including the source painting's sky region), so the
       close layer would otherwise occlude sky-clear behind it. Hard-clip
       the top 2/3 of the close layer to transparent so only the bottom
       band — where the actual foreground specimens live — is visible.
       Mid stays unmasked: its painted alpha is well-shaped already and
       a top mask would cut tree tops. -->
  <linearGradient id="pb-close-grad" x1="0" y1="200" x2="0" y2="600"
                  gradientUnits="userSpaceOnUse">
    <stop offset="0%"  stop-color="black" />
    <stop offset="60%" stop-color="black" />
    <stop offset="78%" stop-color="white" />
    <stop offset="100%" stop-color="white" />
  </linearGradient>
  <mask id="pb-close-mask">
    <rect x="-3200" y="200" width="9600" height="400" fill="url(#pb-close-grad)" />
  </mask>
</defs>

<g>
  <!-- 1. sky (opaque, slowest scroll, behind everything) -->
  {#each offsets as offset (`sky-${offset}`)}
    <image href={skyUrl} x={skyX + offset} y={VIEWBOX_TOP_Y}
           width={PAINT_W} height={PAINT_H} preserveAspectRatio="none" />
  {/each}

  <!-- 2. far (alpha, distant ridges + horizon) -->
  {#each offsets as offset (`far-${offset}`)}
    <image href={farUrl} x={farX + offset} y={VIEWBOX_TOP_Y}
           width={PAINT_W} height={PAINT_H} preserveAspectRatio="none" />
  {/each}

  <!-- 3. mid (alpha, middle-distance silhouettes) — no mask; BiRefNet alpha
       in the source webp already shapes the visible region cleanly. -->
  {#each offsets as offset (`mid-${offset}`)}
    <image href={midUrl} x={midX + offset} y={VIEWBOX_TOP_Y}
           width={PAINT_W} height={PAINT_H} preserveAspectRatio="none" />
  {/each}

  <!-- 4. close (alpha, foreground specimens, camera-locked) — top 60%
       hard-clipped to transparent, fade to opaque from 60-78%, opaque
       below 78%. Bottom band only. -->
  <g mask="url(#pb-close-mask)">
    {#each offsets as offset (`close-${offset}`)}
      <image href={closeUrl} x={closeX + offset} y={VIEWBOX_TOP_Y}
             width={PAINT_W} height={PAINT_H} preserveAspectRatio="none" />
    {/each}
  </g>
</g>
