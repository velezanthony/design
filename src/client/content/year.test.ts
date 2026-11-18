import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import { initCurrentYear } from './year';

function page(html: string) {
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}

describe('initCurrentYear', () => {
  it('sustituye el año del build por el del reloj inyectado', () => {
    const htmlDocument = page('<p>© <span data-current-year>2020</span> Design</p>');
    initCurrentYear(htmlDocument, new Date('2031-06-15T12:00:00'));
    expect(htmlDocument.querySelector('[data-current-year]')!.textContent).toBe('2031');
  });

  it('actualiza todos los elementos marcados', () => {
    const htmlDocument = page('<span data-current-year>2020</span><i data-current-year>2021</i>');
    initCurrentYear(htmlDocument, new Date('2031-06-15T12:00:00'));
    expect(
      [...htmlDocument.querySelectorAll('[data-current-year]')].map((node) => node.textContent),
    ).toEqual(['2031', '2031']);
  });

  it('sin elementos marcados no hace nada', () => {
    const htmlDocument = page('<p>© 2020 Design</p>');
    expect(() => initCurrentYear(htmlDocument, new Date('2031-06-15T12:00:00'))).not.toThrow();
    expect(htmlDocument.body.textContent).toBe('© 2020 Design');
  });

  it('por defecto usa la fecha de hoy', () => {
    const htmlDocument = page('<span data-current-year>1999</span>');
    initCurrentYear(htmlDocument);
    expect(htmlDocument.querySelector('[data-current-year]')!.textContent).toBe(
      String(new Date().getFullYear()),
    );
  });
});
