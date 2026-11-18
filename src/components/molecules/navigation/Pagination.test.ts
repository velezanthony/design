import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import Pagination from './Pagination.astro';

function props(extra: Record<string, unknown> = {}) {
  return {
    page: 2,
    pages: 3,
    href: (page: number) => `/t/?page=${page}`,
    ...extra,
  };
}

describe('Pagination', () => {
  it('con una sola página sigue ahí: la 1 como actual y anterior y siguiente deshabilitados', async () => {
    const htmlDocument = await render(Pagination, props({ page: 1, pages: 1 }));
    expect(htmlDocument.querySelector('nav')).not.toBeNull();
    expect(text(htmlDocument.querySelector('[aria-current="page"]'))).toBe('1');
    expect(htmlDocument.querySelectorAll('[aria-disabled="true"]').length).toBe(2);
    expect(htmlDocument.querySelector('a[rel="prev"]')).toBeNull();
    expect(htmlDocument.querySelector('a[rel="next"]')).toBeNull();
  });

  it('sin páginas (0) se comporta como una sola: la 1 actual y todo deshabilitado', async () => {
    const htmlDocument = await render(Pagination, props({ page: 1, pages: 0 }));
    expect(text(htmlDocument.querySelector('[aria-current="page"]'))).toBe('1');
    expect(htmlDocument.querySelectorAll('[aria-disabled="true"]').length).toBe(2);
  });

  it('lo deshabilitado no es un enlace, no recibe foco y lo dice con cursor-not-allowed', async () => {
    const htmlDocument = await render(Pagination, props({ page: 1, pages: 1 }));
    for (const item of htmlDocument.querySelectorAll('[aria-disabled="true"]')) {
      expect(item.tagName).not.toBe('A');
      expect(item.hasAttribute('href')).toBe(false);
      expect(item.hasAttribute('tabindex')).toBe(false);
      expect(item.className).toContain('cursor-not-allowed');
    }
  });

  it('la actual de una sola página no es un enlace: no hay a dónde ir', async () => {
    const htmlDocument = await render(Pagination, props({ page: 1, pages: 1 }));
    expect(htmlDocument.querySelector('a')).toBeNull();
  });

  it('enlaces anterior y siguiente con rel, y la página actual marcada', async () => {
    const htmlDocument = await render(Pagination, props());
    expect(htmlDocument.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/t/?page=1');
    expect(htmlDocument.querySelector('a[rel="next"]')?.getAttribute('href')).toBe('/t/?page=3');
    const current = htmlDocument.querySelector('[aria-current="page"]')!;
    expect(text(current)).toBe('2');
  });

  it('con pocas páginas enseña el número de cada una, como enlaces', async () => {
    const htmlDocument = await render(Pagination, props());
    const numbers = [...htmlDocument.querySelectorAll('a[data-page]')].map((anchor) =>
      anchor.getAttribute('href'),
    );
    expect(numbers).toEqual(['/t/?page=1', '/t/?page=2', '/t/?page=3']);
  });

  it('en la primera «anterior» está deshabilitado; en la última, «siguiente»', async () => {
    const first = await render(Pagination, props({ page: 1 }));
    expect(first.querySelector('a[rel="prev"]')).toBeNull();
    expect(text(first.querySelector('[aria-disabled="true"]'))).toContain('Previous');
    expect(first.querySelector('a[rel="next"]')).not.toBeNull();
    const last = await render(Pagination, props({ page: 3 }));
    expect(last.querySelector('a[rel="next"]')).toBeNull();
    expect(text(last.querySelector('[aria-disabled="true"]'))).toContain('Next');
    expect(last.querySelector('a[rel="prev"]')).not.toBeNull();
  });

  it('con muchas páginas condensa: primera, vecinas de la actual y última, con puntos', async () => {
    const htmlDocument = await render(Pagination, props({ page: 10, pages: 20 }));
    const shown = [...htmlDocument.querySelectorAll('[data-page]')].map((element) => text(element));
    expect(shown).toEqual(['1', '9', '10', '11', '20']);
    expect(htmlDocument.querySelectorAll('[data-gap]').length).toBe(2);
  });

  it('sin textos propios usa unos neutrales en inglés', async () => {
    const htmlDocument = await render(Pagination, props({ page: 2, pages: 3 }));
    expect(htmlDocument.querySelector('nav')!.getAttribute('aria-label')).toBe('Pagination');
    expect(text(htmlDocument.querySelector('a[rel="prev"]'))).toContain('Previous');
    expect(text(htmlDocument.querySelector('a[rel="next"]'))).toContain('Next');
    expect(htmlDocument.querySelector('a[data-page][aria-label="Page 1"]')).not.toBeNull();
  });

  it('los textos se pasan por props, para cualquier idioma', async () => {
    const labels = {
      nav: 'Paginación de la tabla',
      previous: '← Anterior',
      next: 'Siguiente →',
      page: (number: number) => `Página ${number}`,
    };
    const htmlDocument = await render(Pagination, props({ labels }));
    expect(htmlDocument.querySelector('nav')!.getAttribute('aria-label')).toBe(
      'Paginación de la tabla',
    );
    expect(text(htmlDocument.querySelector('a[rel="prev"]'))).toBe('← Anterior');
    expect(text(htmlDocument.querySelector('a[rel="next"]'))).toBe('Siguiente →');
    expect(htmlDocument.querySelector('a[data-page][aria-label="Página 1"]')).not.toBeNull();
  });
});
