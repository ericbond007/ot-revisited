<script lang="ts">
  // Drifting clouds. Density and base opacity scale with the
  // SkyAccent-style weather kind. Storm clouds (rainy) get a darker
  // shadow under-puff. Position and scatter are deterministic off
  // an integer seed so frame-to-frame jitter never happens — only
  // the drift driven by `scrollX`.
  //
  // Direction & speed: clouds drift on the same `scrollX` axis as the
  // ground/terrain parallax, just at a much smaller fraction (clouds
  // are far away, so they appear to slide much slower than the road
  // under the wagon). Each cloud also gets a tiny depth jitter on
  // top of the base parallax factor so the band feels layered. Tying
  // to scrollX (rather than a free-running clock) means clouds drift
  // in the right direction relative to wagon travel automatically;
  // when ground motion stops (#164), clouds park with it.
  import type { SkyAccentKind } from './SkyAccent.svelte';

  interface Props {
    kind: SkyAccentKind;
    /** Same scrollX value the terrain layers receive — the integrated
     *  parallax offset in scene units. Negative = wagon traveling
     *  westward; clouds drift in the same direction as terrain tiles
     *  but at a small fraction of the speed. */
    scrollX: number;
    /** Scene viewport width. */
    w: number;
    /** Sky height (unused now but reserved for future cloud-band sizing). */
    skyH?: number;
    /** Top y-coord of the cloud band in viewBox units. Composers
     *  that crop the SVG (e.g. WagonScene's slice strip) push this
     *  down so clouds fall in the visible region. */
    bandY?: number;
  }

  let { kind, scrollX, w, skyH: _skyH, bandY = 30 }: Props = $props();

  const config = $derived.by(() => {
    if (kind === 'sunny')  return { count: 2, baseOp: 0.5,  scale: 0.7 };
    if (kind === 'partly') return { count: 4, baseOp: 0.75, scale: 1.0 };
    if (kind === 'cloudy') return { count: 7, baseOp: 0.9,  scale: 1.2 };
    if (kind === 'rainy')  return { count: 9, baseOp: 0.95, scale: 1.5 };
    if (kind === 'snowy')  return { count: 8, baseOp: 0.92, scale: 1.3 };
    /* night */            return { count: 2, baseOp: 0.7,  scale: 1.0 };
  });

  // Parallax depth factor. Mid layer = 0.4, near layer ≈ 1.0; clouds
  // sit far behind the horizon so we want a much smaller value.
  // Storms get a slight bump (wind-pushed clouds).
  const baseParallax = $derived(kind === 'rainy' || kind === 'snowy' ? 0.18 : 0.08);
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
    const wrapW = w + 200;
    for (let i = 0; i < config.count; i++) {
      const seed = i * 17;
      const baseX = ((seed * 47) % wrapW) - 100;
      // Per-cloud depth jitter — half to 1.5× the base factor so far
      // clouds drift slower and near clouds drift faster within the
      // same band, selling the layered parallax illusion.
      const depth = 0.5 + ((seed * 13) % 100) / 100;
      const factor = baseParallax * depth;
      // -scrollX puts clouds in the same screen-direction as terrain
      // tiles (which use `-((scrollX * SCROLL_FACTOR) % TILE_W)`).
      // Terrain modulo wraps tiles cleanly; clouds wrap on the wider
      // wrapW window so puffs near the edges don't pop.
      const offset = -scrollX * factor;
      let x = (baseX + offset) % wrapW;
      if (x < -100) x += wrapW;
      else if (x > w + 100) x -= wrapW;
      const y = bandY + (seed % 5) * 18;
      const sc = config.scale * (0.7 + ((seed * 7) % 50) / 100);
      const op = isStorm
        ? config.baseOp * 0.85
        : config.baseOp * (0.7 + ((seed * 11) % 30) / 100);
      out.push({ fx: x, y, sc, op, seed });
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
