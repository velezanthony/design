import { describe, expect, it } from 'vitest';
import type { EntryCover } from '../../core/listing/covers';
import type { ListingView } from '../../core/listing/view';
import { resolveCovers } from './index-covers';

function view(covers: EntryCover[]): ListingView {
  return {
    layout: 'cards',
    items: covers.map((cover, index) => ({
      slug: `a/${index}`,
      title: `${index}`,
      href: `/a/${index}/`,
      path: [],
      cover,
      pattern: 'grid' as const,
    })),
    total: covers.length,
    range: { from: 1, to: covers.length },
  };
}

/** Las portadas del resultado; falla si no es una tabla o unas tarjetas. */
function coversOf(result: ListingView<unknown>) {
  if (result.layout === 'list') throw new Error('esperaba tarjetas');
  return result.items.map((item) => item.cover);
}

async function optimize(asset: { src: string }) {
  return `/_astro/${asset.src.split('/').pop()}`;
}

describe('resolveCovers', () => {
  it('una imagen procesada pasa por astro:assets; una de public/ lleva la base', async () => {
    const result = await resolveCovers(
      view([
        { kind: 'image', source: { asset: { src: '/src/x.png', width: 10, height: 5 } }, alt: '' },
        { kind: 'image', source: { src: '/portadas/y.png' }, alt: 'Y' },
      ]),
      '/repo',
      optimize,
    );
    expect(coversOf(result)).toEqual([
      { kind: 'image', src: '/_astro/x.png', alt: '' },
      { kind: 'image', src: '/repo/portadas/y.png', alt: 'Y' },
    ]);
  });

  it('sin imagen o con la de la librería no cambia nada', async () => {
    const result = await resolveCovers(
      view([{ kind: 'none' }, { kind: 'placeholder' }]),
      '/',
      optimize,
    );
    expect(coversOf(result)).toEqual([{ kind: 'none' }, { kind: 'placeholder' }]);
  });

  it('una ruta que no llegó a imagen (`docsSchema()` sin `image`) cae a la de la librería', async () => {
    const result = await resolveCovers(
      view([{ kind: 'image', source: { asset: './x.png' }, alt: '' }]),
      '/',
      optimize,
    );
    expect(coversOf(result)[0]).toEqual({ kind: 'placeholder' });
  });

  it('una lista no tiene portadas: sale tal cual', async () => {
    const list: ListingView = { layout: 'list', sections: [], headings: [], empty: true };
    expect(await resolveCovers(list, '/repo', optimize)).toBe(list);
  });
});
