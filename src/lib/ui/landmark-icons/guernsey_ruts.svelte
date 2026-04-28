<script lang="ts">
  // Guernsey Ruts — twin wagon-wheel ruts cut deep into sandstone cross-section,
  // pass-by landmark (no badge). Bare silhouette.
  // Ported verbatim from icons-passbys.jsx (PB_GuernseyRuts).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- sandstone cross-section -->
  <path d="M 2 19 L 2 12 Q 6 11 12 11 Q 18 11 22 12 L 22 19 Z"
        fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
  <!-- the twin ruts cut DOWN into the rock — V-shaped channels -->
  <path d="M 7 11 L 9 19 L 7 19 L 5 11 Z"
        fill={LI.ink} opacity="0.55" />
  <path d="M 17 11 L 15 19 L 17 19 L 19 11 Z"
        fill={LI.ink} opacity="0.55" />
  <!-- shadow inside ruts -->
  <line x1="7" y1="13" x2="6" y2="19" stroke={LI.ink} stroke-width="0.3" opacity="0.7" />
  <line x1="17" y1="13" x2="18" y2="19" stroke={LI.ink} stroke-width="0.3" opacity="0.7" />
  <!-- striations on the rock face -->
  <line x1="3" y1="14" x2="4.5" y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
  <line x1="10" y1="14" x2="14" y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
  <line x1="19.5" y1="14" x2="21" y2="14" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
  <line x1="3" y1="16.5" x2="5" y2="16.5" stroke={LI.ink} stroke-width="0.2" opacity="0.35" />
  <line x1="10" y1="16.5" x2="14" y2="16.5" stroke={LI.ink} stroke-width="0.2" opacity="0.35" />
</g>
