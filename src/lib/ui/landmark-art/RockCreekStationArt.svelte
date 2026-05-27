<!--
  RockCreekStationArt — mile ~230, Jefferson Co. NE.

  Glenn's 1857 West Ranch + McCanles's 1860 East Ranch + the toll bridge
  across Rock Creek. The frontier-grim cousin of Hollenberg Ranch:
  spare, functional, sod-roofed, frontier-utilitarian. NOT the warm
  domesticity of Hollenberg.

  Composition (per docs/historical-pass/13-landmark-visual-references/
  rock_creek_station.md §2):
   • Two squat sod-roofed log buildings flanking a steep-banked creek cut
   • Toll bridge dead-center (NEW construction — the scene's reason)
   • West Ranch (left): station house with lean-to store, 80×20 barn
     behind, crooked corral
   • East Ranch (right): hewn-log Pony Express swing station with
     outside ladder to attic
   • Cottonwoods line the creek banks
   • Open rolling prairie horizon
   • Approaching wagon + ox-team lower-left at toll point
   • Mid-afternoon summer prairie light — harsh, flat, short shadows

  Period accuracy gates: NO stockade, NO flag, NO saloon façade, NO
  Hickok-era confrontation imagery (1861 gunfight POSTDATES our window).

  Color palette per research §2.2.
-->
<script lang="ts">
  import { LMK, LMK_VIEW_W, LMK_VIEW_H } from './landmark-art-tokens';

  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  // Sod + log palette per research §2.2.
  const sodWall = '#7a6840';
  const sodWallSh = '#4a3e24';
  const sodRoof = '#6a7840';
  const sodRoofHi = '#8a9452';
  const logWall = '#5a3e22';
  const logEnd = '#3a2810';
  const bridgePlank = '#7a6040';
  const bridgeShadow = '#4a3a20';
  const creekWater = '#6a8898';
  const creekBank = '#5a4428';
  const prairieGrass = '#a89858';
  const prairieShadow = '#7a6840';
  const cottonwoodCanopy = '#586840';
  const cottonwoodTrunk = '#3a2810';
  const corralRail = '#4a3820';
  const stoneCap = '#8a8478';
</script>

<g>
  <!-- SKY — high, pale, harsh summer prairie -->
  <rect x="0" y="0" width={LMK_VIEW_W} height="60" fill={LMK.skyHi} opacity="0.92" />
  <rect x="0" y="50" width={LMK_VIEW_W} height="20" fill={LMK.paperWarm} opacity="0.4" />
  <!-- a couple flat clouds, undramatic -->
  <g fill={LMK.white} opacity="0.5">
    <ellipse cx="140" cy="22" rx="50" ry="5" />
    <ellipse cx="380" cy="18" rx="46" ry="5" />
  </g>

  <!-- DISTANT PRAIRIE HORIZON — low, rolling, undramatic -->
  <path d="M 0 70 Q 120 66 240 72 Q 360 66 480 70 L 480 84 L 0 84 Z"
        fill={prairieShadow} opacity="0.55" />
  <!-- second horizon ridge a bit closer -->
  <path d="M 0 82 Q 120 78 240 84 Q 360 78 480 82 L 480 92 L 0 92 Z"
        fill={prairieGrass} opacity="0.7" />

  <!-- ROLLING PRAIRIE GROUND — both banks of creek, open and exposed -->
  <rect x="0" y="92" width={LMK_VIEW_W} height={LMK_VIEW_H - 92} fill={prairieGrass} opacity="0.85" />
  <!-- light shadow in foreground -->
  <rect x="0" y="170" width={LMK_VIEW_W} height="30" fill={prairieShadow} opacity="0.3" />
  <!-- prairie grass tussock dots -->
  <g stroke={prairieShadow} stroke-width="0.3" opacity="0.55">
    {#each Array(45) as _, i}
      {@const x = 6 + (i * 11) % 472}
      {@const y = 110 + ((i * 13) % 80)}
      <line x1={x} y1={y} x2={x} y2={y - 2 - (i % 2)} />
    {/each}
  </g>

  <!-- ROCK CREEK CUT — narrow, cut-banked, the scene's geographic reason -->
  <!-- creek surface visible between cut banks (oblique view) -->
  <path d="M 200 124 L 280 124 L 270 148 L 210 148 Z"
        fill={creekWater} stroke={inkSoft} stroke-width="0.4" />
  <!-- a couple flow crests -->
  <g stroke={LMK.white} stroke-width="0.25" opacity="0.45">
    <line x1="220" y1="132" x2="244" y2="132" />
    <line x1="216" y1="142" x2="248" y2="142" />
  </g>
  <!-- steep cut banks — exposed dark soil, the reason the toll bridge mattered -->
  <path d="M 180 110 L 200 124 L 210 148 L 190 148 Z"
        fill={creekBank} stroke={ink} stroke-width="0.4" />
  <path d="M 300 110 L 280 124 L 270 148 L 290 148 Z"
        fill={creekBank} stroke={ink} stroke-width="0.4" />

  <!-- COTTONWOODS lining the creek — frame the bridge -->
  <g>
    <!-- left bank cottonwoods (behind west ranch, between buildings and creek) -->
    <ellipse cx="170" cy="100" rx="22" ry="8" fill={cottonwoodCanopy} opacity="0.85" />
    <line x1="170" y1="106" x2="170" y2="118" stroke={cottonwoodTrunk} stroke-width="0.8" />
    <ellipse cx="190" cy="98" rx="18" ry="7" fill={cottonwoodCanopy} opacity="0.85" />
    <!-- right bank cottonwoods -->
    <ellipse cx="310" cy="98" rx="20" ry="8" fill={cottonwoodCanopy} opacity="0.85" />
    <ellipse cx="290" cy="100" rx="18" ry="7" fill={cottonwoodCanopy} opacity="0.85" />
    <line x1="310" y1="104" x2="310" y2="118" stroke={cottonwoodTrunk} stroke-width="0.8" />
  </g>

  <!-- TOLL BRIDGE — central, rough timber, the newest construction.
       Simple flat-deck plank, no rails, supported on rough piling. -->
  <g>
    <!-- bridge deck (planks, viewed obliquely) -->
    <path d="M 200 124 L 280 124 L 274 128 L 206 128 Z"
          fill={bridgePlank} stroke={ink} stroke-width="0.5" />
    <!-- plank seams across deck -->
    <g stroke={bridgeShadow} stroke-width="0.3" opacity="0.7">
      <line x1="216" y1="124" x2="216" y2="128" />
      <line x1="232" y1="124" x2="232" y2="128" />
      <line x1="248" y1="124" x2="248" y2="128" />
      <line x1="264" y1="124" x2="264" y2="128" />
    </g>
    <!-- piling supports -->
    <line x1="220" y1="128" x2="220" y2="148" stroke={bridgeShadow} stroke-width="0.7" />
    <line x1="252" y1="128" x2="252" y2="148" stroke={bridgeShadow} stroke-width="0.7" />
    <!-- toll post — single upright on the west approach -->
    <line x1="198" y1="124" x2="198" y2="116" stroke={logEnd} stroke-width="0.8" />
    <line x1="194" y1="116" x2="202" y2="116" stroke={logEnd} stroke-width="0.5" />
  </g>

  <!-- WEST RANCH (left of bridge) — station house with lean-to store
       and barn behind. Squat, sod-roofed, log-frame. -->
  <g>
    <!-- 80x20 BARN, set behind the station house — large in silhouette -->
    <g transform="translate(78 100)">
      <!-- barn body -->
      <rect x="-30" y="-4" width="60" height="18" fill={sodWall} stroke={ink} stroke-width="0.45" />
      <!-- sod roof, shallow pitch -->
      <path d="M -32 -4 L 0 -14 L 32 -4 Z" fill={sodRoof} stroke={ink} stroke-width="0.45" />
      <!-- roof grass tufts -->
      <g stroke={sodRoofHi} stroke-width="0.4" opacity="0.75">
        <line x1="-20" y1="-7" x2="-19" y2="-9" />
        <line x1="-10" y1="-10" x2="-9" y2="-12" />
        <line x1="0" y1="-12" x2="1" y2="-14" />
        <line x1="10" y1="-10" x2="11" y2="-12" />
        <line x1="20" y1="-7" x2="21" y2="-9" />
      </g>
      <!-- log courses on barn wall -->
      <g stroke={logEnd} stroke-width="0.3" opacity="0.6">
        <line x1="-30" y1="0" x2="30" y2="0" />
        <line x1="-30" y1="4" x2="30" y2="4" />
        <line x1="-30" y1="8" x2="30" y2="8" />
        <line x1="-30" y1="12" x2="30" y2="12" />
      </g>
      <!-- large barn door (closed, dark) -->
      <rect x="-7" y="2" width="14" height="12" fill={logEnd} stroke={ink} stroke-width="0.35" />
    </g>

    <!-- WEST RANCH STATION HOUSE — squat, primary, in front of barn -->
    <g transform="translate(60 130)">
      <!-- station house body -->
      <rect x="-16" y="-6" width="32" height="10" fill={sodWall} stroke={ink} stroke-width="0.45" />
      <!-- sodded log construction texture lines -->
      <g stroke={sodWallSh} stroke-width="0.35" opacity="0.65">
        <line x1="-16" y1="-3" x2="16" y2="-3" />
        <line x1="-16" y1="0" x2="16" y2="0" />
        <line x1="-16" y1="3" x2="16" y2="3" />
      </g>
      <!-- saggy sod roof (shallow gable, irregular) -->
      <path d="M -18 -6 Q -2 -13 0 -14 Q 16 -10 18 -6 Z" fill={sodRoof} stroke={ink} stroke-width="0.45" />
      <!-- roof grass tufts -->
      <g stroke={sodRoofHi} stroke-width="0.4" opacity="0.8">
        <line x1="-12" y1="-9" x2="-11" y2="-12" />
        <line x1="-4" y1="-12" x2="-3" y2="-14" />
        <line x1="6" y1="-11" x2="7" y2="-13" />
        <line x1="13" y1="-8" x2="14" y2="-10" />
      </g>
      <!-- stone chimney emerging from roof -->
      <rect x="-14" y="-16" width="3" height="6" fill={stoneCap} stroke={ink} stroke-width="0.35" />
      <!-- smoke from chimney — lazy, curling sideways -->
      <path d="M -13 -16 Q -10 -22 -8 -28 Q -10 -34 -6 -38"
            stroke={LMK.paperCool} stroke-width="0.55" fill="none" opacity="0.55" />
      <!-- low door, no window visible -->
      <rect x="-2" y="-2" width="4" height="6" fill={inkSoft} stroke={ink} stroke-width="0.3" />
    </g>

    <!-- LEAN-TO STORE — attached to the right side of the station house -->
    <g transform="translate(86 132)">
      <rect x="-6" y="-6" width="12" height="8" fill={sodWall} stroke={ink} stroke-width="0.45" />
      <!-- shed-style sloped roof -->
      <path d="M -7 -6 L 6 -10 L 7 -6 Z" fill={sodRoof} stroke={ink} stroke-width="0.4" />
      <!-- small door -->
      <rect x="-1.5" y="-3" width="3" height="5" fill={inkSoft} stroke={ink} stroke-width="0.3" />
    </g>

    <!-- CROOKED CORRAL — rough rails at uneven heights, west of buildings -->
    <g stroke={corralRail} stroke-width="0.7" fill="none">
      <!-- posts at uneven heights -->
      <line x1="10" y1="152" x2="10" y2="142" />
      <line x1="22" y1="152" x2="22" y2="143" />
      <line x1="34" y1="152" x2="34" y2="141" />
      <line x1="46" y1="152" x2="46" y2="144" />
      <!-- rails between posts (not perfectly horizontal — irregular) -->
      <line x1="10" y1="145" x2="22" y2="146" />
      <line x1="22" y1="146" x2="34" y2="144" />
      <line x1="34" y1="144" x2="46" y2="146" />
      <line x1="10" y1="150" x2="46" y2="151" />
    </g>
  </g>

  <!-- EAST RANCH (right of bridge) — McCanles's hewn-log Pony Express
       swing station: 36×16×8 ft, with outside ladder to attic. Slightly
       more finished-looking than the West Ranch. -->
  <g transform="translate(360 128)">
    <!-- hewn-log body -->
    <rect x="-22" y="-9" width="44" height="12" fill={logWall} stroke={ink} stroke-width="0.45" />
    <!-- horizontal log courses (visible, hewn) -->
    <g stroke={logEnd} stroke-width="0.35" opacity="0.7">
      <line x1="-22" y1="-6" x2="22" y2="-6" />
      <line x1="-22" y1="-3" x2="22" y2="-3" />
      <line x1="-22" y1="0" x2="22" y2="0" />
    </g>
    <!-- log ends exposed at corners -->
    <g fill={logEnd}>
      <circle cx="-22" cy="-6" r="0.8" />
      <circle cx="-22" cy="-3" r="0.8" />
      <circle cx="-22" cy="0" r="0.8" />
      <circle cx="22" cy="-6" r="0.8" />
      <circle cx="22" cy="-3" r="0.8" />
      <circle cx="22" cy="0" r="0.8" />
    </g>
    <!-- shallow sod roof -->
    <path d="M -23 -9 L 0 -16 L 23 -9 Z" fill={sodRoof} stroke={ink} stroke-width="0.45" />
    <g stroke={sodRoofHi} stroke-width="0.4" opacity="0.75">
      <line x1="-12" y1="-12" x2="-11" y2="-14" />
      <line x1="0" y1="-14" x2="1" y2="-16" />
      <line x1="12" y1="-12" x2="13" y2="-14" />
    </g>
    <!-- stone fireplace chimney -->
    <rect x="16" y="-19" width="3" height="5" fill={stoneCap} stroke={ink} stroke-width="0.3" />
    <!-- low door -->
    <rect x="-3" y="-4" width="4" height="7" fill={inkSoft} stroke={ink} stroke-width="0.3" />
    <!-- OUTSIDE LADDER to attic — distinctive feature of the East Ranch -->
    <g stroke={logEnd} stroke-width="0.5">
      <line x1="-20" y1="3" x2="-18" y2="-10" />
      <line x1="-18" y1="3" x2="-16" y2="-10" />
      <line x1="-20" y1="0" x2="-18" y2="0" />
      <line x1="-19.5" y1="-3" x2="-17.5" y2="-3" />
      <line x1="-19" y1="-6" x2="-17" y2="-6" />
      <line x1="-18.5" y1="-9" x2="-16.5" y2="-9" />
    </g>
    <!-- horse corral for the Pony Express stock (very simple, beside the building) -->
    <g stroke={corralRail} stroke-width="0.6" fill="none">
      <line x1="24" y1="3" x2="24" y2="-5" />
      <line x1="34" y1="3" x2="34" y2="-4" />
      <line x1="24" y1="-2" x2="34" y2="-2" />
      <line x1="24" y1="1" x2="34" y2="1" />
    </g>
  </g>

  <!-- APPROACHING WAGON + OX-TEAM at toll point, foreground lower-left.
       Driver probably arguing the toll — visual sign of the toll's role. -->
  <g transform="translate(150 158)">
    <!-- wagon body + canvas -->
    <rect x="-9" y="-3" width="18" height="3.2" fill={LMK.earth} stroke={ink} stroke-width="0.45" />
    <path d="M -9 -3 Q 0 -10 9 -3 Z" fill={LMK.white} stroke={ink} stroke-width="0.5" />
    <!-- wheels -->
    <circle cx="-5" cy="1.5" r="2.6" fill="none" stroke={ink} stroke-width="0.5" />
    <circle cx="5" cy="1.5" r="2.6" fill="none" stroke={ink} stroke-width="0.5" />
    <!-- ox-team in front (yoke + two oxen, small) -->
    <g transform="translate(16 1)">
      <!-- yoke pole -->
      <line x1="-7" y1="0" x2="14" y2="0" stroke={LMK.earthDark} stroke-width="0.5" />
      <!-- ox 1 -->
      <ellipse cx="10" cy="0" rx="4" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
      <line x1="10" y1="2.5" x2="9" y2="5" stroke={ink} stroke-width="0.3" />
      <line x1="12" y1="2.5" x2="13" y2="5" stroke={ink} stroke-width="0.3" />
      <!-- ox 2 -->
      <ellipse cx="18" cy="0" rx="4" ry="2.5" fill={LMK.earthDark} stroke={ink} stroke-width="0.35" />
      <line x1="18" y1="2.5" x2="17" y2="5" stroke={ink} stroke-width="0.3" />
      <line x1="20" y1="2.5" x2="21" y2="5" stroke={ink} stroke-width="0.3" />
    </g>
  </g>

  <!-- caption -->
  <text x="240" y="194" text-anchor="middle"
        font-family="IM Fell English, Georgia, serif" font-size="7"
        fill={inkSoft} font-style="italic" opacity="0.9">
    Rock Creek Station — the toll crossing, Nebraska
  </text>
</g>
