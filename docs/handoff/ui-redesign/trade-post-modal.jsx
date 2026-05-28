// ============================================================================
// TRADE POST — modal with 3 layout variants
// ============================================================================
// Variants (toggled via Tweaks):
//   unified  — primary. Each item row has TWO ways to acquire it: pay cash OR
//              offer barter goods. Single basket with both totals.
//   tabs     — Buy / Sell / Barter as three top-level tabs (matches the
//              repo's current direction).
//   split    — Left column = post stock w/ cash prices; right column = barter
//              board. Both visible at once.
//
// All three share the same header (post identity), left rail (post flavor +
// barter preferences banner + live inventory), and footer (totals + confirm).
//
// Exports: <TradePostModal post party layout cash onClose />
// ============================================================================

const { useState, useMemo, useEffect } = React;

// ----------------------------------------------------------------------------
// Shared widgets
// ----------------------------------------------------------------------------

function PostHeader({ post, party, cash }) {
  return (
    <header className="tp-head" style={{ borderColor: post.accent }}>
      <div className="tp-head-l">
        <div className="tp-post-glyph" style={{ background: post.accent }}>
          {/* Bespoke landmark glyph — placeholder rust badge with initials */}
          <span>{post.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
        </div>
        <div className="tp-head-titles">
          <div className="tp-eyebrow" style={{ color: post.accent }}>{post.tag}</div>
          <h1 className="tp-head-name">{post.name}</h1>
          <div className="tp-head-sub">
            Mile {post.mile} · Day {party.day} · {party.leaderName}'s party of {party.partySize}
          </div>
        </div>
      </div>
      <div className="tp-head-r">
        <div className="tp-purse">
          <span className="tp-eyebrow">Purse</span>
          <span className="tp-cash">${cash}</span>
        </div>
      </div>
    </header>);

}

function PreferencesBanner({ post }) {
  const wantsItems = (post.barterPreferred || []).map((id) => window.TP_ITEMS[id]?.name).filter(Boolean);
  const refusesItems = (post.barterRefused || []).map((id) => window.TP_ITEMS[id]?.name).filter(Boolean);
  const fmt = (list) => list.length === 0 ? '—' :
  list.length === 1 ? list[0] :
  list.length === 2 ? `${list[0]} and ${list[1]}` :
  `${list.slice(0, -1).join(', ')}, and ${list.slice(-1)}`;
  return (
    <div className="tp-banner" style={{ borderColor: post.accent }}>
      <div className="tp-banner-mult">
        <span className="tp-eyebrow">Pricing</span>
        <span className="tp-banner-mult-val" style={{ color: post.accent }}>
          {post.priceMultiplier === 1 ?
          '× mid-trail' :
          post.priceMultiplier > 1 ?
          `× ${post.priceMultiplier.toFixed(2)} (gouge)` :
          `× ${post.priceMultiplier.toFixed(2)} (charity)`}
        </span>
      </div>
      <div className="tp-banner-pref">
        <span className="tp-chip tp-chip-prefers">Wants</span>
        <span className="tp-banner-text">{fmt(wantsItems)}</span>
        <span className="tp-banner-bonus">+15% rate</span>
      </div>
      <div className="tp-banner-pref">
        <span className="tp-chip tp-chip-refused">Won't touch</span>
        <span className="tp-banner-text">{refusesItems.length === 0 ? '—' : fmt(refusesItems)}</span>
        {refusesItems.length > 0 && <span className="tp-banner-penalty">−40% rate</span>}
      </div>
    </div>);

}

function ItemChips({ id, post }) {
  const isPref = (post.barterPreferred || []).includes(id);
  const isRef = (post.barterRefused || []).includes(id);
  if (!isPref && !isRef) return null;
  return (
    <>
      {isPref && <span className="tp-chip tp-chip-prefers" title="Post pays +15% in barter">★ prefers</span>}
      {isRef && <span className="tp-chip tp-chip-refused" title="Post pays −40% in barter">⊘ refused</span>}
    </>);

}

// Rate scale bar: fair band shaded, current rate as a notch.
//   Range plotted: 0.30 → 1.25 (covers the [0.5, 1.05] fair band with margin)
function RateScale({ rate, fair, post }) {
  const LO = 0.30,HI = 1.25;
  const fairLo = window.TP_BARTER.RATE_FLOOR; // 0.5
  const fairHi = window.TP_BARTER.RATE_CEIL; // 1.05
  const pct = (v) => Math.max(0, Math.min(100, (v - LO) / (HI - LO) * 100));
  const tone = !fair ? 'bad' : rate >= 0.95 ? 'good' : 'mid';
  const labels = [0.5, 0.75, 1.0];
  return (
    <div className={`tp-scale tp-scale-${tone}`}>
      <div className="tp-scale-track">
        <div
          className="tp-scale-fair"
          style={{ left: `${pct(fairLo)}%`, width: `${pct(fairHi) - pct(fairLo)}%` }} />
        
        {labels.map((v) =>
        <div key={v} className="tp-scale-tick" style={{ left: `${pct(v)}%` }}>
            <div className="tp-scale-tick-line" />
            <div className="tp-scale-tick-label">{v.toFixed(2)}</div>
          </div>
        )}
        {rate > 0 &&
        <div className="tp-scale-notch" style={{ left: `${pct(rate)}%`, background: post.accent }}>
            <div className="tp-scale-notch-val">{rate.toFixed(2)}×</div>
          </div>
        }
      </div>
      <div className="tp-scale-legend">
        <span className="tp-scale-band-label">Fair: 0.50 – 1.05</span>
      </div>
    </div>);

}

// Compact non-interactive rate readout. Used inside the unified summary
// where the big track-and-notch scale eats too much space and reads as
// a slider. Just a colored pill: "0.92× · fair".
function RateBadge({ rate, fair, overpaying }) {
  const tone = rate === 0 ? 'neutral' :
  !fair ? 'bad' :
  overpaying ? 'warn' :
  rate >= 0.95 ? 'good' :
  'mid';
  const label = rate === 0 ? '—' :
  !fair ? 'refused' :
  overpaying ? 'overpay' :
  rate >= 0.95 ? 'fair' :
  "trader's terms";
  return (
    <span className={`tp-ratebadge tp-ratebadge-${tone}`}>
      <span className="tp-ratebadge-rate">{rate > 0 ? `${rate.toFixed(2)}×` : '—'}</span>
      <span className="tp-ratebadge-label">{label}</span>
    </span>);

}

function QuoteReceipt({ quote, giveItem, giveQty, recvItem, recvQty, post }) {
  if (!giveItem || !recvItem) return null;
  const giveMeta = window.TP_ITEMS[giveItem];
  const recvMeta = window.TP_ITEMS[recvItem];
  const tone = !quote.fair ? 'bad' : quote.rate >= 0.95 ? 'good' : 'mid';
  return (
    <div className={`tp-receipt tp-receipt-${tone}`}>
      <div className="tp-receipt-row">
        <span className="tp-receipt-label">You give</span>
        <span className="tp-receipt-item">{giveQty} × {giveMeta?.name || giveItem}</span>
        <span className="tp-receipt-val">{window.TP_money(quote.giveVal)}</span>
      </div>
      <div className="tp-receipt-row">
        <span className="tp-receipt-label">They give</span>
        <span className="tp-receipt-item">{recvQty} × {recvMeta?.name || recvItem}</span>
        <span className="tp-receipt-val">{window.TP_money(quote.recvVal)}</span>
      </div>
      <div className="tp-receipt-row tp-receipt-rate">
        <span className="tp-receipt-label">Rate</span>
        <span className="tp-receipt-item">
          {!quote.fair && quote.rate < window.TP_BARTER.RATE_FLOOR ?
          'Trader refuses — your offer is too thin.' :
          !quote.fair && quote.rate > window.TP_BARTER.RATE_CEIL ?
          "You'd be paying through the nose." :
          quote.rate >= 0.95 ?
          'Fair trade.' :
          "Trader's terms — still fair."}
        </span>
        <span className="tp-receipt-val" style={{ color: post.accent }}>{quote.rate.toFixed(2)}×</span>
      </div>
    </div>);

}

// Stepper — a small −/value/+ control.
// Two display modes:
//   - default: value (0..max) shown in the center
//   - source-projected: when `baseCount` + `direction` are passed, the
//     center shows the source pile after the trade (wagon items leaving,
//     or post stock leaving — both decrement from their own source).
//     A bubble in the top-right shows where the items flow:
//       give → red −N (leaving your wagon)
//       get  → green +N (arriving in your wagon)
function Stepper({ value, min, max, onChange, accent, baseCount, direction }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const projecting = direction === 'give' || direction === 'get';
  const projected = projecting ? baseCount - value : value;
  const showDelta = projecting && value > 0;
  return (
    <div className={`tp-stepper ${projecting ? 'tp-stepper-proj' : ''}`}>
      <button type="button" className="tp-stepper-btn" onClick={dec} disabled={value <= min}>−</button>
      <span className="tp-stepper-val" style={value > 0 ? { color: accent } : undefined}>{projected}</span>
      <button type="button" className="tp-stepper-btn" onClick={inc} disabled={value >= max}>+</button>
      {showDelta &&
      <span className={`tp-stepper-bubble tp-stepper-bubble-${direction}`}>
          {direction === 'give' ? '−' : '+'}{value}
        </span>
      }
    </div>);

}

// ----------------------------------------------------------------------------
// VARIANT A — UNIFIED (primary)
//
// Layout:
//   ┌───────── SUMMARY ──────────────────────────────────┐
//   │ YOU GIVE: $X goods + [cash slider] = $Y           │
//   │ YOU GET:  $Z goods                                 │
//   │ ══════════ rate bar ═══════════                   │
//   │ Hint: "Add $4 to balance" / "You're overpaying"   │
//   └────────────────────────────────────────────────────┘
//   ┌─ Your wagon (give) ──┬─ Post stock (get) ──────────┐
//   │ 🦬 Buffalo robe (2)   │ 🌾 Flour (80 left)          │
//   │   ★ prefers  [- 1 +] │   $0.15/u    [- 0 +]        │
//   │ 🥃 Whiskey (2)        │ 🥓 Bacon (60)               │
//   │   ⊘ refused [- 0 +]  │   $0.30/u    [- 0 +]        │
//   │ ...                   │ ...                          │
//   └───────────────────────┴──────────────────────────────┘
//
// No item shuffles into a separate basket. Every item the player has, and
// every item the post stocks, is visible at all times with its own stepper.
// The summary up top is sticky so the running total + cash slider stay in
// view while you scroll the item lists.
// ----------------------------------------------------------------------------

function UnifiedView({
  post, party, cash,
  basket, setBasket, // what player GETS (post stock → wagon)
  offered, setOffered, // what player GIVES (wagon → post)
  cashOffer, setCashOffer, // additional cash player adds (0 = pure barter)
  barterEnabled, setBarterEnabled // false = cash mode (default), true = barter mode
}) {
  const cashMult = post.priceMultiplier ?? 1.0;

  // ---- Math ----
  // Barter mode: give-side goods value uses the post's barter math
  // (preferred / refused / mult); cash on top is straight $.
  // Cash mode: give-side is reinterpreted as a sell basket — proceeds at
  // post's sell price × mult, no preferred/refused modifiers.
  let giveGoodsVal = 0;
  if (barterEnabled) {
    for (const [id, q] of Object.entries(offered)) {
      if (!q) continue;
      const quote = window.TP_quoteBarter(post, id, q, 'flour', 1);
      giveGoodsVal += quote.giveVal;
    }
  } else {
    for (const [id, q] of Object.entries(offered)) {
      if (!q) continue;
      giveGoodsVal += (window.TP_ITEMS[id]?.sell ?? 0) * q * cashMult;
    }
  }
  let getGoodsVal = 0;
  for (const [id, q] of Object.entries(basket)) {
    if (!q) continue;
    getGoodsVal += (window.TP_ITEMS[id]?.buy ?? 0) * q * cashMult;
  }
  const giveTotal = giveGoodsVal + (barterEnabled ? cashOffer : 0);
  const getTotal = getGoodsVal;
  // Rate / fairness only meaningful in barter mode.
  const rate = barterEnabled && getTotal > 0 ? giveTotal / getTotal : 0;
  const fair = !barterEnabled
    || (giveTotal === 0 && getTotal === 0)
    || rate >= window.TP_BARTER.RATE_FLOOR;
  const overpaying = barterEnabled && rate > window.TP_BARTER.RATE_CEIL;
  const tooThin = barterEnabled && rate > 0 && rate < window.TP_BARTER.RATE_FLOOR;
  const cashGap = Math.max(0, getTotal - giveGoodsVal);
  const cashGapToFair = Math.max(0, getTotal * window.TP_BARTER.RATE_FLOOR - giveGoodsVal);

  // Cash-mode flow: net cash = buy - sell credit. Positive = you pay; negative = you receive.
  const cashNet = getGoodsVal - giveGoodsVal;

  // ---- Lists ----
  const giveIds = useMemo(() => groupByCategory(
    Object.keys(party.inventory).filter((id) => (party.inventory[id] ?? 0) > 0)
  ), [party]);
  const getIds = useMemo(() => groupByCategory(Object.keys(post.stock)), [post]);

  // Switching modes: clear cashOffer (only meaningful in barter mode).
  const toggleBarter = () => {
    setBarterEnabled(!barterEnabled);
    setCashOffer(0);
  };

  return (
    <div className="tp-deal">
      {/* ===== SUMMARY (sticky) ===== */}
      <header className="tp-summary" style={{ borderColor: post.accent }}>
        {/* Mode toggle — cash by default; barter as opt-in */}
        <div className="tp-mode-toggle-row">
          <div className="tp-mode-toggle" role="tablist" aria-label="Trade mode">
            <button
              type="button"
              role="tab"
              aria-selected={!barterEnabled}
              className={`tp-mode-tab ${!barterEnabled ? 'tp-mode-tab-active' : ''}`}
              style={!barterEnabled ? { background: post.accent, borderColor: post.accent } : undefined}
              onClick={() => { if (barterEnabled) toggleBarter(); }}>
              Cash
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={barterEnabled}
              className={`tp-mode-tab ${barterEnabled ? 'tp-mode-tab-active' : ''}`}
              style={barterEnabled ? { background: post.accent, borderColor: post.accent } : undefined}
              onClick={() => { if (!barterEnabled) toggleBarter(); }}>
              Barter
            </button>
          </div>
          <span className="tp-mode-hint">
            {barterEnabled
              ? "Trade goods for goods. Add cash on top to balance an offer."
              : `Pay ${post.name} in cash. Use the give column to sell items back.`}
          </span>
        </div>

        {barterEnabled ? (
          <>
            <div className="tp-summary-row">
              <span className="tp-summary-label">You give</span>
              <span className="tp-summary-goods" title="Value of goods you're offering (post-modifier)">{window.TP_money(giveGoodsVal)} <span className="tp-summary-sub">goods</span></span>
              <span className="tp-summary-plus">+</span>
              <div className="tp-summary-cash">
                <span className="tp-summary-cash-label">cash</span>
                <span className="tp-summary-cash-val">{window.TP_money(cashOffer)}</span>
                <div className="tp-cash-chips">
                  <button
                    type="button"
                    className="tp-cash-chip tp-cash-chip-neg"
                    onClick={() => setCashOffer(0)}
                    disabled={cashOffer === 0}
                    title="Clear cash">×</button>
                  {[0.5, 1, 5, 10].map((amt) => {
                    const next = Math.min(cash, Math.round((cashOffer + amt) * 100) / 100);
                    return (
                      <button
                        key={amt}
                        type="button"
                        className="tp-cash-chip"
                        disabled={cashOffer >= cash}
                        onClick={() => setCashOffer(next)}
                        title={`Add ${amt < 1 ? `${amt * 100}¢` : `$${amt}`}`}>
                        +{amt < 1 ? `${amt * 100}¢` : `$${amt}`}
                      </button>
                    );
                  })}
                  {cashGap > 0 && cashGap <= cash && Math.abs(cashOffer - cashGap) > 0.01 &&
                  <button
                    type="button"
                    className="tp-cash-chip tp-cash-chip-suggest"
                    style={{ borderColor: post.accent, color: post.accent }}
                    onClick={() => setCashOffer(Math.round(cashGap))}
                    title="Top up cash to balance the trade exactly">
                    Even ${Math.round(cashGap)}</button>
                  }
                </div>
              </div>
              <span className="tp-summary-eq">=</span>
              <span className="tp-summary-total" style={{ color: post.accent }}>{window.TP_money(giveTotal)}</span>
            </div>

            <div className="tp-summary-row">
              <span className="tp-summary-label">You get</span>
              <span className="tp-summary-goods">{window.TP_money(getGoodsVal)} <span className="tp-summary-sub">goods</span></span>
              <span className="tp-summary-spacer" />
              <span className="tp-summary-eq">=</span>
              <span className="tp-summary-total" style={{ color: post.accent }}>{window.TP_money(getTotal)}</span>
            </div>

            {(tooThin || overpaying) &&
            <div className={`tp-alert ${tooThin ? 'tp-alert-bad' : 'tp-alert-warn'}`}>
              {tooThin &&
              <>
                <strong>Trader refuses.</strong>{' '}
                {cashGapToFair > 0 && cashGapToFair <= cash &&
                  <>Add <strong style={{ color: post.accent }}>${Math.ceil(cashGapToFair)}</strong> cash or more goods.</>
                }
                {cashGapToFair > cash &&
                  <>Not enough cash to balance — give more goods.</>
                }
              </>
              }
              {overpaying &&
              <>You're overpaying — trim cash or take more from the post.</>
              }
            </div>
            }
          </>
        ) : (
          <div className="tp-summary-cashrow">
            <div className="tp-summary-cashpair">
              <span className="tp-summary-label">Sell</span>
              <span className="tp-summary-goods tp-cash-credit">+{window.TP_money(giveGoodsVal)}</span>
            </div>
            <div className="tp-summary-cashpair">
              <span className="tp-summary-label">Buy</span>
              <span className="tp-summary-goods tp-cash-debit">−{window.TP_money(getGoodsVal)}</span>
            </div>
            <span className="tp-summary-eq">=</span>
            <div className="tp-summary-cashpair">
              <span className="tp-summary-label">Net</span>
              <span className={`tp-summary-total ${cashNet > cash ? 'tp-total-danger' : ''}`}
                    style={{ color: cashNet <= 0 ? 'var(--c-good)' : cashNet > cash ? undefined : post.accent }}>
                {cashNet >= 0 ? window.TP_money(cashNet) : `+${window.TP_money(-cashNet)}`}
              </span>
              <span className="tp-summary-sub">
                {cashNet > cash ? 'over budget' : cashNet > 0 ? 'you pay' : cashNet < 0 ? 'you receive' : '—'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* ===== TWO PARALLEL ITEM LISTS ===== */}
      <div className="tp-cols">
        <ItemColumn
          title="Your wagon"
          subtitle={barterEnabled ? "give in trade" : "sell for cash"}
          groups={giveIds}
          source={party.inventory}
          values={offered}
          onChange={setOffered}
          post={post}
          accent={post.accent}
          side="give"
          party={party}
          barterEnabled={barterEnabled} />

        <ItemColumn
          title={post.name}
          subtitle={barterEnabled ? "take from stock" : "buy with cash"}
          groups={getIds}
          source={post.stock}
          values={basket}
          onChange={setBasket}
          post={post}
          accent={post.accent}
          side="get"
          party={party}
          barterEnabled={barterEnabled} />
      </div>
    </div>
  );
}

// Single-column item list. Rows show qty available, per-unit value at this
// post (barter-credit on give side, cash price on get side), and a stepper
// bounded by source qty. Rows with qty > 0 highlight subtly.
function ItemColumn({ title, subtitle, groups, source, values, onChange, post, accent, side, party, barterEnabled }) {
  const cashMult = post.priceMultiplier ?? 1.0;
  return (
    <section className="tp-col">
      <header className="tp-col-head" style={{ borderColor: accent }}>
        <div className="tp-eyebrow">{side === 'give' ? 'You give from' : 'You get from'}</div>
        <div className="tp-col-title">{title}</div>
        <div className="tp-col-sub">{subtitle}</div>
      </header>
      <div className="tp-col-body">
        {groups.length === 0 && <p className="tp-pile-empty">Nothing to offer.</p>}
        {groups.map((g) =>
        <div key={g.cat} className="tp-col-group">
            <div className="tp-col-cat">{window.TP_CATEGORY_LABEL[g.cat]}</div>
            <div className="tp-col-rows">
              {g.ids.map((id) => {
              const meta = window.TP_ITEMS[id];
              const have = source[id] ?? 0;
              const v = values[id] ?? 0;
              const isPref = (post.barterPreferred || []).includes(id);
              const isRef = (post.barterRefused || []).includes(id);
              // Per-unit value at this post.
              //   - give-side, barter mode: barter-credit value (pref/refused applied)
              //   - give-side, cash mode:   straight sell price × mult (no modifiers)
              //   - get-side, either mode:  buy price × mult
              let perUnit;
              if (side === 'give') {
                if (barterEnabled) {
                  const q = window.TP_quoteBarter(post, id, 1, 'flour', 1);
                  perUnit = q.giveVal;
                } else {
                  perUnit = (meta?.sell ?? 0) * cashMult;
                }
              } else {
                perUnit = (meta?.buy ?? 0) * cashMult;
              }
              const showBarterChips = barterEnabled && side === 'give';
              return (
                <div key={id} className={`tp-col-row ${v > 0 ? 'tp-col-row-active' : ''} ${showBarterChips && isRef ? 'tp-col-row-refused' : ''}`}>
                    <span className="tp-col-icon">{meta.icon}</span>
                    <div className="tp-col-rowtext">
                      <div className="tp-col-rowname">
                        {meta.name}
                        {showBarterChips && isPref && <span className="tp-chip tp-chip-prefers" style={{ marginLeft: 6 }}>★ +15%</span>}
                        {showBarterChips && isRef && <span className="tp-chip tp-chip-refused" style={{ marginLeft: 6 }}>⊘ −40%</span>}
                      </div>
                      <div className="tp-col-rowsub">
                        <span className="tp-col-have">{have} {side === 'give' ? 'in wagon' : 'in stock'}</span>
                        <span className="tp-col-perunit">{window.TP_money(perUnit)}<span className="tp-col-perunit-sub">/{
                          side === 'give'
                            ? (barterEnabled ? 'credit' : 'cash')
                            : 'cash'
                        }</span></span>
                      </div>
                    </div>
                    <Stepper
                    value={v}
                    min={0}
                    max={have}
                    onChange={(n) => onChange({ ...values, [id]: n })}
                    accent={accent}
                    baseCount={have}
                    direction={side} />
                  
                  </div>);

            })}
            </div>
          </div>
        )}
      </div>
    </section>);

}

// ----------------------------------------------------------------------------
// VARIANT B — TABS
//   Buy / Sell / Barter as three separate panes. Mirrors what's currently
//   in TradeModal.svelte but cleaner.
// ----------------------------------------------------------------------------

function TabsView({ post, party, cash, tab, setTab, basket, setBasket, sellBasket, setSellBasket, barter, setBarter }) {
  return (
    <div className="tp-tabs-view">
      <div className="tp-tabs" role="tablist">
        {['buy', 'sell', 'barter'].map((t) =>
        <button
          key={t}
          type="button"
          className={`tp-tab ${tab === t ? 'tp-tab-active' : ''}`}
          style={tab === t ? { background: post.accent, borderColor: post.accent } : undefined}
          onClick={() => setTab(t)}>
          
            {t === 'buy' ? 'Buy from Post' : t === 'sell' ? 'Sell to Post' : 'Barter'}
          </button>
        )}
      </div>

      {tab === 'buy' && <BuyPane post={post} basket={basket} setBasket={setBasket} />}
      {tab === 'sell' && <SellPane post={post} party={party} sellBasket={sellBasket} setSellBasket={setSellBasket} />}
      {tab === 'barter' && <BarterPane post={post} party={party} barter={barter} setBarter={setBarter} />}
    </div>);

}

function BuyPane({ post, basket, setBasket }) {
  const cashMult = post.priceMultiplier ?? 1.0;
  const groups = useMemo(() => groupByCategory(Object.keys(post.stock)), [post]);
  return (
    <div className="tp-pane">
      {groups.map((g) =>
      <div key={g.cat} className="tp-group">
          <div className="tp-group-head">{window.TP_CATEGORY_LABEL[g.cat]}</div>
          <div className="tp-rows">
            {g.ids.map((id) => {
            const meta = window.TP_ITEMS[id];
            const inStock = post.stock[id] ?? 0;
            const taking = basket[id] ?? 0;
            return (
              <div key={id} className={`tp-row ${taking > 0 ? 'tp-row-active' : ''}`}>
                  <span className="tp-row-icon">{meta.icon}</span>
                  <span className="tp-row-name">{meta.name}</span>
                  <span className="tp-row-chips">
                    <ItemChips id={id} post={post} />
                    <span className={`tp-stock ${inStock <= 3 ? 'tp-stock-low' : ''}`}>{inStock} left</span>
                  </span>
                  <span className="tp-row-price">{window.TP_money(meta.buy * cashMult)}</span>
                  <Stepper value={taking} min={0} max={inStock} onChange={(v) => setBasket({ ...basket, [id]: v })} accent={post.accent} />
                </div>);

          })}
          </div>
        </div>
      )}
    </div>);

}

function SellPane({ post, party, sellBasket, setSellBasket }) {
  const sellMult = post.priceMultiplier ?? 1.0;
  const ownedIds = Object.keys(party.inventory).filter((id) => (party.inventory[id] ?? 0) > 0);
  const groups = useMemo(() => groupByCategory(ownedIds), [party.inventory]);
  return (
    <div className="tp-pane">
      {groups.map((g) =>
      <div key={g.cat} className="tp-group">
          <div className="tp-group-head">{window.TP_CATEGORY_LABEL[g.cat]}</div>
          <div className="tp-rows">
            {g.ids.map((id) => {
            const meta = window.TP_ITEMS[id];
            const owned = party.inventory[id] ?? 0;
            const selling = sellBasket[id] ?? 0;
            return (
              <div key={id} className={`tp-row ${selling > 0 ? 'tp-row-active' : ''}`}>
                  <span className="tp-row-icon">{meta.icon}</span>
                  <span className="tp-row-name">{meta.name}</span>
                  <span className="tp-row-chips">
                    <span className="tp-stock">{owned} in wagon</span>
                  </span>
                  <span className="tp-row-price" style={{ color: 'var(--c-good)' }}>+{window.TP_money(meta.sell * sellMult)}</span>
                  <Stepper value={selling} min={0} max={owned} onChange={(v) => setSellBasket({ ...sellBasket, [id]: v })} accent={post.accent} />
                </div>);

          })}
          </div>
        </div>
      )}
    </div>);

}

function BarterPane({ post, party, barter, setBarter }) {
  const ownedIds = Object.keys(party.inventory).filter((id) => (party.inventory[id] ?? 0) > 0);
  const stockIds = Object.keys(post.stock);
  const quote = window.TP_quoteBarter(post, barter.giveId, barter.giveQty, barter.recvId, barter.recvQty);
  const giveOwned = party.inventory[barter.giveId] ?? 0;
  const recvStock = post.stock[barter.recvId] ?? 0;
  return (
    <div className="tp-pane tp-barter-pane">
      <div className="tp-barter-grid">
        <section className="tp-barter-col">
          <div className="tp-eyebrow">You give</div>
          <select
            className="tp-select"
            value={barter.giveId}
            onChange={(e) => setBarter({ ...barter, giveId: e.target.value })}>
            
            {ownedIds.map((id) => {
              const m = window.TP_ITEMS[id];
              const pref = (post.barterPreferred || []).includes(id);
              const ref = (post.barterRefused || []).includes(id);
              return (
                <option key={id} value={id}>
                  {m.name} ({party.inventory[id]}){pref ? ' · prefers' : ''}{ref ? ' · refused' : ''}
                </option>);

            })}
          </select>
          <div className="tp-barter-qty">
            <span className="tp-eyebrow">Qty</span>
            <Stepper value={barter.giveQty} min={1} max={Math.max(1, giveOwned)} onChange={(v) => setBarter({ ...barter, giveQty: v })} accent={post.accent} />
            <span className="tp-barter-have">of {giveOwned}</span>
          </div>
          <ItemChips id={barter.giveId} post={post} />
        </section>

        <div className="tp-barter-arrow" style={{ color: post.accent }}>⇄</div>

        <section className="tp-barter-col">
          <div className="tp-eyebrow">You receive</div>
          <select
            className="tp-select"
            value={barter.recvId}
            onChange={(e) => setBarter({ ...barter, recvId: e.target.value })}>
            
            {stockIds.map((id) => {
              const m = window.TP_ITEMS[id];
              const left = post.stock[id] ?? 0;
              return (
                <option key={id} value={id} disabled={left === 0}>{m.name} ({left} left)</option>);

            })}
          </select>
          <div className="tp-barter-qty">
            <span className="tp-eyebrow">Qty</span>
            <Stepper value={barter.recvQty} min={1} max={Math.max(1, recvStock)} onChange={(v) => setBarter({ ...barter, recvQty: v })} accent={post.accent} />
            <span className="tp-barter-have">of {recvStock} left</span>
          </div>
        </section>
      </div>

      <RateScale rate={quote.rate} fair={quote.fair} post={post} />
      <QuoteReceipt quote={quote} giveItem={barter.giveId} giveQty={barter.giveQty} recvItem={barter.recvId} recvQty={barter.recvQty} post={post} />

      {(post.barterRefused || []).includes(barter.giveId) &&
      <p className="tp-flavor tp-flavor-refused">{post.refusalLine}</p>
      }
      {(post.barterPreferred || []).includes(barter.giveId) &&
      <p className="tp-flavor tp-flavor-preferred">
          {post.name} pays well for {window.TP_ITEMS[barter.giveId]?.name?.toLowerCase()} — good choice.
        </p>
      }
    </div>);

}

// ----------------------------------------------------------------------------
// VARIANT C — SPLIT COLUMN
//   Left: post's stock with cash prices (compact).
//   Right: full barter board.
// ----------------------------------------------------------------------------

function SplitView({ post, party, basket, setBasket, sellBasket, setSellBasket, barter, setBarter }) {
  const cashMult = post.priceMultiplier ?? 1.0;
  const groups = useMemo(() => groupByCategory(Object.keys(post.stock)), [post]);
  const ownedIds = Object.keys(party.inventory).filter((id) => (party.inventory[id] ?? 0) > 0);

  return (
    <div className="tp-split">
      {/* LEFT — cash stock */}
      <section className="tp-split-col tp-split-cash">
        <div className="tp-split-col-head" style={{ borderColor: post.accent }}>
          <span className="tp-eyebrow">Cash counter</span>
          <span className="tp-split-col-sub">Buy & sell at posted prices</span>
        </div>
        <div className="tp-split-scroll">
          {groups.map((g) =>
          <div key={g.cat} className="tp-group tp-group-compact">
              <div className="tp-group-head">{window.TP_CATEGORY_LABEL[g.cat]}</div>
              <div className="tp-rows">
                {g.ids.map((id) => {
                const meta = window.TP_ITEMS[id];
                const inStock = post.stock[id] ?? 0;
                const owned = party.inventory[id] ?? 0;
                const taking = basket[id] ?? 0;
                const selling = sellBasket[id] ?? 0;
                return (
                  <div key={id} className={`tp-row tp-row-compact ${taking > 0 || selling > 0 ? 'tp-row-active' : ''}`}>
                      <span className="tp-row-icon">{meta.icon}</span>
                      <span className="tp-row-name">{meta.name}</span>
                      <span className="tp-row-prices-stacked">
                        <span className="tp-row-buy">B {window.TP_money(meta.buy * cashMult)} <span className="tp-row-price-sub">({inStock})</span></span>
                        {owned > 0 && <span className="tp-row-sell">S +{window.TP_money(meta.sell * cashMult)} <span className="tp-row-price-sub">({owned})</span></span>}
                      </span>
                      <span className="tp-row-controls-stacked">
                        <Stepper value={taking} min={0} max={inStock} onChange={(v) => setBasket({ ...basket, [id]: v })} accent={post.accent} />
                        {owned > 0 && <Stepper value={selling} min={0} max={owned} onChange={(v) => setSellBasket({ ...sellBasket, [id]: v })} accent={'#8bb96a'} />}
                      </span>
                    </div>);

              })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT — barter board */}
      <section className="tp-split-col tp-split-barter">
        <div className="tp-split-col-head" style={{ borderColor: post.accent }}>
          <span className="tp-eyebrow">Barter board</span>
          <span className="tp-split-col-sub">Trade goods for goods</span>
        </div>
        <BarterPane post={post} party={party} barter={barter} setBarter={setBarter} />
      </section>
    </div>);

}

// ----------------------------------------------------------------------------
// Helper — group item ids by category
// ----------------------------------------------------------------------------

function groupByCategory(ids) {
  const by = {};
  for (const id of ids) {
    const meta = window.TP_ITEMS[id];
    if (!meta) continue;
    (by[meta.cat] ??= []).push(id);
  }
  return window.TP_CATEGORY_ORDER.
  filter((c) => by[c] && by[c].length > 0).
  map((c) => ({ cat: c, ids: by[c].sort((a, b) => window.TP_ITEMS[a].name.localeCompare(window.TP_ITEMS[b].name)) }));
}

// ----------------------------------------------------------------------------
// MAIN — TradePostModal
// ----------------------------------------------------------------------------

function TradePostModal({ post, party, layout, cash, setCash, onClose }) {
  // Three basket families; only the relevant ones are used per layout.
  const [basket, setBasket] = useState({}); // what you're BUYING / GETTING from post
  const [sellBasket, setSellBasket] = useState({}); // what you're SELLING for cash (tabs/split)
  const [offered, setOffered] = useState({}); // what you're OFFERING (unified: sells in cash mode, barters in barter mode)
  const [cashOffer, setCashOffer] = useState(0); // additional cash player adds (unified barter mode only)
  const [unifiedBarter, setUnifiedBarter] = useState(false); // unified mode: cash (default) vs barter
  const [tab, setTab] = useState('buy');
  const [barter, setBarter] = useState(() => {
    const firstOwned = Object.keys(party.inventory).find((id) => (party.inventory[id] ?? 0) > 0) || '';
    const firstStock = Object.keys(post.stock)[0] || '';
    return { giveId: firstOwned, giveQty: 1, recvId: firstStock, recvQty: 1 };
  });

  // Reset baskets when post changes (different stock, different prefs).
  useEffect(() => {
    setBasket({});setSellBasket({});setOffered({});setCashOffer(0);
    setUnifiedBarter(false);
    const firstOwned = Object.keys(party.inventory).find((id) => (party.inventory[id] ?? 0) > 0) || '';
    const firstStock = Object.keys(post.stock)[0] || '';
    setBarter({ giveId: firstOwned, giveQty: 1, recvId: firstStock, recvQty: 1 });
  }, [post.id]);

  // ---------- TOTALS ----------
  const cashMult = post.priceMultiplier ?? 1.0;
  const buyTotal = Object.entries(basket).reduce(
    (s, [id, q]) => s + q * (window.TP_ITEMS[id]?.buy ?? 0) * cashMult, 0
  );
  const sellTotal = Object.entries(sellBasket).reduce(
    (s, [id, q]) => s + q * (window.TP_ITEMS[id]?.sell ?? 0) * cashMult, 0
  );
  // Unified barter math: barter goods + cash on the give side balance against
  // goods on the get side.
  const offerCredit = Object.entries(offered).reduce(
    (s, [id, q]) => {
      if (!q || q <= 0) return s;
      const quote = window.TP_quoteBarter(post, id, q, 'flour', 1);
      return s + quote.giveVal;
    }, 0
  );
  // Unified cash math: `offered` is reinterpreted as a sell basket — cash
  // proceeds from selling at the post's sell price × mult.
  const unifiedSellTotal = Object.entries(offered).reduce(
    (s, [id, q]) => s + q * (window.TP_ITEMS[id]?.sell ?? 0) * cashMult, 0
  );
  const unifiedGiveTotal = offerCredit + cashOffer;
  const unifiedGetTotal = buyTotal;
  const unifiedRate = unifiedGetTotal > 0 ? unifiedGiveTotal / unifiedGetTotal : 0;
  const unifiedFair = unifiedGetTotal === 0 ?
  unifiedGiveTotal === 0 :
  unifiedRate >= window.TP_BARTER.RATE_FLOOR;
  // Net cash flow: barter mode = cash you add on top of goods; cash mode =
  // buy total minus sell credit; tabs barter = 0; everywhere else = buy − sell.
  const netCash = layout === 'unified' ?
  unifiedBarter ? cashOffer : buyTotal - unifiedSellTotal :
  layout === 'tabs' && tab === 'barter' ?
  0 :
  buyTotal - sellTotal;
  const canAfford = layout === 'unified' ?
  unifiedBarter ?
  cashOffer <= cash && unifiedFair && (unifiedGiveTotal > 0 || unifiedGetTotal > 0) :
  Math.ceil(netCash) <= cash && (buyTotal > 0 || unifiedSellTotal > 0) :
  Math.ceil(netCash) <= cash;

  // Weight delta — show the wagon impact.
  const weightDelta = useMemo(() => {
    let d = 0;
    for (const [id, q] of Object.entries(basket)) d += (window.TP_ITEMS[id]?.w ?? 0) * q;
    for (const [id, q] of Object.entries(sellBasket)) d -= (window.TP_ITEMS[id]?.w ?? 0) * q;
    for (const [id, q] of Object.entries(offered)) d -= (window.TP_ITEMS[id]?.w ?? 0) * q;
    if (layout === 'tabs' && tab === 'barter' && barter.giveId && barter.recvId) {
      d -= (window.TP_ITEMS[barter.giveId]?.w ?? 0) * barter.giveQty;
      d += (window.TP_ITEMS[barter.recvId]?.w ?? 0) * barter.recvQty;
    }
    return d;
  }, [basket, sellBasket, offered, barter, tab, layout, cashOffer]);
  const currentWeight = window.TP_totalInvWeight(party.inventory);
  const afterWeight = currentWeight + weightDelta;

  return (
    <div className="tp-backdrop" onClick={onClose}>
      <div
        className="tp-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ '--post-accent': post.accent, '--post-accent-dark': post.accentDark }}>
        
        {/* LEFT RAIL */}
        <aside className="tp-rail">
          <section className="tp-panel tp-post-panel" style={{ borderColor: post.accent, borderWidth: 3 }}>
            <div className="tp-rail-glyph" style={{ background: post.accent }}>
              <span>{post.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
            </div>
            <div className="tp-eyebrow" style={{ color: post.accent, marginTop: 8 }}>{post.tag}</div>
            <h2 className="tp-rail-name">{post.name}</h2>
            <p className="tp-rail-blurb">{post.blurb}</p>
          </section>

          <PreferencesBanner post={post} />

          <section className="tp-panel">
            <div className="tp-eyebrow">In your wagon</div>
            <div className="tp-rail-inv">
              {Object.entries(party.inventory).
              filter(([, q]) => q > 0).
              map(([id, q]) => {
                const m = window.TP_ITEMS[id];
                const pref = (post.barterPreferred || []).includes(id);
                const ref = (post.barterRefused || []).includes(id);
                return (
                  <div key={id} className="tp-rail-inv-row">
                      <span>{m?.icon} {m?.name}</span>
                      <span className="tp-rail-inv-qty">
                        {q}
                        {pref && <span className="tp-rail-inv-flag" style={{ color: '#8bb96a' }}>★</span>}
                        {ref && <span className="tp-rail-inv-flag" style={{ color: '#e85a4a' }}>⊘</span>}
                      </span>
                    </div>);

              })}
            </div>
          </section>
        </aside>

        {/* MAIN COLUMN */}
        <div className="tp-main">
          <PostHeader post={post} party={party} cash={cash} />

          <div className="tp-content">
            {layout === 'unified' &&
            <UnifiedView
              post={post} party={party} cash={cash}
              basket={basket} setBasket={setBasket}
              offered={offered} setOffered={setOffered}
              cashOffer={cashOffer} setCashOffer={setCashOffer}
              barterEnabled={unifiedBarter} setBarterEnabled={setUnifiedBarter} />

            }
            {layout === 'tabs' &&
            <TabsView post={post} party={party} cash={cash} tab={tab} setTab={setTab}
            basket={basket} setBasket={setBasket}
            sellBasket={sellBasket} setSellBasket={setSellBasket}
            barter={barter} setBarter={setBarter} />
            }
            {layout === 'split' &&
            <SplitView post={post} party={party}
            basket={basket} setBasket={setBasket}
            sellBasket={sellBasket} setSellBasket={setSellBasket}
            barter={barter} setBarter={setBarter} />
            }
          </div>

          {/* TOTALS BAR */}
          <footer className={`tp-totals ${!canAfford ? 'tp-totals-overdraw' : ''}`} style={{ borderColor: post.accent }}>
            {layout === 'unified' ?
            unifiedBarter ?
            <>
                <div className="tp-total"><span className="tp-eyebrow">You give</span><span className="tp-total-val">{window.TP_money(unifiedGiveTotal)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">You get</span><span className="tp-total-val">{window.TP_money(unifiedGetTotal)}</span></div>
                <div className="tp-total">
                  <span className="tp-eyebrow">Rate</span>
                  <span
                  className={`tp-total-val tp-total-val-net ${
                  !unifiedFair ? 'tp-total-danger' :
                  unifiedRate > window.TP_BARTER.RATE_CEIL ? 'tp-total-warn' :
                  ''}`
                  }
                  style={unifiedFair && unifiedRate > 0 && unifiedRate <= window.TP_BARTER.RATE_CEIL ? { color: post.accent } : undefined}>
                  
                    {unifiedRate > 0 ? `${unifiedRate.toFixed(2)}×` : '—'}
                  </span>
                </div>
                <div className="tp-total"><span className="tp-eyebrow">Cash after</span><span className="tp-total-val">${(cash - cashOffer).toFixed(0)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Weight</span><span className="tp-total-val tp-total-weight">{Math.round(afterWeight)}/{party.weightCap}</span></div>
              </> :
            <>
                <div className="tp-total"><span className="tp-eyebrow">Sell</span><span className="tp-total-val tp-total-sell">+{window.TP_money(unifiedSellTotal)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Buy</span><span className="tp-total-val tp-total-buy">{window.TP_money(buyTotal)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Net cash</span><span className={`tp-total-val tp-total-val-net ${!canAfford ? 'tp-total-danger' : ''}`}>{netCash >= 0 ? window.TP_money(netCash) : `+${window.TP_money(-netCash)}`}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Cash after</span><span className="tp-total-val">${(cash - netCash).toFixed(0)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Weight</span><span className="tp-total-val tp-total-weight">{Math.round(afterWeight)}/{party.weightCap}</span></div>
              </> :
            layout === 'tabs' && tab === 'barter' ?
            <>
                <div className="tp-total"><span className="tp-eyebrow">Mode</span><span className="tp-total-val" style={{ color: post.accent }}>Barter</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Give</span><span className="tp-total-val">{barter.giveQty} × {window.TP_ITEMS[barter.giveId]?.name}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Receive</span><span className="tp-total-val">{barter.recvQty} × {window.TP_ITEMS[barter.recvId]?.name}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Weight</span><span className="tp-total-val tp-total-weight">{Math.round(afterWeight)}/{party.weightCap}</span></div>
              </> :

            <>
                <div className="tp-total"><span className="tp-eyebrow">Buy</span><span className="tp-total-val tp-total-buy">{window.TP_money(buyTotal)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Sell</span><span className="tp-total-val tp-total-sell">+{window.TP_money(sellTotal)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Net cash</span><span className={`tp-total-val tp-total-val-net ${!canAfford ? 'tp-total-danger' : ''}`}>{window.TP_money(netCash)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">After</span><span className="tp-total-val">${(cash - netCash).toFixed(2)}</span></div>
                <div className="tp-total"><span className="tp-eyebrow">Weight</span><span className="tp-total-val tp-total-weight">{Math.round(afterWeight)}/{party.weightCap}</span></div>
              </>
            }

            <div className="tp-totals-actions">
              <button type="button" className="tp-btn tp-btn-cancel" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="tp-btn tp-btn-confirm"
                style={{ background: canAfford ? post.accent : undefined, borderColor: canAfford ? post.accentDark : undefined }}
                disabled={!canAfford}>
                
                Confirm Trade
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>);

}

window.TradePostModal = TradePostModal;