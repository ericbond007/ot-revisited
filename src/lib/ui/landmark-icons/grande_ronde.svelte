<script lang="ts">
  // Grande Ronde Valley — panoramic vista with far ridge, near ridges
  // flanking, valley floor with river snake and cattle dots. Pass-by (no badge).
  // Ported verbatim from icons-passbys.jsx (PB_GrandeRonde).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- far ridge frames the vista -->
  <path d="M 0 8 L 4 6 L 8 7 L 12 5 L 16 7 L 20 6 L 24 8 L 24 11 L 0 11 Z"
        fill={LI.water} opacity="0.45" stroke={LI.ink} stroke-width="0.3" stroke-linejoin="round" />
  <!-- near ridges flanking -->
  <path d="M 0 11 L 3 9 L 6 11 L 8 11 L 8 18 L 0 18 Z"
        fill={LI.sageDark} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
  <path d="M 24 11 L 21 9 L 18 11 L 16 11 L 16 18 L 24 18 Z"
        fill={LI.sageDark} stroke={LI.ink} stroke-width="0.4" stroke-linejoin="round" />
  <!-- valley floor — broad meadow with river snake -->
  <rect x="8" y="11" width="8" height="8" fill={LI.sage} opacity="0.55" stroke={LI.ink} stroke-width="0.3" />
  <path d="M 9 19 Q 10 16 11 14 Q 12 12 13 13 Q 14 15 15 19"
        stroke={LI.water} stroke-width="0.6" fill="none" />
  <!-- tiny cattle/dots on the floor -->
  <circle cx="10" cy="17" r="0.3" fill={LI.ink} opacity="0.6" />
  <circle cx="13" cy="16" r="0.3" fill={LI.ink} opacity="0.6" />
  <circle cx="11.5" cy="15" r="0.3" fill={LI.ink} opacity="0.6" />
  <circle cx="14" cy="17.5" r="0.3" fill={LI.ink} opacity="0.6" />
</g>
