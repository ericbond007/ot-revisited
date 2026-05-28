<script lang="ts">
  // Sun/moon disc with halo. Hidden under heavy weather (rainy/snowy).
  // The pulse keeps the disc subtly alive without animating CSS —
  // pure SVG transform driven off the scene tick `t`.
  //
  // The brief vocabulary is intentionally narrower than the engine's
  // 8-state weather union; the composer in Phase 6 maps state.weather
  // onto these kinds before passing in.

  export type SkyAccentKind =
    | 'sunny'
    | 'partly'
    | 'cloudy'
    | 'rainy'
    | 'snowy'
    | 'night';

  interface Props {
    kind: SkyAccentKind;
    x: number;
    y: number;
    /** Scene-tick seconds. */
    t: number;
  }

  let { kind, x, y, t }: Props = $props();

  const visible = $derived(kind !== 'rainy' && kind !== 'snowy');
  const isMoon = $derived(kind === 'night');
  const pulse = $derived(1 + Math.sin(t * 0.6) * 0.04);
</script>

{#if visible}
  <g transform={`translate(${x} ${y}) scale(${pulse})`}>
    <!-- outer glow -->
    <circle r="22" fill={isMoon ? '#d8d8e8' : '#fff5d0'} opacity="0.18" />
    <circle r="14" fill={isMoon ? '#e0e0f0' : '#fde8a0'} opacity="0.4" />
    <!-- disc -->
    <circle r="9" fill={isMoon ? '#f0f0f8' : '#fff0c8'}
            stroke={isMoon ? '#a0a0b0' : '#e8b850'} stroke-width="0.6" />
    {#if isMoon}
      <circle cx="-3" cy="-2" r="1.4" fill="#c0c0d0" opacity="0.5" />
      <circle cx="2" cy="3" r="1" fill="#c0c0d0" opacity="0.4" />
    {/if}
  </g>
{/if}
