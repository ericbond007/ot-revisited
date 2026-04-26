<script lang="ts">
  // Fullscreen pan/zoom modal — the whole 2,170-mi trail at once,
  // Independence MO → Oregon City. Drag to pan, wheel/+/− to zoom,
  // 0/home to fit, Esc/X to close.
  //
  // Trail painting is delegated to TrailMapPaint, which renders the
  // landmarks + data-driven traveled/ahead path + wagon glyph in the
  // shared 1000×380 coord-space.

  import { onMount } from 'svelte';
  import type { Landmark } from '$lib/game/content/landmarks';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  import ParchmentBg from './trail-map-svg/ParchmentBg.svelte';
  import TrailMapPaint from './trail-map-svg/TrailMapPaint.svelte';
  import { ICON } from '$lib/data/icon-dictionary';

  interface Props {
    landmarks?: readonly Landmark[];
    /** Cumulative miles — used by the wagon position. */
    currentMileage: number;
    onClose?: () => void;
  }

  let { landmarks = LANDMARKS, currentMileage, onClose }: Props = $props();

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
                <TrailMapPaint {landmarks} {currentMileage} wagonSize="sm" youAreHereLabel />
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
</style>
