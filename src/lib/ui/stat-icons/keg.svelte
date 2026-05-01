<script lang="ts">
  // Water keg — wood-staved barrel with iron hoops, side view (#134).
  // Drawn fresh in SI vocabulary because the handoff bundle didn't
  // ship one. Sits next to the water-amount readout in InventoryPanel
  // — the wagon's water container is a keg, not a droplet.
  import { SI } from './stat-icon-tokens';
</script>

<!-- Body: oak stave barrel, slight bilge curve. -->
<path
  d="M 5 7 Q 3.5 12 5 17 L 19 17 Q 20.5 12 19 7 Z"
  fill={SI.woodAccent}
  opacity="0.85"
/>
<!-- Wood-grain wash (subtler tone, darker top half). -->
<path
  d="M 5 7 Q 3.5 12 5 17 L 19 17 Q 20.5 12 19 7 Z"
  fill={SI.rustDeep}
  opacity="0.18"
/>
<!-- Vertical staves — three thin separators. -->
<path d="M 9 7.5 Q 8.7 12 9 16.5" stroke={SI.ink} stroke-width="0.5" fill="none" opacity="0.4" />
<path d="M 12 7.3 Q 12 12 12 16.7" stroke={SI.ink} stroke-width="0.5" fill="none" opacity="0.4" />
<path d="M 15 7.5 Q 15.3 12 15 16.5" stroke={SI.ink} stroke-width="0.5" fill="none" opacity="0.4" />
<!-- Iron hoops — top, middle, bottom. -->
<path d="M 5.2 8 Q 12 7 18.8 8" stroke={SI.ink} stroke-width="1.1" fill="none" />
<path d="M 4 12 Q 12 11.4 20 12" stroke={SI.ink} stroke-width="1.1" fill="none" />
<path d="M 5.2 16 Q 12 17 18.8 16" stroke={SI.ink} stroke-width="1.1" fill="none" />
<!-- Bung (top) — small dot. -->
<circle cx="13.5" cy="7" r="0.7" fill={SI.ink} />
<!-- Body outline so the keg reads as a closed shape against any bg. -->
<path
  d="M 5 7 Q 3.5 12 5 17 L 19 17 Q 20.5 12 19 7 Z"
  fill="none"
  stroke={SI.ink}
  stroke-width="1.1"
  stroke-linejoin="round"
/>
