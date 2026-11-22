import { describe, expect, it } from 'vitest';
import { pagesOf, type StoredPage } from './stored-page';

function data(slug: string, locale: string, extra: Partial<StoredPage> = {}): StoredPage {
  return {
    slug,
    locale,
    title: slug || 'Home',
    sourcePath: `${slug || 'index'}.md`,
    ...extra,
  };
}

describe('pagesOf', () => {
  it('reconstruye Page desde los datos de la colección', () => {
    const [page] = pagesOf([data('guide', 'es', { seo: { noindex: true }, translations: 'omit' })]);
    expect(page).toMatchObject({
      slug: 'guide',
      locale: 'es',
      seo: { noindex: true },
      translations: 'omit',
    });
  });
});

describe('pagesOf: kind', () => {
  it('conserva si la página es externa, y sin dato es nativa', () => {
    const [external, native] = pagesOf([
      data('changelog', 'en', { kind: 'external' }),
      data('guide', 'en'),
    ]);
    expect(external!.kind).toBe('external');
    expect(native!.kind).toBe('native');
  });
});

describe('pagesOf: índices', () => {
  it('conserva el listado y el bloque `index` (sin la portada, que es de la vista)', () => {
    const [page] = pagesOf([
      data('a', 'en', {
        kind: 'generated',
        listing: { layout: 'cards' },
        index: { summary: 'Corto.', imageAlt: 'Un gato', cover: false },
      }),
    ]);
    expect(page).toMatchObject({
      kind: 'generated',
      listing: { layout: 'cards' },
      index: { summary: 'Corto.', imageAlt: 'Un gato' },
    });
    expect(page!.index).not.toHaveProperty('cover');
  });

  it('sin resumen ni texto alternativo no hay bloque `index`', () => {
    const [page] = pagesOf([data('a', 'en', { index: { cover: false } })]);
    expect(page).not.toHaveProperty('index');
  });
});

describe('`slug` propio', () => {
  it('pagesOf conserva la URL propia de la página', () => {
    const [page] = pagesOf([data('guide', 'es', { urlSlug: 'guia' })]);
    expect(page).toMatchObject({ slug: 'guide', urlSlug: 'guia' });
  });
});
