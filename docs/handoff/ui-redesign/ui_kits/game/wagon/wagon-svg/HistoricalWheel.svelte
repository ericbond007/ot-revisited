<script lang="ts">
  // Spoked wagon wheel — pale spokes against a dark hub, matching real
  // historic photos (white-painted spokes were common). Renders as a
  // <g> group meant to be nested inside a parent <svg>; coordinates
  // are in the parent's units.
  import { W_INK, W_WOOD_DARK } from './wagon-tokens';

  interface Props {
    cx: number;
    cy: number;
    r: number;
    angle?: number;
    spokes?: number;
    broken?: boolean;
    spokeColor?: string;
  }

  let {
    cx,
    cy,
    r,
    angle = 0,
    spokes = 10,
    broken = false,
    spokeColor = '#e8d4a8'
  }: Props = $props();

  // Build the spoke list; if broken, skip spoke index 3.
  const spokeList = $derived.by(() => {
    const out: Array<{ x2: number; y2: number; idx: number }> = [];
    for (let i = 0; i < spokes; i++) {
      if (broken && i === 3) continue;
      const a = (i * 360) / spokes;
      const x2 = Math.cos((a * Math.PI) / 180) * (r - 0.8);
      const y2 = Math.sin((a * Math.PI) / 180) * (r - 0.8);
      out.push({ x2, y2, idx: i });
    }
    return out;
  });
</script>

<g transform="translate({cx} {cy})">
  <!-- outer rim (iron tire) — dark band -->
  <circle r={r} fill="none" stroke={W_INK} stroke-width="1.1" />
  <!-- inner rim wood (pale ring just inside the iron tire) -->
  <circle r={r - 0.55} fill="none" stroke={spokeColor} stroke-width="0.7" />
  <circle r={r - 0.9} fill="none" stroke={W_INK} stroke-width="0.18" opacity="0.55" />
  <!-- spokes (rotating) -->
  <g transform="rotate({angle})">
    {#each spokeList as s (s.idx)}
      <line x1="0" y1="0" x2={s.x2} y2={s.y2}
            stroke={spokeColor} stroke-width="0.65" stroke-linecap="round" />
      <line x1="0" y1="0" x2={s.x2} y2={s.y2}
            stroke={W_INK} stroke-width="0.18" stroke-linecap="round" opacity="0.5" />
    {/each}
    <!-- hub — dark contrasting circle (key feature in reference photos) -->
    <circle r={r * 0.26} fill={W_WOOD_DARK} stroke={W_INK} stroke-width="0.5" />
    <circle r={r * 0.18} fill={W_INK} />
    <!-- iron hub axle cap -->
    <circle r={r * 0.08} fill={spokeColor} />
    <!-- iron hub bands -->
    <circle r={r * 0.32} fill="none" stroke={W_INK} stroke-width="0.32" opacity="0.7" />
  </g>
  <!-- if broken, draw a stick replacement -->
  {#if broken}
    <g transform="rotate({angle})">
      <line x1="0" y1="0" x2={r * 0.85} y2={r * 0.4}
            stroke="#a87040" stroke-width="0.9" stroke-linecap="round" />
      <line x1="0" y1="0" x2={r * 0.6} y2={r * 0.85}
            stroke="#a87040" stroke-width="0.9" stroke-linecap="round" />
    </g>
  {/if}
</g>
