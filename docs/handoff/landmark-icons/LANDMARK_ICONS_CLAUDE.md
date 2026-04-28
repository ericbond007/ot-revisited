# LANDMARK_ICONS_CLAUDE.md — agent-facing build brief

Drop this in the repo root when handing off to a code-focused agent. It
tells them exactly what to build, where it slots in, and what conventions
to keep.

---

## What you're building

`<LandmarkIcon id="..." size={24} />` — a single Svelte component that
renders the bespoke watercolor icon for any of the 38 landmarks in
`landmarks.ts`. It replaces the existing emoji-based pin glyph.

---

## Slot map — where this component is used

| Slot | Current code | New code |
|---|---|---|
| Trail map landmark pins | `LandmarkPin.svelte` uses `<text>{emoji}</text>` | `<LandmarkIcon id={landmark.id} size={24} />` |
| Arrival modal hero | `ArrivalModal.svelte` uses big emoji | `<LandmarkIcon id={landmark.id} size={64} />` |
| Ford modal header | `FordModal.svelte` uses 🌊 | `<LandmarkIcon id={landmark.id} size={48} />` |
| Trade modal header | `TradeModal.svelte` uses generic post emoji | `<LandmarkIcon id={landmark.id} size={48} />` |
| Journal entry rows | `JournalEntry.svelte` shows landmark name only | Optional: prepend `<LandmarkIcon id={...} size={20} />` |

---

## File layout in the repo

```
src/lib/ui/
├── LandmarkIcon.svelte                  ← dispatcher (import from handoff)
└── landmark-art/
    ├── _helpers.svelte                  ← <RiverSurface>, <FloatingWagon>, <ShallowFordWagon>
    ├── hollenberg_ranch.svelte
    ├── fort_kearny.svelte
    ├── … (38 total — one per landmark id) …
    └── oregon_city.svelte
```

Each `landmark-art/<id>.svelte` file is **pure SVG markup** — no `<script>`,
no props. It exports the inner `<g>…</g>` of the corresponding React
component verbatim, with these mechanical conversions:

- `className` → `class`
- `strokeWidth` → `stroke-width`, `strokeLinejoin` → `stroke-linejoin`, etc.
- `{LI.ink}` → `"#2a1a08"`, `{LI.parchment}` → `"#e8d9b8"` — inline the hex
  using the palette table in `README.md` (or import the `LI` object from a
  shared `_palette.js` if preferred — your call)
- `<HybridBadge tone="warm">…</HybridBadge>` wrapper becomes literal:
  ```svelte
  <defs>
    <clipPath id="hb-{id}"><circle cx="12" cy="12" r="10.5" /></clipPath>
  </defs>
  <circle cx="12" cy="12" r="11" fill="#e8d9b8" stroke="#2a1a08" stroke-width="1.1" />
  <g clip-path="url(#hb-{id})">
    <rect x="1" y="1" width="22" height="11" fill="#f0deb6" opacity="0.55" />
    <rect x="1" y="12" width="22" height="11" fill="#e8d9b8" opacity="0.7" />
    <!-- inner art here -->
  </g>
  <circle cx="12" cy="12" r="10" fill="none" stroke="#2a1a08" stroke-width="0.4" opacity="0.6" />
  ```
- Pass-by components have NO badge — they're bare `<g>` content rendered
  directly inside the dispatcher's `<svg>`.

---

## Conventions to keep

1. **Every landmark in `landmarks.ts` has an icon.** Don't fall back to a
   generic glyph at runtime — if you add a landmark to the data, add the
   art file in the same PR.
2. **24×24 viewBox is the canonical size.** Don't redraw at other sizes.
   Let `width`/`height` props scale the SVG.
3. **No transitions, no hover states inside the icon.** This is content
   art, not a UI control. Hover styling lives on the surrounding
   `LandmarkPin` button.
4. **Stop vs. pass-by visual contrast is load-bearing.** Stops have the
   circular hybrid badge; pass-bys are bare silhouettes. Don't unify them.
5. **Tone is part of identity.** Don't change a fort's badge tone without
   checking `README.md` — Fort Hall is cool because it's HBC; making it
   warm breaks the affiliation cue.

---

## Do / don't

| Do | Don't |
|---|---|
| Reuse `_helpers.svelte` for river-ford grammar | Reinvent the wagon for each ford |
| Use the `LI` palette hex values literally | Introduce new hues for one-off icons |
| Import all 38 art files in `LandmarkIcon.svelte` | Lazy-load them — bundle is ~14 KB total gzipped |
| Test at 24, 32, 48 px against `Specimen Sheet.html` | Test only at one size |

---

## Verification

After porting, the repo's `Specimen Sheet.html` (or equivalent storybook
page) should match `design_handoff_landmark_icons/Specimen Sheet.html`
pixel-close. The four sheets in `landmark_icons/Sheet 1–4.html` are the
explorations that led here; keep them as design history but don't ship.
