<script lang="ts">
  // HybridBadge wrapper — circular parchment frame around bespoke art.
  // Stop landmarks (forts, rivers, arrival sites) wear this; pass-by
  // landmarks render bare. Tone drives the parchment fill: warm =
  // default; cool = river / HBC; gold = trail terminus.
  //
  // The clip-path id needs to be unique per mounted instance (SVG
  // <defs> are document-global). Caller passes a stable `id`; we
  // suffix a per-instance random string.
  import { LI, type LandmarkIconTone } from './landmark-icon-tokens';
  import type { Snippet } from 'svelte';

  let { id, tone = 'warm', children }: {
    id: string;
    tone?: LandmarkIconTone;
    children: Snippet;
  } = $props();

  const fill = $derived(
    tone === 'cool' ? LI.parchCool
    : tone === 'gold' ? LI.parchGold
    : LI.parchment
  );
  // Per-instance suffix for the clipPath id — SVG <defs> are document
  // global, so two icons on the same page can't share an id. $derived
  // makes the warning go away (Svelte sees it as a closure read).
  const cid = $derived(`${id}-${Math.random().toString(36).slice(2, 7)}`);
</script>

<g>
  <defs>
    <clipPath id={cid}>
      <circle cx="12" cy="12" r="10.5" />
    </clipPath>
  </defs>
  <circle cx="12" cy="12" r="11" fill={fill} stroke={LI.ink} stroke-width="1.1" />
  <g clip-path={`url(#${cid})`}>
    <rect x="1" y="1" width="22" height="11" fill={LI.paperWarm} opacity="0.55" />
    <rect x="1" y="12" width="22" height="11" fill={fill} opacity="0.7" />
    {@render children()}
  </g>
  <circle cx="12" cy="12" r="10" fill="none" stroke={LI.ink} stroke-width="0.4" opacity="0.6" />
</g>
