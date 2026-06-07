// #302 Game AI — shared decision-layer types.
//
// Lifted from `dev/bot/` (where it was test-only) to `game/ai/` so the
// same brain drives the player bot, NPC companion wagons (#280b),
// future encountered-train wagons, and #284 multiplayer fallback.
//
// The Persona interface declares the full decision surface a wagon AI
// can express. Drivers (player bot CLI, NPC tick) consult these
// methods and route the answers through their respective execution
// paths — public actions for the player bot, direct state mutation
// for the NPC tick.

import type { GameState, CompanyRestDecision } from '../types';
import type { GameEvent } from '../content/events';
import type { Landmark } from '../content/landmarks';
import type { Rng } from '../rng';
import type { CampActionId } from '../actions/camp-actions';
import type { BundleWeights, RestBundle } from './bundle';

// Re-export the engine's canonical FordMethod so consumers get one
// source of truth instead of a parallel string union.
export type { FordMethod } from '../actions/ford';
import type { FordMethod } from '../actions/ford';
import type { EquipmentRestockOpts, FoodRestockOpts } from './shopping';
import type { WheelBreakChoice } from '../systems/wheel-break';

export type PersonaId =
  | 'cautious'
  | 'balanced'
  | 'aggressive'
  | 'chaos'
  // #287b — named-profile variants. Each derives from `balanced` and
  // overrides 1-2 methods that express the variant's signature trait
  // (Sundays off, grueling pace, hoarding, generosity, devotion, drink).
  | 'sunday_rester'
  | 'pace_pusher'
  | 'hoarder'
  | 'generous'
  | 'faithful'
  | 'drinker';

// All persona methods receive an Rng. Deterministic personas
// (cautious/balanced/aggressive) ignore it and produce the same
// answer for a given state. The chaos persona uses it to pick
// seeded-random choices — still reproducible per run seed, but
// exercises weird decision sequences a heuristic player would never
// take.

/** #934 — Persona-level foresight identity. Used by every gap-aware
 *  decision method (pickFoodRestockOpts, shouldTradeAtPost food
 *  trigger, pickOxSwapCount, future pickRepairBudget) to convert
 *  miles-to-next-supply-post into a days / lb / health-floor budget.
 *  Declared once per persona; spread automatically into inheritors
 *  via `...balancedPersona`. */
export interface PersonaForesight {
  /** Expected travel speed in mi/day. Cautious 8 (rests Sundays,
   *  hunts often), balanced 10, aggressive 12 (grueling pace). */
  paceMiPerDay: number;
  /** Multiplier on projected days-to-next-supply. Cautious 1.5
   *  (deep buffer), balanced 1.2, aggressive 1.0 (lean). */
  safetyFactor: number;
}

/** #910 — share order returned by `Persona.shouldShareWithTrain`. The
 *  item id is a string (ItemId-typed at the engine consumer side; kept
 *  loose here to avoid pulling content types into the AI surface). */
export interface ShareOrder {
  item: string;
  qty: number;
}

