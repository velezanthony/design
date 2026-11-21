import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import { items } from '../../../testing/index-items';
import IndexTable from './IndexTable.astro';

describe('IndexTable', () => {
  it('columnas del catálogo y un título de tabla para lectores de pantalla', async () => {
    const document = await render(IndexTable, { items, strings: stringsFor('es'), lang: 'es' });
    const table = document.querySelector('table.table-cards')!;
    expect([...table.querySelectorAll('th')].map((cell) => text(cell))).toEqual([
      'Título',
      'Resumen',
      'Sección',
      'Actualizado',
    ]);
    expect(text(table.querySelector('caption'))).toBe(
      'Páginas, de la más reciente a la más antigua',
    );
  });

  it('cada fila es una tarjeta en móvil, con la etiqueta de cada celda', async () => {
    const document = await render(IndexTable, { items, strings: stringsFor('es'), lang: 'es' });
    const rows = [...document.querySelectorAll('tbody tr[data-card]')];
    expect(rows).toHaveLength(3);
    const cells = [...rows[1]!.querySelectorAll('td')];
    expect(cells.map((cell) => cell.getAttribute('data-cell'))).toEqual([
      'Título',
      'Resumen',
      'Sección',
      'Actualizado',
    ]);
    expect(cells[0]!.querySelector('a')!.getAttribute('href')).toBe(
      '/repo/tutoriales/instalacion/',
    );
    expect(text(cells[2]!)).toBe('Esenciales › Primeros pasos');
    expect(text(cells[3]!)).toBe('21 nov 2026');
  });

  it('sin fecha la celda queda vacía y en móvil no se apila (sin etiqueta suelta)', async () => {
    const document = await render(IndexTable, { items, strings: stringsFor('es'), lang: 'es' });
    const first = document.querySelector('tbody tr')!;
    const updated = first.querySelector('td[data-cell="Actualizado"]')!;
    expect(updated.querySelector('time')).toBeNull();
    expect(updated.getAttribute('class')).toContain('max-md:hidden!');
    const dated = document
      .querySelectorAll('tbody tr')[1]!
      .querySelector('td[data-cell="Actualizado"]')!;
    expect(dated.getAttribute('class')).not.toContain('max-md:hidden!');
  });

  it('con `visible`, las entradas de más van ocultas (las enseña el selector «Por página»)', async () => {
    const document = await render(IndexTable, {
      items,
      strings: stringsFor('es'),
      lang: 'es',
      visible: 2,
    });
    const entries = [...document.querySelectorAll('[data-index-item]')];
    expect(entries.map((entry) => entry.hasAttribute('hidden'))).toEqual([false, false, true]);
  });
});
