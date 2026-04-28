<script lang="ts">
  // Ice Slough — boggy meadow with grass tufts, peat layer, and ice layer
  // below, spade digging to expose it. Pass-by landmark (no badge).
  // Ported verbatim from icons-passbys.jsx (PB_IceSlough).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- meadow grass -->
  <rect x="2" y="14" width="20" height="2" fill={LI.sage} opacity="0.6" />
  <!-- tufts of grass on top -->
  <line x1="3" y1="14" x2="3" y2="12" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="5" y1="14" x2="5" y2="11" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="7" y1="14" x2="7.5" y2="11.5" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="9" y1="14" x2="9" y2="12" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="11" y1="14" x2="11" y2="11" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="13" y1="14" x2="13.5" y2="12" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="15" y1="14" x2="15" y2="11.5" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="17" y1="14" x2="17" y2="12" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="19" y1="14" x2="19" y2="11" stroke={LI.sageDark} stroke-width="0.4" />
  <line x1="21" y1="14" x2="21" y2="12" stroke={LI.sageDark} stroke-width="0.4" />
  <!-- peat soil layer -->
  <rect x="2" y="16" width="20" height="1.5" fill={LI.earth} opacity="0.7" />
  <!-- ice layer below — the curiosity -->
  <rect x="2" y="17.5" width="20" height="2" fill={LI.water} opacity="0.85" stroke={LI.ink} stroke-width="0.4" />
  <!-- ice shimmer -->
  <line x1="4" y1="18.3" x2="6" y2="18.3" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <line x1="9" y1="18.6" x2="12" y2="18.6" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <line x1="15" y1="18.3" x2="18" y2="18.3" stroke={LI.white} stroke-width="0.3" opacity="0.7" />
  <!-- spade dug into the layer to expose ice -->
  <path d="M 12 5 L 12 14" stroke={LI.ink} stroke-width="0.5" />
  <path d="M 11 5 L 13 5 L 13 6.5 L 11 6.5 Z" fill={LI.earth} stroke={LI.ink} stroke-width="0.4" />
  <path d="M 11 14 L 13 14 L 12.7 17 L 11.3 17 Z" fill={LI.bone} stroke={LI.ink} stroke-width="0.4" />
</g>
