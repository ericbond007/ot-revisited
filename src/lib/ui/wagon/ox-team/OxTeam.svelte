<script lang="ts">
  // Team of 1–6 oxen (or mules) hitched in pairs. Renders in profile,
  // facing left, walking together with a per-pair phase offset so the
  // herd doesn't move in lockstep.
  //
  // Coordinate frame: pre-scale ox-local units. The composer in
  // Phase 6 wraps OxTeam in a `transform="translate(...) scale(4)"`
  // group so SingleOx renders at the same `sceneScale` as the wagon.
  //
  // Brief props:
  //   count        — total animal count, 1..6 (rounds up to even pairs
  //                  visually; an odd count shows a lone leader)
  //   isMule       — whole team renders as mules (no mixed teams yet)
  //   gaitPhase    — 0..1 stride phase of the lead pair
  //   anchorX      — x of the lead (left-most, toward the wagon's
  //                  forward direction... wait, the team is AHEAD of
  //                  the wagon and the wagon faces LEFT, so the lead
  //                  pair is on the LEFT and trailing pairs are to
  //                  the RIGHT, closer to the wagon).
  //   wagonHookX   — x where the chain connects to the wagon tongue
  //                  clevis. Drawn from the hindmost yoke ring.
  //   y            — ground line for the team

  import SingleOx from './SingleOx.svelte';
  import {
    PAIR_SPACE,
    PAIR_PHASE_OFFSET,
    YOKE_WOOD,
    YOKE_WOOD_DARK,
    CHAIN_IRON,
    CHAIN_HIGHLIGHT,
    FAR_OX_DX,
    FAR_OX_DY,
    OX_INK
  } from './ox-team-tokens';

  interface Props {
    count: number;
    isMule?: boolean;
    gaitPhase?: number;
    anchorX: number;
    wagonHookX: number;
    y: number;
  }

  let {
    count,
    isMule = false,
    gaitPhase = 0,
    anchorX,
    wagonHookX,
    y
  }: Props = $props();

  // Number of pairs to render. Brief allows 1-6 head; we render
  // ceil(count / 2) pairs and treat the last as a single if count
  // is odd.
  const pairCount = $derived(Math.max(1, Math.ceil(Math.max(1, Math.min(6, count)) / 2)));
  const isLastSolo = $derived(count % 2 === 1);

  type Pair = {
    cx: number;          // pair center x
    phase: number;       // gait phase for this pair
    solo: boolean;       // odd-count teams: last "pair" is one ox
    idx: number;
  };

  const pairs = $derived.by<Pair[]>(() => {
    const out: Pair[] = [];
    for (let i = 0; i < pairCount; i++) {
      out.push({
        cx: anchorX + i * PAIR_SPACE,
        phase: (gaitPhase + i * PAIR_PHASE_OFFSET) % 1,
        solo: isLastSolo && i === pairCount - 1,
        idx: i
      });
    }
    return out;
  });

  // Hindmost yoke: rightmost pair's center. Chain runs from its
  // ring back to the wagon hook.
  const hitchPair = $derived(pairs[pairs.length - 1]);
  const chainStartX = $derived(hitchPair.cx + 4); // ~edge of pair to right
  const chainStartY = $derived(y - 7);            // neck level
</script>

<g>
  <!-- Pairs are rendered front-most last so the trailing pair (closest
       to the wagon) draws on top of leading pairs. -->
  {#each pairs as pair (pair.idx)}
    <g transform="translate({pair.cx} {y})">
      <!-- far ox of the pair (slightly back+up so the silhouettes read
           as two distinct animals, not a single thick body) -->
      {#if !pair.solo}
        <g transform="translate({FAR_OX_DX} {FAR_OX_DY})" opacity="0.92">
          <SingleOx gaitPhase={(pair.phase + 0.18) % 1} {isMule} />
        </g>
      {/if}
      <!-- near ox (always rendered on top) -->
      <SingleOx gaitPhase={pair.phase} {isMule} />

      <!-- yoke beam: heavy wood crossbar at neck height running
           across the pair (in profile we see it edge-on as a short
           horizontal block sitting on the necks). Skip on solo. -->
      {#if !pair.solo && !isMule}
        <g>
          <rect x="-9.5" y="-9.6" width="3.5" height="1.1"
                fill={YOKE_WOOD} stroke={OX_INK} stroke-width="0.25" />
          <line x1="-9.2" y1="-8.8" x2="-6.3" y2="-8.8"
                stroke={YOKE_WOOD_DARK} stroke-width="0.25" opacity="0.7" />
          <!-- bow staples (the U-shaped pieces under the necks) -->
          <path d="M -8.7 -8.6 q 0 1 0.6 1.4 m 1.2 -1.4 q 0 1 -0.6 1.4"
                stroke={YOKE_WOOD_DARK} stroke-width="0.32" fill="none" />
        </g>
      {:else if !pair.solo && isMule}
        <!-- mule: harness collar instead of yoke; padded leather
             ring around the neck of the near mule -->
        <g>
          <ellipse cx="-8.5" cy="-7.6" rx="1.4" ry="1.7"
                   fill={YOKE_WOOD_DARK} stroke={OX_INK} stroke-width="0.25" opacity="0.95" />
          <ellipse cx="-8.5" cy="-7.6" rx="0.7" ry="1.0"
                   fill="#2a1810" />
        </g>
      {/if}
    </g>
  {/each}

  <!-- Inter-pair traces — lengths of chain joining each pair's yoke
       ring to the next. Drawn between adjacent pairs. -->
  {#each pairs.slice(0, -1) as pair, i (pair.idx)}
    {@const next = pairs[i + 1]}
    <line x1={pair.cx + 4} y1={y - 7}
          x2={next.cx - 7} y2={y - 7}
          stroke={CHAIN_IRON} stroke-width="0.6" />
    <line x1={pair.cx + 4} y1={y - 7}
          x2={next.cx - 7} y2={y - 7}
          stroke={CHAIN_HIGHLIGHT} stroke-width="0.18" opacity="0.8" />
  {/each}

  <!-- Trailing chain back to the wagon tongue. -->
  <line x1={chainStartX} y1={chainStartY}
        x2={wagonHookX} y2={chainStartY + 0.5}
        stroke={CHAIN_IRON} stroke-width="0.6" />
  <line x1={chainStartX} y1={chainStartY}
        x2={wagonHookX} y2={chainStartY + 0.5}
        stroke={CHAIN_HIGHLIGHT} stroke-width="0.18" opacity="0.8" />
  <!-- chain ring at wagon tongue clevis -->
  <circle cx={wagonHookX} cy={chainStartY + 0.5} r="0.6"
          fill="none" stroke={CHAIN_IRON} stroke-width="0.4" />
</g>
