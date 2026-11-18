import { describe, expect, it } from 'vitest';
import { prevNext } from './prev-next';
import type { SidebarLeaf } from './sidebar';

function leaf(slug: string, badge?: string): SidebarLeaf {
  return {
    label: slug,
    slug,
    href: `/${slug}/`,
    ...(badge ? { badge } : {}),
  };
}
const order = [leaf('a'), leaf('b'), leaf('c')];

describe('prevNext', () => {
  it('en una página intermedia hay anterior y siguiente', () => {
    expect(prevNext(order, 'b')).toEqual({ prev: order[0], next: order[2] });
  });

  it('la primera no tiene anterior y la última no tiene siguiente', () => {
    expect(prevNext(order, 'a')).toEqual({ next: order[1] });
    expect(prevNext(order, 'c')).toEqual({ prev: order[1] });
  });

  it('salta las hojas link (llevan a otro idioma)', () => {
    const withLink = [leaf('a'), leaf('changelog', 'en'), leaf('c')];
    expect(prevNext(withLink, 'a')).toEqual({ next: withLink[2] });
    expect(prevNext(withLink, 'c')).toEqual({ prev: withLink[0] });
  });

  it('una página que no está en el orden no tiene vecinas', () => {
    expect(prevNext(order, 'zzz')).toEqual({});
  });

  it('una sola página no tiene vecinas', () => {
    expect(prevNext([leaf('a')], 'a')).toEqual({});
  });
});
