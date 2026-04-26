<script lang="ts">
  // Prairie-schooner glyph as it appears on the trail map (smaller +
  // simpler than the wagon-scene render). Centered at (0,0) so the
  // caller positions via parent <g transform="translate(...)">.
  //
  // Includes the SMIL pulse halo. SMIL lives inside the SVG and
  // doesn't share the wagon-scene's rAF tick — keeping it animated
  // during /play is fine.
  //
  // `size` selects the proportions:
  //   "lg" = snippet (default) — bigger, more detail
  //   "sm" = modal full-trail   — same shape, scaled down
  import type { Snippet } from 'svelte';

  interface Props {
    size?: 'lg' | 'sm';
    /** Optional overlay (e.g. "YOU ARE HERE" label). */
    children?: Snippet;
  }

  let { size = 'lg', children }: Props = $props();
</script>

{#if size === 'lg'}
  <!-- snippet variant -->
  <circle r="18" fill="#c96a2a" opacity="0.20">
    <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
  </circle>
  <g transform="translate(0 1)">
    <ellipse cx="0" cy="6" rx="13" ry="1" fill="#3a1a08" opacity="0.35" />
    <line x1="-12" y1="1" x2="-19" y2="3" stroke="#3a1a08" stroke-width="1" stroke-linecap="round" />
    <path d="M -12 1 Q -13 -3 -10 -7 Q -5 -11 0 -11 Q 5 -11 10 -7 Q 13 -3 12 1 Q 6 2.5 0 2.5 Q -6 2.5 -12 1 Z"
          fill="#f5e6c8" stroke="#3a1a08" stroke-width="1.1" stroke-linejoin="round" />
    <path d="M -7 1.5 Q -7 -4 -7 -8" stroke="#3a1a08" stroke-width="0.4" fill="none" opacity="0.55" />
    <path d="M 0 2.5 Q 0 -5 0 -10"   stroke="#3a1a08" stroke-width="0.4" fill="none" opacity="0.55" />
    <path d="M 7 1.5 Q 7 -4 7 -8"    stroke="#3a1a08" stroke-width="0.4" fill="none" opacity="0.55" />
    <ellipse cx="-12" cy="-3" rx="0.7" ry="3" fill="#3a1a08" opacity="0.6" />
    <path d="M -12 1.2 Q 0 0.2 12 1.2 L 12 4 L -12 4 Z"
          fill="#8a5a2a" stroke="#3a1a08" stroke-width="0.8" stroke-linejoin="round" />
    <line x1="-11.5" y1="1.3" x2="-11.5" y2="3.8" stroke="#1a0e04" stroke-width="0.6" />
    <line x1="11.5"  y1="1.3" x2="11.5"  y2="3.8" stroke="#1a0e04" stroke-width="0.6" />
    <line x1="-6" y1="1.4" x2="-6" y2="3.7" stroke="#3a1a08" stroke-width="0.3" opacity="0.6" />
    <line x1="0"  y1="1.2" x2="0"  y2="3.7" stroke="#3a1a08" stroke-width="0.3" opacity="0.6" />
    <line x1="6"  y1="1.4" x2="6"  y2="3.7" stroke="#3a1a08" stroke-width="0.3" opacity="0.6" />
    <g transform="translate(-7 5)">
      <circle r="3.2" fill="none" stroke="#3a1a08" stroke-width="1" />
      <line x1="-3.2" y1="0" x2="3.2" y2="0"   stroke="#3a1a08" stroke-width="0.4" />
      <line x1="0"    y1="-3.2" x2="0" y2="3.2" stroke="#3a1a08" stroke-width="0.4" />
      <line x1="-2.3" y1="-2.3" x2="2.3" y2="2.3" stroke="#3a1a08" stroke-width="0.4" />
      <line x1="-2.3" y1="2.3"  x2="2.3" y2="-2.3" stroke="#3a1a08" stroke-width="0.4" />
      <circle r="0.7" fill="#3a1a08" />
    </g>
    <g transform="translate(7 5)">
      <circle r="3.8" fill="none" stroke="#3a1a08" stroke-width="1.1" />
      <line x1="-3.8" y1="0" x2="3.8" y2="0"   stroke="#3a1a08" stroke-width="0.4" />
      <line x1="0"    y1="-3.8" x2="0" y2="3.8" stroke="#3a1a08" stroke-width="0.4" />
      <line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" stroke="#3a1a08" stroke-width="0.4" />
      <line x1="-2.7" y1="2.7"  x2="2.7" y2="-2.7" stroke="#3a1a08" stroke-width="0.4" />
      <circle r="0.8" fill="#3a1a08" />
    </g>
  </g>
{:else}
  <!-- modal variant: same DNA, smaller -->
  <circle r="14" fill="#c96a2a" opacity="0.18">
    <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
  </circle>
  <g transform="translate(0 1)">
    <ellipse cx="0" cy="5" rx="10" ry="0.8" fill="#3a1a08" opacity="0.35" />
    <line x1="-9" y1="1" x2="-15" y2="2.5" stroke="#3a1a08" stroke-width="0.8" stroke-linecap="round" />
    <path d="M -9 0.8 Q -10 -2.5 -7.5 -5.5 Q -3.5 -8.5 0 -8.5 Q 3.5 -8.5 7.5 -5.5 Q 10 -2.5 9 0.8 Q 4.5 2 0 2 Q -4.5 2 -9 0.8 Z"
          fill="#f5e6c8" stroke="#3a1a08" stroke-width="0.9" stroke-linejoin="round" />
    <path d="M -5 1 Q -5 -3 -5 -6" stroke="#3a1a08" stroke-width="0.3" fill="none" opacity="0.5" />
    <path d="M 0 2 Q 0 -4 0 -8"    stroke="#3a1a08" stroke-width="0.3" fill="none" opacity="0.5" />
    <path d="M 5 1 Q 5 -3 5 -6"    stroke="#3a1a08" stroke-width="0.3" fill="none" opacity="0.5" />
    <ellipse cx="-9" cy="-2.2" rx="0.5" ry="2.2" fill="#3a1a08" opacity="0.6" />
    <path d="M -9 1 Q 0 0.3 9 1 L 9 3 L -9 3 Z"
          fill="#8a5a2a" stroke="#3a1a08" stroke-width="0.6" stroke-linejoin="round" />
    <line x1="-8.5" y1="1.1" x2="-8.5" y2="2.9" stroke="#1a0e04" stroke-width="0.45" />
    <line x1="8.5"  y1="1.1" x2="8.5"  y2="2.9" stroke="#1a0e04" stroke-width="0.45" />
    <g transform="translate(-5 4)">
      <circle r="2.4" fill="none" stroke="#3a1a08" stroke-width="0.8" />
      <line x1="-2.4" y1="0" x2="2.4" y2="0"   stroke="#3a1a08" stroke-width="0.3" />
      <line x1="0"    y1="-2.4" x2="0" y2="2.4" stroke="#3a1a08" stroke-width="0.3" />
      <line x1="-1.7" y1="-1.7" x2="1.7" y2="1.7" stroke="#3a1a08" stroke-width="0.3" />
      <line x1="-1.7" y1="1.7"  x2="1.7" y2="-1.7" stroke="#3a1a08" stroke-width="0.3" />
      <circle r="0.55" fill="#3a1a08" />
    </g>
    <g transform="translate(5 4)">
      <circle r="2.9" fill="none" stroke="#3a1a08" stroke-width="0.9" />
      <line x1="-2.9" y1="0" x2="2.9" y2="0"   stroke="#3a1a08" stroke-width="0.3" />
      <line x1="0"    y1="-2.9" x2="0" y2="2.9" stroke="#3a1a08" stroke-width="0.3" />
      <line x1="-2"   y1="-2" x2="2" y2="2"     stroke="#3a1a08" stroke-width="0.3" />
      <line x1="-2"   y1="2"  x2="2" y2="-2"    stroke="#3a1a08" stroke-width="0.3" />
      <circle r="0.65" fill="#3a1a08" />
    </g>
  </g>
{/if}
{@render children?.()}
