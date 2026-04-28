<script lang="ts">
  // Pace stat — ox head, simplified from the OxHead in
  // explorations/travel-scene. Long flat profile facing left, single
  // forward-curving horn, big leaf ear, pied rust crown patch over
  // cream body, cream muzzle. Worked-port template for "complex
  // multi-layer hero silhouette with shaped overlays." Ported verbatim
  // from docs/handoff/stat-icons/src/stat-icons.jsx (PaceIcon). Path
  // data is committed — don't optimize or redraw.
  import { SI } from './stat-icon-tokens';
</script>

<!-- ear (back) -->
  <path d="M 16 7.5 Q 19 7 19.5 9.5 Q 19 11 17 10.5 Z" fill={SI.pipedEar} opacity="0.9" />
  <path d="M 16 7.5 Q 19 7 19.5 9.5 Q 19 11 17 10.5 Z" fill="none" stroke={SI.ink} stroke-width="0.9" stroke-linejoin="round" />
  <!-- head silhouette -->
  <path d="M 17 7  Q 16 6 14 6.5  Q 11 7 8 8.5  Q 5 10 4 12  Q 4 13.5 5 14  L 7 14.5  Q 8 16 10 16.5  Q 13 17 15 16.5  Q 17 16 17.5 14.5  Q 18 13 17.8 11  Q 17.5 9 17 7 Z" fill={SI.hide} />
  <!-- pied rust crown patch -->
  <path d="M 17 7  Q 16 6 14 6.5  Q 11 7 8.5 8  Q 8 9 9 10  Q 12 9.5 15 10  Q 17 10.5 17.8 11  Q 17.5 9 17 7 Z" fill={SI.pied} opacity="0.9" />
  <!-- head ink outline -->
  <path d="M 17 7  Q 16 6 14 6.5  Q 11 7 8 8.5  Q 5 10 4 12  Q 4 13.5 5 14  L 7 14.5  Q 8 16 10 16.5  Q 13 17 15 16.5  Q 17 16 17.5 14.5  Q 18 13 17.8 11  Q 17.5 9 17 7 Z" fill="none" stroke={SI.ink} stroke-width="1.1" stroke-linejoin="round" />
  <!-- crown patch ink edge -->
  <path d="M 8.5 8.2 Q 12 9 17.5 10.6" fill="none" stroke={SI.ink} stroke-width="0.7" opacity="0.75" />
  <!-- muzzle -->
  <path d="M 4 12  Q 4 13.5 5 14  L 7 14.5  Q 7.5 13.5 7 12.5  Q 5.5 12 4 12 Z" fill={SI.muzzle} />
  <path d="M 4 12  Q 4 13.5 5 14  L 7 14.5  Q 7.5 13.5 7 12.5  Q 5.5 12 4 12 Z" fill="none" stroke={SI.ink} stroke-width="0.9" stroke-linejoin="round" />
  <ellipse cx="5.4" cy="13.2" rx="0.5" ry="0.35" fill={SI.ink} />
  <ellipse cx="9" cy="11.4" rx="0.5" ry="0.4" fill={SI.ink} />
  <!-- horn — forward-and-up curve -->
  <path d="M 16.5 6.8  Q 14.5 5.5 13.2 4.2" fill="none" stroke={SI.hornCream} stroke-width="1.7" stroke-linecap="round" />
  <path d="M 16.5 6.8  Q 14.5 5.5 13.2 4.2" fill="none" stroke={SI.ink} stroke-width="0.6" stroke-linecap="round" opacity="0.6" />
<circle cx="13.1" cy="4.1" r="0.35" fill="#2a1004" />
