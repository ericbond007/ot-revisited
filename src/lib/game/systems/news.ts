import type { GameState } from '../types';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import { LANDMARKS, type Landmark } from '../content/landmarks';
import { TRIBES, attitudeLevel } from '../content/tribes';
import { eligibleHeadlines, type NewsHeadline, type HeadlineEffect } from '../content/news-headlines';
import { getTribeAttitude } from './tribe-relations';
import { dayOfYear, severityShift, WINTER_SEVERITY_SHIFT_DAYS } from './winter';

// Trail gossip — actionable hints the player picks up from encounters,
// trading posts, and landmark arrivals. News surfaces in the event log
// with a `📢 News:` prefix and is also stashed on `flags._news` so a
// future journal panel can render the rolling list.
//
// Topics:
//   tribe       — "Sioux are restless near Laramie"
//   water       — "Sweetwater is running high" / "springs at X are dry"
//   weather     — "early frost in the mountains"
//   opportunity — "Bridger has good moccasins"
//   hazard      — "cholera hit the train ahead of you"
//
// News is purely informational for now. The player reads it and
// decides what to do. Mechanics (e.g. cholera-event probability bumps
// after a "cholera ahead" rumor) can layer on later.

export type NewsTopic = 'tribe' | 'water' | 'weather' | 'opportunity' | 'hazard';

export interface NewsItem {
  text: string;
  /** Who told you. "Eastbound emigrant", "Fort Laramie clerk", "Mail rider", etc. */
  source: string;
  topic: NewsTopic;
  /** In-game day the news was learned. */
  day: number;
  /** Optional world-effect hook — runs once when the news is added.
   *  Lets gossip be mechanically real: a cholera rumor temporarily
   *  boosts cholera event weight, a tribe rumor shifts attitude, a
   *  buffalo-herd tip bumps the next week's hunt yield. */
  applyEffect?: (state: GameState) => GameState;
}

const NEWS_CAP = 30;
const NEWS_PREFIX = '📢 News:';

function readNews(state: GameState): NewsItem[] {
  // The flags type doesn't allow array values, so we round-trip through
  // unknown — the news list is JSON-serializable so save/load handle it.
  return (state.flags._news as unknown as NewsItem[] | undefined) ?? [];
}

function writeNews(state: GameState, items: NewsItem[]): GameState {
  return {
    ...state,
    flags: { ...state.flags, _news: items as unknown as Record<string, unknown> }
  };
}

/** Push a news item into both the event log and the journal flag. If
 *  the item carries an `applyEffect` hook, it fires once here so the
 *  rumor concretely shifts the world state.
 *
 *  The function reference is stripped from the persisted record before
 *  it lands in `flags._news` — SvelteKit form-action returns go through
 *  devalue, which throws on functions. The effect has already fired by
 *  this point, so only the displayable fields need to survive. */
export function addNews(state: GameState, item: NewsItem): GameState {
  let next = state;
  if (item.applyEffect) next = item.applyEffect(next);
  const { applyEffect: _stripped, ...persisted } = item;
  void _stripped;
  const items = [...readNews(next), persisted].slice(-NEWS_CAP);
  return {
    ...writeNews(next, items),
    eventLog: [
      ...next.eventLog,
      { day: next.day, text: `${NEWS_PREFIX} ${item.text} (— ${item.source})` }
    ]
  };
}

/** All currently-stashed news, oldest first. */
export function recentNews(state: GameState): NewsItem[] {
  return readNews(state);
}

// --- World-effect hooks ---

/** Bumps cholera event weight for 14 days. Read by systems/events.ts. */
export function effectCholeraScare(s: GameState): GameState {
  return { ...s, flags: { ...s.flags, _choleraHintedUntilDay: s.day + 14 } };
}

/** Boosts hunt yield for 7 days. Read by actions/hunt.ts. */
export function effectHuntBonus(s: GameState): GameState {
  return { ...s, flags: { ...s.flags, _huntBonusUntilDay: s.day + 7 } };
}

