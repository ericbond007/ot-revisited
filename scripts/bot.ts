// #275 CLI driver for the game-playing bot.
//
// Modes:
//   npm run bot                                     # 1 run, balanced, random seed
//   npm run bot -- --runs 10                        # 10 runs, aggregated summary
//   npm run bot -- --persona aggressive             # pick persona
//   npm run bot -- --persona chaos                  # seeded-random fuzz mode
//   npm run bot -- --seed bot-1234                  # reproducible
//   npm run bot -- --runs 50 --quiet                # summary only
//   npm run bot -- --verbose                        # per-run breakdown
//   npm run bot -- --json out.json                  # write per-run reports
//   npm run bot -- --profession-sweep               # one run per leader profession
//   npm run bot -- --year-sweep                     # sweeps 1841 / 1849 / 1856 / 1869
//
// Driven via tsx — see package.json `scripts.bot`. Direct engine
// calls, no SvelteKit, no HTTP.

import { writeFileSync } from 'fs';
import { runBot } from '../src/lib/dev/bot/runner';
import { PROFESSIONS } from '../src/lib/game/content/professions';
import type { ProfessionId } from '../src/lib/game/types';
import type { BotRunReport, PersonaId } from '../src/lib/dev/bot/types';

interface CliOpts {
  runs: number;
  persona: PersonaId;
  seed: string | null;
  quiet: boolean;
  verbose: boolean;
  json: string | null;
  professionSweep: boolean;
  yearSweep: boolean;
  partySweep: boolean;
  partySize: number | null;
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = {
    runs: 1,
    persona: 'balanced',
    seed: null,
    quiet: false,
    verbose: false,
    json: null,
    professionSweep: false,
    yearSweep: false,
    partySweep: false,
    partySize: null
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--runs') opts.runs = parseInt(argv[++i], 10);
    else if (a === '--persona') opts.persona = argv[++i] as PersonaId;
    else if (a === '--seed') opts.seed = argv[++i];
    else if (a === '--quiet') opts.quiet = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a === '--json') opts.json = argv[++i];
    else if (a === '--profession-sweep') opts.professionSweep = true;
    else if (a === '--year-sweep') opts.yearSweep = true;
    else if (a === '--party-sweep') opts.partySweep = true;
    else if (a === '--party-size' || a === '--party') opts.partySize = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log('Usage: npm run bot -- [--runs N] [--persona cautious|balanced|aggressive|chaos] [--seed STR]');
      console.log('                       [--quiet] [--verbose] [--json PATH]');
      console.log('                       [--party-size N] [--party-sweep]');
      console.log('                       [--profession-sweep] [--year-sweep]');
      console.log('       chaos = seeded-random "dumbass tourist" mode for fuzz coverage');
      console.log('       --party-size N = total party size 2..6 (default 3 = leader + 2 companions)');
      console.log('       --party-sweep  = one run per party size 2/3/4/5/6');
      console.log('       --profession-sweep = one run per leader profession (catches');
      console.log('         profession-specific bugs)');
      console.log('       --year-sweep = sweeps 1841 / 1849 / 1856 / 1869 (catches year-');
      console.log('         gate bugs like Fort Hall abandonment, Cayuse War, Barlow Road)');
      process.exit(0);
    }
  }
  if (opts.partySize !== null && (opts.partySize < 1 || opts.partySize > 6)) {
    console.error(`--party-size must be 1..6 (got ${opts.partySize}).`);
    process.exit(1);
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
  const prof = r.leaderProfession.padEnd(13);
  return `  [${r.persona.padEnd(10)}] ${prof} p${r.startingPartySize} seed=${r.seed.padEnd(20)} ${outcome} day=${days} mi=${miles} party=${survivors} score=${arrival} fun=${fun}`;
}

function aggregate(reports: BotRunReport[]): {
  arrived: number;
  wiped: number;
  inProgress: number;
  avgDays: number;
  avgMiles: number;
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
    avgMiles: Math.round(avg(reports.map((r) => r.milesTraveled))),
    avgArrivalScore: Math.round(avg(reports.map((r) => r.arrivalScore))),
    avgFunScore: Math.round(avg(reports.map((r) => r.funScore))),
    errorCount: reports.reduce((s, r) => s + r.errors.length, 0)
  };
}

