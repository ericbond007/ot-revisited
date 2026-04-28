<script lang="ts">
  // Project-wide SVG sprite. Mounted once in `+layout.svelte`; consumers
  // reference glyphs via `<svg><use href="#gi-…" /></svg>`. The hidden
  // 0×0 wrapper keeps the symbols out of layout flow but makes their ids
  // resolvable from anywhere in the document.
  //
  // Symbols ported verbatim from
  // docs/handoff/components/src/action-bar.html. Path data is committed —
  // do not optimize or redraw. Travel is hard-fill #f5e6c8 (matches
  // --c-tan-bright); the others use currentColor so the action bar can
  // theme them per state.
</script>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="gi-travel" viewBox="0 0 64 40">
      <!-- ox -->
      <rect x="13" y="22" width="1.6" height="9" fill="#f5e6c8"/>
      <rect x="18" y="22" width="1.6" height="9" fill="#f5e6c8"/>
      <path d="M9 20 Q9 14 15 13 L26 13 Q29 13 29 16 L29 22 Q29 24 26 24 L12 24 Q9 24 9 20 Z" fill="#f5e6c8"/>
      <path d="M15 13 Q14 9 17 9 Q19 9 19 13 Z" fill="#f5e6c8"/>
      <path d="M9 17 L5 16 L4 21 L9 22 Z" fill="#f5e6c8"/>
      <path d="M5 16 Q1 16 0.5 19 Q0.5 22 3 22 L7 22 Q8 20 8 18 Z" fill="#f5e6c8"/>
      <path d="M3 17 Q1 14 3 12 Q5 11 6 13" stroke="#f5e6c8" stroke-width="1" fill="none" stroke-linecap="round"/>
      <!-- yoke + traces -->
      <line x1="9" y1="11" x2="20" y2="11" stroke="#f5e6c8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20" y1="11" x2="36" y2="24" stroke="#f5e6c8" stroke-width="0.8"/>
      <line x1="20" y1="14" x2="36" y2="26" stroke="#f5e6c8" stroke-width="0.8"/>
      <!-- wagon -->
      <path d="M36 24 Q47 8 60 24 L60 28 L36 28 Z" fill="none" stroke="#f5e6c8" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="36" y="28" width="24" height="3" fill="#f5e6c8"/>
      <circle cx="42" cy="34" r="3" fill="none" stroke="#f5e6c8" stroke-width="1.2"/>
      <circle cx="56" cy="34" r="3" fill="none" stroke="#f5e6c8" stroke-width="1.2"/>
      <line x1="42" y1="31" x2="42" y2="37" stroke="#f5e6c8" stroke-width="0.6"/>
      <line x1="39" y1="34" x2="45" y2="34" stroke="#f5e6c8" stroke-width="0.6"/>
      <line x1="56" y1="31" x2="56" y2="37" stroke="#f5e6c8" stroke-width="0.6"/>
      <line x1="53" y1="34" x2="59" y2="34" stroke="#f5e6c8" stroke-width="0.6"/>
    </symbol>

    <symbol id="gi-rest" viewBox="0 0 32 32">
      <path d="M4 26 L16 6 L28 26 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" stroke-width="1.4"/>
      <path d="M14 26 L16 16 L18 26" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    </symbol>

    <symbol id="gi-hunt" viewBox="0 0 64 32">
      <!-- barrel -->
      <rect x="14" y="13" width="44" height="2.6" fill="currentColor" transform="rotate(-12 32 14)"/>
      <!-- muzzle -->
      <circle cx="56.5" cy="8.5" r="2" fill="currentColor"/>
      <!-- front sight blade -->
      <path d="M50 10 L50.5 7 L51 10 Z" fill="currentColor"/>
      <!-- ramrod -->
      <line x1="16" y1="18" x2="50" y2="11" stroke="currentColor" stroke-width="0.9"/>
      <!-- stock -->
      <path d="M3 22 L18 16 L24 18 Q26 22 22 25 Q14 28 8 28 Q4 28 3 26 Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
      <!-- lock plate -->
      <ellipse cx="22" cy="18" rx="3.2" ry="2.4" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <!-- hammer -->
      <path d="M20 18 L18 13 L22 14 Z" fill="currentColor"/>
      <!-- trigger guard -->
      <path d="M20 22 Q22 26 25 23" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <line x1="22.5" y1="23" x2="22.5" y2="24.5" stroke="currentColor" stroke-width="1"/>
    </symbol>

    <symbol id="gi-visit" viewBox="0 0 32 32">
      <!-- left blockhouse -->
      <rect x="3" y="10" width="6" height="18" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M3 10 L6 6 L9 10 Z" fill="currentColor"/>
      <!-- right blockhouse -->
      <rect x="23" y="10" width="6" height="18" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M23 10 L26 6 L29 10 Z" fill="currentColor"/>
      <!-- gate -->
      <path d="M9 28 L9 16 Q9 14 11 14 L21 14 Q23 14 23 16 L23 28 Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <line x1="16" y1="14" x2="16" y2="28" stroke="currentColor" stroke-width="1"/>
      <!-- palisade points along top of walls -->
      <path d="M10 14 L11 12 L12 14 M14 14 L15 12 L16 14 M18 14 L19 12 L20 14" fill="currentColor"/>
    </symbol>

    <symbol id="gi-ford" viewBox="0 0 64 40">
      <!-- water lines -->
      <path d="M2 28 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0" stroke="currentColor" stroke-width="0.9" fill="none"/>
      <path d="M2 35 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0 q3 1.5 6 0 q3 -1.5 6 0" stroke="currentColor" stroke-width="0.7" fill="none" opacity="0.8"/>
      <!-- wagon canopy -->
      <path d="M14 22 Q32 4 50 22 L50 26 L14 26 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <!-- wagon body partly submerged -->
      <rect x="14" y="26" width="36" height="3" fill="currentColor"/>
      <!-- wheels (half submerged) -->
      <circle cx="22" cy="32" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="42" cy="32" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/>
      <line x1="22" y1="29" x2="22" y2="35" stroke="currentColor" stroke-width="0.6"/>
      <line x1="19" y1="32" x2="25" y2="32" stroke="currentColor" stroke-width="0.6"/>
      <line x1="42" y1="29" x2="42" y2="35" stroke="currentColor" stroke-width="0.6"/>
      <line x1="39" y1="32" x2="45" y2="32" stroke="currentColor" stroke-width="0.6"/>
    </symbol>
  </defs>
</svg>
