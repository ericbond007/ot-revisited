<script lang="ts">
  // Cash stat — folded banknotes matching 💵 emoji silhouette. Ported
  // verbatim from docs/handoff/stat-icons/src/stat-icons.jsx (CashIcon).
  // Path data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<rect x="4.5" y="9" width="16" height="9" rx="0.6" fill={SI.sageDeep} opacity="0.55" />
<path d="M 3.5 8  L 19.5 7  L 20 16  L 4 17 Z" fill={SI.sage} opacity="0.95" />
<path d="M 3.5 8  L 19.5 7  L 19.7 7.6  L 3.6 8.6 Z" fill={SI.sageDeep} opacity="0.7" />
<path d="M 3.5 8  L 19.5 7  L 20 16  L 4 17 Z" fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
<ellipse cx="11.7" cy="12" rx="3" ry="2" fill="none" stroke={SI.ink} stroke-width="0.8" opacity="0.85" />
<text x="11.7" y="13.2" text-anchor="middle" font-family="serif" font-weight="700" font-size="3.6" fill={SI.ink}>$</text>
<circle cx="6"    cy="9.6"  r="0.7" fill="none" stroke={SI.ink} stroke-width="0.5" />
<circle cx="17.5" cy="14.5" r="0.7" fill="none" stroke={SI.ink} stroke-width="0.5" />
