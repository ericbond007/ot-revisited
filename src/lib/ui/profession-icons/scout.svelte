<script lang="ts">
  // Scout — compass rose with cardinal directions and needle.
  // Ported verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconScout). Path data is committed — don't optimize or redraw.
  import { LI } from './profession-icon-tokens';
</script>

<g>
  <circle cx="12" cy="12" r="8.5" fill={LI.parchment} stroke={LI.ink} stroke-width="1"/>
  <circle cx="12" cy="12" r="7.2" fill="none" stroke={LI.ink} stroke-width="0.4" opacity="0.5"/>
  <path d="M12 4 L13.5 12 L12 20 L10.5 12 Z" fill={LI.rust} stroke={LI.ink} stroke-width="0.7"/>
  <path d="M4 12 L12 13.2 L20 12 L12 10.8 Z" fill={LI.bone} stroke={LI.ink} stroke-width="0.7"/>
  <text x="12" y="6.5" text-anchor="middle" font-family="serif" font-size="2.2" font-weight="700" fill={LI.ink}>N</text>
  <circle cx="12" cy="12" r="0.9" fill={LI.ink}/>
</g>