/** Shifts a tribe's attitude by `delta` (clamped). Used by tribe-gossip news
 *  so the rumor matches the (newly-shifted) world state. */
export function effectTribeShift(tribeId: string, delta: number) {
  return (s: GameState): GameState => {
    const map = (s.flags._tribeAttitudes as Record<string, number> | undefined) ?? {};
    const tribe = TRIBES.find((t) => t.id === tribeId);
    const current = map[tribeId] ?? tribe?.baselineAttitude ?? 50;
    const next = Math.max(0, Math.min(100, current + delta));
    return {
      ...s,
      flags: { ...s.flags, _tribeAttitudes: { ...map, [tribeId]: next } }
    };
  };
}

// --- Generators ---

/** Pick a tribe in any region the trail covers, weighted toward the
 *  region the party is currently approaching. Returns the tribe + a
 *  flavor word reflecting current attitude. */
function pickTribeForRumor(state: GameState, rng: Rng) {
  // Prefer tribes whose region the party is in or near.
  const m = state.location.milesTraveled;
  const candidates = TRIBES.filter(
    (t) => Math.abs((t.region.fromMile + t.region.toMile) / 2 - m) < 600
  );
  const pool = candidates.length > 0 ? candidates : [...TRIBES];
  const tribe = pool[rng.int(0, pool.length - 1)];
  const level = attitudeLevel(getTribeAttitude(state, tribe.id));
  return { tribe, level };
}

/** A river or scenic landmark up the trail to attribute water/weather rumors to. */
function pickUpcomingLandmark(state: GameState, rng: Rng): Landmark | null {
  const m = state.location.milesTraveled;
  const ahead: Landmark[] = [];
  let running = 0;
  for (const l of LANDMARKS) {
    running += l.milesFromPrevious;
    if (running > m && running < m + 800 && (l.kind === 'river' || l.kind === 'landmark')) {
      ahead.push(l);
    }
  }
  if (ahead.length === 0) return null;
  return ahead[rng.int(0, ahead.length - 1)];
}

// ── Seasonal snow-news schedule (#1304-T3) ─────────────────────────────────
//
// A hidden-severity-keyed schedule: the first mountain-snow news item becomes
// eligible from base DOY + severityShift(state) + per-seed jitter ≤ JITTER_MAX.
// Three escalating tiers of copy surface as the calendar advances past
// the eligible DOY.  The hidden severity NEVER appears in any news string or
// flag — only the observed timing (early vs late arrival of dustings) leaks it.
//
// checkSnowNews(state) is called from the daily-steps spine (POST_BRANCH_STEPS)
// for BOTH player and bot runs. It fires at most once per game-day
// (_snowNewsLastDay guard) and records _firstSnowNewsDay on first surface.
//
// Fort gossip: getFortSnowGossip(state, postName) returns tier copy for
// ft_hall / ft_boise / whitman_mission when visited in-season — the period
// anchor is Captain Richard Grant at Fort Hall warning emigrants about winter
// (emigrant diaries 1845–1851 consistently record his counsel). Called from
// +page.server.ts alongside generatePostGossip so player gets the warning
// on arrival; bots rely on the daily-tick path.
//
// Tier-3 anchor is the existing copy in generatePostGossip roll===2:
//   "Heavy snow is in the high passes — wagons are turning back."

/** Base day-of-year for the first eligible snow-news item at 'normal' severity
 *  (Oct 5 = DOY 278). Shift by severityShift(state) for early/late years. */
export const SNOW_NEWS_BASE_DOY = 278; // Oct 5

/** Per-seed deterministic jitter added on top of the shifted base.
 *  Bounded [0, SNOW_NEWS_JITTER_MAX] so no run fires earlier than the
 *  shifted base. Sub-rng `snownews:${seed}` keeps it off the main stream. */
export const SNOW_NEWS_JITTER_MAX = 5;

