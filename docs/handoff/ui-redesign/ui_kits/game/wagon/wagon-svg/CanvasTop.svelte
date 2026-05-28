<script lang="ts">
  // Wagon canvas top — drawn to match period prairie schooner photos
  // (Hansen replicas, Scotts Bluff, William Henry Jackson) with these
  // specific construction cues:
  //   * 6 hickory BOWS visible at the front and rear edges (the
  //     foremost + rearmost bows frame the openings); the middle bows
  //     are inside the canvas and visible only as subtle ridges
  //   * Canvas drawn TIGHT over the bows (small drape, not a loose
  //     tarp). Cotton duck weave texture via raster pattern fill.
  //   * Front opening (behind driver) — puckered drawstring hole with
  //     visible cord radiating from a dark interior
  //   * Rear opening — same construction, rearmost bow frames it
  //   * Grommet ROPE every ~16-20 inches along the bottom edge,
  //     attached to metal hooks on the sideboards (period method)
  //
  // damageLevel layers tears and patches on top (0 = pristine, 4 =
  // shredded). dirtyLevel washes the canvas darker.
  import {
    W_INK,
    W_WOOD_DARK,
    W_WOOD_LIGHT
  } from './wagon-tokens';

  interface Props {
    bedX: number;
    bedY: number;
    bedW: number;
    arch?: number;
    ribs?: number;
    overhang?: number;
    drape?: number;
    /** Extra middle-sag for Conestoga "boat" look. */
    slack?: number;
    damageLevel?: 0 | 1 | 2 | 3 | 4;
    dirtyLevel?: 0 | 1 | 2;
  }

  let {
    bedX,
    bedY,
    bedW,
    arch = 7,
    ribs = 6,
    overhang = 1.5,
    drape = 0.6,
    slack = 0,
    damageLevel = 0,
    dirtyLevel = 0
  }: Props = $props();

  const cx = $derived(bedX + bedW / 2);
  const topY = $derived(bedY - arch);

  // Canvas profile anchors. Tighter than v1 — drape default 0.6 (was 1.2)
  // makes the canvas hug the bows instead of sagging over them.
  const xL = $derived(bedX - overhang);
  const xR = $derived(bedX + bedW + overhang);
  const yBL = $derived(bedY + drape + slack * 0.2);
  const yBR = $derived(bedY + drape + slack * 0.2);
  const yMid = $derived(bedY + drape + slack);

  // Bow positions in x. Six bows evenly spaced from xL to xR.
  type BowEl = {
    x: number;
    topY: number;
    botY: number;
    arch: number;
    idx: number;
    isEnd: boolean; // first or last — visible at the canvas edge
  };
  const bowEls = $derived.by<BowEl[]>(() => {
    const out: BowEl[] = [];
    for (let i = 0; i < ribs; i++) {
      const t = i / (ribs - 1); // 0..1 across canvas span
      const x = xL + (xR - xL) * t;
      // Each bow's apex height — slightly lower at the very ends
      // (canvas cinches inward) so bows shape the puckered openings.
      const archScale = 0.78 + 0.22 * Math.sin(Math.PI * t);
      const bowTopY = topY + arch * (1 - archScale) * 0.5;
      const bowBotY = yMid;
      const isEnd = i === 0 || i === ribs - 1;
      out.push({ x, topY: bowTopY, botY: bowBotY, arch, idx: i, isEnd });
    }
    return out;
  });

  // Canvas envelope path — single arched profile, cinched slightly at
  // ends (the puckered front/rear openings are drawn separately on top).
  const pathD = $derived(
    `M${xL + 0.4} ${yBL}
     Q${xL - 0.2} ${topY + arch * 0.6} ${xL + (xR - xL) * 0.10} ${topY + arch * 0.18}
     Q${cx} ${topY - 0.4} ${xR - (xR - xL) * 0.10} ${topY + arch * 0.18}
     Q${xR + 0.2} ${topY + arch * 0.6} ${xR - 0.4} ${yBR}
     Q${cx} ${yMid + 0.1} ${xL + 0.4} ${yBL} Z`
  );

  // Front opening anchor (the wagon faces LEFT, so this is at xL side
  // of the canvas, behind the driver bench seat). The opening sits in
  // the cinched front pucker and reveals dark interior + drawstring.
  const frontX = $derived(xL + 0.6);
  const frontY = $derived(topY + arch * 0.55);
  const frontRX = 1.0;
  const frontRY = $derived(arch * 0.40);

  // Rear opening anchor — same construction at xR side.
  const rearX = $derived(xR - 0.6);
  const rearY = $derived(topY + arch * 0.55);
  const rearRX = 1.0;
  const rearRY = $derived(arch * 0.40);

  // Drawstring radial lines around each opening (the rope cinching
  // the canvas mouth tight).
  type Pucker = { x1: number; y1: number; x2: number; y2: number; idx: number };
  function puckerLines(centerX: number, centerY: number, rx: number, ry: number): Pucker[] {
    const out: Pucker[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const x1 = centerX + Math.cos(a) * rx * 0.95;
      const y1 = centerY + Math.sin(a) * ry * 0.95;
      const x2 = centerX + Math.cos(a) * (rx + 0.5);
      const y2 = centerY + Math.sin(a) * (ry + 0.6);
      out.push({ x1, y1, x2, y2, idx: i });
    }
    return out;
  }
  const frontPucker = $derived(puckerLines(frontX, frontY, frontRX, frontRY));
  const rearPucker = $derived(puckerLines(rearX, rearY, rearRX, rearRY));

  // Grommet rope tie-down points along the bottom edge — period
  // method: rope through grommets every ~16-20 inches, anchored to
  // iron hooks on the sideboards.
  type Tie = { tx: number; ty: number; idx: number };
  const tieEls = $derived.by<Tie[]>(() => {
    const out: Tie[] = [];
    const count = ribs + 2;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const tx = xL + 0.6 + (xR - xL - 1.2) * t;
      const ty = yBL + (yMid - yBL) * Math.sin(Math.PI * t);
      out.push({ tx, ty, idx: i });
    }
    return out;
  });
