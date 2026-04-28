import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Element-count parity check between the handoff bundle's JSX source
// and the ported Svelte files. Same shape as
// tests/landmark-icons-port.test.ts and tests/stat-icons-port.test.ts.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HANDOFF_FILE = path.resolve(
  __dirname,
  '../docs/handoff/profession-icons/src/icons-professions.jsx'
);
const PORTED_DIR = path.resolve(__dirname, '../src/lib/ui/profession-icons');

const TAG_NAMES = ['path', 'rect', 'circle', 'ellipse', 'line', 'text', 'g'];

const HANDOFF_MAPPING: Record<string, string> = {
  banker:        'ProfessionIconBanker',
  farmer:        'ProfessionIconFarmer',
  carpenter:     'ProfessionIconCarpenter',
  doctor:        'ProfessionIconDoctor',
  blacksmith:    'ProfessionIconBlacksmith',
  hunter:        'ProfessionIconHunter',
  teamster:      'ProfessionIconTeamster',
  merchant:      'ProfessionIconMerchant',
  whore:         'ProfessionIconWhore',
  scout:         'ProfessionIconScout',
  preacher:      'ProfessionIconPreacher',
  indian_trader: 'ProfessionIconIndianTrader',
  gunsmith:      'ProfessionIconGunsmith'
};

function loadJsxSource(): string {
  return readFileSync(HANDOFF_FILE, 'utf-8');
}

/** Extract the body of `function <name>()`. The profession bundle uses
 *  unparametrized functions, but the extractor handles destructured
 *  params too (skips past parens before finding the body's `{`). */
function extractFunctionBody(source: string, fnName: string): string | null {
  const headerStart = source.indexOf(`function ${fnName}(`);
  if (headerStart === -1) return null;
  let i = headerStart + `function ${fnName}`.length;
  let parenDepth = 0;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '(') parenDepth++;
    else if (c === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        i++;
        break;
      }
    }
  }
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

function stripComments(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/g, '') // Svelte script blocks (line comments inside can mention SVG tags)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '') // JSX braces-around-block-comment
    .replace(/<!--[\s\S]*?-->/g, '');           // HTML/Svelte comments
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

describe('profession-icons port fidelity', () => {
  const jsxAll = loadJsxSource();

  for (const [id, fnName] of Object.entries(HANDOFF_MAPPING)) {
    const sveltePath = path.join(PORTED_DIR, `${id}.svelte`);
    const ported = existsSync(sveltePath);
    const label = ported ? `${id} matches JSX element counts` : `${id} (unported — skipped)`;

    it.skipIf(!ported)(label, () => {
      const jsxBody = extractFunctionBody(jsxAll, fnName);
      expect(jsxBody, `JSX function ${fnName} not found`).toBeTruthy();
      const svelteContent = readFileSync(sveltePath, 'utf-8');
      const jsxCounts = countTags(jsxBody!);
      const svelteCounts = countTags(svelteContent);
      expect(svelteCounts).toEqual(jsxCounts);
    });
  }
});