/** Days past eligible DOY when each tier activates:
 *  tier 1: offset 0  — "first dustings on the peaks"
 *  tier 2: offset 14 — "snow lying early in the high country"
 *  tier 3: offset 28 — "Heavy snow … wagons are turning back" (anchor copy) */
export const SNOW_NEWS_TIER_OFFSETS: readonly [number, number, number] = [0, 14, 28];

/** The three tier copies, ordered by tier (index 0 = tier 1, index 2 = tier 3).
 *  Period voice: terse, dread-building, no comfort.  No severity words. */
const SNOW_NEWS_TIER_TEXT: readonly string[] = [
  // Tier 1 — first dustings.  Period diaries: "white caps on the Blues this morning."
  'Snow dusting the peaks to the west this morning. The mountains look close.',
  // Tier 2 — snow lying.  Period diaries: "snow lying deep in the passes" (Applegate 1843).
  'Snow lying deep in the high passes. Companies ahead are traveling hard.',
  // Tier 3 — anchor copy from generatePostGossip roll===2, winter months.
  'Heavy snow is in the high passes — wagons are turning back.'
];

/** Compute the first-eligible DOY for snow news for this run.
 *  Deterministic per seed via sub-rng `snownews:${seed}`.
 *  Result = base + severityShift + jitter ∈ [0, SNOW_NEWS_JITTER_MAX]. */
export function snowNewsEligibleDOY(state: GameState): number {
  const jitterRng = makeRng(`snownews:${state.seed}`);
  const jitter = jitterRng.int(0, SNOW_NEWS_JITTER_MAX);
  return SNOW_NEWS_BASE_DOY + severityShift(state) + jitter;
}

/** Current tier: 0 (pre-season), 1, 2, or 3.
 *  Based solely on how many days past the eligible DOY we currently are. */
export function snowNewsTier(state: GameState): 0 | 1 | 2 | 3 {
  const currentDOY = dayOfYear(state.date.month, state.date.day);
  const eligible = snowNewsEligibleDOY(state);
  if (currentDOY < eligible) return 0;
  const daysIn = currentDOY - eligible;
  if (daysIn < SNOW_NEWS_TIER_OFFSETS[1]) return 1;
  if (daysIn < SNOW_NEWS_TIER_OFFSETS[2]) return 2;
  return 3;
}

/** Check and potentially surface a scheduled snow-news item.
 *  Called from the daily-steps spine for BOTH player and bot runs.
 *
 *  Guards:
 *  - Pre-season (tier === 0): no-op.
 *  - _snowNewsLastDay === state.day: already fired today, skip.
 *
 *  On fire:
 *  - Calls addNews with tier copy and sets _snowNewsLastDay.
 *  - If _firstSnowNewsDay is unset, stamps it now (once only).
 *
 *  The _firstSnowNewsDay flag is the T4 estimator's input.  It is set here
 *  (tick-loop path) so BOTH player and bot runs stamp it on the same code
 *  path.  A bot that never visits a trading post during the season still
 *  hears this news through the daily tick — signal-honest because it fires
 *  on every day the wagon is on the trail. */
export function checkSnowNews(state: GameState): GameState {
  const tier = snowNewsTier(state);
  if (tier === 0) return state; // pre-season
  if (state.completed) return state; // game over

  // Daily de-dup: don't fire more than once per game-day.
  const lastDay = state.flags._snowNewsLastDay as number | undefined;
  if (lastDay === state.day) return state;

  const tierText = SNOW_NEWS_TIER_TEXT[tier - 1];
  const source = 'eastbound emigrants';

  let next = addNews(state, {
    text: tierText,
    source,
    topic: 'weather',
    day: state.day
  });

  // Stamp _snowNewsLastDay so this day doesn't fire again on resume.
  next = { ...next, flags: { ...next.flags, _snowNewsLastDay: next.day } };

  // _firstSnowNewsDay: set exactly once.
  if (next.flags._firstSnowNewsDay === undefined) {
    next = { ...next, flags: { ...next.flags, _firstSnowNewsDay: next.day } };
  }

  return next;
}

