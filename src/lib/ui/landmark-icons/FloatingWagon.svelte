<script lang="ts">
  // Buoyant caulked-wagon glyph — used at deeper river crossings
  // (big_blue_river, north_platte_west, bear_river). The slim band
  // under the wagon reads as a small wake.
  import { LI } from './landmark-icon-tokens';

  let { x = 8, y = 9, scale = 1 }: { x?: number; y?: number; scale?: number } = $props();
</script>

<g transform={`translate(${x} ${y}) scale(${scale})`}>
  <path d="M 0 4 Q 4 -0.5 8 4 Z" fill={LI.white} stroke={LI.ink} stroke-width="0.5" />
  <rect x="0" y="4" width="8" height="2" fill={LI.ink} stroke={LI.ink} stroke-width="0.3" />
  <path d="M -1 6.2 Q 4 6.7 9 6.2" stroke={LI.water} stroke-width="0.5" fill="none" />
</g>
