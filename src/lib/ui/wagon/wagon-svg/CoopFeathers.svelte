<script lang="ts">
  // Feathers periodically drifting OUT of the chicken coop in a fairly
  // flat arc — rise, peak, fall. Pure SVG, time-driven by parent's `t`.
  // When `t` is frozen (paused) the feathers freeze.
  //
  // Three feather "slots" cycle at staggered phases so there's almost
  // always one in flight. Each lifecycle: emit at coop, rise + drift
  // forward in a low parabolic arc, peak halfway through, settle back
  // down + fade out at the end of cycle.

  interface Props {
    /** Anchor: coop top in wagon-local coords (where feathers emit). */
    x: number;
    y: number;
    /** Animation time in seconds. */
    t: number;
    /** Number of chickens. 0 = no feathers. More chickens = faster cycle. */
    chickens: number;
  }

  let { x, y, t, chickens }: Props = $props();

  const SLOTS = 3;
  const cycle = $derived(chickens >= 5 ? 2.8 : chickens >= 3 ? 3.6 : 4.5);

  type FeatherEl = {
    fx: number;
    fy: number;
    rot: number;
    opacity: number;
    idx: number;
  };

  const feathers = $derived.by<FeatherEl[]>(() => {
    if (chickens <= 0) return [];
    const out: FeatherEl[] = [];
    for (let i = 0; i < SLOTS; i++) {
      const phaseOffset = i / SLOTS;
      const phase = ((t / cycle) + phaseOffset) % 1;
      // Per-slot deterministic variation so feathers don't track the
      // exact same arc.
      const seed = (i * 13) % 7;
      // ARC TRAJECTORY: parabolic up-and-down. Horizontal travel is
      // dominant; vertical peak is small (fairly flat arc per Dave).
      // - x drifts forward (rearward in our left-facing coords) over
      //   the lifecycle
      // - y peaks ~halfway through, returns to ground level by end
      const horizontal = phase * 3.0; // total drift across cycle (kept in-frame)
      const peakHeight = 1.4;
      const fy = -Math.sin(phase * Math.PI) * peakHeight;
      const fxOffset = (seed - 3) * 0.18; // emit-point spread
      const fx = fxOffset + horizontal;
      // Slow tilt — much less than the spinning rotation of v1.
      const rot = (seed - 3) * 25 + phase * 70;
      // Fade in/out at endpoints.
      const opacity =
        phase < 0.10 ? phase / 0.10 :
        phase > 0.85 ? Math.max(0, (1 - phase) / 0.15) : 1;
      out.push({ fx, fy, rot, opacity, idx: i });
    }
    return out;
  });
</script>

<g transform="translate({x} {y})">
  {#each feathers as f (f.idx)}
    {#if f.opacity > 0.02}
      <g transform="translate({f.fx} {f.fy}) rotate({f.rot})" opacity={f.opacity}>
        <!-- Feather: wider vane + obvious asymmetric curve so the
             SILHOUETTE alone reads as feather. ~1.6 SVG units tall —
             smaller and the shape is too thin to register at our
             render scale. -->
        <!-- vane (asymmetric curve — wider on one side, classic
             feather shape) -->
        <path d="M 0 0
                 Q -0.18 -0.35 -0.30 -0.85
                 Q -0.32 -1.30 -0.05 -1.55
                 L 0.10 -1.55
                 Q 0.30 -1.20 0.32 -0.75
                 Q 0.28 -0.30 0.05 0 Z"
              fill="#fafaf2" stroke="#6a5a45" stroke-width="0.05"
              stroke-linejoin="round" />
        <!-- central spine (rachis) — thicker dark line down the middle -->
        <path d="M -0.02 -0.05 Q 0 -0.7 0.03 -1.45"
              stroke="#5a4a35" stroke-width="0.07" fill="none"
              stroke-linecap="round" />
        <!-- darker barb hatches on each side, more spaced out so
             they read clearly at small size -->
        <line x1="-0.05" y1="-0.30" x2="-0.22" y2="-0.45"
              stroke="#7a6a55" stroke-width="0.06" opacity="0.7"
              stroke-linecap="round" />
        <line x1="0.05" y1="-0.30" x2="0.22" y2="-0.45"
              stroke="#7a6a55" stroke-width="0.06" opacity="0.7"
              stroke-linecap="round" />
        <line x1="-0.04" y1="-0.65" x2="-0.25" y2="-0.85"
              stroke="#7a6a55" stroke-width="0.06" opacity="0.7"
              stroke-linecap="round" />
        <line x1="0.04" y1="-0.65" x2="0.25" y2="-0.85"
              stroke="#7a6a55" stroke-width="0.06" opacity="0.7"
              stroke-linecap="round" />
        <line x1="-0.03" y1="-1.00" x2="-0.20" y2="-1.18"
              stroke="#7a6a55" stroke-width="0.05" opacity="0.65"
              stroke-linecap="round" />
        <line x1="0.03" y1="-1.00" x2="0.20" y2="-1.18"
              stroke="#7a6a55" stroke-width="0.05" opacity="0.65"
              stroke-linecap="round" />
        <!-- wispy fluff at the base (downy barbs near the quill) -->
        <path d="M -0.05 -0.03 Q -0.18 -0.10 -0.20 0.02
                 M  0.05 -0.03 Q  0.18 -0.10  0.20 0.02"
              stroke="#7a6a55" stroke-width="0.04" fill="none"
              opacity="0.6" stroke-linecap="round" />
      </g>
    {/if}
  {/each}
</g>
