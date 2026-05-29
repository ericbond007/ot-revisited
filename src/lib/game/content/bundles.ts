// src/lib/game/content/bundles.ts
//
// #1172 — named outfitter loadouts the player applies with one click.
// ADDITIVE: applying folds `kit[id] x qty` into the basket at normal
// per-item prices (no discount, no premium). Value is convenience, not
// a deal — so there is intentionally NO `cost` field. Compositions are
// taken verbatim from the Claude Design handoff (`outfit-data.jsx`).
export type BundleTone = 'rust' | 'good' | 'warn' | 'neutral';

export interface Bundle {
  id: string;
  /** Display name, e.g. "Marcy's top-up". */
  name: string;
  /** Eyebrow line (IM Fell SC), e.g. "1859 . prudent". */
  sub: string;
  /** Period-citation flavor. */
  blurb: string;
  /** Emoji glyph (placeholder until the icon pass). */
  icon: string;
  tone: BundleTone;
  /** itemId -> quantity, folded additively onto the basket. */
  kit: Record<string, number>;
}

export const BUNDLES: Bundle[] = [
  {
    id: 'marcy_topup',
    name: "Marcy's top-up",
    sub: '1859 . prudent',
    blurb: "Tops up the basics over Marcy 1859's recommended floor — extra powder, water bags, spare wheel.",
    icon: '\u{1F4CB}',
    tone: 'rust',
    kit: {
      flour: 50, bacon: 20, gunpowder: 10, lead_balls: 100, percussion_caps: 100,
      water_bag: 4, ox_shoes: 6, rope: 1, iron_toolkit: 1, bandages: 8
    }
  },
  {
    id: 'palmer_generous',
    name: "Palmer's generous",
    sub: '1845 . 4 souls x full ration',
    blurb: 'Palmer 1845 prescribed lavish per-soul provisioning. Big food, big medicine, no luxuries.',
    icon: '\u{1F35E}',
    tone: 'good',
    kit: {
      flour: 250, bacon: 60, beans: 40, sugar: 15, coffee: 6, dried_fruit: 25,
      hardtack: 30, quinine: 4, laudanum: 2, patent_medicine: 2, bandages: 16
    }
  },
  {
    id: 'bryant_minimum',
    name: "Bryant's minimum",
    sub: '1846 . light & fast',
    blurb: 'Bryant 1846 famously ran light — flour, bacon, rifle, powder, courage. Banks on hunting.',
    icon: '\u{1F40E}',
    tone: 'neutral',
    kit: {
      flour: 40, bacon: 15, gunpowder: 15, lead_balls: 150, percussion_caps: 150,
      rope: 1, shovel: 1
    }
  },
  {
    id: 'frontier_starter',
    name: 'Frontier starter',
    sub: 'Build a life in Oregon',
    blurb: "Plow, seed grain, fruit saplings, family bible. Doesn't help you survive — does set up Oregon.",
    icon: '\u{1F333}',
    tone: 'warn',
    kit: {
      plow: 1, seed_grain: 2, fruit_tree_saplings: 1, garden_seeds: 1, family_bible: 1
    }
  },
  {
    id: 'hunter_pack',
    name: 'Hunter pack',
    sub: 'Heavy on powder & shot',
    blurb: 'For parties that plan to live off the rifle. Triple ammo, spare rifle, light on staples.',
    icon: '\u{1F52B}',
    tone: 'rust',
    kit: {
      gunpowder: 30, lead_balls: 300, percussion_caps: 300, rifle: 1, bacon: 10, hardtack: 15
    }
  }
];
