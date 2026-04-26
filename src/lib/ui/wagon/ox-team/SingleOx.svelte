<script lang="ts">
  // Single ox or mule, profile view, FACING LEFT (traveling west).
  //
  // Coordinate system (per the brief):
  //   * Origin between hooves on the ground
  //   * y-positive points DOWN
  //   * Spine sits at y ≈ -8 to -9
  //   * Total length ~17 units along x
  //   * Leg length ~5
  //
  // The walk cycle is a simple sin wave — diagonal pairs of legs swing
  // in opposite phase. `gaitPhase` is 0..1 (one full stride). At
  // gaitPhase=0 the front-near + rear-far legs are forward; at 0.5
  // the opposite diagonal is forward.
  //
  // V1 rendering — passable working-ox proportions, intentionally
  // stylized to match the wagon's "dusty 32-bit" idiom. Full visual
  // pass against a clean reference photo is tracked separately
  // (see TODO.md #158).

  import {
    OX_RED,
    OX_RED_DARK,
    OX_WHITE,
    OX_HOOF,
    OX_HORN,
    OX_HORN_TIP,
    OX_INK,
    MULE_BODY,
    MULE_BODY_DARK,
    MULE_BELLY,
    MULE_MANE,
    LEG_SWING_DEG
  } from './ox-team-tokens';

  interface Props {
    /** 0..1 — one full stride per cycle. */
    gaitPhase?: number;
    isMule?: boolean;
  }

  let { gaitPhase = 0, isMule = false }: Props = $props();

  // Per-leg phase offsets. Diagonal pairs swing together:
  //   front-near (FN) + rear-far  (RF) → +sin
  //   front-far  (FF) + rear-near (RN) → -sin
  const legAngle = (offset: number) =>
    Math.sin((gaitPhase + offset) * 2 * Math.PI) * LEG_SWING_DEG;

  const angFN = $derived(legAngle(0));      // front-near
  const angFF = $derived(legAngle(0.5));    // front-far  (opposite)
  const angRN = $derived(legAngle(0.5));    // rear-near  (diagonal pair w/ FF)
  const angRF = $derived(legAngle(0));      // rear-far   (diagonal pair w/ FN)

  // Body palette — pied red-and-white for ox, single grey-brown for mule.
  const bodyMain  = $derived(isMule ? MULE_BODY : OX_WHITE);
  const bodyShade = $derived(isMule ? MULE_BODY_DARK : OX_RED);
  const bellyTone = $derived(isMule ? MULE_BELLY : OX_WHITE);
  const accent    = $derived(isMule ? MULE_MANE : OX_RED_DARK);
</script>

