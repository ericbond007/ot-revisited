<script lang="ts">
  // Shared river-surface primitive — reused by every river-ford icon
  // (kansas_river, big_blue_river, sweetwater_1, etc.). Water rect +
  // muddy bank line + three wavelets, parameterized on `y` (top edge)
  // and `h` (height). Lifted verbatim from the handoff bundle's
  // RiverSurface JSX helper.
  import { LI } from './landmark-icon-tokens';

  let { y = 13, h = 9, opacity = 0.7 }: { y?: number; h?: number; opacity?: number } = $props();
</script>

<g>
  <rect x="1" {y} width="22" height={h} fill={LI.water} {opacity} />
  <rect x="1" y={y - 0.5} width="22" height="0.7" fill={LI.earth} opacity="0.7" />
  <path d={`M 2 ${y + 2} Q 6 ${y + 1} 10 ${y + 2} T 18 ${y + 2} T 22 ${y + 2}`}
        stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.55" />
  <path d={`M 2 ${y + 5} Q 6 ${y + 4} 10 ${y + 5} T 18 ${y + 5} T 22 ${y + 5}`}
        stroke={LI.ink} stroke-width="0.3" fill="none" opacity="0.5" />
  <path d={`M 2 ${y + 7.5} Q 6 ${y + 6.5} 10 ${y + 7.5} T 18 ${y + 7.5} T 22 ${y + 7.5}`}
        stroke={LI.ink} stroke-width="0.25" fill="none" opacity="0.45" />
</g>
