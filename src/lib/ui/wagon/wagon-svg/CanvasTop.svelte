<script lang="ts">
  // Wagon canvas top — drawn to match real prairie schooner photos:
  //   * Bonnet ribs are visible as bulges (canvas puffs OUTWARD between
  //     each rib).
  //   * Cover OVERHANGS the bed front and back like an eave.
  //   * Cover DRAPES DOWN over the bed sides with visible sag between
  //     ribs.
  //   * Front opening is a circular puckered hole drawn shut with a
  //     cord.
  //   * Tie-down rope points along the bottom edge.
  //
  // damageLevel layers tears and patches on top (0 = pristine, 4 =
  // shredded). dirtyLevel desaturates the canvas (0 = clean, 2 = grimy)
  // and draws dirt streaks.
  import {
    W_CANVAS,
    W_CANVAS_DIRTY,
    W_CANVAS_PATCH,
    W_INK,
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
    arch = 12,
    ribs = 5,
    overhang = 1.5,
    drape = 1.6,
    slack = 0,
    damageLevel = 0,
    dirtyLevel = 0
  }: Props = $props();

  const cx = $derived(bedX + bedW / 2);
  const topY = $derived(bedY - arch);

  // Pick canvas + shadow colors based on dirt level.
  const canvasFill = $derived(
    dirtyLevel === 0 ? W_CANVAS : dirtyLevel === 1 ? W_CANVAS_DIRTY : W_CANVAS_PATCH
  );
  const shadeFill = $derived(
    dirtyLevel === 0 ? '#e8d4a8' : dirtyLevel === 1 ? '#b89860' : '#8a7048'
  );

  // Anchor points for the canvas profile.
  const xL = $derived(bedX - overhang);
  const xR = $derived(bedX + bedW + overhang);
  const yBL = $derived(bedY + drape + slack * 0.2);
  const yBR = $derived(bedY + drape + slack * 0.2);
  const yMid = $derived(bedY + drape + slack);

  // Top arc + bottom edge path.
  const pathD = $derived(
    `M${xL} ${yBL}
     Q${xL - 0.4} ${topY + arch * 0.5} ${xL + (xR - xL) * 0.12} ${topY + arch * 0.12}
     Q${cx} ${topY - 0.6} ${xR - (xR - xL) * 0.12} ${topY + arch * 0.12}
     Q${xR + 0.4} ${topY + arch * 0.5} ${xR} ${yBR}
     Q${cx} ${yMid + 0.2} ${xL} ${yBL} Z`
  );

  // Bonnet rib elements — each rib creates a vertical highlight along
  // the canopy plus a darker shadow on its left side suggesting the
  // canvas dips between ribs.
  type RibEl = { ribTopY: number; ribBotY: number; rx: number; segWidth: number; shadowTopY: number };
  const ribEls = $derived.by<RibEl[]>(() => {
    const out: RibEl[] = [];
    for (let i = 0; i < ribs; i++) {
      const t = (i + 1) / (ribs + 1);
      const rx = xL + (xR - xL) * t;
      const archScale = 0.85 + 0.15 * Math.sin(Math.PI * t);
      const ribTopY = topY + arch * (1 - archScale) * 0.5;
      const ribBotY = yBL + (yMid - yBL) * Math.sin(Math.PI * t);
      const segWidth = (xR - xL) / (ribs + 1);
      const shadowTopY = topY + arch * 0.05 + (1 - archScale) * arch * 0.5;
      out.push({ ribTopY, ribBotY, rx, segWidth, shadowTopY });
    }
    return out;
  });

  // Tie-down points along the bottom edge.
  type TieEl = { tx: number; ty: number };
  const tieEls = $derived.by<TieEl[]>(() => {
    const out: TieEl[] = [];
    for (let i = 0; i < ribs + 1; i++) {
      const t = (i + 0.5) / (ribs + 1);
      const tx = xL + (xR - xL) * t;
      const ty = yBL + (yMid - yBL) * Math.sin(Math.PI * t);
      out.push({ tx, ty });
    }
    return out;
  });

  // Front opening: circular puckered hole at the left (front) edge
  // since the wagon faces left (traveling west).
  const openX = $derived(xL + 0.6);
  const openY = $derived(topY + arch * 0.55);
  const openRX = 0.9;
  const openRY = $derived(arch * 0.32);

  type Pucker = { x1: number; y1: number; x2: number; y2: number };
  const puckerEls = $derived.by<Pucker[]>(() => {
    const out: Pucker[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x1 = openX + Math.cos(a) * openRX * 0.95;
      const y1 = openY + Math.sin(a) * openRY * 0.95;
      const x2 = openX + Math.cos(a) * (openRX + 0.6);
      const y2 = openY + Math.sin(a) * (openRY + 0.8);
      out.push({ x1, y1, x2, y2 });
    }
    return out;
  });
</script>

