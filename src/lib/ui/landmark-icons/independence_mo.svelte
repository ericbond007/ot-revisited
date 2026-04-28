<script lang="ts">
  // Independence MO — trail start marker, compass star burst on bone circle,
  // "MO" text label. Gold tone via bare silhouette (pass-by/terminus).
  // Ported verbatim from icons-passbys.jsx (PB_IndependenceMO_Start).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- "GO" star burst — start marker -->
  <circle cx="12" cy="12" r="9" fill={LI.bone} stroke={LI.ink} stroke-width="0.5" />
  <!-- compass star -->
  <path d="M 12 4 L 13.2 11 L 20 12 L 13.2 13 L 12 20 L 10.8 13 L 4 12 L 10.8 11 Z"
        fill={LI.rust} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
  <circle cx="12" cy="12" r="1.4" fill={LI.bone} stroke={LI.ink} stroke-width="0.4" />
  <!-- tiny banner -->
  <text x="12" y="13" font-size="2.2" font-family="Georgia, serif" font-weight="bold"
        fill={LI.ink} text-anchor="middle">MO</text>
</g>