<g>
  <!-- ───────── shadow on the ground ───────── -->
  <ellipse cx="-1" cy="0.2" rx="9" ry="0.7" fill={OX_INK} opacity="0.28" />

  <!-- ───────── far-side legs (drawn first, slightly desaturated so
       they read as behind the near pair) ───────── -->
  {#each [{ angle: angFF, hipX: -5, key: 'ff' }, { angle: angRF, hipX: 4, key: 'rf' }] as leg (leg.key)}
    <g transform="translate({leg.hipX + 0.5} -5) rotate({leg.angle})">
      <!-- upper leg -->
      <rect x="-0.8" y="0" width="1.6" height="2.6" fill={bodyShade} stroke={OX_INK} stroke-width="0.25" opacity="0.85" />
      <!-- lower leg -->
      <rect x="-0.65" y="2.4" width="1.3" height="2.4" fill={bodyMain} stroke={OX_INK} stroke-width="0.22" opacity="0.85" />
      <!-- hoof -->
      <rect x="-0.8" y="4.6" width="1.6" height="0.6" fill={OX_HOOF} opacity="0.9" />
    </g>
  {/each}

  <!-- ───────── body trunk ─────────
       The base is a rounded trapezoidal silhouette. Front shoulder
       sits slightly higher than the haunch; belly tucks up
       between the legs. Mules read as slimmer (smaller flank). -->
  <path d={isMule
      ? 'M -7 -8 Q -8 -7.5 -7.5 -6 L -7 -5 L 5.5 -5 L 6.5 -6 Q 6.5 -8 5 -8.5 L -5 -8.5 Q -6.5 -8.5 -7 -8 Z'
      : 'M -7.5 -8.5 Q -8.5 -8 -8 -6.5 L -7.5 -4.5 L 6 -4.5 L 7 -6 Q 7 -8.5 5.5 -9 L -5 -9 Q -6.5 -9 -7.5 -8.5 Z'}
        fill={bodyMain} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />

  <!-- back patch (red on the ox; darker brown on the mule) -->
  <path d={isMule
      ? 'M -5 -8.3 Q -2 -8.8 1 -8.7 Q 4 -8.5 5 -7.6 L 5 -6.5 Q 2 -7.2 -1 -7.1 Q -4 -7 -5 -7.4 Z'
      : 'M -5.5 -8.9 Q -2 -9.3 1 -9.2 Q 4.5 -9 5.5 -8.2 L 5.5 -7 Q 2 -7.7 -1 -7.6 Q -4.5 -7.5 -5.5 -7.9 Z'}
        fill={bodyShade} stroke={OX_INK} stroke-width="0.3" />

  <!-- shoulder hump highlight + flank dip -->
  <path d="M -7 -7.6 Q -6 -8.5 -4.5 -8" fill="none" stroke={accent} stroke-width="0.25" opacity="0.55" />

  <!-- belly tone -->
  <path d={isMule
      ? 'M -6.5 -5.4 L 5 -5.4'
      : 'M -7 -5 L 5.5 -5'}
        stroke={bellyTone} stroke-width="0.5" opacity="0.85" />

  <!-- tail -->
  <path d={isMule
      ? 'M 6.4 -7.2 q 1.6 0.8 1.4 3.4'
      : 'M 6.9 -8 q 1.7 1 1.5 3.6'}
        stroke={OX_INK} stroke-width="0.45" fill="none" stroke-linecap="round" />
  <circle cx={isMule ? 7.7 : 8.3} cy={isMule ? -3.6 : -4.2} r="0.4" fill={accent} />

  <!-- ───────── neck + head ─────────
       Head sits ahead of and below the spine line. Mule: longer ears,
       no horns. Ox: short curved horns. Both: pale snout, dark eye. -->

  <!-- neck -->
  <path d={isMule
      ? 'M -7 -8 Q -8.5 -8 -9 -7 L -9 -6 Q -8.2 -6 -7.5 -6.4 Z'
      : 'M -7.5 -8.5 Q -9 -8.3 -9.6 -7.4 L -9.6 -6.4 Q -8.6 -6.4 -8 -6.8 Z'}
        fill={bodyMain} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />

  <!-- head proper -->
  <path d={isMule
      ? 'M -9 -7.6 Q -10.6 -7.6 -11.2 -6.6 Q -11.4 -5.8 -10.4 -5.6 L -9 -5.8 Z'
      : 'M -9.6 -8 Q -11.2 -8 -11.6 -7 Q -11.8 -6.2 -10.8 -6 L -9.4 -6.2 Z'}
        fill={bodyMain} stroke={OX_INK} stroke-width="0.35" stroke-linejoin="round" />

  <!-- snout (lighter band on both) -->
  <ellipse cx={isMule ? -10.9 : -11.3} cy={isMule ? -6.1 : -6.6} rx="0.55" ry="0.4"
           fill={bellyTone} stroke={OX_INK} stroke-width="0.2" />
  <!-- nostril -->
  <circle cx={isMule ? -11.05 : -11.45} cy={isMule ? -6 : -6.5} r="0.12" fill={OX_INK} />

  <!-- eye -->
  <circle cx={isMule ? -10.4 : -10.95} cy={isMule ? -7.05 : -7.4} r="0.18" fill={OX_INK} />

  {#if isMule}
    <!-- long mule ears -->
    <path d="M -9.4 -7.9 q -0.1 -1.6 0.4 -2.2 q 0.5 0.3 0.4 1.9 z"
          fill={bodyShade} stroke={OX_INK} stroke-width="0.25" />
    <path d="M -8.9 -8 q 0.2 -1.4 0.7 -1.9 q 0.4 0.4 0.2 1.7 z"
          fill={bodyMain} stroke={OX_INK} stroke-width="0.22" />
  {:else}
    <!-- ox horns: near horn (forward + up curl) and far horn hint -->
    <path d="M -10.2 -8.2 q -0.5 -1.4 -2.0 -1.6 q 0.6 0.5 0.9 1.6 q 0.5 0.5 1.1 0.5 z"
          fill={OX_HORN} stroke={OX_HORN_TIP} stroke-width="0.25" />
    <path d="M -9.6 -8.4 q -0.2 -1.0 -1.2 -1.5 q 0.4 0.5 0.5 1.4 q 0.3 0.3 0.7 0.4 z"
          fill={OX_HORN} stroke={OX_HORN_TIP} stroke-width="0.22" opacity="0.75" />
  {/if}

  <!-- ───────── near-side legs (drawn over body) ───────── -->
  {#each [{ angle: angFN, hipX: -5.5, key: 'fn' }, { angle: angRN, hipX: 4.5, key: 'rn' }] as leg (leg.key)}
    <g transform="translate({leg.hipX} -5) rotate({leg.angle})">
      <!-- upper leg -->
      <rect x="-0.85" y="0" width="1.7" height="2.7" fill={bodyShade} stroke={OX_INK} stroke-width="0.3" />
      <!-- lower leg -->
      <rect x="-0.7" y="2.5" width="1.4" height="2.5" fill={bodyMain} stroke={OX_INK} stroke-width="0.25" />
      <!-- hoof -->
      <rect x="-0.85" y="4.8" width="1.7" height="0.6" fill={OX_HOOF} />
    </g>
  {/each}
</g>
