import { describe, expect, it } from 'vitest';
import type { MatrixRow } from '../../../core/seo-on-page/pages/listing/matrix';
import { render, text } from '../../../testing/render';
import LanguageMatrix from './LanguageMatrix.astro';

const row = (extra: Partial<MatrixRow> = {}): MatrixRow => ({
  slug: 'guide',
  title: 'Guide',
  href: '/i/?slug=guide&locale=en',
  tags: [],
  cells: [
    { locale: 'en', state: 'exists' },
    { locale: 'es', state: 'exists' },
  ],
  hreflang: 'reciprocal',
  xDefault: 'en',
  complete: true,
  ...extra,
});

const matrix = (rows: MatrixRow[], hreflang = true, locales = ['en', 'es']) =>
  render(LanguageMatrix, { rows, locales, hreflang });

describe('LanguageMatrix', () => {
  it('una columna por idioma, más hreflang y x-default', async () => {
    const doc = await matrix([row()]);
    expect([...doc.querySelectorAll('thead th')].map((th) => text(th))).toEqual([
      'Página',
      'EN',
      'ES',
      'hreflang',
      'x-default',
    ]);
  });

  it('con un solo idioma no hay columnas de hreflang', async () => {
    const doc = await matrix([row({ cells: [{ locale: 'en', state: 'exists' }] })], false, ['en']);
    expect([...doc.querySelectorAll('thead th')].map((th) => text(th))).toEqual(['Página', 'EN']);
  });

  it('cada celda dice el estado en palabras y lo lleva en un atributo', async () => {
    const doc = await matrix([
      row({
        cells: [
          { locale: 'en', state: 'exists' },
          { locale: 'es', state: 'omitted' },
        ],
        hreflang: 'unpaired',
        xDefault: undefined,
      }),
    ]);
    expect(text(doc.querySelector('td[data-locale="en"]'))).toContain('sí');
    expect(doc.querySelector('td[data-locale="es"]')!.getAttribute('data-state')).toBe('omitted');
    expect(text(doc.querySelector('td[data-locale="es"]'))).toContain('omitida por política');
    expect(text(doc.querySelector('td[data-hreflang]'))).toContain('sin par');
    expect(text(doc.querySelector('td[data-x-default]'))).toBe('–');
  });

  it('el hreflang omitido por noindex lo dice', async () => {
    const doc = await matrix([row({ hreflang: 'omitted', xDefault: undefined })]);
    expect(text(doc.querySelector('td[data-hreflang]'))).toContain('omitido (noindex)');
  });

  it('x-default dice a qué idioma apunta', async () => {
    expect(text((await matrix([row()])).querySelector('td[data-x-default]'))).toContain('en');
  });

  it('la fila enlaza al inspector y trae la leyenda y la nota', async () => {
    const doc = await matrix([row()]);
    expect(doc.querySelector('tbody th a')!.getAttribute('href')).toBe('/i/?slug=guide&locale=en');
    expect(text(doc.querySelector('ul[aria-label="Leyenda"]'))).toContain('falta (no hay fichero)');
    expect(text(doc)).toContain('hreflang solo cuenta si es recíproco');
  });

  it('sin filas dice que ninguna cumple', async () => {
    expect(text(await matrix([]))).toContain('Ninguna página cumple los filtros.');
  });
});
