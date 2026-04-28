<script lang="ts">
  // Shallow-ford wagon — wheels on the bottom, used at the
  // wadeable crossings (north_platte_east, sweetwater_1,
  // three_island_crossing on its braided sections).
  import { LI } from './landmark-icon-tokens';

  let { x = 8, y = 8 }: { x?: number; y?: number } = $props();
</script>

<g transform={`translate(${x} ${y})`}>
  <path d="M 0 4 Q 4 0 8 4 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.4" />
  <rect x="0" y="4" width="8" height="2" fill={LI.earth} stroke={LI.ink} stroke-width="0.3" />
  <rect x="0" y="4" width="8" height="2" fill={LI.ink} opacity="0.18" />
  <circle cx="1.5" cy="6.5" r="0.7" fill="none" stroke={LI.ink} stroke-width="0.35" />
  <circle cx="6.5" cy="6.5" r="0.7" fill="none" stroke={LI.ink} stroke-width="0.35" />
</g>
