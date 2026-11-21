import { describe, expect, it } from 'vitest';
import type { EntryCover } from '../../core/listing/covers';
import type { IndexView } from '../../core/listing/view';
import { resolveCovers } from './index-covers';

function view(covers: EntryCover[]): IndexView {
  return {
    layout: 'cards',
    sections: [],
    items: covers.map((cover, index) => ({
      slug: `a/${index}`,
      title: `${index}`,
      href: `/a/${index}/`,
      path: [],
      cover,
    })),
    page: 1,
    pages: 1,
    total: covers.length,
    hrefs: ['/a/'],
    headings: [],
    all: false,
    perPage: 9,
    perPageOptions: [9],
    sizes: [],
  };
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
    expect(result.items.map((item) => item.cover)).toEqual([
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
    expect(result.items.map((item) => item.cover)).toEqual([
      { kind: 'none' },
      { kind: 'placeholder' },
    ]);
  });

  it('una ruta que no llegó a imagen (`docsSchema()` sin `image`) cae a la de la librería', async () => {
    const result = await resolveCovers(
      view([{ kind: 'image', source: { asset: './x.png' }, alt: '' }]),
      '/',
      optimize,
    );
    expect(result.items[0]!.cover).toEqual({ kind: 'placeholder' });
  });
});
