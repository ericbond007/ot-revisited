<script lang="ts">
  // Driver figure on the bench seat — head/torso visible from the side,
  // brimmed hat, arms holding reins that trail forward (leftward,
  // toward the team). Slight rocking implied; static pose.
  import { W_INK } from './wagon-tokens';

  interface Props {
    x: number;
    y: number;
    /** Variant kept for future per-wagon driver tweaks. Not visually
     *  distinct yet — port-faithful. */
    variant?: 'light' | 'schooner' | 'conestoga';
  }

  let { x, y, variant: _variant = 'schooner' }: Props = $props();
  const seatY = $derived(y - 4);
</script>

<g transform="translate({x} {seatY})">
  <!-- torso (jacket) -->
  <path d="M-1.2 0 Q-1.7 -1 -1.5 -2 L1.5 -2 Q1.7 -1 1.2 0 Z"
        fill="#5a3a1a" stroke={W_INK} stroke-width="0.35" />
  <!-- arms holding reins -->
  <line x1="-1" y1="-0.5" x2="-3" y2="0.5" stroke={W_INK} stroke-width="0.5" stroke-linecap="round" />
  <!-- head + brimmed hat -->
  <circle cx="0" cy="-3" r="1.1" fill="#e8c89a" stroke={W_INK} stroke-width="0.3" />
  <path d="M-2 -3.6 L2 -3.6 L1.5 -4.2 L-1.5 -4.2 Z" fill={W_INK} />
  <path d="M-2.4 -3.6 L2.4 -3.6" stroke={W_INK} stroke-width="0.5" stroke-linecap="round" />
  <!-- reins going forward (leftward) -->
  <path d="M-3 0.5 q-3 1 -7 1.5" stroke={W_INK} stroke-width="0.35" fill="none" stroke-linecap="round" />
</g>
