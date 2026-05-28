<script lang="ts">
  // Scotts Bluff — long ridgeline with castle-like crenellations.
  import { LANDMARK_FILL, LANDMARK_INK, LANDMARK_LIGHT } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <path d="M -60 0 L -52 -18 L -40 -22 L -28 -32 L -10 -36 L 12 -38 L 30 -32 L 48 -28 L 60 -22 L 68 -10 L 68 0 Z"
        fill={LANDMARK_FILL} stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- crenellation highlights -->
  <path d="M -28 -32 L -22 -38 L -16 -36 M 8 -38 L 14 -42 L 22 -38"
        fill={LANDMARK_LIGHT} stroke={LANDMARK_INK} stroke-width="0.5" />
  <!-- horizontal strata -->
  <path d="M -50 -16 L 60 -16"
        stroke={LANDMARK_INK} stroke-width="0.3" opacity="0.5" />
</g>
