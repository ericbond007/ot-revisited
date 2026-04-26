<script lang="ts">
  // Generic frontier fort silhouette — palisade walls, corner
  // blockhouses, flagpole + pennant, gate. Used for Kearny / Laramie /
  // Hall / Boise / Bridger and friends.
  import { LANDMARK_INK } from './landmark-tokens';

  interface Props {
    x: number;
    baseY: number;
    scale?: number;
    /** Display label kept for future caption use. */
    label?: string;
  }

  let { x, baseY, scale = 1, label: _label = 'Fort' }: Props = $props();

  // Picket spike positions across the palisade.
  const picketIndices = Array.from({ length: 12 }, (_, i) => i);
</script>

<g transform="translate({x} {baseY}) scale({scale})">
  <!-- palisade base -->
  <rect x="-30" y="-14" width="60" height="14"
        fill="#7a5a3a" stroke={LANDMARK_INK} stroke-width="0.6" />
  <!-- picket spikes (triangle tops) -->
  <g stroke={LANDMARK_INK} stroke-width="0.3">
    {#each picketIndices as i (i)}
      {@const px = -30 + i * 5}
      <path d={`M ${px} -14 l 2.5 -3 l 2.5 3 z`} fill="#7a5a3a" />
    {/each}
  </g>
  <!-- corner blockhouses -->
  <rect x="-32" y="-18" width="6" height="18"
        fill="#6a4a2a" stroke={LANDMARK_INK} stroke-width="0.5" />
  <rect x="26"  y="-18" width="6" height="18"
        fill="#6a4a2a" stroke={LANDMARK_INK} stroke-width="0.5" />
  <!-- flagpole + pennant -->
  <line x1="0" y1="-14" x2="0" y2="-26" stroke={LANDMARK_INK} stroke-width="0.5" />
  <path d="M 0 -26 L 8 -24 L 8 -22 L 0 -20 Z"
        fill="#a83a2a" stroke={LANDMARK_INK} stroke-width="0.3" />
  <!-- gate -->
  <rect x="-3" y="-10" width="6" height="10" fill="#3a2818" />
</g>
