import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import SearchBox from './SearchBox.astro';

function box(props: Record<string, unknown> = {}) {
  return render(SearchBox, { strings: stringsFor('es'), baseUrl: '/repo/', ...props });
}

describe('SearchBox', () => {
  it('expone el contrato que cablea client/search.ts', async () => {
    const root = (await box()).querySelector('[data-search]')!;
    expect(root.getAttribute('data-base-url')).toBe('/repo/');
    expect(root.querySelector('input[data-search-input]')).not.toBeNull();
    expect(root.querySelector('[data-search-status][role="status"]')).not.toBeNull();
    expect(root.querySelector('ul[data-search-results]')).not.toBeNull();
  });

  it('el campo tiene etiqueta visible para lectores y placeholder localizados', async () => {
    const htmlDocument = await box();
    const input = htmlDocument.querySelector('input')!;
    expect(input.getAttribute('type')).toBe('search');
    expect(input.getAttribute('placeholder')).toBe('Buscar en la documentación');
    const label = htmlDocument.querySelector(`label[for="${input.id}"]`)!;
    expect(text(label)).toBe('Buscar');
  });

  it('pasa los textos de estado al cliente desde el catálogo', async () => {
    const root = (await box()).querySelector('[data-search]')!;
    expect(root.getAttribute('data-requires-build')).toBe(
      'La búsqueda necesita una build de producción',
    );
    expect(root.getAttribute('data-no-results')).toBe('Sin resultados para «{query}»');
  });

  it('respeta overrides y otro idioma', async () => {
    const en = (await box({ strings: stringsFor('en', { 'search.label': 'Find' }) })).querySelector(
      'label',
    )!;
    expect(text(en)).toBe('Find');
  });

  it('dos cajas en la misma página no comparten id', async () => {
    const firstId = (await box({ id: 'a' })).querySelector('input')!.id;
    const secondId = (await box({ id: 'b' })).querySelector('input')!.id;
    expect(firstId).not.toBe(secondId);
  });

  it('la lista de resultados está vacía y el estado no se anuncia sin JS', async () => {
    const htmlDocument = await box();
    expect(htmlDocument.querySelector('[data-search-results]')!.children).toHaveLength(0);
    expect(text(htmlDocument.querySelector('[data-search-status]'))).toBe('');
  });
});
