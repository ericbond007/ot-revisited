// wagon-svg.jsx — Three historical wagon models in profile view, FACING LEFT (traveling west).
// Each renders at a base scale of 1, anchored at center-bottom of wheels.
// All wagons share a vocabulary: ink-stroke (#3a1a08), wood (#8a5a2a / #5a3a1a),
// canvas (#f5e6c8 → patches in #d8c89a), iron (#1a0e04), rust (#c96a2a).
// Damage states are layered on TOP of the pristine wagon as an overlay component.

const W_INK = "#3a1a08";
const W_WOOD = "#8a5a2a";
const W_WOOD_DARK = "#5a3a1a";
const W_WOOD_LIGHT = "#a87040";
const W_CANVAS = "#f5e6c8";
const W_CANVAS_DIRTY = "#d8c89a";
const W_CANVAS_PATCH = "#a89060";
const W_IRON = "#1a0e04";
const W_RUST = "#c96a2a";

// ─────────────────────────────────────────────────────────────────────────────
// Shared parts: wheel, plank texture, canvas with bonnet ribs
// ─────────────────────────────────────────────────────────────────────────────

function HistoricalWheel({ cx, cy, r, angle = 0, spokes = 10, broken = false, spokeColor = "#e8d4a8" }) {
  // Spokes are PALE/LIGHT against a dark hub — matches real photos (white-painted spokes)
  const spokeEls = [];
  for (let i = 0; i < spokes; i++) {
    if (broken && i === 3) continue; // skip one spoke on broken wheels
    const a = (i * 360) / spokes;
    const x2 = Math.cos((a * Math.PI) / 180) * (r - 0.8);
    const y2 = Math.sin((a * Math.PI) / 180) * (r - 0.8);
    // pale spoke with thin ink edge
    spokeEls.push(
      <line key={`spoke-${i}`} x1={0} y1={0} x2={x2} y2={y2}
            stroke={spokeColor} strokeWidth="0.65" strokeLinecap="round" />
    );
    spokeEls.push(
      <line key={`spoke-edge-${i}`} x1={0} y1={0} x2={x2} y2={y2}
            stroke={W_INK} strokeWidth="0.18" strokeLinecap="round" opacity="0.5" />
    );
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {/* outer rim (iron tire) — dark band */}
      <circle r={r} fill="none" stroke={W_INK} strokeWidth="1.1" />
      {/* inner rim wood (pale ring just inside the iron tire) */}
      <circle r={r - 0.55} fill="none" stroke={spokeColor} strokeWidth="0.7" />
      <circle r={r - 0.9} fill="none" stroke={W_INK} strokeWidth="0.18" opacity="0.55" />
      {/* spokes (rotating) */}
      <g transform={`rotate(${angle})`}>
        {spokeEls}
        {/* hub — dark contrasting circle (key feature in reference photos) */}
        <circle r={r * 0.26} fill={W_WOOD_DARK} stroke={W_INK} strokeWidth="0.5" />
        <circle r={r * 0.18} fill={W_INK} />
        {/* iron hub axle cap */}
        <circle r={r * 0.08} fill={spokeColor} />
        {/* iron hub bands */}
        <circle r={r * 0.32} fill="none" stroke={W_INK} strokeWidth="0.32" opacity="0.7" />
      </g>
      {/* if broken, draw a stick replacement */}
      {broken && (
        <g transform={`rotate(${angle})`}>
          <line x1={0} y1={0} x2={r * 0.85} y2={r * 0.4} stroke={W_WOOD_LIGHT} strokeWidth="0.9" strokeLinecap="round" />
          <line x1={0} y1={0} x2={r * 0.6} y2={r * 0.85} stroke={W_WOOD_LIGHT} strokeWidth="0.9" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

// Plank-textured rectangle for the wagon bed
function PlankBed({ x, y, w, h, planks = 4, dropPlank = -1, fill = W_WOOD }) {
  const lines = [];
  for (let i = 1; i < planks; i++) {
    const px = x + (w / planks) * i;
    lines.push(<line key={i} x1={px} y1={y + 0.5} x2={px} y2={y + h - 0.5} stroke={W_INK} strokeWidth="0.35" opacity="0.7" />);
  }
  // Iron strapping
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={W_INK} strokeWidth="0.7" strokeLinejoin="round" />
      {lines}
      {/* iron straps at ends */}
      <rect x={x + 0.3} y={y - 0.3} width="0.6" height={h + 0.6} fill={W_IRON} opacity="0.7" />
      <rect x={x + w - 0.9} y={y - 0.3} width="0.6" height={h + 0.6} fill={W_IRON} opacity="0.7" />
      {/* dropped plank — show a gap */}
      {dropPlank >= 0 && (
        <rect x={x + (w / planks) * dropPlank + 0.5} y={y + 1} width={(w / planks) - 1} height={h - 2}
              fill={W_INK} opacity="0.6" />
      )}
    </g>
  );
}

// Canvas top with ribs — drawn to match real prairie schooner photos:
//  • Bonnet ribs are visible as bulges (canvas puffs OUTWARD between each rib)
//  • Cover OVERHANGS the bed front and back like an eave
//  • Cover DRAPES DOWN over the bed sides with visible sag between ribs
//  • Front opening is a circular puckered hole drawn shut with a cord
//  • Tie-down rope points along the bottom edge
//
// Args:
//  bedX/bedY/bedW: where the cover sits relative to the bed it's lashed to
//  arch: vertical height of the canopy from the bed top
//  ribs: number of bonnet ribs
//  overhang: how far the canopy extends past the bed at front/back (default 1.5)
//  drape: how far the canvas drapes BELOW the bed top along the side
//  slack: extra middle-sag for Conestoga "boat" look
function CanvasTop({ bedX, bedY, bedW, arch = 12, ribs = 5, overhang = 1.5, drape = 1.6, slack = 0,
                    damageLevel = 0, dirtyLevel = 0 }) {
  const cx = bedX + bedW / 2;
  const topY = bedY - arch;

  // Pick canvas + shadow colors based on dirt level
  const canvasFill = dirtyLevel === 0 ? W_CANVAS : (dirtyLevel === 1 ? W_CANVAS_DIRTY : W_CANVAS_PATCH);
  const shadeFill = dirtyLevel === 0 ? "#e8d4a8" : (dirtyLevel === 1 ? "#b89860" : "#8a7048");

  // Anchor points for the canvas profile
  const xL = bedX - overhang;        // left (front, since facing left) edge of cover
  const xR = bedX + bedW + overhang; // right (rear) edge
  const yBL = bedY + drape + slack * 0.2;     // left bottom of canvas (drapes below bed top)
  const yBR = bedY + drape + slack * 0.2;     // right bottom of canvas
  const yMid = bedY + drape + slack;          // middle of canvas bottom (sags more in Conestoga)

  // Top arc: a smooth ellipse with a subtle peak at center
  // We render via a path: bottom-left → up + over the top → down to bottom-right → curve to bottom-left
  const topArc = `M${xL} ${yBL}
                  Q${xL - 0.4} ${topY + arch * 0.5} ${xL + (xR - xL) * 0.12} ${topY + arch * 0.12}
                  Q${cx} ${topY - 0.6} ${xR - (xR - xL) * 0.12} ${topY + arch * 0.12}
                  Q${xR + 0.4} ${topY + arch * 0.5} ${xR} ${yBR}`;

  // Bottom edge: gently sags between ribs (handled by ribs visually)
  const bottomEdge = `Q${cx} ${yMid + 0.2} ${xL} ${yBL} Z`;

  const pathD = topArc + " " + bottomEdge;

  // ──── BONNET RIBS — drawn as visible bulges + dark crease shadows
  // Each rib creates: a vertical hint of the rib stick going up the canopy,
  //   plus a slight DARKER shadow on either side suggesting the canvas dips
  //   between ribs. The rib LINE itself is at the puffed-out high point.
  const ribEls = [];
  for (let i = 0; i < ribs; i++) {
    const t = (i + 1) / (ribs + 1);
    const rx = xL + (xR - xL) * t;

    // Top of arc at this rib (slight sinusoidal curve)
    const archScale = 0.85 + 0.15 * Math.sin(Math.PI * t); // a tiny bit lower at ends
    const ribTopY = topY + arch * (1 - archScale) * 0.5;

    // Bottom of canvas at this rib (drape line)
    const ribBotY = yBL + (yMid - yBL) * Math.sin(Math.PI * t);

    // Rib stick: a vertical highlight along the cover
    ribEls.push(
      <path key={`rib-${i}`}
            d={`M${rx} ${ribBotY - 0.1}
                Q${rx + 0.05} ${(ribTopY + ribBotY) / 2} ${rx} ${ribTopY}`}
            stroke={W_INK} strokeWidth="0.35" fill="none" opacity="0.55" strokeLinecap="round" />
    );

    // Crease shadow to LEFT of rib: simulates canvas dipping between ribs
    if (i < ribs) {
      const segWidth = (xR - xL) / (ribs + 1);
      const shadowX = rx - segWidth * 0.35;
      const shadowTopY = topY + arch * 0.05 + (1 - archScale) * arch * 0.5;
      ribEls.push(
        <path key={`shade-${i}`}
              d={`M${shadowX} ${ribBotY + 0.4}
                  Q${shadowX + 0.15} ${(shadowTopY + ribBotY) / 2} ${shadowX} ${shadowTopY}`}
              stroke={shadeFill} strokeWidth={segWidth * 0.32} fill="none"
              opacity="0.55" strokeLinecap="round" />
      );
    }
  }

  // ──── TIE-DOWN POINTS along the bottom edge
  const tiedowns = [];
  for (let i = 0; i < ribs + 1; i++) {
    const t = (i + 0.5) / (ribs + 1);
    const tx = xL + (xR - xL) * t;
    const ty = yBL + (yMid - yBL) * Math.sin(Math.PI * t);
    // little knot
    tiedowns.push(
      <circle key={`tie-${i}`} cx={tx} cy={ty + 0.05} r="0.18" fill={W_INK} opacity="0.7" />
    );
    // a small rope going down to the bed
    tiedowns.push(
      <line key={`rope-${i}`} x1={tx} y1={ty + 0.1} x2={tx} y2={ty + 0.6}
            stroke={W_INK} strokeWidth="0.18" opacity="0.5" />
    );
  }

  // ──── FRONT OPENING — circular puckered hole at the left (front, since facing left)
  // The cover gathers around a drawstring; we draw it as a dark elliptical hole
  // with little radial pucker creases.
  const openX = xL + 0.6;
  const openY = topY + arch * 0.55;
  const openRX = 0.9;
  const openRY = arch * 0.32;
  const puckerEls = [];
  // Draw radial creases around the opening
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x1 = openX + Math.cos(a) * openRX * 0.95;
    const y1 = openY + Math.sin(a) * openRY * 0.95;
    const x2 = openX + Math.cos(a) * (openRX + 0.6);
    const y2 = openY + Math.sin(a) * (openRY + 0.8);
    puckerEls.push(
      <line key={`puck-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={shadeFill} strokeWidth="0.22" opacity="0.7" strokeLinecap="round" />
    );
  }

  // ──── DAMAGE: tears + patches
  const damageEls = [];
  if (damageLevel >= 1) {
    // visible patch — sewn-on rectangle of off-color canvas
    damageEls.push(
      <g key="patch1">
        <path d={`M${cx + 1} ${topY + arch * 0.45}
                  l3.5 -0.4 l0.4 2.6 l-3.7 0.5 z`}
              fill={W_CANVAS_PATCH} stroke={W_INK} strokeWidth="0.25" opacity="0.85" />
        <path d={`M${cx + 1} ${topY + arch * 0.45} l3.5 -0.4 l0.4 2.6 l-3.7 0.5 z`}
              fill="none" stroke={W_INK} strokeWidth="0.18" opacity="0.7" strokeDasharray="0.25 0.3" />
      </g>
    );
  }
  if (damageLevel >= 2) {
    damageEls.push(
      <g key="tear1">
        <path d={`M${cx - 4} ${topY + arch * 0.25} l2.5 0.8 l-0.7 2.8 z`}
              fill={W_INK} opacity="0.88" />
        <path d={`M${cx - 4} ${topY + arch * 0.25} l2.5 0.8 l-0.7 2.8`}
              stroke={W_CANVAS} strokeWidth="0.25" fill="none" />
      </g>
    );
  }
  if (damageLevel >= 3) {
    damageEls.push(
      <g key="rip">
        <path d={`M${xR - 4} ${topY + arch * 0.35} l-1.8 1.6 l2.5 1.7 l0.8 -2.5 z`}
              fill={W_INK} opacity="0.9" />
        {/* exposed rib through the rip */}
        <path d={`M${xR - 3.5} ${topY + arch * 0.5} Q${xR - 3.6} ${(topY + bedY) / 2} ${xR - 3.6} ${bedY}`}
              stroke={W_WOOD_LIGHT} strokeWidth="0.5" fill="none" />
      </g>
    );
  }
  if (damageLevel >= 4) {
    damageEls.push(
      <path key="shred"
            d={`M${xL + 2} ${topY - 0.2}
                l0.8 1.5 l-1.2 0.4 l1.6 0.9 l-0.8 1.2 l2 -0.4 l0.8 0.8 l0.8 -1.6`}
            stroke={W_INK} strokeWidth="0.35" fill="none" opacity="0.9" />
    );
  }

  // ──── DIRT streaks
  const dirtEls = [];
  if (dirtyLevel >= 1) {
    dirtEls.push(
      <g key="dirt" opacity="0.32" stroke="#5a3a1a" strokeWidth="0.4" fill="none" strokeLinecap="round">
        <path d={`M${xL + 2} ${yBL - 0.3} l-0.3 -2.5`} />
        <path d={`M${cx - 3} ${yBL - 0.3} l0.2 -2`} />
        <path d={`M${cx + 4} ${yBL - 0.3} l-0.3 -2.6`} />
        <path d={`M${xR - 2} ${yBL - 0.3} l0.4 -3`} />
      </g>
    );
  }

  return (
    <g>
      {/* canvas body */}
      <path d={pathD} fill={canvasFill} stroke={W_INK} strokeWidth="0.7" strokeLinejoin="round" />
      {/* end-cap shadows: cover overhangs the bed, casting a dark crescent on the inside */}
      <path d={`M${xL} ${yBL} Q${xL + 0.4} ${topY + arch * 0.5} ${xL + (xR-xL)*0.12} ${topY + arch * 0.12}`}
            stroke={shadeFill} strokeWidth="0.5" fill="none" opacity="0.5" />
      <path d={`M${xR} ${yBR} Q${xR - 0.4} ${topY + arch * 0.5} ${xR - (xR-xL)*0.12} ${topY + arch * 0.12}`}
            stroke={shadeFill} strokeWidth="0.5" fill="none" opacity="0.5" />
      {/* ribs and creases */}
      {ribEls}
      {/* tie-downs */}
      {tiedowns}
      {/* front puckered opening */}
      <ellipse cx={openX} cy={openY} rx={openRX} ry={openRY} fill={W_INK} opacity="0.78" />
      <ellipse cx={openX} cy={openY} rx={openRX * 0.6} ry={openRY * 0.6} fill={W_INK} />
      {puckerEls}
      {/* drawstring cord around the opening */}
      <ellipse cx={openX} cy={openY} rx={openRX + 0.3} ry={openRY + 0.4}
               fill="none" stroke={W_INK} strokeWidth="0.22" opacity="0.6" strokeDasharray="0.4 0.3" />
      {damageEls}
      {dirtEls}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wagon model 1: LIGHT WAGON
// Short bed (~24 wide), small arched canvas, 4 spokes wheel, low and quick
// ─────────────────────────────────────────────────────────────────────────────
function LightWagon({ angle = 0, bounce = 0, health = 100, addons = {} }) {
  const dmg = healthToDamage(health);
  const bedW = 24, bedH = 4;
  const bedX = -bedW / 2, bedY = -2;

  return (
    <g transform={`translate(0 ${bounce})`}>
      {/* shadow */}
      <ellipse cx="0" cy="11" rx={bedW / 2 + 4} ry="1.6" fill={W_INK} opacity="0.25" />

      {/* tongue extending forward (LEFT, since facing left/west) */}
      <line x1={bedX - 1} y1={bedY + 1.5} x2={bedX - 12} y2={bedY + 4}
            stroke={W_INK} strokeWidth="1" strokeLinecap="round" />

      {/* canvas top — shorter arch */}
      <CanvasTop bedX={bedX} bedY={bedY} bedW={bedW} arch={9} ribs={4}
                 damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />

      {/* wagon bed — single planked rectangle */}
      <PlankBed x={bedX} y={bedY} w={bedW} h={bedH} planks={4} dropPlank={dmg.plank} fill={W_WOOD} />
      {/* underbody axle bar */}
      <line x1={bedX + 1} y1={bedY + bedH + 0.2} x2={bedX + bedW - 1} y2={bedY + bedH + 0.2} stroke={W_IRON} strokeWidth="0.6" />

      {/* addons */}
      {addons.driver && <Driver x={bedX + 2} y={bedY - 1} variant="light" />}
      {addons.kegs >= 1 && <WaterKeg x={bedX + bedW * 0.55} y={bedY + 0.5} />}
      {addons.coop && <ChickenCoop x={bedX + bedW * 0.78} y={bedY + 0.2} size="sm" chickens={Math.min(3, addons.coop)} />}

      {/* wheels — small, even-sized */}
      <HistoricalWheel cx={bedX + 4} cy={5} r={4.2} angle={angle} spokes={8}
                       broken={dmg.wheelBack} />
      <HistoricalWheel cx={bedX + bedW - 4} cy={5} r={4.2} angle={angle * 0.96} spokes={8}
                       broken={dmg.wheelFront} />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wagon model 2: PRAIRIE SCHOONER (the iconic one)
// Longer bed (~30 wide), big arched canvas, 10-spoke wheels (front smaller),
// sloped wagon bed (slightly raised at ends — classic schooner profile)
// ─────────────────────────────────────────────────────────────────────────────
function PrairieSchooner({ angle = 0, bounce = 0, health = 100, addons = {} }) {
  const dmg = healthToDamage(health);
  // Wider, taller proportions to match reference photos
  const bedW = 30, bedH = 5;
  const bedX = -bedW / 2, bedY = -2;

  // Flared sides: top of bed is wider than bottom (classic schooner)
  const flare = 1.2;
  const bedTopL = bedX - flare, bedTopR = bedX + bedW + flare;
  const bedTopY = bedY;
  const bedBotY = bedY + bedH;

  // Front wheel noticeably smaller than rear (matches references)
  const wheelFrontR = 4.4;
  const wheelBackR = 6.0;
  const wheelY = 6;

  return (
    <g transform={`translate(0 ${bounce})`}>
      <ellipse cx="0" cy="11.8" rx={bedW / 2 + 6} ry="1.6" fill={W_INK} opacity="0.32" />

      {/* ────────── TONGUE (forward-extending pole for hitching team) */}
      {/* The tongue extends forward from the front axle; visible as a long pole */}
      <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX - 16} y2={bedY + 5.5}
            stroke={W_WOOD_DARK} strokeWidth="1" strokeLinecap="round" />
      <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX - 16} y2={bedY + 5.5}
            stroke={W_INK} strokeWidth="0.4" strokeLinecap="round" opacity="0.6" />
      {/* iron clevis at end of tongue */}
      <rect x={bedX - 16.7} y={bedY + 5.1} width="1.2" height="0.8" fill={W_IRON} />

      {/* ────────── REAR AXLE BAR (visible under wagon between wheels) */}
      <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX + bedW - 5} y2={wheelY + 0.2}
            stroke={W_INK} strokeWidth="0.9" strokeLinecap="round" />
      <line x1={bedX + 5} y1={wheelY + 0.2} x2={bedX + bedW - 5} y2={wheelY + 0.2}
            stroke={W_WOOD_DARK} strokeWidth="0.45" strokeLinecap="round" />

      {/* ────────── REACH (long beam connecting front + rear axles) */}
      <line x1={bedX + 5} y1={wheelY + 0.6} x2={bedX + bedW - 5} y2={wheelY + 0.6}
            stroke={W_WOOD_DARK} strokeWidth="0.5" />

      {/* ────────── WAGON BED — flared sides (wider at top), plank construction */}
      <g>
        {/* Bed body: trapezoid (top wider than bottom) with subtle upturned ends */}
        <path d={`M${bedTopL} ${bedTopY + 0.4}
                  Q${bedTopL + 2} ${bedTopY - 0.6} ${bedTopL + 5} ${bedTopY - 0.3}
                  L${bedTopR - 5} ${bedTopY - 0.3}
                  Q${bedTopR - 2} ${bedTopY - 0.6} ${bedTopR} ${bedTopY + 0.4}
                  L${bedX + bedW} ${bedBotY}
                  L${bedX} ${bedBotY} Z`}
              fill={W_WOOD} stroke={W_INK} strokeWidth="0.7" strokeLinejoin="round" />

        {/* Top edge cap — a slightly lighter band along the top of the sideboard */}
        <path d={`M${bedTopL + 0.2} ${bedTopY + 0.3}
                  Q${bedTopL + 2} ${bedTopY - 0.4} ${bedTopL + 5} ${bedTopY - 0.1}
                  L${bedTopR - 5} ${bedTopY - 0.1}
                  Q${bedTopR - 2} ${bedTopY - 0.4} ${bedTopR - 0.2} ${bedTopY + 0.3}`}
              stroke={W_WOOD_LIGHT} strokeWidth="0.4" fill="none" opacity="0.85" />

        {/* Vertical PLANK shadow lines (very visible in references) */}
        {[0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88].map((t, i) => {
          const px = bedX + bedW * t;
          // Plank goes from top of bed (which slants slightly) to bottom
          const topX = bedTopL + (bedTopR - bedTopL) * (px - bedX) / bedW;
          const topY = bedTopY - 0.3 + Math.abs(t - 0.5) * 0.3;
          return (
            <line key={`plank-${i}`} x1={topX} y1={topY + 0.4} x2={px} y2={bedBotY - 0.3}
                  stroke={W_INK} strokeWidth="0.22" opacity="0.55" />
          );
        })}

        {/* Plank highlights — pale streaks between dark seams for texture depth */}
        {[0.13, 0.23, 0.33, 0.43, 0.53, 0.63, 0.73, 0.83].map((t, i) => {
          const px = bedX + bedW * t;
          const topX = bedTopL + (bedTopR - bedTopL) * (px - bedX) / bedW;
          return (
            <line key={`plank-hl-${i}`} x1={topX + 0.2} y1={bedTopY + 0.2}
                  x2={px + 0.2} y2={bedBotY - 0.4}
                  stroke={W_WOOD_LIGHT} strokeWidth="0.18" opacity="0.4" />
          );
        })}

        {/* Iron corner straps on bed */}
        <path d={`M${bedTopL + 0.2} ${bedTopY + 0.4} L${bedX + 0.3} ${bedBotY - 0.2}`}
              stroke={W_IRON} strokeWidth="0.6" />
        <path d={`M${bedTopR - 0.2} ${bedTopY + 0.4} L${bedX + bedW - 0.3} ${bedBotY - 0.2}`}
              stroke={W_IRON} strokeWidth="0.6" />
        {/* Iron mid-bands */}
        <line x1={bedX + bedW * 0.33} y1={bedTopY + 0.2} x2={bedX + bedW * 0.33} y2={bedBotY - 0.4}
              stroke={W_IRON} strokeWidth="0.45" opacity="0.85" />
        <line x1={bedX + bedW * 0.66} y1={bedTopY + 0.2} x2={bedX + bedW * 0.66} y2={bedBotY - 0.4}
              stroke={W_IRON} strokeWidth="0.45" opacity="0.85" />

        {/* Iron bolt heads on the iron straps (small dots) */}
        {[0.33, 0.66].map((t, i) => (
          <g key={`bolts-${i}`}>
            <circle cx={bedX + bedW * t} cy={bedTopY + 0.5} r="0.18" fill={W_INK} />
            <circle cx={bedX + bedW * t} cy={bedBotY - 0.5} r="0.18" fill={W_INK} />
          </g>
        ))}

        {/* Front bench seat (driver's seat) — small platform extending forward of canvas */}
        <path d={`M${bedTopL - 0.5} ${bedTopY - 0.3}
                  L${bedTopL - 3.5} ${bedTopY + 0.5}
                  L${bedTopL - 3.5} ${bedTopY + 1.5}
                  L${bedTopL} ${bedTopY + 0.8} Z`}
              fill={W_WOOD_DARK} stroke={W_INK} strokeWidth="0.5" strokeLinejoin="round" />
        {/* seat back edge */}
        <line x1={bedTopL - 0.5} y1={bedTopY - 0.3} x2={bedTopL - 0.5} y2={bedTopY + 0.6}
              stroke={W_INK} strokeWidth="0.4" />

        {/* Damaged plank — show a gap */}
        {dmg.plank >= 0 && (
          <rect x={bedX + bedW * 0.4} y={bedTopY + 0.5} width="2.5" height={bedH - 1.2}
                fill={W_INK} opacity="0.7" />
        )}
      </g>

      {/* ────────── ADDONS (drawn after bed but before wheels so they sit IN the bed) */}
      {addons.driver && <Driver x={bedTopL - 2} y={bedTopY - 1.5} variant="schooner" />}
      {addons.kegs >= 1 && <WaterKeg x={bedX + bedW * 0.5} y={bedTopY + 1} />}
      {addons.kegs >= 2 && <WaterKeg x={bedX + bedW * 0.7} y={bedTopY + 1} />}
      {addons.coop && <ChickenCoop x={bedX + bedW * 0.85} y={bedTopY + 0.5} size="md" chickens={Math.min(5, addons.coop)} />}

      {/* ────────── CANVAS TOP — drawn LAST so its overhang sits in front of bed top */}
      <CanvasTop bedX={bedX} bedY={bedTopY - 0.2} bedW={bedW}
                 arch={14} ribs={6} overhang={2.5} drape={1.4}
                 damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />

      {/* ────────── WHEELS — front noticeably smaller than rear */}
      <HistoricalWheel cx={bedX + 5} cy={wheelY + 0.5} r={wheelFrontR} angle={angle * 1.36}
                       spokes={10} broken={dmg.wheelFront} spokeColor="#e8d4a8" />
      <HistoricalWheel cx={bedX + bedW - 5} cy={wheelY} r={wheelBackR} angle={angle}
                       spokes={12} broken={dmg.wheelBack} spokeColor="#e8d4a8" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wagon model 3: HEAVY FREIGHTER (Conestoga-style)
// Distinctive *swayback* curved bed (high ends, low middle), tall canopy,
// big wheels, 6 oxen needed.  This is the iconic Conestoga silhouette.
// ─────────────────────────────────────────────────────────────────────────────
function HeavyFreighter({ angle = 0, bounce = 0, health = 100, addons = {} }) {
  const dmg = healthToDamage(health);
  const bedW = 36, bedH = 6;
  const bedX = -bedW / 2, bedY = -2;

  return (
    <g transform={`translate(0 ${bounce})`}>
      <ellipse cx="0" cy="13" rx={bedW / 2 + 6} ry="2" fill={W_INK} opacity="0.3" />

      {/* tongue (longer, heavier wagon) */}
      <line x1={bedX - 1} y1={bedY + 3} x2={bedX - 17} y2={bedY + 5.5}
            stroke={W_INK} strokeWidth="1.3" strokeLinecap="round" />
      {/* tongue iron clevis */}
      <rect x={bedX - 17.5} y={bedY + 5} width="1.5" height="1" fill={W_IRON} />

      {/* canvas top — Conestoga "boat" shape: high arched ends curving up, with slack between */}
      <CanvasTop bedX={bedX} bedY={bedY} bedW={bedW} arch={17} ribs={7}
                 slack={2.5}
                 damageLevel={dmg.canvas} dirtyLevel={dmg.dirt} />

      {/* wagon bed — distinctive Conestoga swayback (concave top edge, convex bottom) */}
      <g>
        {/* bed body — curved trough */}
        <path d={`M${bedX} ${bedY - 1.5}
                  Q${bedX + bedW * 0.5} ${bedY + 2.5} ${bedX + bedW} ${bedY - 1.5}
                  L${bedX + bedW} ${bedY + bedH - 1}
                  Q${bedX + bedW * 0.5} ${bedY + bedH + 1.5} ${bedX} ${bedY + bedH - 1} Z`}
              fill={W_WOOD} stroke={W_INK} strokeWidth="0.9" strokeLinejoin="round" />
        {/* darker shadow at the trough bottom */}
        <path d={`M${bedX + 2} ${bedY + bedH * 0.3}
                  Q${bedX + bedW * 0.5} ${bedY + bedH * 0.85} ${bedX + bedW - 2} ${bedY + bedH * 0.3}`}
              fill="none" stroke={W_WOOD_DARK} strokeWidth="0.6" opacity="0.7" />
        {/* plank lines following the curve */}
        {[0.15, 0.3, 0.45, 0.55, 0.7, 0.85].map((t, i) => {
          const px = bedX + bedW * t;
          const topY = bedY - 1.5 + Math.sin(Math.PI * t) * 4;
          const botY = bedY + bedH - 1 + Math.sin(Math.PI * t) * 2.5;
          return <line key={i} x1={px} y1={topY + 0.5} x2={px} y2={botY - 0.3}
                       stroke={W_INK} strokeWidth="0.3" opacity="0.6" />;
        })}
        {/* iron straps at the bow-shaped ends */}
        <path d={`M${bedX + 0.3} ${bedY - 1.3} L${bedX + 0.3} ${bedY + bedH - 1.2}`}
              stroke={W_IRON} strokeWidth="0.7" />
        <path d={`M${bedX + bedW - 0.9} ${bedY - 1.3} L${bedX + bedW - 0.9} ${bedY + bedH - 1.2}`}
              stroke={W_IRON} strokeWidth="0.7" />
        {dmg.plank >= 0 && (
          <rect x={bedX + 5 + dmg.plank * 5} y={bedY + 1} width="3" height="3"
                fill={W_INK} opacity="0.7" />
        )}
      </g>

      {/* addons */}
      {addons.driver && <Driver x={bedX + 3} y={bedY - 1.5} variant="conestoga" />}
      {addons.kegs >= 1 && <WaterKeg x={bedX + bedW * 0.45} y={bedY + 1.5} large />}
      {addons.kegs >= 2 && <WaterKeg x={bedX + bedW * 0.6} y={bedY + 1.5} large />}
      {addons.coop && <ChickenCoop x={bedX + bedW * 0.85} y={bedY + 0.5} size="lg" chickens={Math.min(8, addons.coop)} />}

      {/* wheels — large, both sizable */}
      <HistoricalWheel cx={bedX + 6} cy={8} r={5.5} angle={angle} spokes={12}
                       broken={dmg.wheelFront} />
      <HistoricalWheel cx={bedX + bedW - 6} cy={8} r={6.5} angle={angle * 0.9} spokes={14}
                       broken={dmg.wheelBack} />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Damage mapping: wagon health (0..100) → which damage layers are visible
// ─────────────────────────────────────────────────────────────────────────────
function healthToDamage(health) {
  // canvas: 0 = pristine, 1 = patch, 2 = visible tear, 3 = big rip with exposed rib, 4 = shredded
  let canvas = 0;
  if (health < 80) canvas = 1;
  if (health < 60) canvas = 2;
  if (health < 40) canvas = 3;
  if (health < 20) canvas = 4;

  // dirt: 0 = clean, 1 = streaked, 2 = grimy
  let dirt = 0;
  if (health < 70) dirt = 1;
  if (health < 30) dirt = 2;

  // missing plank index
  const plank = health < 35 ? 1 : -1;

  // wheels
  const wheelBack = health < 25;
  const wheelFront = health < 12;

  return { canvas, dirt, plank, wheelBack, wheelFront };
}

// ─────────────────────────────────────────────────────────────────────────────
// Add-ons: driver, water keg, chicken coop
// ─────────────────────────────────────────────────────────────────────────────

// Driver figure on the bench seat — only the head/torso visible from the side,
// usually wearing a brimmed hat. Slight rocking motion synced to wagon bounce.
function Driver({ x, y, variant = "schooner" }) {
  // x,y is the seat origin; figure sits above & to the right of canvas opening
  const seatY = y - 4;
  return (
    <g transform={`translate(${x} ${seatY})`}>
      {/* torso (jacket) */}
      <path d="M-1.2 0 Q-1.7 -1 -1.5 -2 L1.5 -2 Q1.7 -1 1.2 0 Z"
            fill="#5a3a1a" stroke={W_INK} strokeWidth="0.35" />
      {/* arms holding reins */}
      <line x1="-1" y1="-0.5" x2="-3" y2="0.5" stroke={W_INK} strokeWidth="0.5" strokeLinecap="round" />
      {/* head + brimmed hat */}
      <circle cx="0" cy="-3" r="1.1" fill="#e8c89a" stroke={W_INK} strokeWidth="0.3" />
      <path d="M-2 -3.6 L2 -3.6 L1.5 -4.2 L-1.5 -4.2 Z" fill={W_INK} />
      <path d="M-2.4 -3.6 L2.4 -3.6" stroke={W_INK} strokeWidth="0.5" strokeLinecap="round" />
      {/* reins going forward (leftward) */}
      <path d="M-3 0.5 q-3 1 -7 1.5" stroke={W_INK} strokeWidth="0.35" fill="none" strokeLinecap="round" />
    </g>
  );
}

// Water keg lashed to the side of the wagon
function WaterKeg({ x, y, large = false }) {
  const w = large ? 3.5 : 2.6;
  const h = large ? 4 : 3.2;
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* keg body — vertical, wood with iron bands */}
      <ellipse cx="0" cy={-h + 0.3} rx={w / 2} ry="0.5" fill={W_WOOD_LIGHT} stroke={W_INK} strokeWidth="0.3" />
      <path d={`M${-w / 2} ${-h + 0.3} L${-w / 2 + 0.2} 0 L${w / 2 - 0.2} 0 L${w / 2} ${-h + 0.3}`}
            fill={W_WOOD_LIGHT} stroke={W_INK} strokeWidth="0.4" strokeLinejoin="round" />
      {/* iron bands */}
      <path d={`M${-w / 2 + 0.05} ${-h * 0.3} L${w / 2 - 0.05} ${-h * 0.3}`} stroke={W_IRON} strokeWidth="0.4" />
      <path d={`M${-w / 2 + 0.1} ${-h * 0.7} L${w / 2 - 0.1} ${-h * 0.7}`} stroke={W_IRON} strokeWidth="0.4" />
      {/* stave lines */}
      <line x1="-0.6" y1={-h + 0.3} x2="-0.5" y2="-0.2" stroke={W_INK} strokeWidth="0.25" opacity="0.6" />
      <line x1="0.6" y1={-h + 0.3} x2="0.5" y2="-0.2" stroke={W_INK} strokeWidth="0.25" opacity="0.6" />
      {/* lashing rope */}
      <path d={`M${-w / 2 - 0.5} ${-h * 0.5} Q0 ${-h * 0.5 - 1} ${w / 2 + 0.5} ${-h * 0.5}`}
            fill="none" stroke="#8a6a3a" strokeWidth="0.35" />
    </g>
  );
}

// Chicken coop — wooden slat box strapped to the wagon side
function ChickenCoop({ x, y, size = "md", chickens = 3 }) {
  const w = size === "sm" ? 4 : size === "md" ? 5.5 : 7;
  const h = size === "sm" ? 2.8 : size === "md" ? 3.5 : 4.5;
  const slats = size === "sm" ? 4 : size === "md" ? 5 : 6;
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* coop body */}
      <rect x={-w / 2} y={-h} width={w} height={h} fill={W_WOOD_LIGHT} stroke={W_INK} strokeWidth="0.5" strokeLinejoin="round" />
      {/* slats (vertical bars) */}
      {Array.from({ length: slats - 1 }).map((_, i) => {
        const sx = -w / 2 + (w / slats) * (i + 1);
        return <line key={i} x1={sx} y1={-h + 0.3} x2={sx} y2={-0.3}
                     stroke={W_INK} strokeWidth="0.35" opacity="0.85" />;
      })}
      {/* horizontal cross-brace */}
      <line x1={-w / 2 + 0.3} y1={-h * 0.55} x2={w / 2 - 0.3} y2={-h * 0.55} stroke={W_INK} strokeWidth="0.3" />
      {/* hint of chickens — tiny shapes inside */}
      {Array.from({ length: Math.min(chickens, slats - 1) }).map((_, i) => {
        const cx = -w / 2 + (w / slats) * (i + 1) - (w / slats) / 2;
        const cy = -h * 0.35;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx="0.7" ry="0.5" fill="#e8c89a" />
            <circle cx={cx + 0.4} cy={cy - 0.4} r="0.3" fill="#e8c89a" />
            <path d={`M${cx + 0.65} ${cy - 0.5} l0.3 -0.15`} stroke="#c96a2a" strokeWidth="0.2" />
          </g>
        );
      })}
      {/* lashing rope around the coop */}
      <path d={`M${-w / 2 - 0.5} ${-h * 0.5} L${w / 2 + 0.5} ${-h * 0.5}`}
            stroke="#8a6a3a" strokeWidth="0.4" />
      <path d={`M${-w / 2 - 0.4} ${-h * 0.8} L${w / 2 + 0.4} ${-h * 0.8}`}
            stroke="#8a6a3a" strokeWidth="0.35" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wagon picker — selects model + applies addon counts based on wagon model
// ─────────────────────────────────────────────────────────────────────────────
const WAGON_MODELS = {
  light:            { name: "Light wagon",      Component: LightWagon,      defaultKegs: 1, defaultCoop: 3, optimalTeam: 2, minTeam: 1 },
  prairie_schooner: { name: "Prairie Schooner", Component: PrairieSchooner, defaultKegs: 2, defaultCoop: 5, optimalTeam: 4, minTeam: 2 },
  heavy:            { name: "Heavy Freighter",  Component: HeavyFreighter,  defaultKegs: 2, defaultCoop: 8, optimalTeam: 6, minTeam: 4 },
};

Object.assign(window, {
  WAGON_MODELS,
  LightWagon, PrairieSchooner, HeavyFreighter,
  HistoricalWheel, CanvasTop, PlankBed,
  Driver, WaterKeg, ChickenCoop,
  healthToDamage,
});
