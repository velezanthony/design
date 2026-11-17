import { describe, expect, it } from 'vitest';
import { render, text } from '../../testing/render';
import Pagination from './Pagination.astro';

const props = (extra: Record<string, unknown> = {}) => ({
  page: 2,
  pages: 3,
  href: (page: number) => `/t/?page=${page}`,
  ...extra,
});

describe('Pagination', () => {
  it('con una sola página no pinta nada', async () => {
    const doc = await render(Pagination, props({ page: 1, pages: 1 }));
    expect(doc.querySelector('nav')).toBeNull();
  });

  it('enlaces anterior y siguiente con rel, y la página actual marcada', async () => {
    const doc = await render(Pagination, props());
    expect(doc.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/t/?page=1');
    expect(doc.querySelector('a[rel="next"]')?.getAttribute('href')).toBe('/t/?page=3');
    const current = doc.querySelector('[aria-current="page"]')!;
    expect(text(current)).toBe('2');
  });

  it('con pocas páginas enseña el número de cada una, como enlaces', async () => {
    const doc = await render(Pagination, props());
    const numbers = [...doc.querySelectorAll('a[data-page]')].map((a) => a.getAttribute('href'));
    expect(numbers).toEqual(['/t/?page=1', '/t/?page=2', '/t/?page=3']);
  });

  it('en la primera no hay «anterior»; en la última, no hay «siguiente»', async () => {
    const first = await render(Pagination, props({ page: 1 }));
    expect(first.querySelector('a[rel="prev"]')).toBeNull();
    expect(first.querySelector('a[rel="next"]')).not.toBeNull();
    const last = await render(Pagination, props({ page: 3 }));
    expect(last.querySelector('a[rel="next"]')).toBeNull();
    expect(last.querySelector('a[rel="prev"]')).not.toBeNull();
  });

  it('con muchas páginas condensa: primera, vecinas de la actual y última, con puntos', async () => {
    const doc = await render(Pagination, props({ page: 10, pages: 20 }));
    const shown = [...doc.querySelectorAll('[data-page]')].map((el) => text(el));
    expect(shown).toEqual(['1', '9', '10', '11', '20']);
    expect(doc.querySelectorAll('[data-gap]').length).toBe(2);
  });
});
