<script lang="ts">
  // Driver figure on the bench seat — drawn in SIDE PROFILE facing
  // forward (LEFT in our coords, same direction the wagon travels).
  // Period emigrant: wide-brim slouch hat, weathered coat, suspenders,
  // forward arm holding reins, back arm and back leg implied (hidden
  // behind the visible profile).
  //
  // Slightly smaller than the previous frontal version — sits the
  // driver at a believable scale relative to the bench seat.
  import { W_INK } from './wagon-tokens';

  interface Props {
    x: number;
    y: number;
    /** Variant kept for future per-wagon driver tweaks. Not visually
     *  distinct yet — port-faithful. */
    variant?: 'light' | 'schooner' | 'conestoga';
    /** Swap the hand-drawn SVG paths for the Blender-rendered cowboy
     *  PNG. Same anchor convention: (x, y) = hip on the bench. */
    useBlender?: boolean;
    /** Optional alignment + scale tweaks for the Blender variant. */
    dx?: number;
    dy?: number;
    scale?: number;
  }

  let {
    x, y, variant: _variant = 'schooner',
    useBlender = false,
    dx = 0, dy = 0, scale = 1,
  }: Props = $props();
  // Blender PNG is 340×700 cropped, side-profile facing LEFT (forward).
  // Hip pivot on the image is roughly 57% down, ~50% across.
  const baseHeight = 8;
  const blenderHeight = $derived(baseHeight * scale);
  const blenderWidth = $derived(blenderHeight * (340 / 700));
  const blenderHipFracX = 0.50;
  const blenderHipFracY = 0.57;
  // The figure's internal hip is at y=0 — i.e. the (x, y) prop should
  // be the seat-top point where the driver's butt rests. All
  // child coords drawn UP from there (negative y) for torso/head/hat
  // and DOWN (positive y) for legs/feet folding forward over the
  // jockey toolbox face.
  const seatX = $derived(x + dx);
  const seatY = $derived(y + dy);
</script>

