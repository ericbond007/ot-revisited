<script lang="ts">
  // Mountain pass silhouette — broad saddle between two snow-capped
  // peaks. Stand-in for South Pass and the Blue Mountains.
  import { LANDMARK_INK } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <path d="M -70 0 L -50 -32 L -30 -20 L -10 -42 L 10 -40 L 30 -22 L 50 -34 L 70 0 Z"
        fill="#6a7a8a" stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- snowcaps -->
  <path d="M -52 -28 L -50 -32 L -48 -28 M 8 -36 L 10 -42 L 12 -36 M 48 -30 L 50 -34 L 52 -30"
        fill="#e8e8f0" />
</g>
