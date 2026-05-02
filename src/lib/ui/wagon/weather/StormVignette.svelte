<script lang="ts">
  // Full-stage darkening overlay for rainy / stormy weather. Sits over
  // the precipitation so the scene reads as muted/cold without losing
  // legibility. Heavier when `isStorm` for Kurosawa-feel committed
  // weather; plain rain stays subtle.
  import type { SkyAccentKind } from './SkyAccent.svelte';

  interface Props {
    kind: SkyAccentKind;
    /** True when weather='storm' specifically. Drives heavier vignette
     *  + cooler tone vs plain rain. */
    isStorm?: boolean;
    w: number;
    h: number;
  }

  let { kind, isStorm = false, w, h }: Props = $props();
</script>

{#if kind === 'rainy'}
  <rect x="0" y="0" width={w} height={h}
        fill={isStorm ? '#0e1626' : '#1a2030'}
        opacity={isStorm ? 0.48 : 0.32} />
{/if}
