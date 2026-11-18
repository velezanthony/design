import { describe, expect, it } from 'vitest';
import type { HaveRow } from '../../../core/seo-on-page/pages/listing/have';
import type { ListingTable } from '../../../core/seo-on-page/pages/listing/model';
import { render, text } from '../../../testing/render';
import HaveTable from './HaveTable.astro';

type Columns = Extract<ListingTable, { view: 'have' }>['columns'];

const ok = { state: 'ok' } as const;
const row = (slug: string, cells: Partial<HaveRow['cells']> = {}): HaveRow => ({
  slug,
  title: slug,
  href: `/i/?slug=${slug}&locale=en`,
  tags: [],
  cells: {
    desc: { state: 'site' },
    schema: { state: 'own', detail: 'WebSite' },
    og: { state: 'site' },
    h1: ok,
    i18n: ok,
    index: ok,
    ...cells,
  },
});

const columns = (pressed?: string): Columns =>
  (['desc', 'schema', 'og', 'h1', 'i18n', 'index'] as const).map((column) => ({
    column,
    pressed: column === pressed,
    href: `/t/?view=have&lacks=${column}`,
    good: column === 'h1' ? 38 : 1,
    total: 38,
  }));

describe('HaveTable', () => {
  it('cada cabecera es un enlace con su recuento «N/M propia»', async () => {
    const doc = await render(HaveTable, { rows: [row('a')], columns: columns() });
    const desc = doc.querySelector('a[data-have-col="desc"]')!;
    expect(desc.getAttribute('href')).toBe('/t/?view=have&lacks=desc');
    expect(text(desc)).toContain('Descripción');
    expect(text(desc)).toContain('1/38 propia');
    expect(text(doc.querySelector('a[data-have-col="schema"]'))).toContain('1/38 propio');
    expect(text(doc.querySelector('a[data-have-col="h1"]'))).toContain('38/38');
    expect(text(doc.querySelector('a[data-have-col="h1"]'))).not.toContain('propi');
  });

  it('la columna activa lo dice con aria-current y con palabras', async () => {
    const doc = await render(HaveTable, { rows: [row('a')], columns: columns('og') });
    const og = doc.querySelector('a[data-have-col="og"]')!;
    expect(og.getAttribute('aria-current')).toBe('true');
    expect(text(og)).toContain('solo sin ello');
    expect(doc.querySelectorAll('a[aria-current]')).toHaveLength(1);
  });

  it('cada celda lleva su estado y lo dice en palabras', async () => {
    const doc = await render(HaveTable, {
      rows: [row('a', { i18n: { state: 'missing', detail: 'es' }, index: { state: 'no' } })],
      columns: columns(),
    });
    const cell = (col: string) => doc.querySelector(`td[data-col="${col}"]`)!;
    expect(cell('desc').getAttribute('data-state')).toBe('site');
    expect(text(cell('desc'))).toContain('del sitio');
    expect(text(cell('schema'))).toContain('WebSite');
    expect(text(cell('i18n'))).toContain('falta es');
    expect(text(cell('index'))).toContain('noindex');
  });

  it('la fila enlaza a su inspector', async () => {
    const doc = await render(HaveTable, { rows: [row('guide/intro')], columns: columns() });
    expect(doc.querySelector('tbody th a')!.getAttribute('href')).toBe(
      '/i/?slug=guide/intro&locale=en',
    );
  });

  it('sin filas dice que ninguna cumple, pero deja las cabeceras para quitar la columna', async () => {
    const doc = await render(HaveTable, { rows: [], columns: columns('og') });
    expect(text(doc)).toContain('Ninguna página cumple los filtros.');
    expect(doc.querySelector('a[data-have-col="og"]')).not.toBeNull();
  });

  it('trae la leyenda y la nota', async () => {
    const doc = await render(HaveTable, { rows: [row('a')], columns: columns() });
    expect(text(doc.querySelector('ul[aria-label="Leyenda"]'))).toContain('heredado del sitio');
    expect(text(doc)).toContain('«Del sitio» no es un fallo');
  });
});
