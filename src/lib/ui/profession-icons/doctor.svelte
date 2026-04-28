<script lang="ts">
  // Doctor — shield-shaped plaque with a red cross. Worked-port
  // template for "simple geometric badge with single hero shape."
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconDoctor). Path data is committed — don't optimize.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <!-- shield/plaque background -->
  <path d="M4 4 L20 4 L20 15 Q20 18.5 12 21 Q4 18.5 4 15 Z" fill={LI.bone} stroke={LI.ink} stroke-width="1.1"/>
  <path d="M5.2 5.2 L18.8 5.2 L18.8 14.8 Q18.8 17.6 12 19.7 Q5.2 17.6 5.2 14.8 Z" fill="none" stroke={LI.ink} stroke-width="0.4" opacity="0.5"/>
  <!-- red cross -->
  <path d="M10 6.5 L14 6.5 L14 10.5 L18 10.5 L18 14 L14 14 L14 18 L10 18 L10 14 L6 14 L6 10.5 L10 10.5 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.9"/>
</g>
