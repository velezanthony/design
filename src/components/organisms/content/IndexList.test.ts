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
    label: 'Desarrollo',
    id: 'desarrollo',
    nodes: [
      {
        label: 'Python',
        items: [
          entry('Tipado', 'tipado', { summary: 'Sin generar código.' }),
          {
            label: 'Django',
            items: [entry('N+1', 'n1', { updated: '2026-03-02T00:00:00+00:00' })],
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
      ['desarrollo', 'Desarrollo'],
    ]);
    expect(document.querySelectorAll('section')).toHaveLength(2);
  });

  it('grupos anidados en negrita y cada página con su enlace, su resumen y su fecha', async () => {
    const document = await render(IndexList, { sections, strings: stringsFor('es'), lang: 'es' });
    const groups = [...document.querySelectorAll('[data-index-group]')].map((group) =>
      text(group.querySelector(':scope > p')),
    );
    expect(groups).toEqual(['Python', 'Django']);
    const tipado = document.querySelector('a[href="/repo/tipado/"]')!.closest('li')!;
    expect(text(tipado.querySelector('a'))).toBe('Tipado');
    expect(text(tipado.querySelector('p'))).toBe('Sin generar código.');
    const n1 = document.querySelector('a[href="/repo/n1/"]')!.closest('li')!;
    expect(text(n1.querySelector('time'))).toBe('2 mar 2026');
  });
});
