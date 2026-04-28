<script lang="ts">
  // Banker — folded banknote behind a stack of coins. Worked-port
  // template for "multi-layer composition with text glyphs." Ported
  // verbatim from docs/handoff/profession-icons/src/icons-professions.jsx
  // (ProfessionIconBanker). Path data is committed — don't optimize.
  import { LI } from './profession-icon-tokens';
</script>

<g>
<!-- banknote (back layer) -->
<rect x="3" y="5" width="18" height="9" fill={LI.parchGold} stroke={LI.ink} stroke-width="1"/>
<rect x="4.5" y="6.5" width="15" height="6" fill="none" stroke={LI.ink} stroke-width="0.4" opacity="0.55"/>
<circle cx="7" cy="9.5" r="1.4" fill="none" stroke={LI.ink} stroke-width="0.5" opacity="0.7"/>
<text x="7" y="10.5" text-anchor="middle" font-family="serif" font-weight="700" font-size="2.4" fill={LI.ink}>$</text>
<text x="17" y="10.5" text-anchor="middle" font-family="serif" font-weight="700" font-size="2.4" fill={LI.ink}>$</text>
<line x1="10" y1="8.5" x2="14" y2="8.5" stroke={LI.ink} stroke-width="0.35" opacity="0.5"/>
<line x1="10" y1="10" x2="14" y2="10" stroke={LI.ink} stroke-width="0.35" opacity="0.5"/>
<line x1="10" y1="11.5" x2="14" y2="11.5" stroke={LI.ink} stroke-width="0.35" opacity="0.5"/>
<!-- coin stack (front layer) -->
<ellipse cx="12" cy="15" rx="5.5" ry="1.5" fill={LI.goldFlag} stroke={LI.ink} stroke-width="0.9"/>
<path d="M6.5 15 L6.5 17 Q6.5 18.4 12 18.4 Q17.5 18.4 17.5 17 L17.5 15" fill={LI.goldFlag} stroke={LI.ink} stroke-width="0.9"/>
<ellipse cx="12" cy="17" rx="5.5" ry="1.5" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.6" opacity="0.6"/>
<path d="M6.5 17 L6.5 19 Q6.5 20.4 12 20.4 Q17.5 20.4 17.5 19 L17.5 17" fill={LI.goldFlag} stroke={LI.ink} stroke-width="0.9"/>
<ellipse cx="12" cy="19" rx="5.5" ry="1.5" fill={LI.earthLight} stroke={LI.ink} stroke-width="0.6" opacity="0.55"/>
<text x="12" y="19.9" text-anchor="middle" font-family="serif" font-weight="700" font-size="2.6" fill={LI.ink}>$</text>
</g>
