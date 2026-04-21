export interface PriceEntry {
  buy: number;
  sell: number;
}

export const PRICES: Record<string, PriceEntry> = {
  flour: { buy: 0.20, sell: 0.10 },
  bacon: { buy: 0.40, sell: 0.30 },
  beans: { buy: 0.25, sell: 0.15 },
  bullets: { buy: 2.00, sell: 1.00 },
  rifle: { buy: 20.00, sell: 12.00 },
  shovel: { buy: 4.00, sell: 2.00 },
  yoke: { buy: 6.00, sell: 3.00 },
  wheel: { buy: 10.00, sell: 6.00 },
  axle: { buy: 12.00, sell: 8.00 },
  tongue: { buy: 8.00, sell: 5.00 },
  ox: { buy: 30.00, sell: 20.00 },
  coffee: { buy: 1.50, sell: 0.80 },
  tea: { buy: 1.00, sell: 0.60 },
  dried_fruit: { buy: 0.60, sell: 0.35 }
};

export function getPrice(item: string): PriceEntry {
  const p = PRICES[item];
  if (!p) throw new Error(`Unknown item for trade: ${item}`);
  return p;
}
