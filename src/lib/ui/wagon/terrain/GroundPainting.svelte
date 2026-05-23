<script lang="ts">
  // Painted side-view trail strip — the layer the ox team and wagon
  // walk on. Two-layer composition:
  //   1. FLUX dirt+ruts BASE (4096×384 source) — the painterly trail
  //      surface with two horizontal ruts. Single biome-neutral tile.
  //   2. Scattered debris SPRITES overlaid on top — individual FLUX-
  //      generated pebbles, sticks, and bones with transparent
  //      backgrounds, placed at deterministic positions.
  //
  // Why split: FLUX wouldn't paint distinct debris items into the trail
  // tile no matter how the prompt was phrased. Generating individual
  // sprite items (each "single object on plain background") works
  // reliably, then we composite them in SVG.
  import { GROUND_Y, SCENE_W } from './terrain-tokens';
  import type { Terrain } from '$lib/game/types';
  import { trailProgress } from './trail-progress';
  import {
    categoryWeights,
    debrisAt,
    LARAMIE_PROGRESS,
    SLOT_PITCH,
  } from './debris-field';

  interface Props {
    /** Scene-level horizontal scroll position. */
    scrollX: number;
    terrain?: Terrain;
    /** Absolute miles travelled; defaults keep the component usable
     *  standalone (renders early-trail procedural debris). */
    milesTraveled?: number;
    deathCount?: number;
  }

  let { scrollX, terrain = 'prairie', milesTraveled = 0, deathCount = 0 }: Props = $props();

  // Strip dims. PAINT_H=70 / STRIP_TOP_OFFSET=-10 → strip y=530..600.
  const PAINT_W = 1280;
  const PAINT_H = 70;
  const SCROLL_FACTOR = 0.6;
  const x = $derived(-((scrollX * SCROLL_FACTOR) % PAINT_W));
  const offsets = [-PAINT_W, 0, PAINT_W];

  const url = '/wagon-bg/ground_strip-trail.webp';

  const STRIP_TOP_OFFSET = -10;
  const stripTop = GROUND_Y + STRIP_TOP_OFFSET;

  // ─── Painted rut overlay ──────────────────────────────────────
  // FLUX reliably paints ONE rut, never two (v11–v15 history — prompt
  // engineering hit its ceiling). Strategy C: composite the single
  // *painted* groove at TWO y positions over a now-rut-free dirt base.
  // tools/wagon-bg/split_rut.py heals the native rut out of
  // ground_strip-trail.webp and emits ground_strip-rut.webp (the
  // groove cropped with feathered top/bottom alpha). Same source
  // pixels as the base ⇒ perfect tone match — NOT a drawn-on line.
  const rutUrl = '/wagon-bg/ground_strip-rut.webp';
  const RUT_H = (PAINT_H * 78) / 384; // sprite 4096×78, scaled like base
  // Two grooves inside the debris-avoided band (~scene y 560..585):
  const rutCenters = [stripTop + 34, stripTop + 50];

  // ─── Dynamic trail debris (deterministic per trail position) ───
  // Rut-avoided y bands (rut groove lives ~scene y 560..585):
  const ABOVE_Y0 = 540, ABOVE_Y1 = 558;   // above the upper rut
  const BELOW_Y0 = 588, BELOW_Y1 = 600;   // below the lower rut
  const DEBRIS_SCROLL = SCROLL_FACTOR;    // must equal SCROLL_FACTOR — debris and dirt share the same parallax layer

  const progress = $derived(trailProgress(milesTraveled));
  const weights = $derived(
    categoryWeights({
      progress,
      terrain,
      deathCount,
      laramieProgress: LARAMIE_PROGRESS,
    }),
  );

  // Visible absolute-world span, swept slot by slot.
  const debris = $derived.by(() => {
    const worldStart = scrollX * DEBRIS_SCROLL;
    // Guard of 1 is sufficient: max visible overhang =
    // (MAX_JITTER + MAX_SPRITE/2) / SLOT_PITCH ≈ 1.17 slots.
    const i0 = Math.floor(worldStart / SLOT_PITCH) - 1;
    const i1 = Math.ceil((worldStart + SCENE_W) / SLOT_PITCH) + 1;
    const out: {
      href: string;
      x: number;
      y: number;
      size: number;
      rot: number;
      cx: number;
    }[] = [];
    for (let i = i0; i <= i1; i++) {
      const d = debrisAt(i, weights);
      if (!d) continue;
      const screenX = d.worldX - worldStart;
      const [y0, y1] = d.row === 'above' ? [ABOVE_Y0, ABOVE_Y1] : [BELOW_Y0, BELOW_Y1];
      const cy = y0 + d.rowT * (y1 - y0);
      out.push({
        href: `/wagon-bg/trail-debris/${d.sprite}.webp`,
        x: screenX - d.size / 2,
        y: cy - d.size / 2,
        size: d.size,
        rot: d.rot,
        cx: screenX,
      });
    }
    return out;
  });
</script>

<g>
  <!-- 1. Dirt BASE (native rut healed out) — 3 tile copies -->
  {#each offsets as offset (offset)}
    {@const tx = x + offset}
    <image
      href={url}
      x={tx}
      y={stripTop}
      width={PAINT_W}
      height={PAINT_H}
      preserveAspectRatio="none"
    />
  {/each}

  <!-- 2. Rut OVERLAY — the one painted groove composited at TWO y
       positions, each tiled+scrolled in sync with the dirt base. -->
  {#each rutCenters as cy (cy)}
    {#each offsets as offset (offset)}
      <image
        href={rutUrl}
        x={x + offset}
        y={cy - RUT_H / 2}
        width={PAINT_W}
        height={RUT_H}
        preserveAspectRatio="none"
      />
    {/each}
  {/each}

  <!-- 3. Debris OVERLAY — deterministic field over the visible world span -->
  {#each debris as d, i (i)}
    <image
      href={d.href}
      x={d.x}
      y={d.y}
      width={d.size}
      height={d.size}
      transform={d.rot ? `rotate(${d.rot} ${d.cx} ${d.y + d.size / 2})` : ''}
      preserveAspectRatio="xMidYMid meet"
    />
  {/each}
</g>
