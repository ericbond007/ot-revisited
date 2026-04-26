<script lang="ts">
  // Chimney Rock — distinctive narrow spire on a conical mound.
  // Real landmark on the North Platte; one of the most-mentioned
  // sights in emigrant journals.
  import { LANDMARK_FILL, LANDMARK_INK, LANDMARK_LIGHT } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <!-- low conical mound base -->
  <path d="M -34 0 L -22 -12 L 22 -12 L 34 0 Z"
        fill={LANDMARK_FILL} stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- spire (slightly wider so it doesn't read as a lollipop stem) -->
  <path d="M -6 -12 L -4 -38 L 4 -38 L 6 -12 Z"
        fill={LANDMARK_LIGHT} stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- spire shadow side -->
  <path d="M -6 -12 L -4 -38 L 0 -38 L 0 -12 Z"
        fill={LANDMARK_FILL} opacity="0.7" />
</g>