<g>
  <!-- canvas body -->
  <path d={pathD} fill={canvasFill} stroke={W_INK}
        stroke-width="0.7" stroke-linejoin="round" />

  <!-- end-cap shadows: cover overhangs the bed, casting a dark crescent on the inside -->
  <path d={`M${xL} ${yBL} Q${xL + 0.4} ${topY + arch * 0.5} ${xL + (xR - xL) * 0.12} ${topY + arch * 0.12}`}
        stroke={shadeFill} stroke-width="0.5" fill="none" opacity="0.5" />
  <path d={`M${xR} ${yBR} Q${xR - 0.4} ${topY + arch * 0.5} ${xR - (xR - xL) * 0.12} ${topY + arch * 0.12}`}
        stroke={shadeFill} stroke-width="0.5" fill="none" opacity="0.5" />

  <!-- ribs (vertical highlights) + crease shadows -->
  {#each ribEls as r, i (i)}
    <path d={`M${r.rx} ${r.ribBotY - 0.1} Q${r.rx + 0.05} ${(r.ribTopY + r.ribBotY) / 2} ${r.rx} ${r.ribTopY}`}
          stroke={W_INK} stroke-width="0.35" fill="none"
          opacity="0.55" stroke-linecap="round" />
    <path d={`M${r.rx - r.segWidth * 0.35} ${r.ribBotY + 0.4}
              Q${r.rx - r.segWidth * 0.35 + 0.15} ${(r.shadowTopY + r.ribBotY) / 2} ${r.rx - r.segWidth * 0.35} ${r.shadowTopY}`}
          stroke={shadeFill} stroke-width={r.segWidth * 0.32} fill="none"
          opacity="0.55" stroke-linecap="round" />
  {/each}

  <!-- tie-downs -->
  {#each tieEls as t, i (i)}
    <circle cx={t.tx} cy={t.ty + 0.05} r="0.18" fill={W_INK} opacity="0.7" />
    <line x1={t.tx} y1={t.ty + 0.1} x2={t.tx} y2={t.ty + 0.6}
          stroke={W_INK} stroke-width="0.18" opacity="0.5" />
  {/each}

  <!-- front puckered opening -->
  <ellipse cx={openX} cy={openY} rx={openRX} ry={openRY} fill={W_INK} opacity="0.78" />
  <ellipse cx={openX} cy={openY} rx={openRX * 0.6} ry={openRY * 0.6} fill={W_INK} />
  {#each puckerEls as p, i (i)}
    <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
          stroke={shadeFill} stroke-width="0.22" opacity="0.7" stroke-linecap="round" />
  {/each}

  <!-- drawstring cord around the opening -->
  <ellipse cx={openX} cy={openY} rx={openRX + 0.3} ry={openRY + 0.4}
           fill="none" stroke={W_INK} stroke-width="0.22"
           opacity="0.6" stroke-dasharray="0.4 0.3" />

  <!-- DAMAGE: tears + patches. Layered cumulatively. -->
  {#if damageLevel >= 1}
    <g>
      <!-- visible patch — sewn-on rectangle of off-color canvas -->
      <path d={`M${cx + 1} ${topY + arch * 0.45} l3.5 -0.4 l0.4 2.6 l-3.7 0.5 z`}
            fill={W_CANVAS_PATCH} stroke={W_INK} stroke-width="0.25" opacity="0.85" />
      <path d={`M${cx + 1} ${topY + arch * 0.45} l3.5 -0.4 l0.4 2.6 l-3.7 0.5 z`}
            fill="none" stroke={W_INK} stroke-width="0.18"
            opacity="0.7" stroke-dasharray="0.25 0.3" />
    </g>
  {/if}
  {#if damageLevel >= 2}
    <g>
      <path d={`M${cx - 4} ${topY + arch * 0.25} l2.5 0.8 l-0.7 2.8 z`}
            fill={W_INK} opacity="0.88" />
      <path d={`M${cx - 4} ${topY + arch * 0.25} l2.5 0.8 l-0.7 2.8`}
            stroke={W_CANVAS} stroke-width="0.25" fill="none" />
    </g>
  {/if}
  {#if damageLevel >= 3}
    <g>
      <path d={`M${xR - 4} ${topY + arch * 0.35} l-1.8 1.6 l2.5 1.7 l0.8 -2.5 z`}
            fill={W_INK} opacity="0.9" />
      <!-- exposed rib through the rip -->
      <path d={`M${xR - 3.5} ${topY + arch * 0.5} Q${xR - 3.6} ${(topY + bedY) / 2} ${xR - 3.6} ${bedY}`}
            stroke={W_WOOD_LIGHT} stroke-width="0.5" fill="none" />
    </g>
  {/if}
  {#if damageLevel >= 4}
    <path d={`M${xL + 2} ${topY - 0.2}
              l0.8 1.5 l-1.2 0.4 l1.6 0.9 l-0.8 1.2 l2 -0.4 l0.8 0.8 l0.8 -1.6`}
          stroke={W_INK} stroke-width="0.35" fill="none" opacity="0.9" />
  {/if}

  <!-- DIRT streaks -->
  {#if dirtyLevel >= 1}
    <g opacity="0.32" stroke="#5a3a1a" stroke-width="0.4" fill="none" stroke-linecap="round">
      <path d={`M${xL + 2} ${yBL - 0.3} l-0.3 -2.5`} />
      <path d={`M${cx - 3} ${yBL - 0.3} l0.2 -2`} />
      <path d={`M${cx + 4} ${yBL - 0.3} l-0.3 -2.6`} />
      <path d={`M${xR - 2} ${yBL - 0.3} l0.4 -3`} />
    </g>
  {/if}
</g>
