<script lang="ts">
  // Shared SVG paint used by both TrailMapSnippet (cropped window) and
  // TrailMapModal (full 1000×380 view). Coord-space is the modal's
  // viewBox; consumers pick their own viewBox to crop or show all.
  //
  // `paintScale` shrinks font-sizes and stroke-widths so they stay
  // visually proportional when the consumer zooms in (snippet's tight
  // viewBox magnifies everything ~3×; passing paintScale=0.5 keeps
  // text + lines from feeling chunky).
  //
  // Renders only the inner SVG content — caller wraps in <svg viewBox=...>.

  import type { Landmark } from '$lib/game/content/landmarks';
  import { accumulateMiles, interpolatePosition } from '../trail-map-helpers';
  import { LANDMARK_COORDS } from './landmark-coords';
  import LandmarkPin from './LandmarkPin.svelte';
  import WagonGlyph from './WagonGlyph.svelte';

  interface Props {
    landmarks: readonly Landmark[];
    currentMileage: number;
    /** Wagon glyph size — modal uses 'sm' (full trail), snippet 'lg'. */
    wagonSize?: 'sm' | 'lg';
    /** Show "YOU ARE HERE" label above the wagon glyph. */
    youAreHereLabel?: boolean;
    /** Multiplier for font-size + stroke-width. Default 1 (modal). */
    paintScale?: number;
  }

  let {
    landmarks,
    currentMileage,
    wagonSize = 'sm',
    youAreHereLabel = false,
    paintScale = 1
  }: Props = $props();

  const ps = $derived(paintScale);

  const marked = $derived(accumulateMiles(landmarks));
  const plotted = $derived(marked.filter((m) => LANDMARK_COORDS[m.id]));
  const wagonXY = $derived(interpolatePosition(marked, currentMileage, LANDMARK_COORDS));
  const wagonX = $derived(wagonXY[0]);
  const wagonY = $derived(wagonXY[1]);

  // Trail polyline as straight segments through plotted landmarks.
  // Split at the wagon's current position into traveled + ahead.
  const traveledPath = $derived.by(() => {
    const passed = plotted.filter((m) => m.mile <= currentMileage);
    if (passed.length === 0) return null;
    const [wx, wy] = wagonXY;
    const segs = passed.map((m, i) => {
      const [x, y] = LANDMARK_COORDS[m.id]!;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    });
    segs.push(`L ${wx} ${wy}`);
    return segs.join(' ');
  });

  const aheadPath = $derived.by(() => {
    const ahead = plotted.filter((m) => m.mile > currentMileage);
    if (ahead.length === 0) return null;
    const [wx, wy] = wagonXY;
    const segs = [`M ${wx} ${wy}`];
    for (const m of ahead) {
      const [x, y] = LANDMARK_COORDS[m.id]!;
      segs.push(`L ${x} ${y}`);
    }
    return segs.join(' ');
  });

  /** Pin kind override per landmark (start/fort/landmark/end) — falls
   *  back to a generic 'landmark' pin for anything not specially-cased. */
  function pinKind(l: Landmark): 'start' | 'fort' | 'landmark' | 'end' {
    if (l.kind === 'start') return 'start';
    if (l.kind === 'end') return 'end';
    if (l.kind === 'trading_post') return 'fort';
    return 'landmark';
  }

  /** Display label — uppercased name. */
  function pinLabel(l: Landmark): string {
    return l.name.toUpperCase();
  }
</script>

<defs>
  <linearGradient id="trail-river-paint" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#6a98c4" />
    <stop offset="1" stop-color="#2f5a8a" />
  </linearGradient>
  <pattern
    id="hatch-mountain-paint"
    patternUnits="userSpaceOnUse"
    width="6"
    height="6"
    patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" stroke="#5a3a1a" stroke-width={0.5 * ps} />
  </pattern>
</defs>

<!-- territories -->
<g stroke="#8a5a2a" stroke-width={1 * ps} fill="none" opacity="0.5" stroke-dasharray="4 3">
  <path d="M40 50 L260 60 L290 180 L80 200 Z" />
  <path d="M260 60 L370 90 L390 220 L290 180 Z" />
  <path d="M370 90 L520 110 L530 280 L390 220 Z" />
  <path d="M520 110 L820 150 L820 320 L530 280 Z" />
  <path d="M820 150 L970 170 L970 340 L820 320 Z" />
