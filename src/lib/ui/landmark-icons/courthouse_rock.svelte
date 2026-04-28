<script lang="ts">
  // Courthouse & Jail Rocks — two squat sandstone blocks on the prairie,
  // pass-by landmark (no badge). Bare silhouette.
  // Ported verbatim from icons-passbys.jsx (PB_CourthouseJail).
  // Path data is committed — don't optimize or redraw.
  import { LI } from './landmark-icon-tokens';
</script>

<g>
  <!-- Courthouse — bigger, blockier -->
  <path d="M 2 18 L 2 9 L 4 9 L 4 7 L 9 7 L 9 9 L 11 9 L 11 18 Z"
        fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
  <path d="M 9 7 L 9 9 L 11 9 L 11 18 L 8 18 L 8 7 Z" fill={LI.ink} opacity="0.22" />
  <!-- Jail — smaller, narrower -->
  <path d="M 14 18 L 14 12 L 16 12 L 16 10 L 19 10 L 19 12 L 21 12 L 21 18 Z"
        fill={LI.earthLight} stroke={LI.ink} stroke-width="0.5" stroke-linejoin="round" />
  <path d="M 19 10 L 19 12 L 21 12 L 21 18 L 18 18 L 18 10 Z" fill={LI.ink} opacity="0.22" />
  <!-- striations -->
  <line x1="3" y1="13" x2="10" y2="13" stroke={LI.ink} stroke-width="0.2" opacity="0.4" />
  <line x1="3" y1="15" x2="10" y2="15" stroke={LI.ink} stroke-width="0.2" opacity="0.35" />
  <line x1="14.5" y1="15" x2="20.5" y2="15" stroke={LI.ink} stroke-width="0.2" opacity="0.35" />
</g>
