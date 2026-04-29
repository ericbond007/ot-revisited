<script lang="ts">
  // Fort Bridger — sparse low log stockade with a crenellated top profile
  // and lone signpost. Jim Bridger's famous but "famously thin" post.
  // Ported verbatim from icons-trading-posts.jsx (Lmk_FortBridger).
  // Path data is committed — don't optimize or redraw.
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="bridger" tone="warm">
  {#snippet children()}
    <rect x="1" y="18" width="22" height="5" fill={LI.earthLight} opacity="0.5" />
    <!-- simple low log stockade -->
    <path d="M 5 12 L 7 11 L 9 12 L 11 11 L 13 12 L 15 11 L 17 12 L 19 11 L 19 19 L 5 19 Z"
          fill={LI.earth} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
    <rect x="13" y="11.5" width="6" height="7.5" fill={LI.ink} opacity="0.2" />
    <!-- tiny gate -->
    <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
    <!-- lone signpost — Bridger's famous "famously thin" feel -->
    <line x1="3.5" y1="13" x2="3.5" y2="19" stroke={LI.ink} stroke-width="0.5" />
    <rect x="2" y="13" width="3" height="1.6" fill={LI.bone} stroke={LI.ink} stroke-width="0.3" />
  {/snippet}
</HybridBadge>
