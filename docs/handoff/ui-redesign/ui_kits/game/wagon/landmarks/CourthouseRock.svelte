<script lang="ts">
  // Courthouse & Jail Rocks — pair of square-shouldered bluffs.
  import { LANDMARK_FILL, LANDMARK_INK, LANDMARK_LIGHT } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <!-- main mass (Courthouse Rock) -->
  <path d="M -38 0 L -32 -28 L -20 -34 L 8 -34 L 20 -30 L 28 -22 L 38 -18 L 42 0 Z"
        fill={LANDMARK_FILL} stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- second smaller mass (Jail Rock) -->
  <path d="M 36 -8 L 42 -22 L 56 -22 L 60 -10 L 60 0 L 36 0 Z"
        fill={LANDMARK_LIGHT} stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- strata lines -->
  <path d="M -32 -22 L 8 -22 M -28 -14 L 30 -14"
        stroke={LANDMARK_INK} stroke-width="0.3" fill="none" opacity="0.5" />
</g>
