// #275 CLI driver for the game-playing bot.
//
// Usage:
//   npm run bot                                 # 1 run, balanced, random seed
//   npm run bot -- --runs 10                    # 10 runs, aggregated summary
//   npm run bot -- --persona aggressive         # pick persona
//   npm run bot -- --seed bot-1234              # reproducible
//   npm run bot -- --runs 50 --quiet            # summary only, no per-run lines
//
// Driven via tsx — see package.json `scripts.bot`. No SvelteKit, no
// HTTP — direct calls into the engine.

import { runBot } from '../src/lib/dev/bot/runner';
import type { BotRunReport, PersonaId } from '../src/lib/dev/bot/types';

interface CliOpts {
  runs: number;
  persona: PersonaId;
  seed: string | null;
  quiet: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = { runs: 1, persona: 'balanced', seed: null, quiet: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--runs') opts.runs = parseInt(argv[++i], 10);
    else if (a === '--persona') opts.persona = argv[++i] as PersonaId;
    else if (a === '--seed') opts.seed = argv[++i];
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npm run bot -- [--runs N] [--persona cautious|balanced|aggressive|chaos] [--seed STR] [--quiet] [--verbose]');
      console.log('       chaos = seeded-random "dumbass tourist" mode for fuzz coverage');
      process.exit(0);
    }
  }
  if (!['cautious', 'balanced', 'aggressive', 'chaos'].includes(opts.persona)) {
    console.error(`Unknown persona "${opts.persona}". Use cautious | balanced | aggressive | chaos.`);
    process.exit(1);
  }
  return opts;
}

function formatReport(r: BotRunReport): string {
  const survivors = `${r.endingAliveCount}/${r.startingPartySize}`;
  const outcome = r.outcome.padEnd(11);
  const days = String(r.daysElapsed).padStart(3);
  const miles = String(r.milesTraveled).padStart(4);
  const arrival = String(r.arrivalScore).padStart(5);
  const fun = String(r.funScore).padStart(3);
  return `  [${r.persona.padEnd(10)}] seed=${r.seed.padEnd(20)} ${outcome} day=${days} mi=${miles} party=${survivors} score=${arrival} fun=${fun}`;
}

function aggregate(reports: BotRunReport[]): {
  arrived: number;
  wiped: number;
  inProgress: number;
  avgDays: number;
  avgArrivalScore: number;
  avgFunScore: number;
  errorCount: number;
} {
  const arrived = reports.filter((r) => r.outcome === 'arrived').length;
  const wiped = reports.filter((r) => r.outcome === 'wiped').length;
  const inProgress = reports.filter((r) => r.outcome === 'in-progress').length;
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
  return {
    arrived,
    wiped,
    inProgress,
    avgDays: Math.round(avg(reports.map((r) => r.daysElapsed))),
    avgArrivalScore: Math.round(avg(reports.map((r) => r.arrivalScore))),
    avgFunScore: Math.round(avg(reports.map((r) => r.funScore))),
    errorCount: reports.reduce((s, r) => s + r.errors.length, 0)
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const reports: BotRunReport[] = [];
  const seedBase = opts.seed ?? `bot-${Date.now()}`;

  const startMs = Date.now();
  for (let i = 0; i < opts.runs; i++) {
    const seed = opts.runs === 1 ? seedBase : `${seedBase}-${i}`;
    const report = runBot({ seed, persona: opts.persona });
    reports.push(report);
    if (!opts.quiet) console.log(formatReport(report));
    if (opts.verbose) {
      console.log('    decisions:', report.decisionsMade, 'unique-events:', report.uniqueEventCount, 'drama:', report.dramaBeatCount);
      console.log('    deaths-by-cause:', JSON.stringify(report.deathsByCause));
      console.log('    fun-breakdown:', JSON.stringify(report.funBreakdown));
      const top = Object.entries(report.eventsFiredById)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      if (top) console.log('    top events:', top);
    }
  }
  const elapsedMs = Date.now() - startMs;

  const agg = aggregate(reports);
  console.log('');
  console.log(`Runs: ${opts.runs} (persona: ${opts.persona}) — ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Arrived:    ${agg.arrived} / ${opts.runs}  (${Math.round(100 * agg.arrived / opts.runs)}%)`);
  console.log(`Wiped:      ${agg.wiped}`);
  console.log(`Stalled:    ${agg.inProgress}  (hit max-day cap — investigate)`);
  console.log(`Avg days:   ${agg.avgDays}`);
  console.log(`Avg arrival score: ${agg.avgArrivalScore}`);
  console.log(`Avg fun score:     ${agg.avgFunScore} / 100`);
  if (agg.errorCount > 0) {
    console.log(`Errors:     ${agg.errorCount} ⚠️`);
    for (const r of reports) {
      for (const err of r.errors) {
        console.log(`  ${r.seed}: ${err}`);
      }
    }
    process.exit(1);
  }
}

main();
