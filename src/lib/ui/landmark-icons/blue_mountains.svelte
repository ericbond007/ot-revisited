<script lang="ts">
  // Blue Mountains — jagged forested range with back range in blue, conifer
  // silhouettes on front ridge. Pass-by (no badge).
  // Ported verbatim from icons-passbys.jsx (PB_BlueMountains).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <rect x="2" y="17" width="20" height="2" fill={LI.parchment} opacity="0.8" />
  <!-- back range — distant blue -->
  <path d="M 2 13 L 5 9 L 8 11 L 11 7 L 14 10 L 17 8 L 20 11 L 22 13 L 22 18 L 2 18 Z"
        fill={LI.water} opacity="0.55" stroke={LI.ink} stroke-width="0.3" stroke-linejoin="round" />
  <!-- front range — forested, with conifers -->
  <path d="M 2 17 L 4 13 L 7 14 L 9 11 L 12 13 L 14 11 L 17 14 L 19 12 L 22 16 L 22 19 L 2 19 Z"
        fill={LI.sageDark} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
  <!-- conifer suggestion — tiny triangles on ridge -->
  <path d="M 5 16 L 5.5 14.5 L 6 16 Z" fill={LI.ink} opacity="0.5" />
  <path d="M 8 15 L 8.5 13 L 9 15 Z" fill={LI.ink} opacity="0.5" />
  <path d="M 11 16 L 11.5 14 L 12 16 Z" fill={LI.ink} opacity="0.5" />
  <path d="M 14 14 L 14.5 12 L 15 14 Z" fill={LI.ink} opacity="0.5" />
  <path d="M 17 16 L 17.5 14 L 18 16 Z" fill={LI.ink} opacity="0.5" />
  <path d="M 20 15 L 20.5 13 L 21 15 Z" fill={LI.ink} opacity="0.5" />
</g>
