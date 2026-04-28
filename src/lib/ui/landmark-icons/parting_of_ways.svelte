<script lang="ts">
  // Parting of the Ways — trail forks into two branches (Sublette cutoff vs
  // Fort Bridger main), signpost at the fork. Pass-by (no badge).
  // Ported verbatim from icons-passbys.jsx (PB_PartingOfTheWays).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- sage prairie -->
  <rect x="2" y="14" width="20" height="5" fill={LI.sage} opacity="0.4" />
  <!-- trail comes from bottom and forks upward -->
  <path d="M 12 22 L 12 14"
        stroke={LI.ink} stroke-width="1.2" fill="none" opacity="0.7" stroke-dasharray="0.8 0.5" />
  <!-- left branch — Sublette cutoff -->
  <path d="M 12 14 Q 8 11 3 8"
        stroke={LI.ink} stroke-width="1.2" fill="none" opacity="0.7" stroke-dasharray="0.8 0.5" />
  <!-- right branch — Fort Bridger main -->
  <path d="M 12 14 Q 16 11 21 8"
        stroke={LI.ink} stroke-width="1.2" fill="none" opacity="0.7" stroke-dasharray="0.8 0.5" />
  <!-- signpost at the fork -->
  <line x1="12" y1="14" x2="12" y2="6" stroke={LI.ink} stroke-width="0.6" />
  <path d="M 12 7 L 6 7 L 4 8 L 6 9 L 12 9 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
  <path d="M 12 9.5 L 18 9.5 L 20 10.5 L 18 11.5 L 12 11.5 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
  <!-- tiny direction marks on signs -->
  <line x1="6" y1="8" x2="9" y2="8" stroke={LI.bone} stroke-width="0.3" />
  <line x1="14" y1="10.5" x2="17" y2="10.5" stroke={LI.bone} stroke-width="0.3" />
</g>
