<script lang="ts" module>
  // Per-ox stride variance. Deterministic from (pairIndex, near/far) so
  // the same animal always strides the same way across renders. Two
  // animals never share the same {phase, swing} pair within a 6-ox team.
  //
  //   phase: 0..0.06 — small forward/back offset in the gait cycle.
  //     Large enough to read ("that one is half a beat behind") but
  //     small enough that the pair still reads as yoked together.
  //   swing: 0.88..1.12 — leg-swing amplitude multiplier. One ox might
  //     step a bit more vigorously, another a bit more sluggishly.
  export function jitterFor(pairIdx: number, nearOrFar: 0 | 1) {
    const seed = (pairIdx * 13 + nearOrFar * 7 + 1) | 0;
    const a = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const b = ((Math.sin(seed * 78.233 + 4.1) * 43758.5453) % 1 + 1) % 1;
    return {
      phase: (a - 0.5) * 0.06,
      swing: 0.88 + b * 0.24
    };
  }
</script>

<script lang="ts">
  // OxTeam — composer. Renders N oxen yoked in pairs with a pole running
  // back to the wagon hitch.
  //
  // ORIGIN CONVENTION (changed in this revision, #158):
  //   The pole tip lands at (0, 0) — the wagon's hitch point.
  //   Pairs are laid out to the LEFT of the origin (negative x).
  //   Pair 0 is closest to the wagon; the last pair is the lead pair.
  //   Within a pair, the near ox is at depth 0; the far ox is tucked
  //   behind via a small (+x, -y) offset.
  //
  // The caller wraps this whole component in a <g transform="translate
  // (hookX, hookY)"> to place it. WagonScene also wraps the WAGON in
  // the same translate(_, teamBob) so the wagon rides the team's bob.
  //
  // gait="stopped" zeros teamBob and freezes leg/body motion — use it
  // when the wagon is parked at a landmark or in camp.

  import {
    PAIR_SPACE,
    PAIR_PHASE_OFFSET,
    FAR_OX_DX,
    FAR_OX_DY,
    OX_INK,
    YOKE_WOOD,
    YOKE_DARK,
    CHAIN_INK,
    POLE_WOOD
  } from './ox-team-tokens';
  import SingleOx from './SingleOx.svelte';

  interface Props {
    count: number;
    /** "walking" (default — animated stride) or "stopped" (planted, idle). */
    gait?: 'walking' | 'stopped';
    /** 0..1 — one full stride per cycle. */
    gaitPhase?: number;
    /** Hide the pole (e.g. when rendering a free-standing demo). */
    showPole?: boolean;
    /** Render mules instead of oxen — passes through to SingleOx via
     *  the legacy fallback rendering. */
    isMule?: boolean;
    /** Dev-only: skip per-ox SingleOx composer and render a single
     *  Blender-rendered team frame cycling through ox-team-frames/. */
    useBlenderTeam?: boolean;
    /** Dev-only: per-ox sprite alignment + scale tweaks (Blender mode). */
    oxDx?: number;
    oxDy?: number;
    oxScale?: number;
    /** Mule-team sprite size/position tuning (#216, Blender mode).
     *  Dialed via the /dev/wagon-view sliders. The yoke is baked into
     *  the sprite, so there's no separate yoke placement here. */
    muleScale?: number;
    muleDx?: number;
    muleDy?: number;
  }

  let {
    count,
    gait = 'walking',
    gaitPhase = 0,
    showPole = true,
    isMule = false,
    useBlenderTeam = false,
    oxDx = 0,
    oxDy = 0,
    oxScale = 1,
    // Dave's dialed mule↔wagon alignment (#216 dev sandbox).
    muleScale = 1.1,
    muleDx = 5.75,
    muleDy = 0,
  }: Props = $props();

  // Blender frame index: 12 frames over one gait cycle. The
  // ox-walk-only-frames set is the ox body alone — no harness, since
  // harness is rendered once between wagon and lead pair.
  const blenderFrame = $derived(
    String(Math.floor(((gaitPhase % 1) + 1) % 1 * 12) % 12).padStart(2, '0')
  );

  // Per-pair breed pick (#214). Each pair gets a deterministic breed
  // based on its pair index so the same team consistently shows the
  // same mix across re-renders. '' = default gray (the original
  // ox-yoke-wide-frames dir, no breed suffix).
  const OX_BREEDS = ['', 'angus', 'brindle', 'devon', 'roan'] as const;
  function breedForPair(pairIdx: number): string {
    return OX_BREEDS[Math.abs(pairIdx * 13 + 7) % OX_BREEDS.length];
  }
  function yokeFramesDir(breed: string): string {
    return breed
      ? `ox-yoke-wide-frames-${breed}`
      : 'ox-yoke-wide-frames';
  }

  // Per-pair mule color pick (#216). Mirrors the ox breed picker. Mules
  // render from their own Blender walk-cycle sprite set (donkey base,
  // soniarocha CC-BY), reskinned per color. '' = the default dark dir.
  const MULE_COLORS = ['', 'sorrel', 'gray'] as const;
  function colorForPair(pairIdx: number): string {
    return MULE_COLORS[Math.abs(pairIdx * 13 + 7) % MULE_COLORS.length];
  }
  function muleFramesDir(color: string): string {
    return color ? `mule-walk-frames-${color}` : 'mule-walk-frames';
  }
  // Cropped mule sprite aspect ≈ 1.38 (mule + baked yoke; the yoke adds
  // a little height vs the bare 1.42).
  const MULE_ASPECT = 1.38;

  const stopped = $derived(gait === 'stopped');
  const numPairs = $derived(Math.max(1, Math.ceil(count / 2)));

  // ── shared team bob ──────────────────────────────────────────────
  // One slow vertical settle per gait cycle, very small amplitude. The
  // entire hitched mass — oxen + yoke + chains + pole + wagon — rocks
  // as one. Single-frequency, NOT double; a double-frequency bob reads
  // as trotting. Zero when stopped.
  const teamT = $derived(gaitPhase * Math.PI * 2);
  const teamBob = $derived(stopped ? 0 : Math.sin(teamT) * 0.08);

  // Pair layout. Negative x = farther from wagon.
  interface PairSpec {
    p: number;
    oxenInPair: 1 | 2;
    px: number;
    isLeadPair: boolean;
  }
  const pairs = $derived<PairSpec[]>(
    Array.from({ length: numPairs }, (_, p) => {
      const isLast = p === numPairs - 1;
      const oxenInPair: 1 | 2 = isLast && count % 2 === 1 ? 1 : 2;
      const px = -(p * PAIR_SPACE) - PAIR_SPACE * 0.5;
      return { p, oxenInPair, px, isLeadPair: isLast };
    })
  );

  const frontPolePx = $derived(pairs[0].px + 4);
  const poleLength = $derived(Math.abs(frontPolePx));
