<script lang="ts">
  // Independence Rock — low granite dome on the Sweetwater. Famous
  // for the names emigrants carved into it.
  import { LANDMARK_FILL, LANDMARK_INK } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <path d="M -42 0 C -42 -16, -28 -26, 0 -26 C 28 -26, 42 -16, 42 0 Z"
        fill={LANDMARK_FILL} stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- dome highlight curve -->
  <path d="M -32 -8 C -20 -14, 20 -14, 32 -8"
        stroke={LANDMARK_INK} stroke-width="0.3" fill="none" opacity="0.5" />
</g>
