import { describe, it, expect } from 'vitest';
import { _parseTradeBasket } from '../src/routes/play/+page.server';

function fd(pairs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(pairs)) f.append(k, v);
  return f;
}

describe('_parseTradeBasket', () => {
  it('parses mode, get_/give_ fields, and cashOffer; drops zero/neg qty', () => {
    const b = _parseTradeBasket(fd({
      mode: 'barter', get_flour: '8', get_bacon: '0', give_buffalo_robe: '2', cashOffer: '5'
    }));
    expect(b.mode).toBe('barter');
    expect(b.get).toEqual({ flour: 8 });
    expect(b.give).toEqual({ buffalo_robe: 2 });
    expect(b.cashOffer).toBe(5);
  });
  it('defaults mode to cash and cashOffer to 0', () => {
    const b = _parseTradeBasket(fd({ get_flour: '3' }));
    expect(b.mode).toBe('cash');
    expect(b.cashOffer).toBe(0);
  });
});