</g>
<g class="state-text" style="font-size:{8.5 * ps}px">
  <text x="120" y="115">OREGON COUNTRY</text>
  <text x="295" y="135">IDAHO</text>
  <text x="430" y="170">WYOMING</text>
  <text x="650" y="195">NEBRASKA TERR.</text>
  <text x="855" y="220">MO.</text>
</g>

<!-- mountains -->
<g stroke="#5a3a1a" stroke-width={1 * ps} fill="url(#hatch-mountain-paint)" opacity="0.85">
  <path d="M380 195 l8 -16 l8 16 z" />
  <path d="M395 200 l10 -22 l10 22 z" />
  <path d="M413 198 l9 -19 l9 19 z" />
  <path d="M430 205 l8 -15 l8 15 z" />
  <path d="M340 235 l7 -13 l7 13 z" />
  <path d="M355 240 l8 -16 l8 16 z" />
  <path d="M180 145 l7 -13 l7 13 z" />
  <path d="M195 150 l8 -15 l8 15 z" />
  <path d="M210 152 l7 -14 l7 14 z" />
  <path d="M85 110 l8 -16 l8 16 z" />
  <path d="M100 115 l9 -18 l9 18 z" />
  <path d="M115 118 l7 -14 l7 14 z" />
</g>
<g class="state-text" style="opacity:0.8;letter-spacing:0.15em;font-size:{9 * ps}px">
  <text x="395" y="172">ROCKY MTNS</text>
</g>
<g class="state-text" style="opacity:0.8;letter-spacing:0.12em;font-size:{8 * ps}px">
  <text x="180" y="125">BLUE MTNS</text>
  <text x="80" y="92">CASCADES</text>
</g>

<!-- rivers -->
<g
  fill="none"
  stroke="url(#trail-river-paint)"
  stroke-linecap="round"
  stroke-linejoin="round"
  opacity="0.95">
  <path d="M30 95 Q60 105 95 115 Q140 125 175 130" stroke-width={3.5 * ps} />
  <path d="M175 130 Q220 145 265 155 Q310 168 340 165 Q365 162 380 175" stroke-width={3 * ps} />
  <path d="M395 215 Q435 218 470 215 Q495 213 520 220" stroke-width={2.2 * ps} />
  <path d="M520 220 Q560 230 600 240 Q640 248 680 258" stroke-width={2.6 * ps} />
  <path d="M680 258 Q720 263 760 270 Q800 275 840 285" stroke-width={3 * ps} />
  <path d="M905 80 Q920 160 925 240 Q930 320 920 360" stroke-width={3.5 * ps} />
  <path d="M840 285 Q870 295 905 305" stroke-width={2 * ps} />
</g>
<g class="river-text" style="font-size:{9 * ps}px">
  <text x="60" y="108" transform="rotate(-8 60 108)">Columbia R.</text>
  <text x="220" y="148" transform="rotate(-4 220 148)">Snake R.</text>
  <text x="430" y="208">Sweetwater R.</text>
  <text x="610" y="252" transform="rotate(6 610 252)">N. Platte R.</text>
  <text x="730" y="280">Platte R.</text>
  <text x="912" y="200" transform="rotate(-90 912 200)">Missouri R.</text>
</g>

