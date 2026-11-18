import { describe, expect, it } from 'vitest';
import type { EntryRow } from '../../../core/seo-on-page/pages/listing/entries';
import { render, text } from '../../../testing/render';
import EntriesTable from './EntriesTable.astro';

function entry(locale: string, extra: Partial<EntryRow> = {}): EntryRow {
  return {
    slug: 'guide',
    locale,
    href: `/i/?slug=guide&locale=${locale}`,
    title: `Guide ${locale} | Site`,
    titleLength: 20,
    descriptionSource: 'site',
    descriptionLength: 93,
    issues: [],
    tone: 'ok',
    ...extra,
  };
}

describe('EntriesTable', () => {
  it('una fila por entrada, cada una enlazada a su inspector, con su idioma', async () => {
    const doc = await render(EntriesTable, { rows: [entry('en'), entry('es')] });
    const rows = [...doc.querySelectorAll('tbody tr')];
    expect(rows.map((row) => row.getAttribute('data-entry'))).toEqual(['guide/en', 'guide/es']);
    expect(rows[1]!.querySelector('th a')!.getAttribute('href')).toBe('/i/?slug=guide&locale=es');
    expect(rows[1]!.querySelector('[data-locale]')!.getAttribute('data-locale')).toBe('es');
  });

  it('dice de dónde sale la descripción y su longitud', async () => {
    const doc = await render(EntriesTable, { rows: [entry('en')] });
    const cells = doc.querySelectorAll('tbody td');
    expect(text(cells[2])).toContain('Heredada del sitio');
    expect(text(cells[2])).toContain('93');
  });

  it('sin descripción no pinta barra', async () => {
    const doc = await render(EntriesTable, {
      rows: [entry('en', { descriptionSource: 'none', descriptionLength: undefined })],
    });
    expect(text(doc.querySelectorAll('tbody td')[2])).toContain('Sin descripción');
    expect(doc.querySelectorAll('tbody td')[2]!.querySelector('[role="meter"], meter')).toBeNull();
  });

  it('sin problemas propios lo dice', async () => {
    expect(text(await render(EntriesTable, { rows: [entry('en')] }))).toContain('Nada propio');
  });

  it('sin filas dice que ninguna cumple', async () => {
    expect(text(await render(EntriesTable, { rows: [] }))).toContain(
      'Ninguna página cumple los filtros.',
    );
  });
});
