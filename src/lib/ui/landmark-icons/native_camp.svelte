<script lang="ts">
  // Native camp (#202) — placeholder teepee silhouette in warm leather
  // tones. Used for both cheyenne_camp and shoshone_camp until proper
  // bespoke art lands (#211).
  import HybridBadge from './_badge.svelte';
  import { LI } from './landmark-icon-tokens';
</script>

<HybridBadge id="native_camp" tone="warm">
  {#snippet children()}
    <!-- teepee body — taut hide cone -->
    <path d="M 12 5 L 17 18 L 7 18 Z"
          fill={LI.earth} stroke={LI.ink} stroke-width="0.7" stroke-linejoin="round" />
    <!-- door slit -->
    <path d="M 12 13 L 11.4 18 L 12.6 18 Z" fill={LI.ink} />
    <!-- smoke poles poking out the top -->
    <line x1="12" y1="5" x2="10.5" y2="3" stroke={LI.ink} stroke-width="0.5" stroke-linecap="round" />
    <line x1="12" y1="5" x2="13.5" y2="3" stroke={LI.ink} stroke-width="0.5" stroke-linecap="round" />
    <line x1="12" y1="5" x2="12" y2="2.5" stroke={LI.ink} stroke-width="0.5" stroke-linecap="round" />
    <!-- faint smoke wisp -->
    <path d="M 12 3 Q 11 2 11.5 1 Q 12 0.5 12.5 1.5"
          fill="none" stroke={LI.ink} stroke-width="0.4" stroke-linecap="round" opacity="0.4" />
  {/snippet}
</HybridBadge>
