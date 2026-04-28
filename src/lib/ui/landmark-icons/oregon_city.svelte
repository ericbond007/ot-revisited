<script lang="ts">
  // Oregon City — trail end marker, Willamette Falls cascade with stepped
  // waterfall, "END" banner ribbon at top. Pass-by/terminus (no badge).
  // Ported verbatim from icons-passbys.jsx (PB_OregonCity_End).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- Willamette Falls + ribbon as "end" -->
  <circle cx="12" cy="12" r="9" fill={LI.bone} stroke={LI.ink} stroke-width="0.5" />
  <!-- falls — stepped cascade -->
  <path d="M 5 8 L 19 8 L 19 9.5 L 5 9.5 Z" fill={LI.water} stroke={LI.ink} stroke-width="0.3" />
  <path d="M 6 9.5 L 18 9.5 Q 16 14 12 16 Q 8 14 6 9.5 Z"
        fill={LI.water} stroke={LI.ink} stroke-width="0.3" />
  <!-- cascade lines -->
  <line x1="8" y1="11" x2="8" y2="14" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <line x1="10" y1="11" x2="10" y2="15" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <line x1="12" y1="11" x2="12" y2="15.5" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <line x1="14" y1="11" x2="14" y2="15" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <line x1="16" y1="11" x2="16" y2="14" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <!-- banner ribbon at top -->
  <path d="M 4 5 L 20 5 L 19 7 L 5 7 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.3" />
  <text x="12" y="6.7" font-size="1.8" font-family="Georgia, serif" font-weight="bold"
        fill={LI.bone} text-anchor="middle" letter-spacing="0.2">END</text>
</g>
