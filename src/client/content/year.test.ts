import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';

import { initCurrentYear } from './year';

const page = (html: string) =>
  parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;

describe('initCurrentYear', () => {
  it('sustituye el año del build por el del reloj inyectado', () => {
    const doc = page('<p>© <span data-current-year>2020</span> Design</p>');
    initCurrentYear(doc, new Date('2031-06-15T12:00:00'));
    expect(doc.querySelector('[data-current-year]')!.textContent).toBe('2031');
  });

  it('actualiza todos los elementos marcados', () => {
    const doc = page('<span data-current-year>2020</span><i data-current-year>2021</i>');
    initCurrentYear(doc, new Date('2031-06-15T12:00:00'));
    expect([...doc.querySelectorAll('[data-current-year]')].map((n) => n.textContent)).toEqual([
      '2031',
      '2031',
    ]);
  });

  it('sin elementos marcados no hace nada', () => {
    const doc = page('<p>© 2020 Design</p>');
    expect(() => initCurrentYear(doc, new Date('2031-06-15T12:00:00'))).not.toThrow();
    expect(doc.body.textContent).toBe('© 2020 Design');
  });

  it('por defecto usa la fecha de hoy', () => {
    const doc = page('<span data-current-year>1999</span>');
    initCurrentYear(doc);
    expect(doc.querySelector('[data-current-year]')!.textContent).toBe(
      String(new Date().getFullYear()),
    );
  });
});
