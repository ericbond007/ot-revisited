<script lang="ts">
  // Single ox or mule, profile view, FACING LEFT (traveling west).
  //
  // Coordinate system (per the brief):
  //   * Origin (0, 0) = ground directly under the shoulder
  //   * +x = backward (toward wagon, the right side of screen)
  //   * -x = forward (away from wagon, the left side of screen)
  //   * -y = up (sky), +y = down (ground / shadow)
  //
  // OX path (default): full rewrite from the new travel-scene handoff
  // (#158). The ox is built around real anatomical landmarks — withers,
  // hip, brisket, dewlap, leaf-shaped ear, hooked horn, cloven hoof —
  // not symbolic rectangles. ~22 long nose-to-tail, shoulder height 14.
  //
  // MULE path (`isMule`): kept from prior design — the new handoff has
  // no mule variant, so the rectangles-and-bands fallback still owns
  // mule rendering until a dedicated handoff arrives.

  import {
    OX_INK,
    OX_RED,
    OX_RED_LT,
    OX_RED_DK,
    OX_WHITE,
    OX_WHITE_SH,
    OX_HORN,
    OX_HORN_TIP,
    OX_PINK,
    OX_HOOF,
    MULE_BODY,
    MULE_BODY_DARK,
    MULE_BELLY,
    MULE_MANE,
    LEG_SWING_DEG
  } from './ox-team-tokens';

  interface Props {
    /** "walking" (default — animated stride) or "stopped" (planted, idle).
     *  When stopped, gaitPhase is ignored and all swings/lifts collapse. */
    gait?: 'walking' | 'stopped';
    /** 0..1 — one full stride per cycle. */
    gaitPhase?: number;
    /** Per-ox amplitude jitter (~0.88..1.12). Each animal walks slightly
     *  differently; the OxTeam composer hashes a value per pair+near/far. */
    swingScale?: number;
    /** Per-ox phase shift (small, ±0.03). Yoked pairs are NOT in lockstep
     *  — a tiny offset adds biological variance. */
    strideOffset?: number;
    /** Far ox of a yoked pair — slightly tucked behind via x/y offset
     *  in the parent. The body itself stays fully opaque. */
    far?: boolean;
    /** Per-ox color jitter so adjacent oxen aren't identical.
     *  0 = pure red+white, 1 = darker, -1 = lighter. */
    tone?: -1 | 0 | 1;
    /** Markings pattern. "pied" (default) = red back + white belly +
     *  face blaze. "solid" = solid red, no white belly. */
    markings?: 'pied' | 'solid';
    /** Render as a mule instead of an ox — uses the legacy fallback path. */
    isMule?: boolean;
  }

  let {
    gait = 'walking',
    gaitPhase = 0,
    swingScale = 1,
    strideOffset = 0,
    far = false,
    tone = 0,
    markings = 'pied',
    isMule = false
  }: Props = $props();

  // ─── ox gait math ─────────────────────────────────────────────────
  // Diagonal pairs: front-near + rear-far swing together; opposite pair
  // alternates. Real oxen at draft pace barely lift their hooves —
  // small swings, low foot-clearance. Per-ox swingScale lets each
  // animal stride a bit differently. When stopped, all swings/lifts
  // collapse to 0 — the ox stands planted.
  const stopped = $derived(gait === 'stopped');
  const t = $derived(((gaitPhase + strideOffset) % 1) * Math.PI * 2);
  const baseSwing = $derived(0.55 * swingScale);
  const swA = $derived(stopped ? 0 : Math.sin(t) * baseSwing);
  const swB = $derived(stopped ? 0 : Math.sin(t + Math.PI) * baseSwing);
  const liftA = $derived(stopped ? 0 : Math.max(0, swA) * 0.7);
  const liftB = $derived(stopped ? 0 : Math.max(0, swB) * 0.7);

  // ─── ox tone ──────────────────────────────────────────────────────
  const bodyRed = $derived(
    tone < 0 ? OX_RED_LT : tone > 0 ? OX_RED_DK : OX_RED
  );
  const isPied = $derived(markings === 'pied');

  // ─── tail sway (couples to gait) ──────────────────────────────────
  const sway = $derived(stopped ? 0 : Math.sin(t) * 0.22);
  const tipX = $derived(10.0 + sway);
  const tipY = $derived(-6.2 + Math.abs(sway) * 0.15);

  // ─── mule fallback gait (unchanged from prior design) ─────────────
  const muleLegAngle = (offset: number) =>
    Math.sin((gaitPhase + offset) * 2 * Math.PI) * LEG_SWING_DEG;
  const muleAngFN = $derived(stopped ? 0 : muleLegAngle(0));
  const muleAngFF = $derived(stopped ? 0 : muleLegAngle(0.5));
  const muleAngRN = $derived(stopped ? 0 : muleLegAngle(0.5));
  const muleAngRF = $derived(stopped ? 0 : muleLegAngle(0));
