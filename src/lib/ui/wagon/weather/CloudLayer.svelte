<script lang="ts">
  // Drifting clouds. Density and base opacity scale with the
  // SkyAccent-style weather kind. Storm clouds (rainy) get a darker
  // shadow under-puff. Position and scatter are deterministic off
  // an integer seed so frame-to-frame jitter never happens — only
  // the drift driven by `t`.
  import type { SkyAccentKind } from './SkyAccent.svelte';

  interface Props {
    kind: SkyAccentKind;
    /** Scene-tick seconds. */
    t: number;
    /** Scene viewport width. */
    w: number;
    /** Sky height (unused now but reserved for future cloud-band sizing). */
    skyH?: number;
  }

  let { kind, t, w, skyH: _skyH }: Props = $props();

  const config = $derived.by(() => {
    if (kind === 'sunny')  return { count: 2, baseOp: 0.5,  scale: 0.7 };
    if (kind === 'partly') return { count: 4, baseOp: 0.75, scale: 1.0 };
    if (kind === 'cloudy') return { count: 7, baseOp: 0.9,  scale: 1.2 };
    if (kind === 'rainy')  return { count: 9, baseOp: 0.95, scale: 1.5 };
    if (kind === 'snowy')  return { count: 8, baseOp: 0.92, scale: 1.3 };
    /* night */            return { count: 2, baseOp: 0.7,  scale: 1.0 };
  });

  const driftSpeed = $derived(kind === 'rainy' || kind === 'snowy' ? 18 : 6);
  const isStorm = $derived(kind === 'rainy');

  type Cloud = {
    fx: number;
    y: number;
    sc: number;
    op: number;
    seed: number;
  };
  const clouds = $derived.by<Cloud[]>(() => {
    const out: Cloud[] = [];
    for (let i = 0; i < config.count; i++) {
      const seed = i * 17;
      const baseX = ((seed * 47) % (w + 200)) - 100;
      const x = (baseX - t * driftSpeed) % (w + 200);
      const fx = x < -100 ? x + (w + 200) : x;
      const y = 30 + (seed % 5) * 18;
      const sc = config.scale * (0.7 + ((seed * 7) % 50) / 100);
      const op = isStorm
        ? config.baseOp * 0.85
        : config.baseOp * (0.7 + ((seed * 11) % 30) / 100);
      out.push({ fx, y, sc, op, seed });
    }
    return out;
  });
</script>

<g>
  {#each clouds as c (c.seed)}
    <!-- main puff cluster -->
    <g transform={`translate(${c.fx} ${c.y}) scale(${c.sc})`} opacity={c.op}>
      <ellipse cx="-10" cy="0"  rx="8"  ry="5"   fill="#f0f0f0" />
      <ellipse cx="0"   cy="-3" rx="11" ry="6.5" fill="#f0f0f0" />
      <ellipse cx="10"  cy="0"  rx="8"  ry="5"   fill="#f0f0f0" />
      <ellipse cx="-3"  cy="2"  rx="10" ry="4"   fill="#f0f0f0" />
      <!-- shadow underside -->
      <ellipse cx="0" cy="3" rx="14" ry="2" fill="#3a3a3a" opacity="0.18" />
    </g>
    {#if isStorm}
      <g transform={`translate(${c.fx} ${c.y + 1}) scale(${c.sc * 1.05})`} opacity="0.6">
        <ellipse cx="0" cy="0" rx="14" ry="6" fill="#2a3548" />
      </g>
    {/if}
  {/each}
</g>
