import { describe, it, expect } from 'vitest';
import { parseBuyOrders } from '../src/routes/outfit/+page.server';

// Regression: the outfit form once emitted two `buy_<id>` hidden inputs per
// item (a named NumberStepper + the top-level buyQty loop), so the server
// bought every open-category item — and chickens always — TWICE,
// double-charging cash and double-stocking inventory.
describe('parseBuyOrders — outfit buy dedup', () => {
  it('dedupes duplicate buy_<id> fields so an item is purchased once', () => {
    const fd = new FormData();
    fd.append('buy_chicken', '5');
    fd.append('buy_chicken', '5'); // the duplicate hidden input
    fd.append('buy_flour', '10');
    const buys = parseBuyOrders(fd);
    expect(buys.filter((b) => b.item === 'chicken')).toEqual([{ item: 'chicken', qty: 5 }]);
    expect(buys.find((b) => b.item === 'flour')?.qty).toBe(10);
  });

  it('ignores non-buy fields and zero/negative quantities', () => {
    const fd = new FormData();
    fd.append('wagonModel', 'heavy');
    fd.append('buy_flour', '0');
    fd.append('buy_bacon', '3');
    expect(parseBuyOrders(fd)).toEqual([{ item: 'bacon', qty: 3 }]);
  });
});