</script>

{#snippet leg(hipX: number, hipY: number, sw: number, lift: number, sock: boolean, isFar: boolean)}
  {@const footX = hipX + sw * 0.7}
  {@const footY = -0.05 - lift}
  {@const lineX = hipX + (footX - hipX) * 0.55}
  {@const lineY = hipY + (footY - hipY) * 0.55}
  {@const kneeX = lineX - 0.35}
  {@const kneeY = lineY}
  {@const fetX = hipX + (footX - hipX) * 0.85}
  {@const fetY = hipY + (footY - hipY) * 0.88}
  {@const upperColor = OX_RED}
  {@const lowerColor = sock ? OX_WHITE : OX_RED}
  {@const outline = isFar ? 0.42 : 0.5}
  {@const wHipFront = 0.55}
  {@const wHipBack = 0.62}
  {@const wKneeFront = 0.32}
  {@const wKneeBack = 0.40}
  {@const wCannon = 0.22}
  {@const wFetFront = 0.32}
  {@const wFetBack = 0.36}
  {@const wHoofTop = 0.45}
  {@const midUpX = (hipX + kneeX) / 2}
  {@const midUpY = (hipY + kneeY) / 2}
  {@const midLoX = (kneeX + fetX) / 2}
  {@const midLoY = (kneeY + fetY) / 2}
  <g>
    <!-- upper leg (forearm / thigh) -->
    <path d="M {hipX - wHipFront} {hipY} Q {midUpX - 0.95} {midUpY - 0.1}, {kneeX - wKneeFront} {kneeY} L {kneeX + wKneeBack} {kneeY} Q {midUpX + 1.05} {midUpY - 0.1}, {hipX + wHipBack} {hipY} Z"
          fill={upperColor} stroke={OX_INK} stroke-width={outline} stroke-linejoin="round" />
    <!-- lower leg (cannon → fetlock) -->
    <path d="M {kneeX - wKneeFront} {kneeY} Q {midLoX - wCannon} {midLoY - 0.05}, {fetX - wFetFront} {fetY} L {fetX - wHoofTop} {footY} L {fetX + wHoofTop} {footY} L {fetX + wFetBack} {fetY} Q {midLoX + wCannon} {midLoY - 0.05}, {kneeX + wKneeBack} {kneeY} Z"
          fill={lowerColor} stroke={OX_INK} stroke-width={outline * 0.9} stroke-linejoin="round" />
    <!-- hoof — cloven, splayed slightly outward at the bottom -->
    <path d="M {fetX - wHoofTop} {footY - 0.02} L {fetX + wHoofTop} {footY - 0.02} L {fetX + wHoofTop + 0.12} {footY + 0.7} L {fetX - wHoofTop - 0.12} {footY + 0.7} Z"
          fill={OX_HOOF} stroke={OX_INK} stroke-width="0.3" stroke-linejoin="round" />
    <!-- cloven cleft -->
    <path d="M {fetX} {footY + 0.05} L {fetX + 0.04} {footY + 0.66}"
          stroke={OX_RED_DK} stroke-width="0.22" />
  </g>
{/snippet}

{#snippet oxHead()}
  <g>
    <!-- NECK (thick wedge from withers to head) -->
    <path d="M -3.0 -13.6 C -5.5 -13.4, -7.0 -12.6, -8.4 -11.4 L -9.0 -10.4 L -8.6 -9.4 C -7.0 -9.6, -5.0 -10.0, -3.5 -10.6 L -3.0 -10.0 L -5.5 -10.0 Z"
          fill={bodyRed} stroke={OX_INK} stroke-width="0.55" stroke-linejoin="round" />
    <!-- dewlap (loose throat skin) -->
    <path d="M -8.6 -9.4 C -7.4 -8.6, -5.6 -8.4, -4.0 -8.8 C -4.6 -9.4, -6.4 -9.7, -8.4 -9.7 Z"
          fill={isPied ? OX_WHITE : bodyRed} stroke={OX_INK} stroke-width="0.45" stroke-linejoin="round" />

    <!-- HEAD silhouette (closed path traced clockwise from poll) -->
    <path d="M -8.5 -11.0 C -9.2 -11.3, -10.0 -11.25, -10.6 -10.85 C -11.7 -10.5, -12.7 -10.0, -13.4 -9.5 C -13.85 -9.15, -14.0 -8.8, -13.95 -8.5 C -13.9 -8.2, -13.65 -8.0, -13.3 -8.0 C -13.0 -8.0, -12.7 -8.05, -12.45 -8.05 C -12.3 -7.85, -11.9 -7.7, -11.4 -7.7 C -10.6 -7.75, -9.85 -8.0, -9.3 -8.5 C -8.85 -9.0, -8.55 -9.6, -8.45 -10.2 C -8.4 -10.6, -8.4 -10.85, -8.5 -11.0 Z"
          fill={isPied ? OX_WHITE : bodyRed} stroke={OX_INK} stroke-width="0.55" stroke-linejoin="round" />

    {#if isPied}
      <!-- Red top-of-head patch -->
      <path d="M -8.5 -11.0 C -9.2 -11.3, -10.0 -11.25, -10.6 -10.85 C -10.85 -10.6, -11.0 -10.35, -11.05 -10.1 C -10.5 -10.2, -9.8 -10.15, -9.1 -10.0 C -8.7 -10.35, -8.5 -10.7, -8.5 -11.0 Z"
            fill={bodyRed} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
      <!-- Cheek/jowl shadow -->
      <path d="M -8.45 -10.2 C -8.55 -9.6, -8.85 -9.0, -9.3 -8.5 C -9.85 -8.0, -10.6 -7.75, -11.4 -7.7 C -11.0 -8.05, -10.4 -8.35, -9.7 -8.55 C -9.15 -8.7, -8.7 -8.95, -8.4 -9.4 Z"
            fill={bodyRed} stroke={OX_INK} stroke-width="0.35" stroke-linejoin="round" opacity="0.95" />
    {/if}

    <!-- MUZZLE (pink leather nose pad) -->
    <path d="M -13.95 -9.15 C -14.1 -8.85, -14.15 -8.5, -14.0 -8.2 C -13.75 -7.95, -13.3 -7.85, -12.85 -7.9 C -12.55 -7.95, -12.4 -8.2, -12.45 -8.55 C -12.55 -8.95, -12.85 -9.2, -13.25 -9.3 C -13.6 -9.35, -13.85 -9.3, -13.95 -9.15 Z"
          fill={OX_PINK} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
    <!-- nostril -->
    <path d="M -13.7 -8.6 C -13.55 -8.45, -13.4 -8.4, -13.25 -8.5"
          stroke={OX_INK} stroke-width="0.32" fill="none" stroke-linecap="round" />
    <!-- mouth line -->
    <path d="M -12.4 -8.0 C -12.05 -7.85, -11.65 -7.85, -11.3 -7.95"
          stroke={OX_INK} stroke-width="0.3" fill="none" stroke-linecap="round" opacity="0.85" />

    <!-- EYE -->
    <ellipse cx="-10.55" cy="-9.7" rx="0.38" ry="0.28" fill={OX_INK} />
    <ellipse cx="-10.65" cy="-9.78" rx="0.12" ry="0.08" fill="#f8e8c0" />
    <path d="M -10.95 -9.95 C -10.55 -10.05, -10.15 -10.0, -9.9 -9.85"
          stroke={OX_INK} stroke-width="0.22" fill="none" stroke-linecap="round" opacity="0.7" />

    <!-- EAR (drawn before horns) -->
    <path d="M -8.6 -10.5 C -7.7 -10.45, -6.9 -10.0, -6.4 -9.3 C -6.25 -9.0, -6.45 -8.85, -6.85 -8.95 C -7.5 -9.15, -8.15 -9.55, -8.55 -10.1 Z"
          fill={isPied ? OX_WHITE : bodyRed} stroke={OX_INK} stroke-width="0.45" stroke-linejoin="round" />
    <path d="M -8.2 -10.05 C -7.55 -9.75, -7.05 -9.4, -6.75 -9.05"
          stroke={OX_PINK} stroke-width="0.3" fill="none" opacity="0.85" />
    <path d="M -8.0 -10.2 C -7.4 -9.95, -6.95 -9.65, -6.7 -9.3"
          stroke={OX_RED_DK} stroke-width="0.18" fill="none" opacity="0.5" />

    <!-- NEAR HORN — tapered stroke in three segments, each wider→narrower -->
    <!-- base segment -->
    <path d="M -8.5 -10.95 Q -9.5 -11.4, -10.0 -11.85" stroke={OX_INK} stroke-width="1.55" fill="none" stroke-linecap="round" />
    <path d="M -8.5 -10.95 Q -9.5 -11.4, -10.0 -11.85" stroke={OX_HORN} stroke-width="1.2" fill="none" stroke-linecap="round" />
    <!-- mid segment -->
    <path d="M -10.0 -11.85 Q -10.55 -12.25, -10.85 -12.7" stroke={OX_INK} stroke-width="1.25" fill="none" stroke-linecap="round" />
    <path d="M -10.0 -11.85 Q -10.55 -12.25, -10.85 -12.7" stroke={OX_HORN} stroke-width="0.9" fill="none" stroke-linecap="round" />
    <!-- tip segment -->
    <path d="M -10.85 -12.7 Q -11.0 -13.05, -11.05 -13.4" stroke={OX_INK} stroke-width="0.9" fill="none" stroke-linecap="round" />
    <path d="M -10.85 -12.7 Q -11.0 -13.05, -11.05 -13.4" stroke={OX_HORN} stroke-width="0.55" fill="none" stroke-linecap="round" />
    <!-- dark tip cap -->
    <path d="M -11.02 -13.25 L -11.05 -13.4" stroke={OX_HORN_TIP} stroke-width="0.38" fill="none" stroke-linecap="round" />
    <!-- subtle growth-ring tick near base -->
    <path d="M -9.45 -11.5 l -0.15 -0.4" stroke={OX_HORN_TIP} stroke-width="0.13" fill="none" stroke-linecap="round" opacity="0.5" />
  </g>
{/snippet}

{#if isMule}
  <!-- ─── MULE FALLBACK (legacy rendering, preserved verbatim) ─── -->
  <g>
    <ellipse cx="-1" cy="0.2" rx="9" ry="0.7" fill={OX_INK} opacity="0.28" />
    {#each [{ angle: muleAngFF, hipX: -5, key: 'ff' }, { angle: muleAngRF, hipX: 4, key: 'rf' }] as legSpec (legSpec.key)}
      <g transform="translate({legSpec.hipX + 0.5} -5) rotate({legSpec.angle})">
        <rect x="-0.8" y="0" width="1.6" height="2.6" fill={MULE_BODY_DARK} stroke={OX_INK} stroke-width="0.25" opacity="0.85" />
        <rect x="-0.65" y="2.4" width="1.3" height="2.4" fill={MULE_BODY} stroke={OX_INK} stroke-width="0.22" opacity="0.85" />
        <rect x="-0.8" y="4.6" width="1.6" height="0.6" fill={OX_HOOF} opacity="0.9" />
      </g>
    {/each}
    <path d="M -7 -8 Q -8 -7.5 -7.5 -6 L -7 -5 L 5.5 -5 L 6.5 -6 Q 6.5 -8 5 -8.5 L -5 -8.5 Q -6.5 -8.5 -7 -8 Z"
          fill={MULE_BODY} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
    <path d="M -5 -8.3 Q -2 -8.8 1 -8.7 Q 4 -8.5 5 -7.6 L 5 -6.5 Q 2 -7.2 -1 -7.1 Q -4 -7 -5 -7.4 Z"
          fill={MULE_BODY_DARK} stroke={OX_INK} stroke-width="0.3" />
    <path d="M -7 -7.6 Q -6 -8.5 -4.5 -8" fill="none" stroke={MULE_MANE} stroke-width="0.25" opacity="0.55" />
    <path d="M -6.5 -5.4 L 5 -5.4" stroke={MULE_BELLY} stroke-width="0.5" opacity="0.85" />
    <path d="M 6.4 -7.2 q 1.6 0.8 1.4 3.4" stroke={OX_INK} stroke-width="0.45" fill="none" stroke-linecap="round" />
    <circle cx="7.7" cy="-3.6" r="0.4" fill={MULE_MANE} />
    <path d="M -7 -8 Q -8.5 -8 -9 -7 L -9 -6 Q -8.2 -6 -7.5 -6.4 Z"
          fill={MULE_BODY} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
    <path d="M -9 -7.6 Q -10.6 -7.6 -11.2 -6.6 Q -11.4 -5.8 -10.4 -5.6 L -9 -5.8 Z"
          fill={MULE_BODY} stroke={OX_INK} stroke-width="0.35" stroke-linejoin="round" />
    <ellipse cx="-10.9" cy="-6.1" rx="0.55" ry="0.4" fill={MULE_BELLY} stroke={OX_INK} stroke-width="0.2" />
    <circle cx="-11.05" cy="-6" r="0.12" fill={OX_INK} />
    <circle cx="-10.4" cy="-7.05" r="0.18" fill={OX_INK} />
    <!-- long mule ears -->
    <path d="M -9.4 -7.9 q -0.1 -1.6 0.4 -2.2 q 0.5 0.3 0.4 1.9 z"
          fill={MULE_BODY_DARK} stroke={OX_INK} stroke-width="0.25" />
    <path d="M -8.9 -8 q 0.2 -1.4 0.7 -1.9 q 0.4 0.4 0.2 1.7 z"
          fill={MULE_BODY} stroke={OX_INK} stroke-width="0.22" />
    {#each [{ angle: muleAngFN, hipX: -5.5, key: 'fn' }, { angle: muleAngRN, hipX: 4.5, key: 'rn' }] as legSpec (legSpec.key)}
      <g transform="translate({legSpec.hipX} -5) rotate({legSpec.angle})">
        <rect x="-0.85" y="0" width="1.7" height="2.7" fill={MULE_BODY_DARK} stroke={OX_INK} stroke-width="0.3" />
        <rect x="-0.7" y="2.5" width="1.4" height="2.5" fill={MULE_BODY} stroke={OX_INK} stroke-width="0.25" />
        <rect x="-0.85" y="4.8" width="1.7" height="0.6" fill={OX_HOOF} />
      </g>
    {/each}
  </g>
{:else}
  <!-- ─── NEW OX (anatomical rewrite from the travel-scene handoff) ─── -->
  <g opacity="1">
    <!-- ground shadow (only on the near ox of a pair) -->
    {#if !far}
      <ellipse cx="-1" cy="0.4" rx="11" ry="0.85" fill={OX_INK} opacity="0.34" />
    {/if}

    <!-- FAR-SIDE LEGS (drawn first, behind body) -->
    {@render leg(-2.5, -9, swB, liftB, isPied, true)}
    {@render leg(7, -8.5, swA, liftA, isPied, true)}

    <!-- ── BODY MASS ── red back/shoulder/haunch shell -->
    <path d="M -5.5 -10 C -5.2 -12.0, -4.0 -13.4, -3.0 -14.0 C -1.0 -14.4, 4.0 -14.4, 6.5 -14.0 C 8.5 -13.6, 9.6 -12.4, 10.0 -11.0 L 10.0 -8.0 C 9.0 -7.6, 6.0 -7.4, 3.0 -7.5 C 0.0 -7.4, -3.0 -7.6, -5.0 -8.0 L -5.5 -10 Z"
          fill={bodyRed} stroke={OX_INK} stroke-width="0.6" stroke-linejoin="round" />

    <!-- topline highlight (soft wedge along the spine) -->
    <path d="M -2.4 -13.5 C -0.4 -13.95, 2.6 -13.95, 4.6 -13.55 C 6.4 -13.15, 7.8 -12.55, 8.8 -11.85 C 8.6 -11.65, 8.4 -11.55, 8.2 -11.55 C 7.4 -12.15, 6.2 -12.55, 4.4 -12.75 C 2.0 -12.9, -0.4 -12.85, -2.0 -12.55 C -2.3 -12.85, -2.4 -13.2, -2.4 -13.5 Z"
          fill={OX_RED_LT} opacity="0.30" />

    {#if isPied}
      <!-- white belly lobe (pied only) -->
      <path d="M -4.6 -7.6 C -3.6 -7.4, -2.6 -7.4, -1.6 -7.6 C -0.4 -7.9, 0.8 -8.0, 2.0 -7.95 C 3.4 -7.9, 4.6 -7.7, 5.8 -7.6 C 7.0 -7.5, 8.2 -7.55, 9.2 -7.7 L 9.4 -7.0 C 8.4 -6.5, 6.4 -6.25, 3.4 -6.3 C 0.6 -6.3, -2.2 -6.5, -4.6 -7.0 C -4.9 -7.25, -4.9 -7.45, -4.6 -7.6 Z"
            fill={OX_WHITE} />
      <!-- feathering dapples at the red→white seam -->
      <ellipse cx="-2.4" cy="-7.5" rx="1.6" ry="0.45" fill={bodyRed} opacity="0.28" />
      <ellipse cx="2.6" cy="-7.85" rx="2.2" ry="0.4" fill={bodyRed} opacity="0.22" />
      <ellipse cx="7.6" cy="-7.55" rx="1.4" ry="0.4" fill={bodyRed} opacity="0.30" />
    {/if}

    <!-- NEAR-SIDE LEGS (drawn over body) -->
    {@render leg(-2.5, -9.5, swA, liftA, isPied, false)}
    {@render leg(7, -8.8, swB, liftB, isPied, false)}

    <!-- ── TAIL ── tapered body + three-strand switch -->
    <g>
      <path d="M 8.8 -13.55 C 9.4 -12.6, 9.7 -10.2, {tipX - 0.22} {tipY} L {tipX + 0.22} {tipY} C 10.2 -10.2, 9.9 -12.4, 9.5 -13.4 Z"
            fill={bodyRed} stroke={OX_INK} stroke-width="0.45" stroke-linejoin="round" />
      <path d="M {tipX - 0.5} {tipY - 0.05} C {tipX - 0.9} {tipY + 0.7}, {tipX - 0.95} {tipY + 1.2}, {tipX - 0.55} {tipY + 1.55} C {tipX - 0.35} {tipY + 1.2}, {tipX - 0.3} {tipY + 0.6}, {tipX - 0.05} {tipY + 0.05} Z"
            fill={OX_INK} stroke={OX_INK} stroke-width="0.2" stroke-linejoin="round" />
      <path d="M {tipX - 0.18} {tipY - 0.05} C {tipX - 0.25} {tipY + 0.7}, {tipX - 0.2} {tipY + 1.35}, {tipX} {tipY + 1.7} C {tipX + 0.2} {tipY + 1.3}, {tipX + 0.18} {tipY + 0.6}, {tipX + 0.18} {tipY + 0.05} Z"
            fill={OX_INK} stroke={OX_INK} stroke-width="0.2" stroke-linejoin="round" />
      <path d="M {tipX + 0.12} {tipY - 0.02} C {tipX + 0.45} {tipY + 0.55}, {tipX + 0.55} {tipY + 1.15}, {tipX + 0.35} {tipY + 1.5} C {tipX + 0.05} {tipY + 1.2}, {tipX + 0.05} {tipY + 0.55}, {tipX + 0.4} {tipY + 0.05} Z"
            fill={OX_INK} stroke={OX_INK} stroke-width="0.2" stroke-linejoin="round" />
    </g>

    <!-- ── NECK + HEAD ── -->
    {@render oxHead()}
  </g>
{/if}

<!-- Suppress unused-var lint for OX_WHITE_SH (reserved for future
     leg-sock shading; dark-leg sock kept the new bodyRed for now). -->
<style>
  /* Empty — palette tokens are imported into the script block. */
</style>
