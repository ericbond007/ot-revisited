<script lang="ts">
  // Generic distant tree clump — for forest landmarks (Grande Ronde
  // Valley, etc.). A single fir-shaped silhouette with a hint of
  // trunk at the base.
  import { LANDMARK_INK } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <!-- foliage profile -->
  <path d="M -16 0 L -14 -18 L -8 -22 L 0 -28 L 8 -22 L 14 -18 L 16 0 Z"
        fill="#3a4a3a" stroke={LANDMARK_INK} stroke-width="0.5" />
  <!-- trunk hint -->
  <path d="M -2 0 L -2 -10 L 2 -10 L 2 0" fill="#3a2818" />
</g>
