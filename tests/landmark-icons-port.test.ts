import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Element-count parity check between the handoff bundle's JSX source
// and the ported Svelte files. Runs over every id in HANDOFF_MAPPING
// that has a corresponding `.svelte` file in src/lib/ui/landmark-icons/
// — unported ids are skipped. Catches:
//   - dropped elements (port has fewer paths/rects/etc. than JSX)
//   - hallucinated elements (port has more)
//   - silently-removed helper components (e.g. dropping <RiverSurface>)
//
// Doesn't catch coordinate drift — that's what the visual-diff specimen
// at /dev/landmark-icons is for. But the port rule is "verbatim path
// data," so coordinate drift only happens when the agent ignores the
// rule entirely; the count test is the cheap canary.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HANDOFF_DIR = path.resolve(__dirname, '../docs/handoff/landmark-icons/src');
const PORTED_DIR = path.resolve(__dirname, '../src/lib/ui/landmark-icons');

const JSX_FILES = [
  'icons-arrival.jsx',
  'icons-passbys.jsx',
  'icons-rivers.jsx',
  'icons-trading-posts.jsx'
];

// Tags worth counting — both raw SVG primitives and our helper
// components. If the port silently drops <RiverSurface> in favor of
// inline rects, the counts diverge and the test fails.
const TAG_NAMES = [
  'path', 'rect', 'circle', 'ellipse', 'line', 'text', 'g',
  'HybridBadge', 'RiverSurface', 'FloatingWagon', 'ShallowFordWagon'
];

// Snake-case landmark id → JSX function name. Built from the bundle's
// LandmarkIcon.svelte registry. Two landmarks (whitman_mission,
// barlow_road) are fresh draws in matching vocabulary — no JSX source
// to compare against; they're omitted here on purpose.
const HANDOFF_MAPPING: Record<string, string> = {
  // Trading posts
  hollenberg_ranch:      'Lmk_Hollenberg',
  ft_kearny:             'Lmk_FortKearny',
  robidoux_post:         'Lmk_Robidoux',
  ft_laramie:            'Lmk_FortLaramie',
  ft_bridger:            'Lmk_FortBridger',
  ft_hall:               'Lmk_FortHall',
  ft_boise:              'Lmk_FortBoise',
  ft_walla_walla:        'Lmk_FortWallaWalla',
  the_dalles:            'Lmk_TheDalles',
  // River fords
  kansas_river:          'Lmk_KansasRiver',
  big_blue_river:        'Lmk_BigBlueRiver',
  // LANDMARKS canonical ids — `north_platte_1/2` are the eastern /
  // western Platte fords (bundle JSX names them East/West);
  // `snake_three_island` is the braided Snake crossing (bundle JSX
  // names it ThreeIsland). The svelte file names match LANDMARKS.
  north_platte_1:        'Lmk_NorthPlatteEast',
  north_platte_2:        'Lmk_NorthPlatteWest',
  sweetwater_1:          'Lmk_SweetwaterFord',
  green_river:           'Lmk_GreenRiver',
  bear_river:            'Lmk_BearRiver',
  snake_three_island:    'Lmk_ThreeIsland',
  // Arrival landmarks
  alcove_spring:         'Lmk_AlcoveSpring',
  ash_hollow:            'Lmk_AshHollow',
  chimney_rock:          'Lmk_ChimneyRock',
  scotts_bluff:          'Lmk_ScottsBluff',
  register_cliff:        'Lmk_RegisterCliff',
  independence_rock:     'Lmk_IndependenceRock',
  devils_gate:           'Lmk_DevilsGate',
  south_pass:            'Lmk_SouthPass',
  pacific_springs:       'Lmk_PacificSprings',
  soda_springs:          'Lmk_SodaSprings',
  laurel_hill:           'Lmk_LaurelHill',
  // Pass-bys — ids match LANDMARKS canonical naming (the bundle JSX
  // function names sometimes diverge: `parting_of_ways` is the LANDMARKS
  // id but the JSX function is `PB_PartingOfTheWays`, etc).
  courthouse_rock:       'PB_CourthouseJail',
  guernsey_ruts:         'PB_GuernseyRuts',
  willow_springs:        'PB_WillowSprings',
  ice_slough:            'PB_IceSlough',
  parting_of_ways:       'PB_PartingOfTheWays',
  farewell_bend:         'PB_FarewellBend',
  blue_mountains:        'PB_BlueMountains',
  grande_ronde:          'PB_GrandeRonde',
  // Trail termini
  independence_mo:       'PB_IndependenceMO_Start',
  oregon_city:           'PB_OregonCity_End'
};

function loadJsxBundle(): string {
  return JSX_FILES
    .map((f) => readFileSync(path.join(HANDOFF_DIR, f), 'utf-8'))
    .join('\n');
}

/** Find the body of `function <name>() { ... }` and return what's
 *  between the outermost braces. Returns null if not found. */
function extractFunctionBody(source: string, fnName: string): string | null {
  const start = source.indexOf(`function ${fnName}()`);
  if (start === -1) return null;
  let i = source.indexOf('{', start);
  if (i === -1) return null;
  const bodyStart = i;
  let depth = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(bodyStart + 1, i);
    }
    i++;
  }
  return null;
}

// Strip JSX braces-around-block-comment and HTML comments so a comment
// mentioning <rect> doesn't inflate the count.
function stripComments(s: string): string {
  return s
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function countTags(content: string): Record<string, number> {
  const stripped = stripComments(content);
  const counts: Record<string, number> = {};
  for (const tag of TAG_NAMES) {
    const re = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
    counts[tag] = (stripped.match(re) ?? []).length;
  }
  return counts;
}

describe('landmark-icons port fidelity', () => {
  const jsxAll = loadJsxBundle();

  for (const [id, fnName] of Object.entries(HANDOFF_MAPPING)) {
    const sveltePath = path.join(PORTED_DIR, `${id}.svelte`);
    const ported = existsSync(sveltePath);
    const label = ported ? `${id} matches JSX element counts` : `${id} (unported — skipped)`;

    it.skipIf(!ported)(label, () => {
      const jsxBody = extractFunctionBody(jsxAll, fnName);
      expect(jsxBody, `JSX function ${fnName} not found in handoff bundle`).toBeTruthy();
      const svelteContent = readFileSync(sveltePath, 'utf-8');
      const jsxCounts = countTags(jsxBody!);
      const svelteCounts = countTags(svelteContent);
      // Equal-shape comparison gives a per-tag diff in the failure
      // message, which the implementer can use to fix the missing /
      // hallucinated elements directly.
      expect(svelteCounts).toEqual(jsxCounts);
    });
  }
});
