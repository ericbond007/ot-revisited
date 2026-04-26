<script lang="ts">
  // Trail-map snippet: a parchment-strip dashboard showing the wagon's
  // current 350-mi window. HUD chrome over an SVG painting with
  // hand-positioned terrain texture, two rivers, and the trail curve.
  //
  // This is the primary trail map in /play. Click anywhere (or hit
  // Enter/Space) to open the fullscreen pan-zoom modal with the full
  // 2,170-mi trail.
  //
  // Visual revisit pass tracked separately (#160) — current numbers
  // are lifted verbatim from docs/handoff/trail-map/src/trail-snippet.html.

  import type { Landmark } from '$lib/game/content/landmarks';
  import { LANDMARKS } from '$lib/game/content/landmarks';
  import {
    accumulateMiles,
    currentLeg,
    legOrdinal,
    milesToNext,
    milesToNextOfKind,
    type MarkedLandmark
  } from './trail-map-helpers';
  import ParchmentBg from './trail-map-svg/ParchmentBg.svelte';
  import Compass from './trail-map-svg/Compass.svelte';
  import LandmarkPin from './trail-map-svg/LandmarkPin.svelte';
  import WagonGlyph from './trail-map-svg/WagonGlyph.svelte';

  interface Props {
    /** Cumulative miles traveled by the wagon. */
    currentMileage: number;
    /** Current game day. */
    day: number;
    /** Override the LANDMARKS array (mostly for tests). */
    landmarks?: readonly Landmark[];
    /** Open-modal callback. */
    onExpand?: () => void;
  }

  let { currentMileage, day, landmarks = LANDMARKS, onExpand }: Props = $props();

  const marked = $derived(accumulateMiles(landmarks));
  const leg = $derived(currentLeg(marked, currentMileage));
  const ordinal = $derived(legOrdinal(marked, currentMileage));
  const next = $derived(milesToNext(marked, currentMileage));
  const nextFort = $derived(milesToNextOfKind(marked, currentMileage, 'trading_post'));

  // HUD strings.
  const fromTo = $derived(
    leg.last && leg.next
      ? `${leg.last.name.toUpperCase()} → ${leg.next.name.toUpperCase()}`
      : leg.last
        ? `${leg.last.name.toUpperCase()} → END`
        : 'INDEPENDENCE → KANSAS RIVER'
  );
  const subText = $derived(`Leg ${ordinal.current} of ${ordinal.total} · day ${day}`);
  const nextLabel = $derived(next ? `${next.miles} mi · ${next.name}` : "TRAIL'S END");
  const nextSub = $derived(nextFort ? `${nextFort.name} in ${nextFort.miles} mi` : 'no fort ahead');

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
    <!-- HUD: leg name -->
    <div class="hud hud-left">
      <span class="hud-label">From → To</span>
      <span class="hud-big">{fromTo}</span>
      <span class="hud-sub">{subText}</span>
    </div>

    <!-- HUD: miles remaining -->
    <div class="hud hud-right">
      <span class="hud-label">Next landmark</span>
      <span class="hud-big">{nextLabel}</span>
      <span class="hud-sub">{nextSub}</span>
    </div>

    <!-- compass -->
    <div class="compass-host">
      <Compass />
    </div>

    <!-- map SVG (350-mi window centered on the snippet's hardcoded
         Ft. Kearny → Ft. Laramie leg; the wagon glyph itself sits at
         the snippet's reference (700, 270) for visual parity with
         trail-snippet.html until the route-coords interpolation
         lookup is built out per landmark). -->
    <svg viewBox="480 130 420 270" preserveAspectRatio="xMidYMid meet" class="map-svg">
      <defs>
        <linearGradient id="trail-river-z" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6a98c4" />
          <stop offset="1" stop-color="#2f5a8a" />
        </linearGradient>
      </defs>

      <!-- territory hint -->
      <text x="640" y="360" class="state-label">NEBRASKA TERRITORY</text>
      <text x="500" y="360" class="state-label" style="font-size:9px">WYO.</text>

      <!-- (1) prairie stipple -->
      <g fill="#8a6a3a" opacity="0.32">
        <circle cx="492" cy="152" r="0.45"/><circle cx="518" cy="160" r="0.4"/><circle cx="542" cy="148" r="0.5"/><circle cx="568" cy="166" r="0.4"/><circle cx="594" cy="154" r="0.45"/><circle cx="620" cy="170" r="0.4"/><circle cx="648" cy="158" r="0.5"/><circle cx="676" cy="166" r="0.4"/><circle cx="702" cy="154" r="0.45"/><circle cx="728" cy="170" r="0.4"/><circle cx="754" cy="160" r="0.5"/><circle cx="782" cy="168" r="0.4"/><circle cx="808" cy="154" r="0.45"/><circle cx="834" cy="166" r="0.4"/><circle cx="862" cy="160" r="0.5"/><circle cx="886" cy="168" r="0.4"/>
        <circle cx="500" cy="180" r="0.5"/><circle cx="528" cy="188" r="0.4"/><circle cx="556" cy="178" r="0.45"/><circle cx="584" cy="186" r="0.4"/><circle cx="612" cy="180" r="0.5"/><circle cx="640" cy="188" r="0.4"/><circle cx="668" cy="176" r="0.45"/><circle cx="696" cy="190" r="0.4"/><circle cx="724" cy="178" r="0.5"/><circle cx="752" cy="188" r="0.4"/><circle cx="780" cy="180" r="0.45"/><circle cx="808" cy="190" r="0.4"/><circle cx="836" cy="178" r="0.5"/><circle cx="864" cy="188" r="0.4"/><circle cx="890" cy="180" r="0.45"/>
        <circle cx="486" cy="205" r="0.4"/><circle cx="514" cy="212" r="0.5"/><circle cx="552" cy="260" r="0.4"/><circle cx="618" cy="272" r="0.45"/><circle cx="690" cy="288" r="0.4"/><circle cx="752" cy="302" r="0.5"/><circle cx="824" cy="308" r="0.4"/><circle cx="878" cy="312" r="0.45"/>
        <circle cx="500" cy="340" r="0.4"/><circle cx="540" cy="352" r="0.5"/><circle cx="580" cy="346" r="0.4"/><circle cx="622" cy="358" r="0.45"/><circle cx="668" cy="350" r="0.4"/><circle cx="712" cy="362" r="0.5"/><circle cx="758" cy="354" r="0.4"/><circle cx="802" cy="366" r="0.45"/><circle cx="848" cy="358" r="0.4"/><circle cx="888" cy="364" r="0.5"/>
        <circle cx="504" cy="380" r="0.4"/><circle cx="548" cy="388" r="0.45"/><circle cx="592" cy="382" r="0.4"/><circle cx="636" cy="390" r="0.5"/><circle cx="680" cy="384" r="0.4"/><circle cx="724" cy="392" r="0.45"/><circle cx="768" cy="386" r="0.4"/><circle cx="812" cy="394" r="0.5"/><circle cx="856" cy="388" r="0.4"/><circle cx="894" cy="394" r="0.45"/>
      </g>

      <!-- (2) prairie tufts -->
      <g fill="none" stroke="#7a5a2a" stroke-width="0.5" opacity="0.42" stroke-linecap="round">
        <path d="M488 145 q1 -2 2 0 M508 152 q1 -2 2 0 M530 148 q1 -2 2 0 M556 156 q1 -2 2 0 M580 150 q1 -2 2 0 M606 158 q1 -2 2 0 M632 152 q1 -2 2 0 M656 158 q1 -2 2 0 M682 150 q1 -2 2 0 M708 158 q1 -2 2 0 M732 152 q1 -2 2 0 M758 158 q1 -2 2 0 M784 152 q1 -2 2 0 M812 158 q1 -2 2 0 M838 150 q1 -2 2 0 M864 158 q1 -2 2 0 M888 152 q1 -2 2 0"/>
        <path d="M500 175 q1 -2 2 0 M524 182 q1 -2 2 0 M548 178 q1 -2 2 0 M574 184 q1 -2 2 0 M598 178 q1 -2 2 0 M624 184 q1 -2 2 0 M648 178 q1 -2 2 0 M672 184 q1 -2 2 0 M696 178 q1 -2 2 0 M720 184 q1 -2 2 0 M744 178 q1 -2 2 0 M768 184 q1 -2 2 0 M792 178 q1 -2 2 0 M816 184 q1 -2 2 0 M840 178 q1 -2 2 0 M864 184 q1 -2 2 0 M888 178 q1 -2 2 0"/>
        <path d="M488 200 q1 -2 2 0 M510 206 q1 -2 2 0 M532 202 q1 -2 2 0 M554 208 q1 -2 2 0 M580 204 q1 -2 2 0 M620 212 q1 -2 2 0 M664 218 q1 -2 2 0 M708 222 q1 -2 2 0 M752 226 q1 -2 2 0 M796 224 q1 -2 2 0 M838 220 q1 -2 2 0 M876 224 q1 -2 2 0"/>
        <path d="M492 340 q1 -2 2 0 M518 348 q1 -2 2 0 M544 342 q1 -2 2 0 M572 350 q1 -2 2 0 M598 344 q1 -2 2 0 M626 352 q1 -2 2 0 M654 344 q1 -2 2 0 M682 352 q1 -2 2 0 M708 346 q1 -2 2 0 M736 354 q1 -2 2 0 M762 348 q1 -2 2 0 M790 354 q1 -2 2 0 M816 348 q1 -2 2 0 M842 356 q1 -2 2 0 M870 348 q1 -2 2 0 M894 356 q1 -2 2 0"/>
        <path d="M492 372 q1 -2 2 0 M520 380 q1 -2 2 0 M548 374 q1 -2 2 0 M578 382 q1 -2 2 0 M608 376 q1 -2 2 0 M638 384 q1 -2 2 0 M668 376 q1 -2 2 0 M698 384 q1 -2 2 0 M728 378 q1 -2 2 0 M758 384 q1 -2 2 0 M788 378 q1 -2 2 0 M818 386 q1 -2 2 0 M848 380 q1 -2 2 0 M878 386 q1 -2 2 0"/>
      </g>

      <!-- (3) low ridge-ticks -->
      <g fill="none" stroke="#5a3a1a" stroke-width="0.5" opacity="0.45" stroke-linecap="round">
        <path d="M495 168 q4 -4 8 0 M508 162 q3 -3 6 0 M522 170 q4 -4 8 0 M548 165 q4 -4 8 0 M564 170 q3 -3 6 0 M598 165 q5 -5 10 0 M615 170 q4 -4 8 0 M632 168 q5 -5 10 0 M656 175 q4 -4 8 0 M675 178 q3 -3 6 0 M696 175 q5 -5 10 0 M716 180 q4 -4 8 0 M738 178 q5 -5 10 0 M760 182 q4 -4 8 0 M782 180 q5 -5 10 0 M806 184 q4 -4 8 0 M828 182 q5 -5 10 0 M852 186 q4 -4 8 0"/>
        <path d="M572 220 q4 -4 8 0 M584 218 q3 -3 6 0 M598 222 q5 -5 10 0 M614 220 q4 -4 8 0 M628 224 q5 -5 10 0 M644 222 q4 -4 8 0 M580 232 q3 -3 6 0 M598 234 q3 -3 6 0 M618 232 q3 -3 6 0 M638 234 q3 -3 6 0"/>
        <path d="M482 195 q5 -6 10 0 M495 200 q4 -5 8 0 M510 198 q5 -6 10 0 M525 202 q4 -5 8 0 M540 200 q5 -6 10 0 M486 215 q4 -5 8 0 M500 218 q4 -5 8 0 M516 215 q4 -5 8 0 M532 220 q4 -5 8 0 M548 218 q4 -5 8 0 M488 232 q3 -4 6 0 M504 235 q3 -4 6 0 M520 232 q3 -4 6 0 M538 236 q3 -4 6 0 M555 234 q3 -4 6 0"/>
      </g>

      <!-- (4) caret-peaks -->
      <g fill="#c9b89a" fill-opacity="0.35" stroke="#5a3a1a" stroke-width="0.6" stroke-linejoin="round" opacity="0.85">
        <path d="M488 188 l4 -8 l4 8 z"/>
        <path d="M502 184 l5 -10 l5 10 z"/>
        <path d="M518 188 l4 -8 l4 8 z"/>
        <path d="M534 184 l5 -10 l5 10 z"/>
        <path d="M548 190 l4 -8 l4 8 z"/>
        <path d="M564 215 l4 -8 l4 8 z"/>
        <path d="M610 213 l4 -8 l4 8 z"/>
        <path d="M644 218 l3 -6 l3 6 z"/>
        <path d="M712 200 l3 -6 l3 6 z" opacity="0.6"/>
        <path d="M788 196 l3 -6 l3 6 z" opacity="0.6"/>
        <path d="M832 198 l3 -6 l3 6 z" opacity="0.6"/>
      </g>

      <!-- (5) sand-dune curves -->
      <g fill="none" stroke="#a87040" stroke-width="0.55" opacity="0.5" stroke-linecap="round">
        <path d="M552 195 q5 -6 10 0"/>
        <path d="M580 200 q4 -5 8 0"/>
        <path d="M664 195 q6 -7 12 0 t12 0"/>
        <path d="M688 205 q5 -6 10 0 t10 0"/>
        <path d="M716 198 q6 -7 12 0 t12 0"/>
        <path d="M744 208 q5 -6 10 0 t10 0"/>
        <path d="M772 200 q6 -7 12 0 t12 0"/>
        <path d="M800 210 q5 -6 10 0 t10 0"/>
        <path d="M676 218 q5 -6 10 0"/>
        <path d="M708 220 q5 -6 10 0"/>
        <path d="M744 222 q5 -6 10 0"/>
        <path d="M780 222 q5 -6 10 0"/>
        <path d="M832 210 q5 -6 10 0"/>
        <path d="M866 215 q4 -5 8 0"/>
      </g>

      <!-- (6) cottonwood / scrub -->
      <g stroke="#5a3a1a" stroke-width="0.55" fill="none" opacity="0.55" stroke-linecap="round">
        <path d="M548 318 v-3 m-1.5 1 l1.5 -1.5 l1.5 1.5"/>
        <path d="M612 320 v-3 m-1.5 1 l1.5 -1.5 l1.5 1.5"/>
        <path d="M672 320 v-3 m-1.5 1 l1.5 -1.5 l1.5 1.5"/>
        <path d="M738 326 v-3 m-1.5 1 l1.5 -1.5 l1.5 1.5"/>
        <path d="M810 332 v-3 m-1.5 1 l1.5 -1.5 l1.5 1.5"/>
        <path d="M860 332 v-3 m-1.5 1 l1.5 -1.5 l1.5 1.5"/>
        <path d="M520 255 q1.5 -1.8 3 0 M566 262 q1.5 -1.8 3 0 M656 280 q1.5 -1.8 3 0 M724 290 q1.5 -1.8 3 0 M810 296 q1.5 -1.8 3 0 M860 296 q1.5 -1.8 3 0"/>
        <path d="M484 248 q1.5 -1.8 3 0 M540 240 q1.5 -1.8 3 0 M608 250 q1.5 -1.8 3 0 M698 250 q1.5 -1.8 3 0 M770 256 q1.5 -1.8 3 0 M820 252 q1.5 -1.8 3 0"/>
      </g>

      <!-- rivers (Platte + N. Platte) -->
      <g fill="none" stroke="url(#trail-river-z)" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
        <path d="M510 320 q20 -8 42 -2 q22 6 44 -2 q22 -8 46 4 q22 12 42 -2" stroke-width="3.4" />
        <path d="M684 318 q22 8 46 6 q24 -2 48 4 q24 6 48 0 q24 -6 44 4" stroke-width="3.8" />
      </g>
      <text x="555" y="312" class="lmk-label-italic" transform="rotate(-3 555 312)">N. Platte R.</text>
      <text x="760" y="332" class="lmk-label-italic">Platte R.</text>

      <!-- trail curve -->
      <defs>
        <path id="trail-curve-z" fill="none"
              d="M 880 290
                 C 845 286, 815 276, 785 280
                 S 740 282, 700 270
                 S 660 256, 630 252
                 S 605 244, 588 245
                 S 555 230, 520 215" />
      </defs>
      <use href="#trail-curve-z" stroke="#c96a2a" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.10" />
      <use href="#trail-curve-z" stroke="#c96a2a" stroke-width="3.6" stroke-linecap="round" fill="none" />
      <!-- dashed remaining -->
      <path d="M 700 270
               C 670 258, 650 252, 630 252
               S 605 244, 588 245
               S 555 230, 520 215"
            fill="none" stroke="#5a3a1a" stroke-width="2.6" stroke-linecap="round"
            stroke-dasharray="6 5" />

      <!-- landmarks -->
      <g transform="translate(770,282)">
        <LandmarkPin kind="fort" label="FT. KEARNY" subLabel="passed · day 32"
                     leaderTo={-52} subLabelColor="#6a4a1a" labelSize={10.5} />
      </g>
      <g transform="translate(700,270)">
        <WagonGlyph size="lg" />
      </g>
      <g transform="translate(630,252)">
        <LandmarkPin kind="landmark" label="COURTHOUSE ROCK" subLabel="~ 130 mi"
                     leaderTo={-38} />
      </g>
      <g transform="translate(588,245)">
        <!-- Chimney rock has a unique two-piece body; use raw paths -->
        <path d="M-5 0 L-2.5 -4 L2.5 -4 L5 0 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width="1.1" />
        <path d="M-1.5 -4 L-0.7 -16 L0.7 -16 L1.5 -4 Z" fill="#c9b89a" stroke="#3a1a08" stroke-width="1.1" />
        <path d="M0 -17 Q -8 -50 -22 -82" stroke="#3a1a08" stroke-width="0.7" fill="none" opacity="0.6" />
        <circle cx="-22" cy="-82" r="1.2" fill="#3a1a08" opacity="0.7" />
        <text x="-22" y="-88" text-anchor="middle" class="lmk-label">CHIMNEY ROCK</text>
        <text x="-22" y="-100" text-anchor="middle" class="lmk-label-italic" style="font-size:10px;fill:#6a4a1a">~ 165 mi</text>
      </g>
      <g transform="translate(520,215)">
        <LandmarkPin kind="fort" label="FT. LARAMIE" subLabel="~ 237 mi · resupply"
                     leaderTo={-32} labelSize={11} />
      </g>
    </svg>

    <!-- scale + legend + expand button -->
    <div class="scale-badge"><span class="bar"></span> ~ 75 MI</div>

    <div class="legend">
      <div><svg width="22" height="6"><line x1="1" y1="3" x2="21" y2="3" stroke="#c96a2a" stroke-width="3" stroke-linecap="round"/></svg> trail traveled</div>
      <div><svg width="22" height="6"><line x1="1" y1="3" x2="21" y2="3" stroke="#5a3a1a" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3"/></svg> trail ahead</div>
      <div><svg width="22" height="6"><path d="M1 3 q5 -2 10 0 t10 0" stroke="#2f5a8a" stroke-width="2" fill="none" stroke-linecap="round"/></svg> river</div>
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

  .hud {
    position: absolute;
    background: rgba(26, 15, 8, 0.86);
    color: #f5e6c8;
    border: 1px solid #c96a2a;
    padding: 6px 9px;
    border-radius: 2px;
    font-family: 'Special Elite', 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.35;
    backdrop-filter: blur(2px);
    z-index: 10;
    display: flex;
    flex-direction: column;
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
  .hud-left  { top: 10px; left: 10px; }
  .hud-right { top: 10px; right: 10px; text-align: right; align-items: flex-end; }

  .compass-host {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
  }

  .scale-badge {
    position: absolute;
    bottom: 10px;
    left: 10px;
    z-index: 10;
    background: rgba(232, 217, 184, 0.92);
    border: 1px solid #5a3a1a;
    padding: 4px 8px;
    border-radius: 2px;
    font-family: 'Special Elite', monospace;
    font-size: 9.5px;
    color: #3a1a08;
    letter-spacing: 0.08em;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .scale-badge .bar {
    display: inline-block;
    width: 60px;
    height: 6px;
    border-left: 1.5px solid #3a1a08;
    border-right: 1.5px solid #3a1a08;
    border-bottom: 1.5px solid #3a1a08;
  }

  .legend {
    position: absolute;
    left: 10px;
    bottom: 42px;
    z-index: 10;
    background: rgba(232, 217, 184, 0.92);
    border: 1px solid #5a3a1a;
    border-radius: 2px;
    padding: 6px 9px;
    font-family: 'Special Elite', monospace;
    font-size: 9.5px;
    color: #3a1a08;
    letter-spacing: 0.04em;
    line-height: 1.5;
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

  /* in-map text classes used by the inline SVG */
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
