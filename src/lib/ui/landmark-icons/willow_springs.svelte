<script lang="ts">
  // Willow Springs — two drooping willows flanking a spring pool,
  // pass-by landmark (no badge). Bare silhouette.
  // Ported verbatim from icons-passbys.jsx (PB_WillowSprings).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- drooping willow on left -->
  <line x1="6" y1="18" x2="6" y2="8" stroke={LI.ink} stroke-width="0.5" opacity="0.7" />
  <path d="M 6 8 Q 3 10 2 14" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <path d="M 6 9 Q 4 11 3 16" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <path d="M 6 8 Q 8 10 9 14" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <path d="M 6 9 Q 8 12 9 16" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <!-- drooping willow on right -->
  <line x1="18" y1="18" x2="18" y2="9" stroke={LI.ink} stroke-width="0.5" opacity="0.7" />
  <path d="M 18 9 Q 15 11 14 15" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <path d="M 18 10 Q 16 13 15 16" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <path d="M 18 9 Q 21 11 22 15" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <path d="M 18 10 Q 20 13 21 16" stroke={LI.sageDark} stroke-width="0.5" fill="none" />
  <!-- spring pool -->
  <ellipse cx="12" cy="18.5" rx="6" ry="1.2" fill={LI.water} stroke={LI.ink} stroke-width="0.4" />
  <path d="M 8 18.3 Q 12 18 16 18.3" stroke={LI.white} stroke-width="0.3" fill="none" opacity="0.5" />
</g>
