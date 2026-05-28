<script lang="ts">
  // River crossing marker — twin posts with a sign and a guide rope.
  import { LANDMARK_INK } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
  }

  let { x, baseY, scale = 1 }: Props = $props();
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <!-- posts -->
  <rect x="-12" y="-18" width="2" height="18" fill="#3a2818" />
  <rect x="10"  y="-18" width="2" height="18" fill="#3a2818" />
  <!-- sign -->
  <rect x="-14" y="-22" width="28" height="6"
        fill="#a8884a" stroke={LANDMARK_INK} stroke-width="0.4" />
  <!-- guide rope -->
  <line x1="-11" y1="-16" x2="11" y2="-16" stroke="#3a2818" stroke-width="0.4" />
</g>