function printReport(report: BotRunReport, opts: CliOpts): void {
  console.log(formatReport(report));
  if (opts.verbose) {
    console.log('    decisions:', report.decisionsMade, 'unique-events:', report.uniqueEventCount, 'drama:', report.dramaBeatCount);
    console.log('    deaths-by-cause:', JSON.stringify(report.deathsByCause));
    console.log('    fun-breakdown:', JSON.stringify(report.funBreakdown));
    const ad = report.actionDays;
    const total = ad.travel + ad.rest + ad.findWater + ad.hunt + ad.ford + ad.tradingPost + ad.eventChoice + ad.other;
    const pct = (n: number) => total > 0 ? Math.round(100 * n / total) + '%' : '-';
    console.log(`    days-by-action: travel=${ad.travel} (${pct(ad.travel)}) rest=${ad.rest} (${pct(ad.rest)}) findWater=${ad.findWater} (${pct(ad.findWater)}) hunt=${ad.hunt} ford=${ad.ford} post=${ad.tradingPost} event=${ad.eventChoice}`);
    const top = Object.entries(report.eventsFiredById)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    if (top) console.log('    top events:', top);
  }
}

function runProfessionSweep(opts: CliOpts): BotRunReport[] {
  const reports: BotRunReport[] = [];
  const seedBase = opts.seed ?? `prof-${Date.now()}`;
  const profIds = Object.keys(PROFESSIONS) as ProfessionId[];
  for (const leader of profIds) {
    const seed = `${seedBase}-${leader}`;
    const report = runBot({
      seed, persona: opts.persona, leaderProfession: leader,
      partySize: opts.partySize ?? undefined
    });
    reports.push(report);
    if (!opts.quiet) printReport(report, opts);
  }
  return reports;
}

function runYearSweep(opts: CliOpts): BotRunReport[] {
  const reports: BotRunReport[] = [];
  const seedBase = opts.seed ?? `year-${Date.now()}`;
  const years = [1841, 1849, 1856, 1869];
  for (const year of years) {
    const seed = `${seedBase}-${year}`;
    const report = runBot({
      seed,
      persona: opts.persona,
      startDate: { year, month: 4, day: 15 },
      partySize: opts.partySize ?? undefined
    });
    reports.push(report);
    if (!opts.quiet) printReport(report, opts);
  }
  return reports;
}

function runPartySweep(opts: CliOpts): BotRunReport[] {
  const reports: BotRunReport[] = [];
  const seedBase = opts.seed ?? `party-${Date.now()}`;
  for (const partySize of [2, 3, 4, 5, 6]) {
    const seed = `${seedBase}-p${partySize}`;
    const report = runBot({ seed, persona: opts.persona, partySize });
    reports.push(report);
    if (!opts.quiet) printReport(report, opts);
  }
  return reports;
}

function runStandard(opts: CliOpts): BotRunReport[] {
  const reports: BotRunReport[] = [];
  const seedBase = opts.seed ?? `bot-${Date.now()}`;
  for (let i = 0; i < opts.runs; i++) {
    const seed = opts.runs === 1 ? seedBase : `${seedBase}-${i}`;
    const report = runBot({
      seed, persona: opts.persona,
      partySize: opts.partySize ?? undefined
    });
    reports.push(report);
    if (!opts.quiet) printReport(report, opts);
  }
  return reports;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  let mode: string;
  let reports: BotRunReport[];
  const startMs = Date.now();

  if (opts.professionSweep) {
    mode = 'profession-sweep';
    reports = runProfessionSweep(opts);
  } else if (opts.yearSweep) {
    mode = 'year-sweep (1841 / 1849 / 1856 / 1869)';
    reports = runYearSweep(opts);
  } else if (opts.partySweep) {
    mode = 'party-sweep (size 2 / 3 / 4 / 5 / 6)';
    reports = runPartySweep(opts);
  } else {
    const sizeNote = opts.partySize ? ` party=${opts.partySize}` : '';
    mode = `${opts.runs} run${opts.runs === 1 ? '' : 's'}${sizeNote}`;
    reports = runStandard(opts);
  }

  const elapsedMs = Date.now() - startMs;
  const agg = aggregate(reports);

  console.log('');
  console.log(`${mode} (persona: ${opts.persona}) — ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`Arrived:    ${agg.arrived} / ${reports.length}  (${Math.round(100 * agg.arrived / reports.length)}%)`);
  console.log(`Wiped:      ${agg.wiped}`);
  console.log(`Stalled:    ${agg.inProgress}  (hit max-day cap — investigate)`);
  console.log(`Avg days:   ${agg.avgDays}`);
  console.log(`Avg miles:  ${agg.avgMiles}`);
  console.log(`Avg arrival score: ${agg.avgArrivalScore}`);
  console.log(`Avg fun score:     ${agg.avgFunScore} / 100`);

  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify({ mode, persona: opts.persona, elapsedMs, aggregate: agg, reports }, null, 2));
    console.log(`Wrote detail JSON: ${opts.json}`);
  }

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