<g transform="translate({seatX} {seatY})">
  {#if useBlender}
    <!-- Blender-rendered seated cowboy PNG. Anchor is hip-on-bench. -->
    <image href="/wagon-figures/cowboy-driver-side.png"
           x={-blenderWidth * blenderHipFracX}
           y={-blenderHeight * blenderHipFracY}
           width={blenderWidth}
           height={blenderHeight}
           preserveAspectRatio="xMidYMid meet" />
  {:else}
  <!-- Profile-view driver: facing LEFT (forward toward the team). All
       coordinates relative to (0, 0) = driver's hip on the bench. -->

  <!-- back leg (visible behind the front) — bent at knee -->
  <path d="M-0.0 0.3 Q0.5 1.4 0.3 2.4 L1.0 2.5 L1.2 2.0 Q1.0 1.0 0.6 0.3 Z"
        fill="#2a1810" stroke={W_INK} stroke-width="0.22"
        stroke-linejoin="round" opacity="0.85" />

  <!-- front leg — knee bent forward, foot resting on footboard -->
  <path d="M-0.4 0.3 Q-1.4 1.5 -1.6 2.4 L-0.4 2.5 L-0.2 1.6 Q-0.0 0.9 0.2 0.3 Z"
        fill="#3a2614" stroke={W_INK} stroke-width="0.26"
        stroke-linejoin="round" />

  <!-- front foot — boot toe pointing forward -->
  <path d="M-1.6 2.3 L-2.0 2.5 L-2.0 2.85 L-0.4 2.85 L-0.4 2.5 Z"
        fill="#1a0a04" stroke={W_INK} stroke-width="0.22"
        stroke-linejoin="round" />

  <!-- coat / torso — narrow profile, slightly hunched forward.
       Front of body to the LEFT (toward the team). -->
  <path d="M-0.3 0.4
           L-0.6 -0.6 Q-0.7 -1.6 -0.4 -2.0
           L0.7 -2.0 Q0.85 -1.4 0.7 -0.5
           L0.6 0.4 Z"
        fill="#5a3a1a" stroke={W_INK} stroke-width="0.28"
        stroke-linejoin="round" />

  <!-- coat back vertical seam -->
  <line x1="0.7" y1="-2.0" x2="0.6" y2="0.3"
        stroke={W_INK} stroke-width="0.18" opacity="0.7" />

  <!-- coat buttons / suspenders along the front -->
  <circle cx="-0.45" cy="-1.4" r="0.10" fill="#aa8a5a" />
  <circle cx="-0.45" cy="-0.8" r="0.10" fill="#aa8a5a" />

  <!-- front arm extending forward to hold reins. Sleeve + hand. -->
  <path d="M-0.3 -1.5 Q-1.2 -0.9 -2.2 -0.3 L-2.0 0.0 Q-1.0 -0.6 -0.2 -1.2 Z"
        fill="#5a3a1a" stroke={W_INK} stroke-width="0.24"
        stroke-linejoin="round" />
  <!-- forward hand -->
  <ellipse cx="-2.3" cy="-0.15" rx="0.22" ry="0.28"
           fill="#e8c89a" stroke={W_INK} stroke-width="0.18" />

  <!-- short coiled whip on the back hip (back arm hidden) -->
  <ellipse cx="0.6" cy="-0.4" rx="0.32" ry="0.22"
           fill="none" stroke={W_INK} stroke-width="0.22" />
  <ellipse cx="0.6" cy="-0.25" rx="0.32" ry="0.22"
           fill="none" stroke={W_INK} stroke-width="0.18" opacity="0.7" />

  <!-- neck -->
  <rect x="-0.05" y="-2.4" width="0.5" height="0.5"
        fill="#e8c89a" stroke={W_INK} stroke-width="0.18" />

  <!-- HEAD in profile facing LEFT — egg-shape with subtle nose + chin -->
  <path d="M0.55 -2.8
           Q0.6 -3.5 0.2 -3.8
           Q-0.3 -3.95 -0.55 -3.65
           L-0.7 -3.45 L-0.55 -3.3
           Q-0.55 -2.9 -0.3 -2.7
           Q0.1 -2.55 0.55 -2.65 Z"
        fill="#e8c89a" stroke={W_INK} stroke-width="0.22"
        stroke-linejoin="round" />
  <!-- eye dot -->
  <circle cx="-0.35" cy="-3.55" r="0.08" fill={W_INK} />
  <!-- short beard along the jaw -->
  <path d="M-0.4 -3.0 Q-0.1 -2.65 0.45 -2.7"
        stroke="#3a2614" stroke-width="0.25" fill="none" opacity="0.85" />

  <!-- WIDE-BRIM SLOUCH HAT — side profile.
       Brim: a horizontal flattened ellipse. Crown: tall on top of brim.
       Both shifted slightly forward so the brim shadows the eyes.    -->
  <!-- brim (side view = thin horizontal oval; hat tilts slightly down at front) -->
  <path d="M-1.6 -3.95 L-1.85 -3.85 L-0.95 -3.7 L0.95 -3.7 L1.55 -3.85 L1.4 -3.95 Z"
        fill="#3a2614" stroke={W_INK} stroke-width="0.22"
        stroke-linejoin="round" />
  <!-- crown (tall trapezoid sitting on the brim) -->
  <path d="M-0.85 -3.95 L-0.65 -4.7 Q0.2 -4.95 0.95 -4.7 L1.05 -3.95 Z"
        fill="#3a2614" stroke={W_INK} stroke-width="0.24"
        stroke-linejoin="round" />
  <!-- hatband (thin lighter line where crown meets brim) -->
  <line x1="-0.8" y1="-3.95" x2="1.0" y2="-3.95"
        stroke="#1a0a04" stroke-width="0.22" />

  <!-- reins extending forward toward the team -->
  <path d="M-2.3 -0.15 q-2.4 0.9 -5.5 1.4"
        stroke={W_INK} stroke-width="0.28" fill="none"
        stroke-linecap="round" />
  {/if}
</g>
