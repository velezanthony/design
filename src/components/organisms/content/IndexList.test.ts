import { describe, expect, it } from 'vitest';

import type { IndexSection } from '../../../core/navigation/index-entries';
import { render, text } from '../../../testing/render';
import { stringsFor } from '../../../testing/strings';
import IndexList from './IndexList.astro';

function entry(title: string, slug: string, extra = {}) {
  return { slug, title, href: `/repo/${slug}/`, path: [], ...extra };
}

const sections: IndexSection[] = [
  {
    label: 'Esenciales',
    id: 'esenciales',
    nodes: [
      {
        label: 'Astro',
        items: [
          entry('Tipado', 'tipado', { summary: 'Sin generar código.' }),
          {
            label: 'Vite',
            items: [entry('Plugins', 'plugins', { updated: '2026-03-02T00:00:00+00:00' })],
          },
        ],
      },
    ],
  },
  { nodes: [entry('Suelto', 'suelto')] },
];

describe('IndexList', () => {
  it('cada sección es un h2 con su id; las páginas sin sección van sin encabezado', async () => {
    const document = await render(IndexList, { sections, strings: stringsFor('es'), lang: 'es' });
    const headings = [...document.querySelectorAll('h2')];
    expect(headings.map((heading) => [heading.id, text(heading)])).toEqual([
      ['esenciales', 'Esenciales'],
    ]);
    expect(document.querySelectorAll('section')).toHaveLength(2);
  });

  it('grupos anidados en negrita y cada página con su enlace, su resumen y su fecha', async () => {
    const document = await render(IndexList, { sections, strings: stringsFor('es'), lang: 'es' });
    const groups = [...document.querySelectorAll('[data-index-group]')].map((group) =>
      text(group.querySelector(':scope > p')),
    );
    expect(groups).toEqual(['Astro', 'Vite']);
    const tipado = document.querySelector('a[href="/repo/tipado/"]')!.closest('li')!;
    expect(text(tipado.querySelector('a'))).toBe('Tipado');
    expect(text(tipado.querySelector('p'))).toBe('Sin generar código.');
    const plugins = document.querySelector('a[href="/repo/plugins/"]')!.closest('li')!;
    expect(text(plugins.querySelector('time'))).toBe('2 mar 2026');
  });
});