</script>

{#snippet oxYoke(width: number, y: number, withRing: boolean)}
  {@const halfW = width / 2}
  {@const beamY = y - 0.55}
  {@const beamH = 1.1}
  {@const w = 1.3}
  {@const wIn = 0.95}
  {@const top = y + 0.1}
  {@const bot = y + 2.55}
  {@const cxL = -halfW + 0.2}
  {@const cxR = halfW - 0.2}
  <g>
    <!-- BOWS (drawn first so beam covers their tops) -->
    <path d="M {cxL - w} {top} C {cxL - w} {top + 1.8}, {cxL - w * 0.4} {bot}, {cxL} {bot} C {cxL + w * 0.4} {bot}, {cxL + w} {top + 1.8}, {cxL + w} {top} L {cxL + wIn} {top} C {cxL + wIn} {top + 1.5}, {cxL + wIn * 0.4} {bot - 0.35}, {cxL} {bot - 0.35} C {cxL - wIn * 0.4} {bot - 0.35}, {cxL - wIn} {top + 1.5}, {cxL - wIn} {top} Z"
          fill={YOKE_WOOD} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
    <path d="M {cxR - w} {top} C {cxR - w} {top + 1.8}, {cxR - w * 0.4} {bot}, {cxR} {bot} C {cxR + w * 0.4} {bot}, {cxR + w} {top + 1.8}, {cxR + w} {top} L {cxR + wIn} {top} C {cxR + wIn} {top + 1.5}, {cxR + wIn * 0.4} {bot - 0.35}, {cxR} {bot - 0.35} C {cxR - wIn * 0.4} {bot - 0.35}, {cxR - wIn} {top + 1.5}, {cxR - wIn} {top} Z"
          fill={YOKE_WOOD} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
    <!-- bow grain -->
    <path d="M {cxL - 1.15} {y + 0.6} C {cxL - 1.1} {y + 1.8}, {cxL - 0.5} {y + 2.45}, {cxL} {y + 2.45}"
          stroke={YOKE_DARK} stroke-width="0.22" fill="none" opacity="0.75" />
    <path d="M {cxR + 1.15} {y + 0.6} C {cxR + 1.1} {y + 1.8}, {cxR + 0.5} {y + 2.45}, {cxR} {y + 2.45}"
          stroke={YOKE_DARK} stroke-width="0.22" fill="none" opacity="0.75" />

    <!-- BEAM — squared timber, gently arched on top -->
    <path d="M {-halfW - 1.1} {beamY + 0.15} Q 0 {beamY - 0.25}, {halfW + 1.1} {beamY + 0.15} L {halfW + 1.1} {beamY + beamH} L {-halfW - 1.1} {beamY + beamH} Z"
          fill={YOKE_WOOD} stroke={OX_INK} stroke-width="0.45" stroke-linejoin="round" />
    <!-- beam grain -->
    <path d="M {-halfW - 0.9} {beamY + 0.55} Q 0 {beamY + 0.35}, {halfW + 0.9} {beamY + 0.55}"
          stroke={YOKE_DARK} stroke-width="0.22" fill="none" opacity="0.7" />
    <path d="M {-halfW - 0.7} {beamY + 0.85} Q 0 {beamY + 0.7}, {halfW + 0.7} {beamY + 0.85}"
          stroke={YOKE_DARK} stroke-width="0.16" fill="none" opacity="0.55" />
    <!-- bow-through-beam notches -->
    <rect x={-halfW + 0.05} y={beamY + 0.2} width="0.3" height={beamH - 0.3}
          fill={YOKE_DARK} opacity="0.85" />
    <rect x={halfW - 0.35} y={beamY + 0.2} width="0.3" height={beamH - 0.3}
          fill={YOKE_DARK} opacity="0.85" />

    {#if withRing}
      <!-- iron staple driven through the beam top -->
      <path d="M -0.55 {beamY - 0.45} L -0.55 {beamY + 0.05} M 0.55 {beamY - 0.45} L 0.55 {beamY + 0.05}"
            stroke={CHAIN_INK} stroke-width="0.32" />
      <!-- ring + short link -->
      <ellipse cx="0" cy={beamY + beamH + 0.55} rx="0.6" ry="0.45"
               fill="none" stroke={CHAIN_INK} stroke-width="0.4" />
      <line x1="0" y1={beamY + beamH} x2="0" y2={beamY + beamH + 0.2}
            stroke={CHAIN_INK} stroke-width="0.32" />
    {/if}
  </g>
{/snippet}

{#snippet oxSingleYoke(y: number)}
  {@const beamY = y - 0.55}
  {@const beamH = 1.1}
  {@const cx = -0.4}
  {@const w = 1.3}
  {@const wIn = 0.95}
  {@const top = y + 0.1}
  {@const bot = y + 2.55}
  <g>
    <!-- bow -->
    <path d="M {cx - w} {top} C {cx - w} {top + 1.8}, {cx - w * 0.4} {bot}, {cx} {bot} C {cx + w * 0.4} {bot}, {cx + w} {top + 1.8}, {cx + w} {top} L {cx + wIn} {top} C {cx + wIn} {top + 1.5}, {cx + wIn * 0.4} {bot - 0.35}, {cx} {bot - 0.35} C {cx - wIn * 0.4} {bot - 0.35}, {cx - wIn} {top + 1.5}, {cx - wIn} {top} Z"
          fill={YOKE_WOOD} stroke={OX_INK} stroke-width="0.4" stroke-linejoin="round" />
    <!-- beam (short, with extension toward wagon) -->
    <path d="M -2.6 {beamY + 0.1} Q 0 {beamY - 0.2}, 2.6 {beamY + 0.1} L 2.6 {beamY + beamH} L -2.6 {beamY + beamH} Z"
          fill={YOKE_WOOD} stroke={OX_INK} stroke-width="0.45" stroke-linejoin="round" />
    <!-- grain -->
    <path d="M -2.4 -13.0 Q 0 -13.15, 2.4 -13.0"
          stroke={YOKE_DARK} stroke-width="0.22" fill="none" opacity="0.7" />
    <!-- notch -->
    <rect x={cx - 0.15} y={beamY + 0.2} width="0.3" height={beamH - 0.3}
          fill={YOKE_DARK} opacity="0.85" />
    <!-- hitch staple + ring -->
    <path d="M 1.55 -12.95 L 1.55 -12.55 M 1.95 -12.95 L 1.95 -12.55"
          stroke={CHAIN_INK} stroke-width="0.3" />
    <ellipse cx="1.75" cy="-12.0" rx="0.5" ry="0.38"
             fill="none" stroke={CHAIN_INK} stroke-width="0.38" />
  </g>
{/snippet}

{#snippet oxPole(length: number, y: number)}
  <g>
    <line x1="0" y1={y} x2={length} y2={y}
          stroke={POLE_WOOD} stroke-width="0.85" stroke-linecap="round" />
    <line x1="0" y1={y} x2={length} y2={y}
          stroke={OX_INK} stroke-width="0.25" opacity="0.7" />
    <!-- end ring (hitches to wagon) -->
    <circle cx={length} cy={y} r="0.85"
            fill="none" stroke={CHAIN_INK} stroke-width="0.55" />
    <circle cx={length} cy={y} r="0.4" fill={CHAIN_INK} />
  </g>
{/snippet}

<!-- Everything hitched together — pole, yokes, chains, oxen — bobs as
     a single mass. teamBob is also exposed via data-team-bob so
     WagonScene can apply the same y-translate to the wagon. -->
{#if useBlenderTeam}
  <!-- BLENDER TEAM MODE — ox + yoke per pair (side profile). Each
       sprite is one ox with the wooden yoke attached at the neck;
       the rope/beam is hidden so multi-pair tiling stays clean.
       Yoke shape was tuned in render-yoke-set.sh — see that file for
       the YOKE_Y_SCALE/UV_COMP_BOOST/YOKE_BOW_STRETCH/YOKE_PEG_SCALE
       parameters. Cropped sprite aspect ≈ 1.246. -->
  {#each pairs as pair}
    {#if isMule}
      <!-- MULE (#216) — bare mule walk sprite per pair, with the ox
           single-yoke reused as hitch hardware (Dave's call: reuse the
           ox gear rather than model a mule harness). Sprite size/pos and
           yoke placement are dialed via /dev/wagon-view sliders. -->
      {@const w = PAIR_SPACE * muleScale}
      {@const h = PAIR_SPACE / MULE_ASPECT * muleScale}
      {@const dir = muleFramesDir(colorForPair(pair.p))}
      <image href="/wagon-bg/wagon-blender/{dir}/walk--{blenderFrame}.png"
             x={pair.px - w / 2 + muleDx} y={-10 + muleDy} width={w} height={h}
             preserveAspectRatio="xMidYMid meet" />
    {:else}
      {@const w = PAIR_SPACE * oxScale}
      {@const h = PAIR_SPACE / 1.246 * oxScale}
      {@const dir = yokeFramesDir(breedForPair(pair.p))}
      <image href="/wagon-bg/wagon-blender/{dir}/yoke-wide--{blenderFrame}.png"
             x={pair.px - w / 2 + oxDx} y={-10 + oxDy} width={w} height={h}
             preserveAspectRatio="xMidYMid meet" />
    {/if}
  {/each}
{:else}
<g transform="translate(0 {teamBob})">
  {#if showPole}
    <g transform="translate({frontPolePx} 0)">
      {@render oxPole(poleLength, -11.5)}
    </g>
  {/if}

  {#each [...pairs].reverse() as pair (pair.p)}
    {@const pairPhase = (gaitPhase + pair.p * PAIR_PHASE_OFFSET) % 1}
    {@const oppPhase = (pairPhase + 0.5) % 1}
    {@const nearJ = jitterFor(pair.p, 0)}
    {@const farJ = jitterFor(pair.p, 1)}
    {@const toneVal = pair.p % 2 === 0 ? 0 : -1}
    {@const markingsVal = pair.p === 1 ? 'solid' : 'pied'}
    <g transform="translate({pair.px} 0)">
      {#if pair.oxenInPair === 2}
        <!-- far ox tucked back & up so its silhouette peeks over the near ox -->
        <g transform="translate({FAR_OX_DX} {FAR_OX_DY})">
          <SingleOx
            {gait}
            gaitPhase={oppPhase}
            far
            strideOffset={farJ.phase}
            swingScale={farJ.swing}
            tone={toneVal}
            markings={markingsVal}
            {isMule} />
        </g>
      {/if}
      <!-- near ox -->
      <SingleOx
        {gait}
        gaitPhase={pairPhase}
        strideOffset={nearJ.phase}
        swingScale={nearJ.swing}
        tone={toneVal}
        markings={markingsVal}
        {isMule} />

      <!-- yoke (or single yoke if only one ox in this pair) -->
      {#if pair.oxenInPair === 2}
        <g transform="translate(-0.5 0)">
          {@render oxYoke(3.5, -14.0, pair.isLeadPair)}
        </g>
      {:else}
        {@render oxSingleYoke(-14.0)}
      {/if}
    </g>
  {/each}
</g>
{/if}