/** Return in-season tier gossip for the three forts before the mountain gates:
 *  Fort Hall, Fort Boise, Whitman Mission.  Period anchor: Captain Richard
 *  Grant's warnings at Fort Hall were recorded in multiple 1845–1851 diaries.
 *
 *  Returns null before the season (tier === 0) or for any other post.
 *  Never encodes the hidden severity. */
export function getFortSnowGossip(state: GameState, postName: string): NewsItem | null {
  const lowerPost = postName.toLowerCase();
  const isFortPost =
    lowerPost.includes('hall') ||
    lowerPost.includes('boise') ||
    lowerPost.includes('whitman') ||
    lowerPost.includes('mission');
  if (!isFortPost) return null;

  const tier = snowNewsTier(state);
  if (tier === 0) return null;

  const tierText = SNOW_NEWS_TIER_TEXT[tier - 1];
  // Period-authentic sources by fort.
  const source =
    lowerPost.includes('hall')
      ? 'Captain Grant, Fort Hall' // Richard Grant, HBC factor, frequently warned emigrants
      : lowerPost.includes('boise')
        ? 'Fort Boise factor'
        : 'Marcus Whitman';         // Whitman Mission — Whitman himself warned later emigrants

  return {
    text: tierText,
    source,
    topic: 'weather',
    day: state.day
  };
}

/** Pool of California-bound chatter that surfaces post-1849 (#180).
 *  Fires when `_californiaUnlocked` is set — the Gold Rush headline
 *  flips that flag (see news-headlines.ts). Authored from period diaries
 *  + emigrant letters: forty-niner talk, Hudspeth Cutoff, Hangtown
 *  yields, the eastward emptying of Indiana / Iowa towns. */
const CALIFORNIA_GOSSIP_POOL: readonly string[] = [
  'A man from Hangtown swore the diggings paid an ounce a day — and the rich ones never bragged.',
  'Half this train\'s bound for the gold fields. Schoonmaker\'s wife wouldn\'t go past Fort Hall.',
  'Forty-niners stripped the Sierra streams. They\'re prospecting south of the Mokelumne now.',
  'Letters home from Marysville say a man saves a thousand dollars in a season.',
  'The Sublette Cutoff\'s seeing more wagons than the main route this year.',
  'There\'s a new road south from Fort Hall — Hudspeth\'s — saves a week to the diggings.',
  'Whole counties back east are empty. Last winter four farms in our township pulled stakes for California.',
  'Mormon ferry up at the Green is fat on Californian gold-traffic.',
  'A train of forty-niners passed two days ago — most of \'em farmers who\'d never held a pan.',
  'San Francisco\'s a city of tents now. They say a square meal costs a dollar in dust.'
];

/** Chance a post-1849 post-gossip roll surfaces a California line
 *  instead of the normal topic mix. 25% means roughly one in four
 *  arrivals after the Gold Rush has Californian flavor — high enough
 *  to feel like the trail's mood shifted, low enough that other gossip
 *  topics (tribes, weather, hazards) still come through. */
const CALIFORNIA_GOSSIP_CHANCE = 0.25;

