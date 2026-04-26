<script lang="ts">
  // Trail-end Willamette Valley arch — twin posts, crossbeam, hanging
  // sign, flanking trees. The "you made it" silhouette for the final
  // approach into Oregon City.
  import { LANDMARK_INK } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <!-- arch posts -->
  <rect x="-22" y="-30" width="4" height="30"
        fill="#5a3a1a" stroke={LANDMARK_INK} stroke-width="0.4" />
  <rect x="18"  y="-30" width="4" height="30"
        fill="#5a3a1a" stroke={LANDMARK_INK} stroke-width="0.4" />
  <!-- crossbeam -->
  <rect x="-26" y="-34" width="52" height="6"
        fill="#7a5a2a" stroke={LANDMARK_INK} stroke-width="0.4" />
  <!-- hanging sign -->
  <rect x="-14" y="-26" width="28" height="10"
        fill="#c8a868" stroke={LANDMARK_INK} stroke-width="0.4" />
  <!-- flanking trees -->
  <path d="M -36 0 L -34 -16 L -28 -20 L -22 -16 L -20 0 Z"
        fill="#3a4a3a" stroke={LANDMARK_INK} stroke-width="0.4" />
  <path d="M 20 0 L 22 -16 L 28 -20 L 34 -16 L 36 0 Z"
        fill="#3a4a3a" stroke={LANDMARK_INK} stroke-width="0.4" />
</g>
