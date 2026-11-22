import { describe, expect, it } from 'vitest';

import { render, text } from '../../../testing/render';
import SectionPath from './SectionPath.astro';

describe('SectionPath', () => {
  it('une la sección y los grupos con «›» en una sola frase', async () => {
    const document = await render(SectionPath, {
      path: ['Esenciales', 'Primeros pasos'],
      class: 'label',
    });
    const path = document.querySelector('span')!;
    expect(text(path)).toBe('Esenciales › Primeros pasos');
    expect(path.classList.contains('label')).toBe(true);
  });

  it('con el camino vacío no pinta nada', async () => {
    expect((await render(SectionPath, { path: [] })).body.innerHTML.trim()).toBe('');
  });

  it('pasa los atributos que recibe', async () => {
    const document = await render(SectionPath, { path: ['A'], 'data-listing-path': '' });
    expect(document.querySelector('[data-listing-path]')).not.toBeNull();
  });
});