export interface Persona {
  id: PersonaId;
  /** #934 — Foresight identity, see PersonaForesight. */
  foresight: PersonaForesight;
  /** Pick a choice for an event. Returns the choice id. */
  pickEventChoice(state: GameState, event: GameEvent, rng: Rng): string;
  /** Daily pace setting. May change as the run progresses. */
  pickPace(state: GameState, rng: Rng): GameState['pace'];
  /** Daily rations. */
  pickRations(state: GameState, rng: Rng): GameState['rations'];
  /** #1245 — daily water-ration choice. Gap-aware: ration down when a dry
   *  stretch ahead would empty the keg at normal draw before the next water. */
  pickWaterRation(state: GameState, rng: Rng): GameState['waterRation'];
  /** Should the party rest a day? */
  shouldRest(state: GameState, rng: Rng): boolean;
  /** #1046 B — when the chartered company forces a lay-by, what does
   *  this persona do? 'abide' (default — trust the company), 'lobby'
   *  (NPC-captain only — appeal the call), 'press_on' (split from the
   *  train and travel solo). Only consulted on a `*_layby` decision;
   *  return 'abide' for travel. The bot-player path maps 'lobby' to
   *  the captain-override when the bot itself is captain. */
  shouldDissent(state: GameState, decision: CompanyRestDecision, rng: Rng): 'abide' | 'lobby' | 'press_on';
  /** #910 — Generous-driven food sharing at company camp. Called by
   *  `applyTrainShare` for each NPC companion wagon on a sabbath /
   *  maintenance lay-by block (once per block, dedup'd by the engine).
   *  Returns the share order (item id + qty) or null to skip. Only
   *  consulted in a lay-by block; the engine handles the outer gating
   *  (lay-by mode, block dedup, train present). The persona answers
   *  the inner question: given I COULD share now, do I want to and
   *  what? Generous returns a flour share when tended + reserve ample;
   *  all other personas default to null (hoarder explicitly, others
   *  by no spontaneous-giving in their character). */
  shouldShareWithTrain(state: GameState, rng: Rng): ShareOrder | null;
  /** Should the party hunt? Returns true when food is low + ammo available. */
  shouldHunt(state: GameState, rng: Rng): boolean;
  /** Pick a river-crossing method. `native_ferry` is preferred when the
   *  river has the option AND the party can pay. */
  pickFordMethod(state: GameState, here: Landmark, rng: Rng): FordMethod;
  /** Should the party trade at this post? Returns true when food/water/
   *  ammo are low AND the party has cash to spend. */
  shouldTradeAtPost(state: GameState, here: Landmark, rng: Rng): boolean;
  /** Should the party stay at the inn? Returns true when the post has an
   *  inn AND morale or party HP justifies the cost. */
  shouldStayAtInn(state: GameState, here: Landmark, rng: Rng): boolean;
  /** Should the party rest a day to find + boil water? Returns true
   *  when the keg is heading toward empty AND off-desert AND we have
   *  the means to boil (doctor or post-1854). */
  shouldFindWater(state: GameState, rng: Rng): boolean;
  /** Should the party spend a half-day panning for gold (#313)? Gates
   *  on river terrain + miles ≥ 700 + year ≥ 1849; persona decides
   *  whether to actually do it given those conditions. Cautious skips
   *  (period: didn't dawdle); aggressive always tries; chaos rolls. */
  shouldPan(state: GameState, rng: Rng): boolean;
  /** Should the party raid a nearby native camp (#316)? Period: a
   *  rare and ugly choice — every default persona refuses. Surface
   *  exists for chaos to roll on it occasionally and for future
   *  named-profile overrides (#287). All gameplay gates (rifle,
   *  ammo, raidable tribe nearby, year ≥ 1845) live in the camp
   *  action availability check; persona only gates the *want*. */
  shouldRaid(state: GameState, rng: Rng): boolean;
  /** Should the player take from another wagon in the train (#314)?
   *  Period: extreme-rare moral choice with banishment as the
   *  caught-outcome. Every default persona refuses. Chaos rolls a
   *  small chance to fuzz the path. Future named profiles like
   *  drinker / gambler (#287) can override. */
  shouldStealFromTrain(state: GameState, rng: Rng): boolean;
  /** How many fresh oxen to acquire at the current trading post via
   *  the #278 ox_swap service (0 = skip). Period: emigrants traded
   *  worn animals for fresh at Laramie / Bridger / Hall as the
   *  standard recovery tool — without this the bot's team thins past
   *  `minTeam` and the wagon strands. Persona only fires when the
   *  post offers `ox_swap`; the action itself handles surrender +
   *  cost. */
  pickOxSwapCount(state: GameState, here: Landmark, rng: Rng): number;
  /** Cash to spend on smithy repair at this post. Returns 0 to skip
   *  (e.g. condition is fine, or persona is hoarding cash for food).
   *  #303c slice A — was hardcoded to `condition < 70 && cash >= 20
   *  → min(40, cash, 100-condition)` in the runner. Personas tune
   *  the threshold + cap: cautious repairs sooner + bigger; balanced
   *  thriftier; aggressive only-when-desperate. */
  pickRepairBudget(state: GameState, here: Landmark): number;
  /**
   * Trailside response when a wagon_wheel event fires. Sibling to
   * `pickRepairBudget` (which fires at trading posts). See #929.
   */
  pickWheelBreakResponse(state: GameState, rng: Rng): WheelBreakChoice;
  /** Per-persona opts for `pickFoodRestock`. Returns the daysFloor /
   *  daysCap thresholds the persona wants applied. #303c slice A —
   *  the v10 medicine cost bump squeezed balanced's cash; lower food
   *  cap leaves room for medicine + repair. NPC drivers pass their
   *  own tighter opts directly (#299), so this only affects the
   *  player-bot composeShoppingList call. */
  pickFoodRestockOpts(state: GameState): FoodRestockOpts;
  /** #909 — Per-persona opts for `pickEquipmentRestock`. Expresses the
   *  cookware-spare disposition (cautious / Tabitha Brown overrides
   *  true). #939l replaced the older `shouldBuyCookwareSpare` /
   *  `shouldBuySaleratus` predicates — their dispositions live here
   *  (and on `pickFoodRestockOpts.saleratusOverstock`) so there is one
   *  shopping surface, not two. */
  pickEquipmentRestockOpts(state: GameState): EquipmentRestockOpts;
  /** Should the bot join a wagon train at this post (#176)? Default
   *  true — the train morale + smithy + pace-clamp benefits stack
   *  positive. Future #287 named profiles like Joe Meek (loner) or
   *  drinker / aggressive can refuse for character flavor. #303c
   *  slice B surface; current consumer is the player-bot runner's
   *  first-trading-post auto-join. */
  shouldJoinTrain(state: GameState, here: Landmark, rng: Rng): boolean;
  /** #1031 — Should the bot start its run already in a wagon train?
   *  Default true (Helen Carpenter 1857: single wagons 'did not pass
   *  the frontier'). Loner personas opt out — pace_pusher (Reed/Donner
   *  archetype that split companies to push pace), aggressive
   *  (impatient hard-charger), chaos (random). Player-bot runner
   *  calls `joinTrain` at construction when this returns true. */
  shouldStartInTrain?(rng: Rng): boolean;
  /** Should the wagon resort to cannibalism on a fresh corpse?
   *  Period: Donner Party precedent — most parties did when the
   *  alternative was the whole company starving. Default true. #287
   *  preacher-led wagon refuses on faith. NPC consumer is
   *  `npc-engine.ts:maybeCannibalize`; player path is the burial-
   *  event "Eat the body" choice (a separate decision). #303c slice
   *  B surfaces this for #287; NPC tick wiring lands with #287
   *  named profiles. */
  shouldCannibalize(state: GameState): boolean;
  /** When an NPC #280c event grows choices (today they're all
   *  choice-less mechanical mutations), this picks one. Returns null
   *  to take the default. Surface-only today; consumer lands when
   *  the first choice-bearing NPC event ships. */
  pickNpcEventChoice(state: GameState, eventId: string, choices: readonly string[], rng: Rng): string | null;
  /** #915 — Ordered list of barter swaps the persona wants to make
   *  at the current trading post. Empty when no exchange makes
   *  sense (cash surplus, no stockable surplus, post barter
   *  disabled, no preferred items in inventory). Each disposition
   *  is independently validated by `quoteBarter` before applying.
   *
   *  Cautious: trades surplus food/robes for medicine when food
   *  > 200 lb; preserves cash.
   *  Aggressive: only barters when cash < $30; rate threshold 0.80.
   *  Hoarder: refuses to give up flour/beans/saleratus.
   *  Drinker: barters whiskey freely.
   *  Chaos: rng-driven within fairness gate.
   *
   *  Bot consumer is `runner.ts:handleLandmark` after the cash
   *  trade attempt; NPC consumer is `wagon-train.ts` post-restock
   *  fallback. */
  pickBarterDispositions(state: GameState, here: Landmark, rng: Rng): BarterDisposition[];
  /** #936b — drop order for the stuck-in-mud auto path. The list is
   *  the jettison sequence (first dumped first); ids it omits fall
   *  back to the engine's `ABANDON_PRIORITY` const appended after, so
   *  a partial reorder still drains the rest. `undefined` (no
   *  override) → pure const order. Re-added by #936b (removed by
   *  #939l as consumerless): the consumer is now `abandonHeavyLoad`
   *  via NPC mud handling (`npc-engine.ts`) and the bot runner — the
   *  player path goes through MudAbandonModal instead. */
  mudAbandonmentPriority?(): readonly string[];

  /** #927 — Per-category priority weights for the default bundle algorithm.
   *  Each weight in {0, 1, 2}: 0 = skip category entirely, 1 = include by
   *  urgency, 2 = include first when budget tight. Multiplied against
   *  per-action urgency to rank candidates. Weight=0 always loses. */
  bundleWeights: BundleWeights;
  /** #927 — Optional escape hatch: replace the default bundle algorithm
   *  entirely. When omitted, bundle.ts's defaultBundleCampActions runs
   *  with this persona's bundleWeights. Used by chaos (random pick) and
   *  faithful (Sabbath-sequenced). Override MUST respect TIME_BUDGET_HOURS
   *  (otherwise rest() throws on apply). */
  bundleCampActions?(state: GameState, primary: CampActionId | null, rng: Rng): RestBundle;
}

/** #915 — A single barter offer-pair the bot wants to make. */
export interface BarterDisposition {
  give: { item: string; qty: number };
  receive: { item: string; qty: number };
}
