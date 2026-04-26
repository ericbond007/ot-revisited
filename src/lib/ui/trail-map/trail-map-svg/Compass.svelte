<script lang="ts">
  // N/S/E/W compass rose, lifted verbatim from trail-snippet.html.
  // Self-contained 42×42 viewBox; caller positions via wrapper CSS.
</script>

<svg class="compass" viewBox="0 0 42 42" aria-label="Compass, north up">
  <circle cx="21" cy="21" r="19" fill="rgba(232,217,184,0.85)" stroke="#3a1a08" stroke-width="1.2" />
  <path d="M21 4 L25 21 L21 18 L17 21 Z"  fill="#8a3a1a" stroke="#3a1a08" stroke-width="0.8" stroke-linejoin="round" />
  <path d="M21 38 L25 21 L21 24 L17 21 Z" fill="#5a3a1a" stroke="#3a1a08" stroke-width="0.8" stroke-linejoin="round" />
  <path d="M4 21 L18 21 M24 21 L38 21" stroke="#3a1a08" stroke-width="0.6" />
  <text x="21" y="11"   text-anchor="middle" font-family="Rye, Georgia, serif" font-size="6"   fill="#3a1a08" font-weight="700">N</text>
  <text x="21" y="34"   text-anchor="middle" font-family="Rye, Georgia, serif" font-size="5.5" fill="#3a1a08">S</text>
  <text x="6.5" y="22.5"                       font-family="Rye, Georgia, serif" font-size="5.5" fill="#3a1a08">W</text>
  <text x="33"  y="22.5"                       font-family="Rye, Georgia, serif" font-size="5.5" fill="#3a1a08">E</text>
</svg>

<style>
  .compass {
    width: 38px;
    height: 38px;
  }
</style>