<!-- TRAVELED + AHEAD trail polylines (data-driven) -->
{#if traveledPath}
  <path
    d={traveledPath}
    fill="none"
    stroke="#c96a2a"
    stroke-width={7 * ps}
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.18" />
  <path
    d={traveledPath}
    fill="none"
    stroke="#c96a2a"
    stroke-width={3.6 * ps}
    stroke-linecap="round"
    stroke-linejoin="round" />
{/if}
{#if aheadPath}
  <path
    d={aheadPath}
    fill="none"
    stroke="#5a3a1a"
    stroke-width={2.2 * ps}
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-dasharray="6 5"
    opacity="0.85" />
{/if}

<!-- LANDMARKS — driven by LANDMARK_COORDS + LANDMARKS labels -->
{#each plotted as l (l.id)}
  {@const [x, y] = LANDMARK_COORDS[l.id]!}
  <g transform="translate({x},{y})">
    {#if l.id === 'chimney_rock'}
      <path d="M-4 0 L-2 -3 L2 -3 L4 0 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width={0.9 * ps} />
      <path d="M-1.2 -3 L-0.6 -11 L0.6 -11 L1.2 -3 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width={0.9 * ps} />
      <text x="0" y="-15" text-anchor="middle" class="lmk-text" style="font-size:{9 * ps}px">CHIMNEY ROCK</text>
    {:else if l.id === 'independence_rock'}
      <ellipse cx="0" cy="0" rx="6" ry="3" fill="#c9b89a" stroke="#3a1a08" stroke-width={1.2 * ps} />
      <text x="0" y="-7" text-anchor="middle" class="lmk-text" style="font-size:{9 * ps}px">{pinLabel(l)}</text>
    {:else if l.id === 'south_pass'}
      <path d="M-8 4 L-4 -3 L0 4 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width={1 * ps} />
      <path d="M0 4 L4 -3 L8 4 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width={1 * ps} />
      <text x="0" y="-7" text-anchor="middle" class="lmk-text" style="font-size:{9 * ps}px">{pinLabel(l)}</text>
    {:else if l.id === 'the_dalles'}
      <ellipse cx="0" cy="0" rx="4" ry="2" fill="#c9b89a" stroke="#3a1a08" stroke-width={1 * ps} />
      <text x="0" y="-6" text-anchor="middle" class="lmk-text" style="font-size:{9 * ps}px">{pinLabel(l)}</text>
    {:else}
      <LandmarkPin kind={pinKind(l)} />
      {#if l.id === 'independence'}
        <text x="-8" y="18" text-anchor="end" class="lmk-text" style="font-size:{9 * ps}px">{pinLabel(l)}</text>
      {:else if l.id === 'oregon_city'}
        <text x="0" y="-13" text-anchor="middle" class="lmk-text" style="font-size:{11 * ps}px;letter-spacing:0.15em">{pinLabel(l)}</text>
      {:else}
        <text x="0" y="-10" text-anchor="middle" class="lmk-text" style="font-size:{9 * ps}px">{pinLabel(l)}</text>
      {/if}
    {/if}
  </g>
{/each}

<!-- Wagon glyph at the interpolated position -->
<g transform="translate({wagonX},{wagonY})">
  <WagonGlyph size={wagonSize}>
    {#if youAreHereLabel}
      <text x="0" y="-15" text-anchor="middle" class="lmk-text" style="fill:#8a3a1a;font-size:{10 * ps}px">YOU ARE HERE</text>
    {/if}
  </WagonGlyph>
</g>

<!-- pacific corner -->
<g transform="translate(40,335)" opacity="0.6">
  <text x="0" y="0" font-family="Georgia, serif" font-style="italic" font-size={9 * ps} fill="#5a3a1a">Pacific Ocean</text>
  <path d="M0 4 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="#2f5a8a" stroke-width={0.6 * ps} fill="none" />
  <path d="M0 9 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="#2f5a8a" stroke-width={0.5 * ps} fill="none" opacity="0.7" />
</g>

<!-- scale bar (anchored bottom-right of modal coord-space) -->
<g transform="translate(840,355)">
  <line x1="0" y1="0" x2="120" y2="0" stroke="#3a1a08" stroke-width={1.6 * ps} />
  <line x1="0" y1="-3" x2="0" y2="3" stroke="#3a1a08" stroke-width={1.6 * ps} />
  <line x1="60" y1="-2" x2="60" y2="2" stroke="#3a1a08" stroke-width={1 * ps} />
  <line x1="120" y1="-3" x2="120" y2="3" stroke="#3a1a08" stroke-width={1.6 * ps} />
  <text x="60" y="-6" text-anchor="middle" font-family="Special Elite, monospace" font-size={9 * ps} fill="#3a1a08" letter-spacing="0.05em">~ 200 MILES</text>
</g>

<style>
  :global(.lmk-text) {
    font-family: 'Special Elite', 'Courier New', monospace;
    fill: #3a1a08;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  :global(.river-text) {
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    fill: #2f5a8a;
  }
  :global(.state-text) {
    font-family: Georgia, serif;
    fill: #8a5a2a;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    opacity: 0.65;
  }
</style>
