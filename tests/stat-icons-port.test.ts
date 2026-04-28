import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Element-count parity check between the handoff bundle's JSX source
// (docs/handoff/stat-icons/src/stat-icons.jsx) and the ported Svelte
// files. Same shape as tests/landmark-icons-port.test.ts — counts
// per-tag occurrences (path/rect/circle/ellipse/line/text/g) inside
// each function body and asserts equality.
//
// `leg` and `weather` are intentionally absent from HANDOFF_MAPPING:
// they're fresh draws in matching vocabulary, no JSX source to
// compare against.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HANDOFF_FILE = path.resolve(
  __dirname,
  '../docs/handoff/stat-icons/src/stat-icons.jsx'
);
const PORTED_DIR = path.resolve(__dirname, '../src/lib/ui/stat-icons');

const TAG_NAMES = [
  'path', 'rect', 'circle', 'ellipse', 'line', 'text', 'g'
];

// kind → exported JSX function name. The 8 kinds in the bundle.
const HANDOFF_MAPPING: Record<string, string> = {
  day:     'DayIcon',
  date:    'DateIcon',
  pace:    'PaceIcon',
  rations: 'RationsIcon',
  morale:  'MoraleIcon',
  health:  'HealthIcon',
  cash:    'CashIcon',
  water:   'WaterIcon'
};

function loadJsxSource(): string {
  return readFileSync(HANDOFF_FILE, 'utf-8');
}

/** Find `export function <name>(...)` and return what's between the
 *  outermost braces of its BODY (not the destructured-params block).
 *  Stat-icon JSX uses `function DayIcon({ size = 16, title }) { ... }`,
 *  so we have to skip past the parens first. Returns null if not found. */
function extractFunctionBody(source: string, fnName: string): string | null {
  const headerStart = source.indexOf(`function ${fnName}(`);
  if (headerStart === -1) return null;

  // Skip the parameter list — track paren depth so we don't fool
  // ourselves on destructuring ({, }) inside the params.
  let i = headerStart + `function ${fnName}`.length;
  let parenDepth = 0;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '(') parenDepth++;
    else if (c === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        i++; // step past the closing )
        break;
      }
    }
  }
  // Now find the body-opening `{`.
  i = source.indexOf('{', i);
  if (i === -1) return null;
  const bodyStart = i;
  let braceDepth = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '{') braceDepth++;
    else if (c === '}') {
      braceDepth--;
      if (braceDepth === 0) return source.slice(bodyStart + 1, i);
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

describe('stat-icons port fidelity', () => {
  const jsxAll = loadJsxSource();

  for (const [kind, fnName] of Object.entries(HANDOFF_MAPPING)) {
    const sveltePath = path.join(PORTED_DIR, `${kind}.svelte`);
    const ported = existsSync(sveltePath);
    const label = ported ? `${kind} matches JSX element counts` : `${kind} (unported — skipped)`;

    it.skipIf(!ported)(label, () => {
      const jsxBody = extractFunctionBody(jsxAll, fnName);
      expect(jsxBody, `JSX function ${fnName} not found in handoff bundle`).toBeTruthy();
      const svelteContent = readFileSync(sveltePath, 'utf-8');
      // The bundle's JSX wraps each icon in its own outer <svg>; the
      // Svelte port files are <g>-only fragments. Subtract the outer
      // <svg> count from the JSX side so the comparison is apples-to-
      // apples. (StatIcon.svelte's dispatcher owns the outer svg.)
      const jsxCounts = countTags(jsxBody!);
      const svelteCounts = countTags(svelteContent);
      // The JSX outer svg adds ONE <g> only if the body uses one;
      // verify by spot-checking that 'svg' isn't in our tag list. It
      // isn't — TAG_NAMES skips svg deliberately. So counts should
      // match unmodified.
      expect(svelteCounts).toEqual(jsxCounts);
    });
  }
});
