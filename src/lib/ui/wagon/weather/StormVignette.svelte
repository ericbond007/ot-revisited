<script lang="ts">
  // Full-stage darkening overlay for storm weather. Sits between the
  // precipitation drops and the time-of-day wash so the rest of the
  // scene reads as muted/cold without losing legibility.
  import type { SkyAccentKind } from './SkyAccent.svelte';

  interface Props {
    kind: SkyAccentKind;
    w: number;
    h: number;
  }

  let { kind, w, h }: Props = $props();
</script>

{#if kind === 'rainy'}
  <rect x="0" y="0" width={w} height={h} fill="#1a2030" opacity="0.32" />
{/if}
