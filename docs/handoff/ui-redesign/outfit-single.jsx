// ============================================================================
// OUTFIT — Variation 1: SINGLE-SCREEN
// ============================================================================
// Everything visible at once. Wagon picker as 3 cards across the top, oxen
// stepper inline beneath, then a tabbed catalog (STAPLES / LUXURIES) with
// grouped sections + steppers. Side rail with running summary + tips.
//
// Tone: parchment-forward, Day 1 optimism. The Trade Post is dark wood +
// rust; the outfitter at Independence is brighter — store-counter feel.
// ============================================================================

const { useState, useMemo, useEffect, useRef } = React;

// ----------------------------------------------------------------------------
// Wagon card (one of three)
// ----------------------------------------------------------------------------
function WagonCard({ wagon, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`of-wagon-card ${selected ? 'of-wagon-card-selected' : ''}`}
      onClick={onSelect}
    >
      <div className="of-wagon-card-head">
        <div>
          <div className="of-eyebrow">{wagon.shortName}</div>
          <div className="of-wagon-card-name">{wagon.name}</div>
        </div>
        {wagon.chip && (
          <span className={`of-wagon-chip of-wagon-chip-${wagon.chipTone}`}>{wagon.chip}</span>
        )}
      </div>
      <p className="of-wagon-card-blurb">{wagon.blurb}</p>
      <div className="of-wagon-card-stats">
        <div className="of-stat">
          <span className="of-stat-label">Carry</span>
          <span className="of-stat-val">{wagon.carryCapacity.toLocaleString()} lb</span>
        </div>
        <div className="of-stat">
          <span className="of-stat-label">Speed</span>
          <span className="of-stat-val">{wagon.baseSpeedMult.toFixed(2)}×</span>
        </div>
        <div className="of-stat">
          <span className="of-stat-label">Team</span>
          <span className="of-stat-val">{wagon.minTeam}–{wagon.optimalTeam}</span>
        </div>
      </div>
      <div className="of-wagon-card-price">${wagon.price}</div>
    </button>
  );
}

