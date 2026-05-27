<!--
  ChimneyRockArt — mile ~550, the most-mentioned landmark on the trail.

  FLUX-only as of PR #185 follow-up. The decorative SVG overlay
  (carved spire, distant wagons, period caption) was stripped 2026-05-27
  because the hand-drawn vector layer doesn't blend visually with the
  painterly oil-on-canvas raster underneath. Going forward every
  FLUX-backed landmark ships raster-only — see CLAUDE.md "FLUX
  landmark backdrops — no SVG decorative overlay" for the rule.

  Backdrop source: tools/wagon-bg/render_landmark.py LANDMARKS['chimney_rock']
  (ht_landscape v2_2000 LoRA, seed 810001). Aspect-ratio mismatch with the
  in-game LandmarkStage viewport (#1182) — fixed by future re-renders at
  16:7 instead of the current 3:1.
-->
<script lang="ts">
  import { LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';
</script>

<g>
  <image
    href="/wagon-bg/landmarks/chimney_rock.webp?v=1"
    x="0" y="0" width={LMK_VIEW_W} height={LMK_VIEW_H}
    preserveAspectRatio="xMidYMid slice" />
</g>
