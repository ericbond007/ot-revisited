<script lang="ts">
  // Trail-map snippet: a parchment-strip dashboard showing a window
  // of the full trail centered on the wagon. As the party moves west,
  // the camera pans along with them.
  //
  // The snippet shares its coord-space (1000×380) with TrailMapModal
  // — both consume TrailMapPaint. The snippet just supplies a smaller
  // viewBox that crops to a moving region around the wagon.
  //
  // Click anywhere (or hit Enter/Space) to open the fullscreen pan-
  // zoom modal with the full trail.

  import type { Landmark } from '$lib/game/content/landmarks';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  import {
    accumulateMiles,
    currentLeg,
    milesToNext,
    milesToNextOfKind,
    interpolatePosition
  } from './trail-map-helpers';
  import { LANDMARK_COORDS, TRAIL_VIEWBOX_W, TRAIL_VIEWBOX_H } from './trail-map-svg/landmark-coords';
  import ParchmentBg from './trail-map-svg/ParchmentBg.svelte';
  import Compass from './trail-map-svg/Compass.svelte';
  import TrailMapPaint from './trail-map-svg/TrailMapPaint.svelte';

  interface Props {
    /** Cumulative miles traveled by the wagon. */
    currentMileage: number;
    /** Override the LANDMARKS array (mostly for tests). */
    landmarks?: readonly Landmark[];
    /** Open-modal callback. */
    onExpand?: () => void;
  }

  let { currentMileage, landmarks = LANDMARKS, onExpand }: Props = $props();

  const marked = $derived(accumulateMiles(landmarks));
  const leg = $derived(currentLeg(marked, currentMileage));
  const next = $derived(milesToNext(marked, currentMileage));
  const nextFort = $derived(milesToNextOfKind(marked, currentMileage, 'trading_post'));

  // Camera window — narrow 320×100 strip showing ~2-3 upcoming
  // landmarks. Wagon anchored at the right-30% mark so most of the
  // viewport shows what's ahead westward; clamping keeps the camera
  // inside the shared 1000×380 coord-space at the trail's east/west
  // ends. `slice` preserves horizontal fill in the strip host (mild
  // vertical crop is fine — the trail diagonal is shallow).
  const VB_W = 320;
  const VB_H = 100;
  /** Where the wagon sits inside the viewBox, expressed as 0–1 from
   *  left edge. 0.7 = wagon at the right-30% mark, leaving the bulk
   *  of the viewport for "what's ahead." */
  const WAGON_ANCHOR = 0.7;
  const wagonXY = $derived(interpolatePosition(marked, currentMileage, LANDMARK_COORDS));
  const camX = $derived(
    Math.max(0, Math.min(TRAIL_VIEWBOX_W - VB_W, wagonXY[0] - WAGON_ANCHOR * VB_W))
  );
  const camY = $derived(
    Math.max(0, Math.min(TRAIL_VIEWBOX_H - VB_H, wagonXY[1] - VB_H / 2))
  );
  const viewBox = $derived(`${camX} ${camY} ${VB_W} ${VB_H}`);

  // HUD strings — single combined readout. Leg ordinal + day moved
  // to the play-page status bar; this HUD focuses on the upcoming
  // landmark + nearest trading post.
  const fromTo = $derived(
    leg.last && leg.next
      ? `${leg.last.name.toUpperCase()} → ${leg.next.name.toUpperCase()}`
      : leg.last
        ? `${leg.last.name.toUpperCase()} → END`
        : 'INDEPENDENCE → KANSAS RIVER'
  );
  const milesLabel = $derived(next ? `${next.miles} mi to ${next.name}` : "TRAIL'S END");
  const postLabel = $derived(
    nextFort ? `next post: ${nextFort.name} in ${nextFort.miles} mi` : 'no post ahead'
  );

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onExpand?.();
    }
  }
</script>

<div class="snippet-host"
     role="button"
     tabindex="0"
     aria-label="Open full trail map"
     onclick={() => onExpand?.()}
     onkeydown={handleKeydown}>
  <ParchmentBg>
    <!-- compass -->
    <div class="compass-host">
      <Compass />
    </div>

    <!-- map SVG — camera window over the shared 1000×380 paint -->
    <svg {viewBox} preserveAspectRatio="xMidYMid slice" class="map-svg">
      <TrailMapPaint {landmarks} {currentMileage} wagonSize="sm" paintScale={0.4} />
    </svg>

    <!-- bottom row: HUD + legend, flex-laid so they never overlap -->
    <div class="bottom-row">
      <div class="hud">
        <span class="hud-label">Heading West</span>
        <span class="hud-big">{fromTo}</span>
        <span class="hud-sub">{milesLabel}</span>
        <span class="hud-sub">{postLabel}</span>
      </div>
      <div class="legend">
        <div><svg width="22" height="6"><line x1="1" y1="3" x2="21" y2="3" stroke="#c96a2a" stroke-width="3" stroke-linecap="round"/></svg> trail traveled</div>
        <div><svg width="22" height="6"><line x1="1" y1="3" x2="21" y2="3" stroke="#5a3a1a" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3"/></svg> trail ahead</div>
        <div><svg width="22" height="6"><path d="M1 3 q5 -2 10 0 t10 0" stroke="#2f5a8a" stroke-width="2" fill="none" stroke-linecap="round"/></svg> river</div>
      </div>
    </div>

    <button class="expand-btn" aria-label="View full map" onclick={(e) => { e.stopPropagation(); onExpand?.(); }}>
      <svg width="11" height="11" viewBox="0 0 12 12">
        <path d="M1 5 L1 1 L5 1 M11 5 L11 1 L7 1 M1 7 L1 11 L5 11 M11 7 L11 11 L7 11"
              stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="square"/>
      </svg>
      Full Map
    </button>
  </ParchmentBg>
</div>

<style>
  .snippet-host {
    position: relative;
    width: 100%;
    height: 380px;
    cursor: zoom-in;
  }
  .map-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /* Bottom-row holder: HUD + legend laid side-by-side with a gap so
   * they never overlap regardless of the HUD's text width. Right
   * offset clears the Full Map button. */
  .bottom-row {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 100px;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    gap: 12px;
  }

  .hud {
    background: rgba(26, 15, 8, 0.86);
    color: #f5e6c8;
    border: 1px solid #c96a2a;
    padding: 6px 9px;
    border-radius: 2px;
    font-family: 'Special Elite', 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.35;
    backdrop-filter: blur(2px);
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
  }
  .hud-label {
    color: #c96a2a;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 9.5px;
    margin-bottom: 2px;
  }
  .hud-big {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #f5e6c8;
  }
  .hud-sub {
    color: #e8c89a;
    font-size: 10.5px;
    font-style: italic;
  }

  .compass-host {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 10;
  }

  .legend {
    background: rgba(232, 217, 184, 0.92);
    border: 1px solid #5a3a1a;
    border-radius: 2px;
    padding: 6px 9px;
    font-family: 'Special Elite', monospace;
    font-size: 9.5px;
    color: #3a1a08;
    letter-spacing: 0.04em;
    line-height: 1.5;
    flex: 0 0 auto;
  }
  .legend > div {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .expand-btn {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 11;
    background: rgba(26, 15, 8, 0.86);
    color: #f5e6c8;
    border: 1px solid #c96a2a;
    border-radius: 2px;
    padding: 5px 9px 5px 8px;
    font-family: 'Special Elite', 'Courier New', monospace;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .expand-btn:hover { background: #c96a2a; color: #1a0f08; }
  .snippet-host:hover .expand-btn { background: #c96a2a; color: #1a0f08; }
</style>
