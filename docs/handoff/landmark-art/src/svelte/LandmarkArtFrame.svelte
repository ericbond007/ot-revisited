<!--
  LandmarkArtFrame.svelte
  ───────────────────────
  Shared chrome for every landmark artwork. Wraps the inner SVG in a
  consistent 480×200 viewBox, paints the parchment ground, lays down the
  filter <defs>, and stamps the grain + vignette overlays last.

  Each landmark component is a slot child:

    <LandmarkArtFrame tone="warm" filterId="lmk-chimney">
      <ChimneyRockArt />
    </LandmarkArtFrame>

  The frame fills 100% of its parent. Parent should size it (e.g. a card
  with `aspect-ratio: 16/7`).
-->
<script lang="ts">
  import { LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  interface Props {
    /** Parchment tone — pick by panel theme. */
    tone?: 'warm' | 'cool' | 'gold';
    /** Unique filter id; must be unique per instance on the page. */
    filterId?: string;
    /** Desaturate + dim — for ruined / abandoned states (e.g. Whitman post-massacre). */
    abandoned?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    tone = 'warm',
    filterId = 'lmk',
    abandoned = false,
    children,
  }: Props = $props();

  const base = $derived(
    tone === 'cool' ? '#dfdfd0' :
    tone === 'gold' ? '#f5e4b6' :
    '#f0deb6'
  );
  const sky = $derived(
    tone === 'cool' ? '#dde2d8' :
    tone === 'gold' ? '#f4e0b0' :
    '#e8d6a8'
  );
</script>

<div class="frame" class:abandoned>
  <svg viewBox="0 0 {LMK_VIEW_W} {LMK_VIEW_H}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <filter id="{filterId}-grain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 0 0.06  0 0 0 0.18 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <filter id="{filterId}-bleed" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5" result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" scale="1.4" />
      </filter>
      <pattern id="{filterId}-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="#2a1a08" stroke-width="0.4" opacity="0.5" />
      </pattern>
      <radialGradient id="{filterId}-sunglow" cx="80%" cy="22%" r="50%">
        <stop offset="0%" stop-color="#f6e9c0" stop-opacity="0.65" />
        <stop offset="40%" stop-color="#f6e9c0" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#f6e9c0" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="{filterId}-vignette" cx="50%" cy="50%" r="65%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)" />
        <stop offset="100%" stop-color="rgba(40,20,8,0.35)" />
      </radialGradient>
    </defs>

    <!-- Paper ground: sky band, earth band, sun glow -->
    <rect x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H * 0.62} fill={sky} />
    <rect x="0" y={LMK_VIEW_H * 0.62} width={LMK_VIEW_W} height={LMK_VIEW_H * 0.38} fill={base} />
    <rect x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H} fill="url(#{filterId}-sunglow)" />

    <!-- Landmark content -->
    {@render children?.()}

    <!-- Grain + vignette on top -->
    <rect x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
          fill="black" filter="url(#{filterId}-grain)" opacity="0.5"
          pointer-events="none" />
    <rect x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
          fill="url(#{filterId}-vignette)" pointer-events="none" />
  </svg>
</div>

<style>
  .frame {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: relative;
    border-radius: 2px;
    overflow: hidden;
  }
  .frame.abandoned {
    filter: saturate(0.35) brightness(0.92);
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
