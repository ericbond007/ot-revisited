<script lang="ts">
  // Plank-textured rectangle for the wagon bed. Vertical seams between
  // planks, iron strapping at each end, and an optional missing-plank
  // gap when `dropPlank >= 0`.
  import { W_INK, W_IRON, W_WOOD } from './wagon-tokens';

  interface Props {
    x: number;
    y: number;
    w: number;
    h: number;
    planks?: number;
    /** If >= 0, draws a dark gap at this plank index. */
    dropPlank?: number;
    fill?: string;
  }

  let {
    x,
    y,
    w,
    h,
    planks = 4,
    dropPlank = -1,
    fill = W_WOOD
  }: Props = $props();

  // Plank seam x-coordinates (skipping the outer edges).
  const seamXs = $derived.by(() => {
    const out: number[] = [];
    for (let i = 1; i < planks; i++) out.push(x + (w / planks) * i);
    return out;
  });
</script>

<g>
  <rect {x} {y} width={w} height={h}
        {fill} stroke={W_INK} stroke-width="0.7" stroke-linejoin="round" />
  {#each seamXs as px, i (i)}
    <line x1={px} y1={y + 0.5} x2={px} y2={y + h - 0.5}
          stroke={W_INK} stroke-width="0.35" opacity="0.7" />
  {/each}
  <!-- iron straps at each end -->
  <rect x={x + 0.3} y={y - 0.3} width="0.6" height={h + 0.6}
        fill={W_IRON} opacity="0.7" />
  <rect x={x + w - 0.9} y={y - 0.3} width="0.6" height={h + 0.6}
        fill={W_IRON} opacity="0.7" />
  <!-- dropped plank — show a gap -->
  {#if dropPlank >= 0}
    <rect x={x + (w / planks) * dropPlank + 0.5} y={y + 1}
          width={(w / planks) - 1} height={h - 2}
          fill={W_INK} opacity="0.6" />
  {/if}
</g>