/** Generate a single piece of gossip for a trading-post arrival. */
export function generatePostGossip(
  state: GameState,
  rng: Rng,
  postName: string
): NewsItem | null {
  const source = `${postName} clerk`;
  const day = state.day;

  // California-flavor gossip (#180) — after the Gold Rush headline
  // unlocks the flag, ~25% of posts buzz about the diggings.
  if (state.flags._californiaUnlocked && rng.chance(CALIFORNIA_GOSSIP_CHANCE)) {
    return {
      text: rng.pick(CALIFORNIA_GOSSIP_POOL),
      source, topic: 'opportunity', day
    };
  }

  // Five-way coin flip across topic templates.
  const roll = rng.int(0, 4);

  if (roll === 0) {
    const { tribe, level } = pickTribeForRumor(state, rng);
    const tone =
      level === 'hostile' ? 'are out for blood'
      : level === 'wary' ? 'are restless'
      : level === 'neutral' ? 'are watching the trail closely'
      : level === 'friendly' ? 'are open to trade'
      : 'have been welcoming travelers';
    // The rumor concretizes — a "restless" rumor nudges relations
    // down, a "welcoming" rumor nudges them up.
    const delta =
      level === 'hostile' ? -3
      : level === 'wary' ? -2
      : level === 'neutral' ? 0
      : level === 'friendly' ? 2
      : 3;
    return {
      text: `The ${tribe.name} ${tone} this season.`,
      source, topic: 'tribe', day,
      applyEffect: delta === 0 ? undefined : effectTribeShift(tribe.id, delta)
    };
  }
  if (roll === 1) {
    const lm = pickUpcomingLandmark(state, rng);
    if (!lm) return null;
    if (lm.kind === 'river') {
      const high = rng.chance(0.5);
      return {
        text: high
          ? `${lm.name} is running high — fording is dangerous.`
          : `${lm.name} is running shallow — easy crossing right now.`,
        source, topic: 'water', day
      };
    }
    return { text: `Word is the springs near ${lm.name} are running clean.`, source, topic: 'water', day };
  }
  if (roll === 2) {
    const month = state.date.month;
    const text =
      month <= 3 || month >= 11
        ? 'Heavy snow is in the high passes — wagons are turning back.'
        : month >= 6 && month <= 8
          ? 'A dry stretch ahead. Last train rationed water for three days.'
          : 'Storms have been rolling in off the mountains the last few nights.';
    return { text, source, topic: 'weather', day };
  }
  if (roll === 3) {
    const buffalo = rng.chance(0.5);
    return {
      text: buffalo
        ? 'Buffalo herds are running thick to the south — good hunting.'
        : `${postName} is well stocked with powder, lead, and bandages this week.`,
      source, topic: 'opportunity', day,
      // Buffalo tip is real — bumps hunt yield for a week.
      applyEffect: buffalo ? effectHuntBonus : undefined
    };
  }
  const cholera = rng.chance(0.5);
  return {
    text: cholera
      ? 'Cholera struck the train just ahead — keep your water clean.'
      : 'A wagon rolled off the trail two days back. Wheel snapped clean.',
    source, topic: 'hazard', day,
    // Cholera ahead — boosts cholera event weight for two weeks.
    applyEffect: cholera ? effectCholeraScare : undefined
  };
}

// --- Newspaper generation (#150 follow-up: A+B+C hybrid) ---
//
// "Read newspaper" pulls 2-4 unread historical headlines for the
// player's current year + 1-2 dynamic gossip items, interleaves them,
// and adds them all via addNews. Headlines flagged as read in
// `flags._headlinesRead` so the same paper isn't served twice.

/** Resolve a single headline effect descriptor against world state. */
function applyHeadlineEffect(state: GameState, eff: HeadlineEffect): GameState {
  switch (eff.kind) {
    case 'california_unlock':
      // The California-leg branching (#175) reads this flag — harmless
      // until the leg itself is wired, useful as a save-state marker now.
      return { ...state, flags: { ...state.flags, _californiaUnlocked: true } };
    case 'tribe_shift':
      return effectTribeShift(eff.tribeId, eff.delta)(state);
  }
}

/** Compose multiple headline effect descriptors into one applyEffect
 *  function for the addNews pipeline. */
function composeHeadlineEffects(effects: HeadlineEffect[]) {
  return (state: GameState): GameState => {
    let next = state;
    for (const eff of effects) next = applyHeadlineEffect(next, eff);
    return next;
  };
}

const HEADLINES_PER_PAPER_MIN = 2;
const HEADLINES_PER_PAPER_MAX = 4;
const GOSSIP_PER_PAPER = 2;

function readHeadlinesRead(state: GameState): Set<string> {
  const arr = (state.flags._headlinesRead as string[] | undefined) ?? [];
  return new Set(arr);
}

