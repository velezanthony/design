import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import { items } from '../../../testing/listing-items';
import { linkVariants } from '../../atoms/actions/variants';
import ListingTable from './ListingTable.astro';

/** ¿Lleva `element` todas las clases de la variante? */
function hasVariant(element: Element, variant: string) {
  return variant.split(' ').every((name) => element.classList.contains(name));
}

describe('ListingTable', () => {
  it('columnas del catálogo y un título de tabla para lectores de pantalla', async () => {
    const document = await render(ListingTable, { items, strings: stringsFor('es'), lang: 'es' });
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
    const document = await render(ListingTable, { items, strings: stringsFor('es'), lang: 'es' });
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
    const document = await render(ListingTable, { items, strings: stringsFor('es'), lang: 'es' });
    const first = document.querySelector('tbody tr')!;
    const updated = first.querySelector('td[data-cell="Actualizado"]')!;
    expect(updated.querySelector('time')).toBeNull();
    expect(updated.getAttribute('class')).toContain('max-md:hidden!');
    const dated = document
      .querySelectorAll('tbody tr')[1]!
      .querySelector('td[data-cell="Actualizado"]')!;
    expect(dated.getAttribute('class')).not.toContain('max-md:hidden!');
  });

  it('el enlace del título usa la variante `inline` de Link', async () => {
    const document = await render(ListingTable, { items, strings: stringsFor('es'), lang: 'es' });
    const anchor = document.querySelector('tbody td a')!;
    expect(hasVariant(anchor, linkVariants.inline)).toBe(true);
    expect(anchor.classList.contains('font-medium')).toBe(true);
  });
});