</script>

<g>
  <defs>
    <!-- Painterly canvas-weave texture; one tile = 6 SVG units. -->
    <pattern id="ct-canvas-weave" patternUnits="userSpaceOnUse"
             x="0" y="0" width="6" height="6">
      <image href="/wagon-bg/wagon-tex-flux/canvas-weave.png"
             x="0" y="0" width="6" height="6"
             preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <!-- Soften rib highlight strokes -->
    <filter id="ct-shadow-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.3" />
    </filter>
  </defs>

  <!-- 1. CANVAS BODY — opaque painterly weave. -->
  <path d={pathD} fill="url(#ct-canvas-weave)" stroke={W_INK}
        stroke-width="0.7" stroke-linejoin="round" />

  <!-- Optional dirt wash over canvas at higher dirty levels. -->
  {#if dirtyLevel >= 1}
    <path d={pathD} fill={dirtyLevel === 1 ? '#a89060' : '#6b5238'}
          opacity={dirtyLevel === 1 ? 0.32 : 0.5} />
  {/if}

  <!-- 2. BOW RIDGES — subtle highlights where each bow pushes the
       canvas up. The middle 4 bows are subtle bumps; the front and
       rear bows get heavier treatment in section 4 since they frame
       the openings. -->
  <g filter="url(#ct-shadow-blur)">
    {#each bowEls as b (b.idx)}
      {#if !b.isEnd}
        <!-- soft white kiss along the canvas where it stretches over
             this bow's apex -->
        <path d={`M${b.x - 0.45} ${b.topY + 0.05}
                  Q${b.x} ${b.topY - 0.18} ${b.x + 0.45} ${b.topY + 0.05}`}
              stroke="#ffffff" stroke-width="0.22" fill="none"
              opacity="0.32" stroke-linecap="round" />
      {/if}
    {/each}
  </g>

  <!-- 3. END-CAP SHADOWS — darker crescents where the canvas wraps
       around the front and rear cinches. Suggests depth past the
       puckered openings. -->
  <path d={`M${xL + 0.4} ${yBL}
            Q${xL + 0.0} ${topY + arch * 0.55} ${xL + (xR - xL) * 0.10} ${topY + arch * 0.18}`}
        stroke={W_WOOD_DARK} stroke-width="0.4" fill="none"
        opacity="0.5" stroke-linecap="round" />
  <path d={`M${xR - 0.4} ${yBR}
            Q${xR - 0.0} ${topY + arch * 0.55} ${xR - (xR - xL) * 0.10} ${topY + arch * 0.18}`}
        stroke={W_WOOD_DARK} stroke-width="0.4" fill="none"
        opacity="0.5" stroke-linecap="round" />

  <!-- 4. FRONT BOW SKELETON — visible at the very front edge where the
       canvas cinches around it. Period photos clearly show the
       foremost bow framing the opening. Drawn as a wood-colored arc
       extending from bed-side up over and back. -->
  {#each bowEls.filter((b) => b.isEnd) as b (b.idx)}
    <path d={`M${b.x - 0.05} ${b.botY}
              Q${b.x - 0.55} ${(b.topY + b.botY) / 2} ${b.x - 0.55} ${b.topY + 0.5}
              Q${b.x - 0.3} ${b.topY - 0.1} ${b.x + 0.05} ${b.topY - 0.05}`}
          stroke={W_WOOD_DARK} stroke-width="0.32" fill="none"
          stroke-linecap="round" opacity="0.7" />
    <!-- subtle highlight on the bow's near edge -->
    <path d={`M${b.x - 0.45} ${b.topY + 0.4}
              Q${b.x - 0.20} ${b.topY - 0.05} ${b.x + 0.0} ${b.topY - 0.02}`}
          stroke={W_WOOD_LIGHT} stroke-width="0.18" fill="none"
          stroke-linecap="round" opacity="0.55" />
  {/each}

  <!-- 5. FRONT OPENING — puckered cinched hole at the front (left) of
       the canvas, behind the driver. Dark interior visible through
       the hole; drawstring cords radiate from the rim. -->
  <ellipse cx={frontX} cy={frontY} rx={frontRX} ry={frontRY}
           fill={W_INK} opacity="0.85" />
  <ellipse cx={frontX} cy={frontY} rx={frontRX * 0.7} ry={frontRY * 0.7}
           fill="#0a0a0a" />
  <!-- drawstring radial lines (cord puckering the fabric) -->
  {#each frontPucker as p (p.idx)}
    <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
          stroke={W_WOOD_DARK} stroke-width="0.18"
          opacity="0.7" stroke-linecap="round" />
  {/each}
  <!-- drawstring cord ring around the opening -->
  <ellipse cx={frontX} cy={frontY} rx={frontRX + 0.25} ry={frontRY + 0.3}
           fill="none" stroke={W_WOOD_DARK} stroke-width="0.22"
           opacity="0.8" stroke-dasharray="0.4 0.25" />

  <!-- 6. REAR OPENING — same construction at the rear edge. -->
  <ellipse cx={rearX} cy={rearY} rx={rearRX} ry={rearRY}
           fill={W_INK} opacity="0.85" />
  <ellipse cx={rearX} cy={rearY} rx={rearRX * 0.7} ry={rearRY * 0.7}
           fill="#0a0a0a" />
  {#each rearPucker as p (p.idx)}
    <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
          stroke={W_WOOD_DARK} stroke-width="0.18"
          opacity="0.7" stroke-linecap="round" />
  {/each}
  <ellipse cx={rearX} cy={rearY} rx={rearRX + 0.25} ry={rearRY + 0.3}
           fill="none" stroke={W_WOOD_DARK} stroke-width="0.22"
           opacity="0.8" stroke-dasharray="0.4 0.25" />

  <!-- 7. GROMMET ROPE TIES — period method: rope through grommets
       every ~16-20 inches anchored to iron hooks on the sideboards.
       Rendered as small dark dots (the grommets themselves) with
       short stub strokes (the rope tying down to the hook). -->
  {#each tieEls as t (t.idx)}
    <circle cx={t.tx} cy={t.ty + 0.08} r="0.16"
            fill={W_INK} opacity="0.78" />
    <line x1={t.tx} y1={t.ty + 0.16} x2={t.tx} y2={t.ty + 0.55}
          stroke={W_WOOD_DARK} stroke-width="0.16" opacity="0.7" />
  {/each}

  <!-- 8. DAMAGE — tears + patches. Layered cumulatively. -->
  {#if damageLevel >= 1}
    <path d={`M${cx + 1} ${topY + arch * 0.45} l3.5 -0.4 l0.4 2.6 l-3.7 0.5 z`}
          fill="#a89060" stroke={W_INK} stroke-width="0.25" opacity="0.85" />
    <path d={`M${cx + 1} ${topY + arch * 0.45} l3.5 -0.4 l0.4 2.6 l-3.7 0.5 z`}
          fill="none" stroke={W_INK} stroke-width="0.18"
          opacity="0.7" stroke-dasharray="0.25 0.3" />
  {/if}
  {#if damageLevel >= 2}
    <path d={`M${cx - 4} ${topY + arch * 0.25} l2.5 0.8 l-0.7 2.8 z`}
          fill={W_INK} opacity="0.88" />
    <path d={`M${cx - 4} ${topY + arch * 0.25} l2.5 0.8 l-0.7 2.8`}
          stroke="#f5e6c8" stroke-width="0.25" fill="none" />
  {/if}
  {#if damageLevel >= 3}
    <path d={`M${xR - 4} ${topY + arch * 0.35} l-1.8 1.6 l2.5 1.7 l0.8 -2.5 z`}
          fill={W_INK} opacity="0.9" />
    <path d={`M${xR - 3.5} ${topY + arch * 0.5} Q${xR - 3.6} ${(topY + bedY) / 2} ${xR - 3.6} ${bedY}`}
          stroke={W_WOOD_LIGHT} stroke-width="0.5" fill="none" />
  {/if}
  {#if damageLevel >= 4}
    <path d={`M${xL + 2} ${topY - 0.2}
              l0.8 1.5 l-1.2 0.4 l1.6 0.9 l-0.8 1.2 l2 -0.4 l0.8 0.8 l0.8 -1.6`}
          stroke={W_INK} stroke-width="0.35" fill="none" opacity="0.9" />
  {/if}

  <!-- 9. DIRT streaks at higher dirty levels -->
  {#if dirtyLevel >= 1}
    <g opacity="0.32" stroke="#5a3a1a" stroke-width="0.4" fill="none" stroke-linecap="round">
      <path d={`M${xL + 2} ${yBL - 0.3} l-0.3 -2.5`} />
      <path d={`M${cx - 3} ${yBL - 0.3} l0.2 -2`} />
      <path d={`M${cx + 4} ${yBL - 0.3} l-0.3 -2.6`} />
      <path d={`M${xR - 2} ${yBL - 0.3} l0.4 -3`} />
    </g>
  {/if}
</g>