function writeHeadlinesRead(state: GameState, set: Set<string>): GameState {
  return {
    ...state,
    flags: { ...state.flags, _headlinesRead: [...set] }
  };
}

/** Build the newspaper-source string from the post name + date.
 *  Period flavor: small posts get the "Saint Joseph Gazette" by mail,
 *  big hubs get something local-feeling. */
function paperSource(postName: string, year: number, month: number): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${postName} clerk's paper, ${monthNames[month - 1]} ${year}`;
}

/** Pick the headlines + gossip for a single newspaper read. Returns the
 *  ordered list of news items + the headline ids that were used (so the
 *  caller can mark them read). */
export function generateNewspaper(
  state: GameState,
  rng: Rng,
  postName: string
): { items: NewsItem[]; headlineIdsUsed: string[] } {
  const year = state.date.year;
  const month = state.date.month;
  const eligible = eligibleHeadlines(year, month);
  const alreadyRead = readHeadlinesRead(state);
  const fresh = eligible.filter((h) => !alreadyRead.has(h.id));

  // Shuffle fresh headlines deterministically and take the front N.
  const pool = [...fresh];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const targetCount = rng.int(HEADLINES_PER_PAPER_MIN, HEADLINES_PER_PAPER_MAX);
  const picked = pool.slice(0, targetCount);

  const headlineItems: NewsItem[] = picked.map((h: NewsHeadline) => ({
    text: h.text,
    source: `${paperSource(postName, year, month)} — ${h.dateline}`,
    topic: 'hazard' as NewsTopic, // Generic bucket; paper headlines aren't trail-action gossip.
    day: state.day,
    applyEffect: h.effects && h.effects.length > 0 ? composeHeadlineEffects(h.effects) : undefined
  }));

  const gossipItems: NewsItem[] = [];
  for (let i = 0; i < GOSSIP_PER_PAPER; i++) {
    const g = generatePostGossip(state, rng, postName);
    if (g) gossipItems.push(g);
  }

  // Interleave: headline, gossip, headline, headline, gossip, ...
  // Mostly headlines on top, gossip woven through.
  const items: NewsItem[] = [];
  const hQueue = [...headlineItems];
  const gQueue = [...gossipItems];
  while (hQueue.length || gQueue.length) {
    if (hQueue.length) items.push(hQueue.shift()!);
    if (gQueue.length && (items.length % 2 === 0 || hQueue.length === 0)) {
      items.push(gQueue.shift()!);
    }
  }

  return { items, headlineIdsUsed: picked.map((h) => h.id) };
}

/** A single rendered row in the newspaper modal — the items the player
 *  just bought to read. Headlines first, gossip woven in. Persisted on
 *  flags._paperBatch and cleared by the ?/ackPaper action when the
 *  player dismisses the modal. */
export interface PaperBatch {
  postName: string;
  /** "June 1849" / etc. — the masthead date. */
  dateline: string;
  items: Array<{ text: string; source: string }>;
}

/** Apply a generated newspaper batch — fires each item via addNews,
 *  records the read headline ids, and stages a PaperBatch on
 *  flags._paperBatch for the modal to pick up. */
export function applyNewspaper(
  state: GameState,
  items: NewsItem[],
  headlineIdsUsed: string[],
  postName: string
): GameState {
  let next = state;
  for (const item of items) next = addNews(next, item);
  if (headlineIdsUsed.length > 0) {
    const set = readHeadlinesRead(next);
    for (const id of headlineIdsUsed) set.add(id);
    next = writeHeadlinesRead(next, set);
  }
  if (items.length > 0) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const batch: PaperBatch = {
      postName,
      dateline: `${monthNames[next.date.month - 1]} ${next.date.year}`,
      items: items.map((i) => ({ text: i.text, source: i.source }))
    };
    next = {
      ...next,
      flags: { ...next.flags, _paperBatch: batch as unknown as Record<string, unknown> }
    };
  }
  return next;
}
