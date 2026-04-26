<script lang="ts">
  // Fullscreen pan/zoom modal — the whole 2,170-mi trail at once,
  // Independence MO → Oregon City. Drag to pan, wheel/+/− to zoom,
  // 0/home to fit, Esc/X to close.
  //
  // Pan/zoom logic ported verbatim from
  // docs/handoff/trail-map/src/trail-snippet.html. `$state` for
  // scale/tx/ty so transforms re-run on each interaction.

  import { onMount } from 'svelte';
  import type { Landmark } from '$lib/game/content/landmarks';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  import ParchmentBg from './trail-map-svg/ParchmentBg.svelte';
  import LandmarkPin from './trail-map-svg/LandmarkPin.svelte';
  import WagonGlyph from './trail-map-svg/WagonGlyph.svelte';
  import { ICON } from '$lib/data/icon-dictionary';

  interface Props {
    landmarks?: readonly Landmark[];
    /** Cumulative miles — used by the wagon position. */
    currentMileage: number;
    onClose?: () => void;
  }

  let { landmarks: _landmarks = LANDMARKS, currentMileage: _currentMileage, onClose }: Props = $props();

  // _landmarks / _currentMileage are reserved for the per-landmark
  // route-coords interpolation refinement (#160). The modal currently
  // shows the snippet's hardcoded reference state for visual parity
  // with trail-snippet.html.

  // pan + zoom state
  let scale = $state(1);
  let tx = $state(0);
  let ty = $state(0);
  const MIN = 0.5;
  const MAX = 6;

  // refs
  let wrap: HTMLDivElement | undefined = $state();
  let stage: HTMLDivElement | undefined = $state();
  let dragging = $state(false);

  function fit() {
    if (!wrap || !stage) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;
    scale = 1;
    tx = 0;
    ty = 0;
  }

  const transform = $derived(`translate(${tx}px, ${ty}px) scale(${scale})`);
  const zoomReadout = $derived(`${Math.round(scale * 100)}%`);

  function clamp(v: number, mn: number, mx: number) {
    return Math.max(mn, Math.min(mx, v));
  }

  function zoomAt(factor: number, cx: number, cy: number) {
    const next = clamp(scale * factor, MIN, MAX);
    const k = next / scale;
    tx = cx - k * (cx - tx);
    ty = cy - k * (cy - ty);
    scale = next;
  }

  function onWheel(e: WheelEvent) {
    if (!wrap) return;
    e.preventDefault();
    const r = wrap.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    zoomAt(f, cx, cy);
  }

  // drag pan
  let sx = 0;
  let sy = 0;
  let stx = 0;
  let sty = 0;

  function onPointerDown(e: PointerEvent) {
    if (!wrap) return;
    dragging = true;
    sx = e.clientX;
    sy = e.clientY;
    stx = tx;
    sty = ty;
    wrap.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    tx = stx + (e.clientX - sx);
    ty = sty + (e.clientY - sy);
  }
  function onPointerUp() {
    dragging = false;
  }

  // keyboard
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    } else if ((e.key === '+' || e.key === '=') && wrap) {
      const r = wrap.getBoundingClientRect();
      zoomAt(1.25, r.width / 2, r.height / 2);
    } else if ((e.key === '-' || e.key === '_') && wrap) {
      const r = wrap.getBoundingClientRect();
      zoomAt(1 / 1.25, r.width / 2, r.height / 2);
    } else if (e.key === '0') {
      fit();
    }
  }

  function onZoomInBtn() {
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    zoomAt(1.3, r.width / 2, r.height / 2);
  }
  function onZoomOutBtn() {
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    zoomAt(1 / 1.3, r.width / 2, r.height / 2);
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  onMount(() => {
    requestAnimationFrame(fit);
    document.addEventListener('keydown', onKeydown);
    const handleResize = () => {
      // Keep transform in sync when viewport resizes; no need to refit.
    };
    window.addEventListener('resize', handleResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = prevOverflow;
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="map-modal" role="dialog" aria-modal="true" aria-label="Full trail map" tabindex="-1" onclick={onBackdropClick}>
  <div class="modal-shell">
    <div class="modal-titlebar">
      <span class="title">◆ THE OREGON TRAIL · INDEPENDENCE MO → OREGON CITY OR · 2,170 mi</span>
      <button class="modal-close" onclick={() => onClose?.()}>{ICON.status.close} Close</button>
    </div>

    <div class="modal-body">
      <div class="zoom-ctrls" role="group" aria-label="Zoom">
        <button onclick={onZoomInBtn} aria-label="Zoom in">+</button>
        <button onclick={fit} aria-label="Reset zoom" title="Fit to view" style="font-size:11px">⌂</button>
        <button onclick={onZoomOutBtn} aria-label="Zoom out">−</button>
      </div>
      <div class="zoom-readout">{zoomReadout}</div>
      <div class="pan-hint">drag to pan · scroll or +/− to zoom</div>

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="modal-map-wrap"
           role="application"
           aria-label="Map pan and zoom area"
           class:dragging
           bind:this={wrap}
           onwheel={onWheel}
           onpointerdown={onPointerDown}
           onpointermove={onPointerMove}
           onpointerup={onPointerUp}
           onpointercancel={onPointerUp}>
        <div class="modal-map-stage" bind:this={stage} style="transform: {transform};">
          <div class="trailmap-host">
            <ParchmentBg bare>
              <svg viewBox="0 0 1000 380" preserveAspectRatio="xMidYMid meet" class="modal-svg">
                <defs>
                  <linearGradient id="trail-river-f" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#6a98c4" />
                    <stop offset="1" stop-color="#2f5a8a" />
                  </linearGradient>
                  <pattern id="hatch-mountain-f" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#5a3a1a" stroke-width="0.5" />
                  </pattern>
                </defs>

                <!-- territories -->
                <g stroke="#8a5a2a" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="4 3">
                  <path d="M40 50 L260 60 L290 180 L80 200 Z" />
                  <path d="M260 60 L370 90 L390 220 L290 180 Z" />
                  <path d="M370 90 L520 110 L530 280 L390 220 Z" />
                  <path d="M520 110 L820 150 L820 320 L530 280 Z" />
                  <path d="M820 150 L970 170 L970 340 L820 320 Z" />
                </g>
                <text x="120" y="115" class="state-label" style="font-size:8.5px">OREGON COUNTRY</text>
                <text x="295" y="135" class="state-label" style="font-size:8.5px">IDAHO</text>
                <text x="430" y="170" class="state-label" style="font-size:8.5px">WYOMING</text>
                <text x="650" y="195" class="state-label" style="font-size:8.5px">NEBRASKA TERR.</text>
                <text x="855" y="220" class="state-label" style="font-size:8.5px">MO.</text>

                <!-- mountains -->
                <g stroke="#5a3a1a" stroke-width="1" fill="url(#hatch-mountain-f)" opacity="0.85">
                  <path d="M380 195 l8 -16 l8 16 z" />
                  <path d="M395 200 l10 -22 l10 22 z" />
                  <path d="M413 198 l9 -19 l9 19 z" />
                  <path d="M430 205 l8 -15 l8 15 z" />
                  <path d="M340 235 l7 -13 l7 13 z" />
                  <path d="M355 240 l8 -16 l8 16 z" />
                  <path d="M180 145 l7 -13 l7 13 z" />
                  <path d="M195 150 l8 -15 l8 15 z" />
                  <path d="M210 152 l7 -14 l7 14 z" />
                  <path d="M85 110 l8 -16 l8 16 z" />
                  <path d="M100 115 l9 -18 l9 18 z" />
                  <path d="M115 118 l7 -14 l7 14 z" />
                </g>
                <text x="395" y="172" class="state-label" style="opacity:0.8;font-size:9px;letter-spacing:0.15em">ROCKY MTNS</text>
                <text x="180" y="125" class="state-label" style="opacity:0.8;font-size:8px;letter-spacing:0.12em">BLUE MTNS</text>
                <text x="80"  y="92"  class="state-label" style="opacity:0.8;font-size:8px;letter-spacing:0.12em">CASCADES</text>

                <!-- rivers -->
                <g fill="none" stroke="url(#trail-river-f)" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
                  <path d="M30 95 Q60 105 95 115 Q140 125 175 130" stroke-width="3.5" />
                  <path d="M175 130 Q220 145 265 155 Q310 168 340 165 Q365 162 380 175" stroke-width="3" />
                  <path d="M395 215 Q435 218 470 215 Q495 213 520 220" stroke-width="2.2" />
                  <path d="M520 220 Q560 230 600 240 Q640 248 680 258" stroke-width="2.6" />
                  <path d="M680 258 Q720 263 760 270 Q800 275 840 285" stroke-width="3" />
                  <path d="M905 80 Q920 160 925 240 Q930 320 920 360" stroke-width="3.5" />
                  <path d="M840 285 Q870 295 905 305" stroke-width="2" />
                </g>
                <text x="60"  y="108" class="lmk-label-italic" style="font-size:9px" transform="rotate(-8 60 108)">Columbia R.</text>
                <text x="220" y="148" class="lmk-label-italic" style="font-size:9px" transform="rotate(-4 220 148)">Snake R.</text>
                <text x="430" y="208" class="lmk-label-italic" style="font-size:9px">Sweetwater R.</text>
                <text x="610" y="252" class="lmk-label-italic" style="font-size:9px" transform="rotate(6 610 252)">N. Platte R.</text>
                <text x="730" y="280" class="lmk-label-italic" style="font-size:9px">Platte R.</text>
                <text x="912" y="200" class="lmk-label-italic" style="font-size:9px" transform="rotate(-90 912 200)">Missouri R.</text>

                <!-- TRAVELED -->
                <path d="M 920 305 Q 870 295 830 290 Q 790 280 760 273 L 740 268 L 700 260"
                      fill="none" stroke="#c96a2a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 920 305 Q 870 295 830 290 Q 790 280 760 273 L 740 268 L 700 260"
                      fill="none" stroke="#c96a2a" stroke-width="7" stroke-linecap="round" opacity="0.18" />

                <!-- REMAINING -->
                <path d="M 700 260 Q 660 252 625 248 Q 605 244 580 240 Q 555 236 530 232 Q 500 228 475 222 Q 445 218 415 215 Q 400 212 405 200 Q 425 175 405 158 Q 380 150 350 158 Q 320 165 290 162 Q 260 158 230 145 Q 200 138 175 130 Q 145 125 115 115 Q 95 102 75 80"
                      fill="none" stroke="#5a3a1a" stroke-width="2.2" stroke-linecap="round"
                      stroke-dasharray="6 5" opacity="0.85" />

                <!-- LANDMARKS east → west -->
                <g transform="translate(920,305)">
                  <!-- Pin only — snippet places labels below the pin, not above,
                       so we emit the text directly here. -->
                  <LandmarkPin kind="start" />
                  <text x="-8" y="18" text-anchor="end" class="lmk-label" style="font-size:9px">INDEPENDENCE, MO</text>
                  <text x="-8" y="29" text-anchor="end" class="lmk-label-italic" style="font-size:8px;fill:#8a5a2a">jumping-off · day 1</text>
                </g>
                <g transform="translate(760,273)">
                  <LandmarkPin kind="fort" />
                  <text x="0" y="-10" text-anchor="middle" class="lmk-label" style="font-size:9px">FT. KEARNY</text>
                  <text x="0" y="20" text-anchor="middle" class="lmk-label-italic" style="font-size:8px;fill:#6a4a1a">passed · day 32</text>
                </g>
                <g transform="translate(700,260)">
                  <WagonGlyph size="sm">
                    <text x="0" y="-15" text-anchor="middle" class="lmk-label" style="fill:#8a3a1a;font-size:10px">YOU ARE HERE</text>
                  </WagonGlyph>
                </g>
                <g transform="translate(625,248)">
                  <LandmarkPin kind="landmark" />
                  <text x="0" y="-12" text-anchor="middle" class="lmk-label" style="font-size:9px">COURTHOUSE</text>
                </g>
                <g transform="translate(605,244)">
                  <!-- Chimney rock unique two-piece body -->
                  <path d="M-4 0 L-2 -3 L2 -3 L4 0 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width="0.9" />
                  <path d="M-1.2 -3 L-0.6 -11 L0.6 -11 L1.2 -3 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width="0.9" />
                  <text x="0" y="-15" text-anchor="middle" class="lmk-label" style="font-size:9px">CHIMNEY ROCK</text>
                </g>
                <g transform="translate(565,234)">
                  <LandmarkPin kind="fort" />
                  <text x="0" y="-10" text-anchor="middle" class="lmk-label" style="font-size:9px">FT. LARAMIE</text>
                  <text x="0" y="20" text-anchor="middle" class="lmk-label-italic" style="font-size:8px;fill:#6a4a1a">resupply · trade</text>
                </g>
                <g transform="translate(470,215)">
                  <ellipse cx="0" cy="0" rx="6" ry="3" fill="#c9b89a" stroke="#3a1a08" stroke-width="1.2" />
                  <text x="0" y="-7" text-anchor="middle" class="lmk-label" style="font-size:9px">INDEPENDENCE ROCK</text>
                </g>
                <g transform="translate(405,200)">
                  <path d="M-8 4 L-4 -3 L0 4 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width="1" />
                  <path d="M0 4 L4 -3 L8 4 Z"  fill="#c9b89a" stroke="#3a1a08" stroke-width="1" />
                  <text x="0" y="-7"  text-anchor="middle" class="lmk-label" style="font-size:9px">SOUTH PASS</text>
                  <text x="0" y="16" text-anchor="middle" class="lmk-label-italic" style="font-size:8px;fill:#6a4a1a">7,412 ft · cont. divide</text>
                </g>
                <g transform="translate(290,162)">
                  <LandmarkPin kind="fort" />
                  <text x="0" y="-10" text-anchor="middle" class="lmk-label" style="font-size:9px">FT. HALL</text>
                </g>
                <g transform="translate(190,140)">
                  <LandmarkPin kind="fort" />
                  <text x="0" y="-10" text-anchor="middle" class="lmk-label" style="font-size:9px">FT. BOISE</text>
                </g>
                <g transform="translate(115,115)">
                  <ellipse cx="0" cy="0" rx="4" ry="2" fill="#c9b89a" stroke="#3a1a08" stroke-width="1" />
                  <text x="0" y="-6" text-anchor="middle" class="lmk-label" style="font-size:9px">THE DALLES</text>
                </g>
                <g transform="translate(75,80)">
                  <LandmarkPin kind="end" />
                  <text x="0" y="-13" text-anchor="middle" class="lmk-label" style="font-size:11px;letter-spacing:0.15em">OREGON CITY</text>
                  <text x="0" y="22" text-anchor="middle" class="lmk-label-italic" style="font-size:9px">end of trail</text>
                </g>

                <!-- scale -->
                <g transform="translate(840,355)">
                  <line x1="0" y1="0" x2="120" y2="0" stroke="#3a1a08" stroke-width="1.6" />
                  <line x1="0" y1="-3" x2="0" y2="3" stroke="#3a1a08" stroke-width="1.6" />
                  <line x1="60" y1="-2" x2="60" y2="2" stroke="#3a1a08" stroke-width="1" />
                  <line x1="120" y1="-3" x2="120" y2="3" stroke="#3a1a08" stroke-width="1.6" />
                  <text x="60" y="-6" text-anchor="middle"
                        font-family="Special Elite, monospace" font-size="9" fill="#3a1a08" letter-spacing="0.05em">~ 200 MILES</text>
                </g>

                <!-- pacific -->
                <g transform="translate(40,335)" opacity="0.6">
                  <text x="0" y="0" font-family="Georgia, serif" font-style="italic" font-size="9" fill="#5a3a1a">Pacific Ocean</text>
                  <path d="M0 4 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="#2f5a8a" stroke-width="0.6" fill="none" />
                  <path d="M0 9 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="#2f5a8a" stroke-width="0.5" fill="none" opacity="0.7" />
                </g>
              </svg>
            </ParchmentBg>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .map-modal {
    position: fixed;
    inset: 0;
    background: rgba(26, 15, 8, 0.85);
    z-index: 9999;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding: 24px;
  }
  .modal-shell {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #1a0f08;
    border: 2px solid #c96a2a;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }
  .modal-titlebar {
    background: #1a0f08;
    color: #f5e6c8;
    border-bottom: 1px solid #5a3a1a;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Special Elite', monospace;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .modal-titlebar .title { color: #c96a2a; }
  .modal-close {
    background: transparent;
    color: #f5e6c8;
    border: 1px solid #c96a2a;
    padding: 4px 10px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
  }
  .modal-close:hover { background: #c96a2a; color: #1a0f08; }
  .modal-body {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #2a1a0c;
  }
  .modal-map-wrap {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    cursor: grab;
  }
  .modal-map-wrap.dragging { cursor: grabbing; }
  .modal-map-stage {
    position: absolute;
    inset: 0;
    transform-origin: 0 0;
    transition: transform 0.25s ease;
  }
  .modal-map-stage:active { transition: none; }
  .trailmap-host {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }
  .modal-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .zoom-ctrls {
    position: absolute;
    right: 14px;
    top: 14px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(26, 15, 8, 0.9);
    border: 1px solid #c96a2a;
    border-radius: 2px;
    overflow: hidden;
  }
  .zoom-ctrls button {
    background: transparent;
    color: #f5e6c8;
    border: none;
    border-bottom: 1px solid rgba(201, 106, 42, 0.4);
    width: 36px;
    height: 36px;
    font-family: 'Special Elite', monospace;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .zoom-ctrls button:last-child { border-bottom: none; }
  .zoom-ctrls button:hover { background: #c96a2a; color: #1a0f08; }
  .zoom-readout {
    position: absolute;
    right: 14px;
    top: 130px;
    z-index: 20;
    background: rgba(26, 15, 8, 0.9);
    color: #e8c89a;
    border: 1px solid #c96a2a;
    border-radius: 2px;
    padding: 4px 8px;
    font-family: 'Special Elite', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
  }
  .pan-hint {
    position: absolute;
    left: 14px;
    bottom: 14px;
    z-index: 20;
    background: rgba(26, 15, 8, 0.85);
    color: #e8c89a;
    border: 1px solid #5a3a1a;
    padding: 4px 9px;
    border-radius: 2px;
    font-family: 'Special Elite', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    pointer-events: none;
  }

  /* Reuse the same in-map text styles. */
  :global(.lmk-label-italic) {
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-size: 11px;
    fill: #2f5a8a;
  }
  :global(.lmk-label) {
    font-family: 'Special Elite', 'Courier New', monospace;
    font-size: 10.5px;
    fill: #3a1a08;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  :global(.state-label) {
    font-family: Georgia, serif;
    font-size: 10px;
    fill: #8a5a2a;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    opacity: 0.65;
  }
</style>
