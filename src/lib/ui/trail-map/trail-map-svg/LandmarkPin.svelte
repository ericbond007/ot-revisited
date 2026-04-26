<script lang="ts">
  // Landmark pin glyph — fort, butte/landmark, river, start, end.
  // Centered at (0,0); caller positions via parent <g transform>.
  // Optional leader line + label band above the pin (per snippet).

  export type PinKind = 'fort' | 'landmark' | 'river' | 'start' | 'end';

  interface Props {
    kind: PinKind;
    /** Primary label (uppercase, monospace). Empty string omits. */
    label?: string;
    /** Italic sub-label (e.g. "passed · day 32"). Empty omits. */
    subLabel?: string;
    /** Y offset where the leader line ends + label sits. Negative
     *  pulls the label up; defaults to a short stub above the pin. */
    leaderTo?: number;
    /** Sub-label color (override). Defaults to the muted brown the
     *  snippet uses for sub-text. */
    subLabelColor?: string;
    /** Override the label font-size (default 10.5 in snippet, 9 in
     *  modal). */
    labelSize?: number;
    /** Override sub-label font-size. */
    subLabelSize?: number;
  }

  let {
    kind,
    label = '',
    subLabel = '',
    leaderTo = -16,
    subLabelColor = '#6a4a1a',
    labelSize = 10.5,
    subLabelSize = 10
  }: Props = $props();

  // The label sits a few units above leaderTo; sub-label is below the
  // label by ~12.
  const labelY = $derived(leaderTo - 6);
  const subY = $derived(leaderTo + 6);
</script>

<g>
  {#if kind === 'fort'}
    <circle r="7" fill="#f3dbb8" stroke="#c96a2a" stroke-width="2" />
    <path d="M-3 -3 L0 -6 L3 -3 L3 3 L-3 3 Z" fill="#3a1a08" />
  {:else if kind === 'landmark'}
    <path d="M-5 0 L-5 -10 L0 -13 L5 -10 L5 0 Z"
          fill="#c9b89a" stroke="#3a1a08" stroke-width="1.3" stroke-linejoin="round" />
  {:else if kind === 'river'}
    <path d="M-7 0 q3 -3 6 0 q3 3 6 0 q3 -3 6 0"
          stroke="#2f5a8a" stroke-width="1.6" fill="none" stroke-linecap="round" />
    <ellipse cx="0" cy="0" rx="2" ry="1.3" fill="#6a98c4" stroke="#2f5a8a" stroke-width="0.7" />
  {:else if kind === 'start'}
    <circle r="6" fill="#f5e0a8" stroke="#7a5a10" stroke-width="2" />
    <circle r="2" fill="#7a5a10" />
  {:else}
    <!-- end -->
    <circle r="7" fill="#f5e0a8" stroke="#7a5a10" stroke-width="2.4" />
    <circle r="3" fill="#7a5a10" />
    <path d="M0 -4 L1 -1 L4 -1 L1.6 1 L2.4 4 L0 2 L-2.4 4 L-1.6 1 L-4 -1 L-1 -1 Z"
          fill="#f5e6c8" stroke="#7a5a10" stroke-width="0.5" />
  {/if}

  {#if label}
    <!-- leader line + dot -->
    <path d="M0 {kind === 'fort' || kind === 'end' ? -10 : -8} L0 {leaderTo}"
          stroke="#3a1a08" stroke-width="0.7" fill="none" opacity="0.6" />
    <circle cx="0" cy={leaderTo} r="1.2" fill="#3a1a08" opacity="0.7" />
    <text x="0" y={labelY} text-anchor="middle"
          font-family="'Special Elite', 'Courier New', monospace"
          font-size={labelSize}
          fill="#3a1a08"
          letter-spacing="0.08em"
          style="text-transform: uppercase">{label}</text>
    {#if subLabel}
      <text x="0" y={subY} text-anchor="middle"
            font-family="Georgia, 'Times New Roman', serif"
            font-size={subLabelSize}
            fill={subLabelColor}
            font-style="italic">{subLabel}</text>
    {/if}
  {/if}
</g>