// ----------------------------------------------------------------------------
// Oxen team stepper — number-stepper with optimal/min markers
// ----------------------------------------------------------------------------
function OxenStepper({ count, setCount, wagon }) {
  const dec = () => setCount(Math.max(window.OF_OX_MIN, count - 1));
  const inc = () => setCount(Math.min(window.OF_OX_MAX, count + 1));
  const ok = count >= wagon.minTeam;
  const optimal = count >= wagon.optimalTeam;

  return (
    <section className="of-oxen-panel">
      <div className="of-oxen-l">
        <div className="of-eyebrow">Team</div>
        <div className="of-oxen-title">Hitch your oxen</div>
        <p className="of-oxen-blurb">
          {wagon.shortName} needs a minimum team of <strong>{wagon.minTeam}</strong> to move;
          {' '}<strong>{wagon.optimalTeam}</strong> is what most emigrants brought. An extra yoke or two beyond optimal gives spares for the long crossing.
        </p>
      </div>
      <div className="of-oxen-r">
        <div className="of-oxen-stepper">
          <button type="button" className="of-stepper-btn" onClick={dec} disabled={count <= window.OF_OX_MIN}>−</button>
          <div className="of-oxen-count">
            <span className="of-oxen-num" style={!ok ? { color: 'var(--c-danger)' } : optimal ? { color: 'var(--c-good)' } : { color: 'var(--c-warn)' }}>{count}</span>
            <span className="of-oxen-glyph">🐂</span>
          </div>
          <button type="button" className="of-stepper-btn" onClick={inc} disabled={count >= window.OF_OX_MAX}>+</button>
        </div>
        <div className="of-oxen-status">
          {!ok && <span className="of-oxen-warn">Under minimum — wagon won't move</span>}
          {ok && !optimal && <span className="of-oxen-warn-soft">Below optimal team</span>}
          {optimal && count === wagon.optimalTeam && <span className="of-oxen-ok">Optimal team</span>}
          {count > wagon.optimalTeam && <span className="of-oxen-ok">+{count - wagon.optimalTeam} spare {count - wagon.optimalTeam === 1 ? 'ox' : 'oxen'}</span>}
        </div>
        <div className="of-oxen-cost">
          {count} × ${window.OF_OX_PRICE} = <strong>${count * window.OF_OX_PRICE}</strong>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Bundles panel — named loadouts that populate the basket on click
// ----------------------------------------------------------------------------
function BundlesPanel({ applyBundle, basket }) {
  const [expandedId, setExpandedId] = useState(null);
  return (
    <section className="of-panel of-bundles">
      <div className="of-eyebrow">Quick loadouts</div>
      <p className="of-bundles-blurb">Period-realistic shopping lists. Tap to preview, again to add.</p>
      <div className="of-bundles-list">
        {window.OF_BUNDLES.map((b) => {
          const itemIds = Object.keys(b.kit);
          const itemCount = itemIds.length;
          // Detect if every item in the bundle is already covered at >= bundle qty.
          const applied = itemIds.every((id) => (basket[id] ?? 0) >= b.kit[id]);
          const expanded = expandedId === b.id;
          const toggle = () => setExpandedId(expanded ? null : b.id);
          return (
            <div
              key={b.id}
              className={`of-bundle-card ${expanded ? 'of-bundle-expanded' : ''} ${applied ? 'of-bundle-applied' : ''}`}
            >
              <button
                type="button"
                className="of-bundle-summary"
                onClick={toggle}
                title={b.blurb}
              >
                <span className="of-bundle-icon">{b.icon}</span>
                <span className="of-bundle-titles">
                  <span className="of-bundle-name">{b.name}</span>
                  <span className="of-bundle-sub">{b.sub}</span>
                </span>
                <span className="of-bundle-meta">
                  <span className="of-bundle-itemcount">{itemCount} items</span>
                  <span className="of-bundle-cost">${b.cost}</span>
                </span>
                <span className="of-bundle-chevron">{expanded ? '▾' : '▸'}</span>
              </button>

              {/* Item icon preview row — always visible (collapsed view) */}
              {!expanded && (
                <div className="of-bundle-preview">
                  {itemIds.slice(0, 8).map((id) => {
                    const meta = window.OF_ITEMS[id];
                    return meta ? (
                      <span key={id} className="of-bundle-preview-icon" title={`${b.kit[id]} × ${meta.name}`}>
                        {meta.icon}
                      </span>
                    ) : null;
                  })}
                  {itemIds.length > 8 && <span className="of-bundle-preview-more">+{itemIds.length - 8}</span>}
                </div>
              )}

              {/* Expanded — full item list + add CTA */}
              {expanded && (
                <div className="of-bundle-expand">
                  <p className="of-bundle-blurb">{b.blurb}</p>
                  <div className="of-bundle-items">
                    {itemIds.map((id) => {
                      const meta = window.OF_ITEMS[id];
                      if (!meta) return null;
                      const have = basket[id] ?? 0;
                      const covered = have >= b.kit[id];
                      return (
                        <div key={id} className={`of-bundle-item ${covered ? 'of-bundle-item-covered' : ''}`}>
                          <span className="of-bundle-item-icon">{meta.icon}</span>
                          <span className="of-bundle-item-name">{meta.name}</span>
                          <span className="of-bundle-item-qty">{b.kit[id]}</span>
                          {covered && <span className="of-bundle-item-check">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className={`of-bundle-add ${applied ? 'of-bundle-add-applied' : ''}`}
                    onClick={() => applyBundle(b)}
                  >
                    {applied ? 'Add again' : `Add to basket · $${b.cost}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Catalog navigation — sticky bar with search + category jump pills
// ----------------------------------------------------------------------------
function CatalogNav({ search, setSearch, visibleCats, itemsByCat, basket, jumpTo }) {
  return (
    <div className="of-catnav">
      <div className="of-catnav-search">
        <span className="of-catnav-search-icon">🔎</span>
        <input
          type="search"
          placeholder="Search supplies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="of-catnav-input"
        />
        {search && (
          <button type="button" className="of-catnav-clear" onClick={() => setSearch('')} title="Clear search">×</button>
        )}
      </div>
      <div className="of-catnav-pills">
        {visibleCats.map((cat) => {
          const ids = itemsByCat[cat] || [];
          const filled = ids.filter((id) => (basket[id] ?? 0) > 0).length;
          return (
            <button
              key={cat}
              type="button"
              className={`of-catnav-pill ${filled > 0 ? 'of-catnav-pill-filled' : ''}`}
              onClick={() => jumpTo(cat)}
            >
              {window.OF_CATEGORY_LABEL[cat]}
              <span className="of-catnav-pill-count">{filled > 0 ? filled : ids.length}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Coverage hint — small at-a-glance label rendered in section headers
// ----------------------------------------------------------------------------
function CoverageHint({ cat, coverage, party }) {
  if (cat === 'food') {
    const days = Math.round(coverage.foodDays);
    const days_per_soul = coverage.foodDays;
    const tone = days_per_soul >= 120 ? 'good' : days_per_soul >= 60 ? 'mid' : 'low';
    return <span className={`of-cov of-cov-${tone}`}>≈ {days} days · {party.partySize} souls</span>;
  }
  if (cat === 'weapons') {
    const tone = coverage.shots >= 100 ? 'good' : coverage.shots >= 30 ? 'mid' : 'low';
    return <span className={`of-cov of-cov-${tone}`}>{coverage.shots} shots</span>;
  }
  if (cat === 'clothing') {
    const cov = coverage.clothingCov;
    const tone = cov >= 1 ? 'good' : cov >= 0.5 ? 'mid' : 'low';
    return <span className={`of-cov of-cov-${tone}`}>{Math.round(cov * party.partySize)}/{party.partySize} souls covered</span>;
  }
  if (cat === 'medicine') {
    const tone = coverage.medDoses >= 8 ? 'good' : coverage.medDoses >= 3 ? 'mid' : 'low';
    return <span className={`of-cov of-cov-${tone}`}>{coverage.medDoses} doses</span>;
  }
  if (cat === 'wagon') {
    const tone = coverage.spares >= 2 ? 'good' : coverage.spares >= 1 ? 'mid' : 'low';
    return <span className={`of-cov of-cov-${tone}`}>{coverage.spares} {coverage.spares === 1 ? 'spare' : 'spares'}</span>;
  }
  if (cat === 'trade') {
    const tone = coverage.tradeQty >= 6 ? 'good' : coverage.tradeQty >= 2 ? 'mid' : 'low';
    return <span className={`of-cov of-cov-${tone}`}>{coverage.tradeQty} trade items</span>;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Missing essentials — Marcy 1859 + per-soul floor
//
// Returns the list of items the player hasn't met yet. Combines starter
// kit with basket so the panel goes quiet when the kit covers it. Critical
// items get .critical=true and surface louder in the readiness footer.
// ----------------------------------------------------------------------------
function computeMissingEssentials(party, kit, basket, wagon, coverage) {
  const sum = (id) => (kit[id] ?? 0) + (basket[id] ?? 0);
  const out = [];

  const addIfMissing = (id, need, label, critical = false) => {
    const have = sum(id);
    if (have < need) out.push({
      id, label, need, have,
      shortLabel: window.OF_ITEMS[id]?.name || id,
      icon: window.OF_ITEMS[id]?.icon || '·',
      critical,
    });
  };

  // Marcy 1859 floor — non-negotiable.
  addIfMissing('rifle', 1, 'Rifle', true);
  addIfMissing('tent', 1, 'Tent');
  addIfMissing('gunpowder', 15, 'Gunpowder · 15 lb');
  addIfMissing('lead_balls', 60, 'Lead balls · 60');
  addIfMissing('percussion_caps', 60, 'Percussion caps · 60');

  // Per-soul wearables.
  addIfMissing('coat', party.partySize, `Coats · ${party.partySize} souls`);
  addIfMissing('blanket', party.partySize, `Blankets · ${party.partySize} souls`);
  addIfMissing('boots', party.partySize, `Boots · ${party.partySize} souls`);

  // Wagon-specific: yokes to hitch the team.
  addIfMissing('yoke', wagon.requiredYokes, `Yokes · ${wagon.requiredYokes}`, true);

  // Food: a soft target of 60 days for the party.
  if (coverage.foodDays < 60) {
    out.push({
      id: '_food',
      label: `Food · ${Math.round(coverage.foodDays)}/60 days`,
      icon: '🍞',
      critical: coverage.foodDays < 30,
    });
  }

  return out;
}

// ----------------------------------------------------------------------------
// Missing-essentials sidebar panel
// ----------------------------------------------------------------------------
function MissingEssentialsPanel({ missing }) {
  if (missing.length === 0) {
    return (
      <section className="of-panel of-missing of-missing-ok">
        <div className="of-eyebrow">Departure check</div>
        <div className="of-missing-ok-row">
          <span className="of-missing-ok-icon">✓</span>
          <div>
            <strong>Essentials covered.</strong>
            <p>Wagon, team, gear, and provisions all check out.</p>
          </div>
        </div>
      </section>
    );
  }
  const critical = missing.filter((m) => m.critical);
  const soft = missing.filter((m) => !m.critical);
  return (
    <section className={`of-panel of-missing ${critical.length > 0 ? 'of-missing-crit' : 'of-missing-warn'}`}>
      <div className="of-missing-head">
        <div className="of-eyebrow">Departure check</div>
        <span className="of-missing-count">{missing.length} missing</span>
      </div>
      <p className="of-missing-blurb">
        {critical.length > 0
          ? "Marcy says: don't leave Independence without these."
          : "Get these before you go — the trail is long."}
      </p>
      <ul className="of-missing-list">
        {[...critical, ...soft].map((m) => (
          <li key={m.id} className={`of-missing-item ${m.critical ? 'of-missing-item-crit' : ''}`}>
            <span className="of-missing-icon">{m.icon}</span>
            <span className="of-missing-label">{m.label}</span>
            {m.critical && <span className="of-missing-flag">critical</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ----------------------------------------------------------------------------
// Coverage dashboard — single horizontal strip above the catalog with all
// six coverage chips. Replaces the buried section-header coverage labels
// (kept those too, but this gives the player one place to scan everything).
// ----------------------------------------------------------------------------
function CoverageDashboard({ coverage, party, jumpTo }) {
  const cells = [
    {
      cat: 'food', label: 'Food', icon: '🍞',
      val: `≈ ${Math.round(coverage.foodDays)} days`,
      tone: coverage.foodDays >= 120 ? 'good' : coverage.foodDays >= 60 ? 'mid' : 'low',
    },
    {
      cat: 'weapons', label: 'Shots', icon: '💥',
      val: `${coverage.shots}`,
      tone: coverage.shots >= 100 ? 'good' : coverage.shots >= 30 ? 'mid' : 'low',
    },
    {
      cat: 'clothing', label: 'Clothing', icon: '🧥',
      val: `${Math.round(coverage.clothingCov * party.partySize)}/${party.partySize}`,
      tone: coverage.clothingCov >= 1 ? 'good' : coverage.clothingCov >= 0.5 ? 'mid' : 'low',
    },
    {
      cat: 'medicine', label: 'Medicine', icon: '💊',
      val: `${coverage.medDoses} doses`,
      tone: coverage.medDoses >= 8 ? 'good' : coverage.medDoses >= 3 ? 'mid' : 'low',
    },
    {
      cat: 'wagon', label: 'Spares', icon: '⚙️',
      val: `${coverage.spares}`,
      tone: coverage.spares >= 2 ? 'good' : coverage.spares >= 1 ? 'mid' : 'low',
    },
    {
      cat: 'trade', label: 'Trade', icon: '🪞',
      val: `${coverage.tradeQty}`,
      tone: coverage.tradeQty >= 6 ? 'good' : coverage.tradeQty >= 2 ? 'mid' : 'low',
    },
  ];
  return (
    <div className="of-dashboard">
      {cells.map((c) => (
        <button
          key={c.cat}
          type="button"
          className={`of-dash-cell of-dash-${c.tone}`}
          onClick={() => jumpTo(c.cat)}
          title={`Jump to ${window.OF_CATEGORY_LABEL[c.cat]}`}
        >
          <span className="of-dash-icon">{c.icon}</span>
          <div className="of-dash-text">
            <span className="of-dash-label">{c.label}</span>
            <span className="of-dash-val">{c.val}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Departure readiness — what stops the party from leaving today.
// Returns issues in priority order (fails first, then warns).
// ----------------------------------------------------------------------------
function computeReadiness({ totals, wagon, oxen, party, missing, coverage }) {
  const issues = [];
  if (totals.cashLeft < 0) issues.push({
    id: 'budget', label: 'Over budget', kind: 'fail',
    detail: `Trim $${(totals.spend - (party.startCash + (totals.cashLeft >= 0 ? 0 : 0))).toFixed(0)}`,
  });
  if (totals.weight > wagon.carryCapacity) issues.push({
    id: 'weight', label: 'Wagon overweight', kind: 'fail',
    detail: `${Math.round(totals.weight - wagon.carryCapacity).toLocaleString()} lb over`,
  });
  if (oxen < wagon.minTeam) issues.push({
    id: 'oxen', label: 'Under-yoked team', kind: 'fail',
    detail: `Need ${wagon.minTeam - oxen} more`,
  });
  const criticals = missing.filter((m) => m.critical);
  if (criticals.length > 0) issues.push({
    id: 'critical', label: `${criticals.length} critical item${criticals.length === 1 ? '' : 's'} missing`, kind: 'fail',
    detail: criticals.map((m) => m.shortLabel || m.label).slice(0, 2).join(', ') + (criticals.length > 2 ? '…' : ''),
  });
  if (missing.length > criticals.length) issues.push({
    id: 'missing', label: `${missing.length - criticals.length} essential${missing.length - criticals.length === 1 ? '' : 's'} short`, kind: 'warn',
    detail: 'Recommended, not required',
  });
  return issues;
}

function ReadinessBadge({ issues }) {
  if (issues.length === 0) {
    return (
      <div className="of-readiness of-readiness-ok">
        <span className="of-readiness-icon">✓</span>
        <div className="of-readiness-text">
          <strong>Ready to depart</strong>
          <span>Wagon, team, gear all set.</span>
        </div>
      </div>
    );
  }
  const fails = issues.filter((i) => i.kind === 'fail');
  const tone = fails.length > 0 ? 'fail' : 'warn';
  return (
    <div className={`of-readiness of-readiness-${tone}`}>
      <span className="of-readiness-icon">{tone === 'fail' ? '⚠' : '!'}</span>
      <div className="of-readiness-text">
        <strong>{issues.length} thing{issues.length === 1 ? '' : 's'} to address</strong>
        <span className="of-readiness-issues">
          {issues.slice(0, 3).map((i, idx) => (
            <span key={i.id} className={`of-readiness-chip of-readiness-chip-${i.kind}`}>
              {i.label}
              {i.detail && <em className="of-readiness-detail"> · {i.detail}</em>}
            </span>
          ))}
          {issues.length > 3 && <span className="of-readiness-more">+{issues.length - 3} more</span>}
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Stepper with green/red projection bubble (reused from Trade Post)
// ----------------------------------------------------------------------------
function ItemStepper({ value, min, max, onChange, baseCount, accent, lot = 1 }) {
  // `lot` = how many units one click adds (e.g. flour by the 10-lb sack).
  // Round value to the nearest lot when decrementing to keep math clean.
  const dec = () => onChange(Math.max(min, value - lot));
  const inc = () => onChange(Math.min(max, value + lot));
  return (
    <div className="of-stepper">
      <button type="button" className="of-stepper-btn" onClick={dec} disabled={value <= min}>−</button>
      <span className="of-stepper-val" style={value > 0 ? { color: accent } : undefined}>
        {value}
      </span>
      <button type="button" className="of-stepper-btn" onClick={inc} disabled={value >= max}>+</button>
      {value > 0 && (
        <span className="of-stepper-bubble">+{value}</span>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Item row — within a category section
// ----------------------------------------------------------------------------
function ItemRow({ id, value, onChange, kit, searchHit }) {
  const meta = window.OF_ITEMS[id];
  if (!meta) return null;
  const have = kit[id] ?? 0;
  const lineTotal = value * meta.buy;
  const lot = meta.lot ?? 1;
  const unit = meta.unit;
  const bulk = meta.bulk;
  return (
    <div className={`of-row ${value > 0 ? 'of-row-active' : ''} ${searchHit ? 'of-row-hit' : ''}`}>
      <span className="of-row-icon">{meta.icon}</span>
      <div className="of-row-text">
        <div className="of-row-name">
          {meta.name}
          {unit && <span className="of-row-unit">by the {unit}</span>}
          {have > 0 && <span className="of-row-have">in kit: {have}</span>}
          {meta.tags?.includes('critical') && <span className="of-chip of-chip-critical">critical</span>}
          {meta.tags?.includes('prestige') && <span className="of-chip of-chip-prestige">prestige</span>}
        </div>
        <div className="of-row-sub">
          <span>${meta.buy.toFixed(2)} / {unit ? 'unit' : 'each'}</span>
          <span>·</span>
          <span>{meta.w} lb / unit</span>
          {value > 0 && (
            <>
              <span>·</span>
              <span className="of-row-linetotal">${lineTotal.toFixed(2)} · {(meta.w * value).toFixed(0)} lb</span>
            </>
          )}
        </div>
      </div>
      <span className="of-row-leader" aria-hidden="true" />
      <span className="of-row-controls">
        {bulk && (
          <span className="of-bulk-chips" role="group" aria-label={`Add ${meta.name} in bulk`}>
            {bulk.map((q) => (
              <button
                key={q}
                type="button"
                className="of-bulk-chip"
                onClick={() => onChange(value + q)}
                title={`Add ${q} ${unit || 'units'}`}
              >+{q}</button>
            ))}
          </span>
        )}
        <ItemStepper value={value} min={0} max={9999} onChange={onChange} baseCount={have} accent="var(--c-rust)" lot={lot} />
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Category section — collapsible group of items
// ----------------------------------------------------------------------------
function CategorySection({ cat, ids, basket, onChange, kit, collapsed, toggleCollapsed, search, coverage, party, anchorRef }) {
  const s = (search || '').trim().toLowerCase();
  // Items that match the search query (or all, when no query).
  const visibleIds = s
    ? ids.filter((id) => (window.OF_ITEMS[id]?.name || '').toLowerCase().includes(s))
    : ids;
  // If search is active and there's no hit in this section, hide it entirely.
  if (s && visibleIds.length === 0) return null;
  // Force-open section while searching, so hits aren't hidden behind a collapse.
  const open = s ? true : !collapsed;
  const itemCount = ids.filter((id) => (basket[id] ?? 0) > 0).length;
  return (
    <section className="of-section" ref={anchorRef}>
      <header className="of-section-head" onClick={s ? undefined : toggleCollapsed}>
        <div className="of-section-titles">
          <div className="of-section-title">
            {window.OF_CATEGORY_LABEL[cat]}
            {itemCount > 0 && <span className="of-section-count">{itemCount}</span>}
            <CoverageHint cat={cat} coverage={coverage} party={party} />
          </div>
          <div className="of-section-sub">{window.OF_CATEGORY_SUB[cat]}</div>
        </div>
        {!s && <span className="of-section-toggle">{collapsed ? '▸' : '▾'}</span>}
      </header>
      {open && (
        <div className="of-section-body">
          {visibleIds.map((id) => (
            <ItemRow
              key={id}
              id={id}
              value={basket[id] ?? 0}
              onChange={(n) => onChange({ ...basket, [id]: n })}
              kit={kit}
              searchHit={!!s}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Side rail — summary + tips
// ----------------------------------------------------------------------------
function SideRail({ party, totals, wagon, oxen, kit, basket, includeKit, setIncludeKit, refundIfSkipKit, showLuxuries, applyBundle, missing }) {
  const overWeight = totals.weight > wagon.carryCapacity;
  const overBudget = totals.spend > party.startCash + (includeKit ? 0 : refundIfSkipKit);

  return (
    <aside className="of-rail">
      {/* Weight */}
      <section className="of-panel">
        <div className="of-eyebrow">Wagon load</div>
        <div className="of-weight-bar">
          <div
            className={`of-weight-fill ${overWeight ? 'of-weight-fill-over' : ''}`}
            style={{ width: `${Math.min(100, (totals.weight / wagon.carryCapacity) * 100)}%` }}
          />
          <div className="of-weight-mark" style={{ left: '85%' }} />
        </div>
        <div className="of-weight-row">
          <span>{Math.round(totals.weight).toLocaleString()} / {wagon.carryCapacity.toLocaleString()} lb</span>
          <span className={overWeight ? 'of-bad' : 'of-dim'}>{Math.round((totals.weight / wagon.carryCapacity) * 100)}%</span>
        </div>
        {overWeight && (
          <p className="of-flavor of-flavor-bad">
            Over capacity by {Math.round(totals.weight - wagon.carryCapacity).toLocaleString()} lb. The {wagon.shortName.toLowerCase()} can't haul this load.
          </p>
        )}
      </section>

      {/* Missing essentials check */}
      <MissingEssentialsPanel missing={missing} />

      {/* Bundle presets — quick loadouts */}
      <BundlesPanel applyBundle={applyBundle} basket={basket} />

      {/* Starter kit toggle */}
      <section className="of-panel">
        <div className="of-eyebrow">Starter kit</div>
        <label className="of-toggle">
          <input
            type="checkbox"
            checked={includeKit}
            onChange={(e) => setIncludeKit(e.target.checked)}
          />
          <span className="of-toggle-track">
            <span className="of-toggle-thumb" />
          </span>
          <span className="of-toggle-label">
            <strong>Include Marcy basics</strong>
            <span className="of-toggle-sub">
              {includeKit
                ? "Flour, bacon, beans, medicine, rifle + powder, tent, per-soul clothing. Already in your wagon."
                : `Skipped — +$${refundIfSkipKit} refund. You'll provision yourself below.`}
            </span>
          </span>
        </label>
      </section>
    </aside>
  );
}

// ----------------------------------------------------------------------------
// Top tab toggle — STAPLES vs LUXURIES
// ----------------------------------------------------------------------------
function CatalogTabs({ tab, setTab, buyStarterKit }) {
  return (
    <div className="of-tabs">
      <button
        type="button"
        className={`of-tab ${tab === 'staples' ? 'of-tab-active' : ''}`}
        onClick={() => setTab('staples')}
      >
        Staples
        <span className="of-tab-sub">food · gear · medicine</span>
      </button>
      <button
        type="button"
        className={`of-tab ${tab === 'luxuries' ? 'of-tab-active' : ''}`}
        onClick={() => setTab('luxuries')}
      >
        Frontier startup
        <span className="of-tab-sub">prestige · arrival score</span>
      </button>
      {buyStarterKit && (
        <button type="button" className="of-buy-starter" onClick={buyStarterKit}>
          <span className="of-buy-starter-icon">✦</span>
          <span className="of-buy-starter-text">
            <span className="of-buy-starter-lead">New to the trail?</span>
            <span className="of-buy-starter-main">Buy the starter kit</span>
          </span>
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
function OutfitSingle({ tweaks, setTweak }) {
  const party = useMemo(() => ({
    ...window.OF_DEFAULT_PARTY,
    cash: tweaks.startCash,
    startCash: tweaks.startCash,
  }), [tweaks.startCash]);

  const [wagonId, setWagonId] = useState('prairie_schooner');
  const [oxen, setOxen] = useState(window.OF_OX_DEFAULT);
  const [basket, setBasket] = useState({});
  const [includeKit, setIncludeKit] = useState(true);
  const [tab, setTab] = useState('staples');
  const [collapsedCats, setCollapsedCats] = useState({});
  const [search, setSearch] = useState('');
  // Per-category anchor refs for jump-to-section behavior.
  const sectionRefs = useRef({});
  const mainScrollRef = useRef(null);

  const wagon = window.OF_WAGONS[wagonId];

  // Reset oxen when wagon changes to match optimal team
  useEffect(() => {
    setOxen(Math.max(oxen, wagon.minTeam));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wagonId]);

  // Buy the starter kit — the "I don't know what to do" big pointer for
  // new players. Same function the old prefill button hit, but now sold
  // as the canonical first action.
  const buyStarterKit = () => {
    setBasket(window.OF_examplePurchases(party.partySize));
  };

  // Apply a bundle preset additively — increments any existing qty.
  const applyBundle = (bundle) => {
    const next = { ...basket };
    for (const [id, q] of Object.entries(bundle.kit)) {
      next[id] = (next[id] ?? 0) + q;
    }
    setBasket(next);
    // Auto-switch to luxuries tab if the bundle is luxury-heavy.
    const isLuxury = Object.keys(bundle.kit).every(
      (id) => window.OF_ITEMS[id]?.cat === 'luxury'
    );
    if (isLuxury) setTab('luxuries');
  };

  // Scroll the main column to a given category section.
  const jumpTo = (cat) => {
    const el = sectionRefs.current[cat];
    const container = mainScrollRef.current;
    if (!el || !container) return;
    // Auto-expand the section so the jump lands on visible content.
    setCollapsedCats((c) => ({ ...c, [cat]: false }));
    // Compute offset relative to scroll container.
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta = elRect.top - containerRect.top - 8;
    container.scrollBy({ top: delta, behavior: 'smooth' });
  };

  // Build the starter kit inventory for display ("in kit: 600" markers)
  const kit = useMemo(() => window.OF_buildStarter(party.partySize, wagonId, includeKit), [party.partySize, wagonId, includeKit]);

  // Which category ids to show in current tab
  const visibleCats = tab === 'staples'
    ? window.OF_CATEGORY_ORDER.filter((c) => c !== 'luxury')
    : ['luxury'];

  // Group items by category
  const itemsByCat = useMemo(() => {
    const by = {};
    for (const [id, meta] of Object.entries(window.OF_ITEMS)) {
      (by[meta.cat] ??= []).push(id);
    }
    for (const c of Object.keys(by)) {
      by[c].sort((a, b) => window.OF_ITEMS[a].name.localeCompare(window.OF_ITEMS[b].name));
    }
    return by;
  }, []);

  // Coverage hints (food days, shots, etc.) — recomputed on every basket change
  const coverage = useMemo(
    () => window.OF_computeCoverage(party, kit, basket),
    [party, kit, basket]
  );

  // Missing essentials (Marcy floor + per-soul + wagon yokes + food)
  const missing = useMemo(
    () => computeMissingEssentials(party, kit, basket, wagon, coverage),
    [party, kit, basket, wagon, coverage]
  );

  // Totals
  const totals = useMemo(() => {
    let spend = wagon.price + oxen * window.OF_OX_PRICE;
    let weight = 0;
    for (const [id, q] of Object.entries(basket)) {
      if (!q) continue;
      const meta = window.OF_ITEMS[id];
      if (!meta) continue;
      spend += q * meta.buy;
      weight += q * meta.w;
    }
    // Include kit weight if enabled
    for (const [id, q] of Object.entries(kit)) {
      const meta = window.OF_ITEMS[id];
      if (!meta) continue;
      weight += q * meta.w;
    }
    const cashLeft = party.startCash + (includeKit ? 0 : window.OF_DEFAULT_PARTY.refundIfSkipKit) - spend;
    return { spend, weight, cashLeft };
  }, [basket, wagon.price, oxen, kit, party.startCash, includeKit]);

  return (
    <div className="of-screen">
      {/* HEADER — broadsheet masthead */}
      <header className="of-header">
        <div className="of-mast-l">
          <div className="of-mast-row">
            <span className="of-mast-stamp">From <strong>Independence, Mo.</strong></span>
          </div>
          <div className="of-mast-row">
            <span className="of-mast-stamp">Bound for <strong>Oregon City</strong></span>
            <span className="of-mast-rule">·</span>
            <span className="of-mast-stamp">2,170 mi</span>
          </div>
          <div className="of-mast-row">
            <span className="of-mast-stamp">Wagon-master <strong>{party.leaderName}</strong></span>
            <span className="of-mast-rule">·</span>
            <span className="of-mast-stamp"><strong>{party.partySize}</strong> souls</span>
          </div>
        </div>

        <div className="of-mast-center">
          <div className="of-mast-eyebrow">Day One · April 13, A.D. 1848</div>
          <h1 className="of-mast-title">The Outfitting Post</h1>
          <p className="of-mast-sub">Provision the wagon. Last counter before the open trail.</p>
          <div className="of-mast-flourish">❦</div>
        </div>

        <div className="of-mast-r">
          <div className="of-purse-stamp">
            <span className="of-purse-stamp-label">Purse</span>
            <span>
              <span className="of-purse-stamp-big">${(totals.cashLeft).toFixed(0)}</span>
              <span className="of-purse-stamp-of">left</span>
            </span>
            <span className="of-purse-stamp-sub">
              spent <strong>${totals.spend.toFixed(2)}</strong> of ${(party.startCash + (includeKit ? 0 : window.OF_DEFAULT_PARTY.refundIfSkipKit)).toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <div className="of-body">
        {/* MAIN COL */}
        <div className="of-main" ref={mainScrollRef}>
          {/* WAGON PICKER */}
          <section className="of-block">
            <header className="of-block-head">
              <h2 className="of-block-title">Choose a wagon</h2>
              <p className="of-block-sub">Trade off speed, capacity, and how big a team it needs.</p>
            </header>
            <div className="of-wagon-grid">
              {window.OF_WAGON_ORDER.map((id) => (
                <WagonCard
                  key={id}
                  wagon={window.OF_WAGONS[id]}
                  selected={id === wagonId}
                  onSelect={() => setWagonId(id)}
                />
              ))}
            </div>
          </section>

          {/* OXEN */}
          <OxenStepper count={oxen} setCount={setOxen} wagon={wagon} />

          {/* CATALOG */}
          <section className="of-block">
            <header className="of-block-head">
              <h2 className="of-block-title">Provisions & gear</h2>
              <p className="of-block-sub">Buy what you'll need; the wagon hauls only so much.</p>
            </header>
            <CoverageDashboard coverage={coverage} party={party} jumpTo={jumpTo} />
            <CatalogTabs tab={tab} setTab={setTab} buyStarterKit={buyStarterKit} />
            <CatalogNav
              search={search}
              setSearch={setSearch}
              visibleCats={visibleCats}
              itemsByCat={itemsByCat}
              basket={basket}
              jumpTo={jumpTo}
            />
            <div className="of-catalog">
              {visibleCats.map((cat) => {
                const ids = itemsByCat[cat] || [];
                if (ids.length === 0) return null;
                return (
                  <CategorySection
                    key={cat}
                    cat={cat}
                    ids={ids}
                    basket={basket}
                    onChange={setBasket}
                    kit={kit}
                    collapsed={!!collapsedCats[cat]}
                    toggleCollapsed={() => setCollapsedCats({ ...collapsedCats, [cat]: !collapsedCats[cat] })}
                    search={search}
                    coverage={coverage}
                    party={party}
                    anchorRef={(el) => { sectionRefs.current[cat] = el; }}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* SIDE RAIL */}
        <SideRail
          party={party}
          totals={totals}
          wagon={wagon}
          oxen={oxen}
          kit={kit}
          basket={basket}
          includeKit={includeKit}
          setIncludeKit={setIncludeKit}
          refundIfSkipKit={window.OF_DEFAULT_PARTY.refundIfSkipKit}
          showLuxuries={tab === 'luxuries'}
          applyBundle={applyBundle}
          missing={missing}
        />
      </div>

      {/* STICKY FOOTER */}
      <footer className="of-footer of-footer-v2">
        <div className="of-footer-l">
          <div className="of-foot-cell">
            <span className="of-eyebrow">Total spend</span>
            <span className="of-foot-val of-foot-val-big">${totals.spend.toFixed(2)}</span>
          </div>
          <div className="of-foot-cell">
            <span className="of-eyebrow">Travel cash</span>
            <span className={`of-foot-val ${totals.cashLeft < 0 ? 'of-bad' : ''}`}>${totals.cashLeft.toFixed(2)}</span>
          </div>
          <div className="of-foot-cell">
            <span className="of-eyebrow">Load</span>
            <span className={`of-foot-val ${totals.weight > wagon.carryCapacity ? 'of-bad' : ''}`}>{Math.round(totals.weight).toLocaleString()} / {wagon.carryCapacity.toLocaleString()} lb</span>
          </div>
        </div>

        <div className="of-footer-actions">
          <button type="button" className="of-btn of-btn-cancel" onClick={() => setBasket({})}>Reset</button>
          <div className="of-confirm-stack">
            <button
              type="button"
              className="of-btn of-btn-confirm"
              disabled={
                totals.cashLeft < 0
                || totals.weight > wagon.carryCapacity
                || oxen < wagon.minTeam
                || missing.some((m) => m.critical)
              }
            >
              Set out for Oregon
            </button>
            {(() => {
              const issues = computeReadiness({ totals, wagon, oxen, party, missing, coverage });
              if (issues.length === 0) {
                return <span className="of-confirm-status of-confirm-status-ok">✓ Ready to depart</span>;
              }
              const fails = issues.filter((i) => i.kind === 'fail');
              const tone = fails.length > 0 ? 'fail' : 'warn';
              return (
                <span className={`of-confirm-status of-confirm-status-${tone}`}>
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'} — see departure check
                </span>
              );
            })()}
          </div>
        </div>
      </footer>
    </div>
  );
}

window.OutfitSingle = OutfitSingle;
