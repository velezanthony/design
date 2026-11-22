import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import type { UrlPolicy } from '../i18n/availability';
import {
  listingPageSlug,
  listingPageUrl,
  listingPositions,
  PAGE_SEGMENT,
  PER_PAGE_SEGMENT,
  reservedSegmentErrors,
} from './urls';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'es' };

describe('segmentos', () => {
  it('fijos e iguales en todos los idiomas', () => {
    expect(PAGE_SEGMENT).toBe('page');
    expect(PER_PAGE_SEGMENT).toBe('per-page');
  });
});

describe('listingPageSlug', () => {
  it('la página 1 del tamaño por defecto es la carpeta', () => {
    expect(listingPageSlug('guia', { perPage: 10, page: 1 }, 10)).toBe('guia');
  });

  it('las demás páginas del tamaño por defecto van bajo `page/<n>`', () => {
    expect(listingPageSlug('guia', { perPage: 10, page: 2 }, 10)).toBe('guia/page/2');
  });

  it('otro tamaño va bajo `per-page/<n>`, y sus páginas debajo', () => {
    expect(listingPageSlug('guia', { perPage: 24, page: 1 }, 10)).toBe('guia/per-page/24');
    expect(listingPageSlug('guia', { perPage: 24, page: 2 }, 10)).toBe('guia/per-page/24/page/2');
  });

  it('la portada (carpeta vacía) da `page/2`', () => {
    expect(listingPageSlug('', { perPage: 10, page: 2 }, 10)).toBe('page/2');
    expect(listingPageSlug('', { perPage: 10, page: 1 }, 10)).toBe('');
  });
});

describe('listingPageUrl', () => {
  it('con la base, el prefijo de idioma y la barra final', () => {
    expect(listingPageUrl('tutorials', 'en', { perPage: 2, page: 2 }, 2, url)).toBe(
      '/repo/en/tutorials/page/2/',
    );
    expect(listingPageUrl('guia', 'es', { perPage: 2, page: 1 }, 2, url)).toBe('/repo/guia/');
  });
});

describe('listingPositions', () => {
  it('cada tamaño de `perPageOptions` × cada una de sus páginas', () => {
    expect(
      listingPositions(25, {
        folder: 'a',
        view: 'cards',
        covers: true,
        pageSize: 12,
        perPageOptions: [12, 24],
      }),
    ).toEqual([
      { perPage: 12, page: 1 },
      { perPage: 12, page: 2 },
      { perPage: 12, page: 3 },
      { perPage: 24, page: 1 },
      { perPage: 24, page: 2 },
    ]);
  });

  it('sin entradas, una página por tamaño', () => {
    expect(
      listingPositions(0, {
        folder: 'a',
        view: 'table',
        covers: true,
        pageSize: 10,
        perPageOptions: [10],
      }),
    ).toEqual([{ perPage: 10, page: 1 }]);
  });
});

function page(slug: string, extra: Partial<Page> = {}): Page {
  return {
    slug,
    locale: 'es',
    title: slug,
    kind: 'native',
    body: '',
    sourcePath: `${slug || 'index'}.md`,
    ...extra,
  };
}

describe('reservedSegmentErrors', () => {
  const guia = page('guia', { sourcePath: 'guia/_index.md' });

  it.each(['guia/page', 'guia/per-page', 'guia/page/x'])(
    '«%s» dentro de una carpeta con listado es un error con su archivo y una pista',
    (slug) => {
      const [error, ...rest] = reservedSegmentErrors([guia, page(slug)]);
      expect(rest).toEqual([]);
      expect(error?.file).toBe(`${slug}.md`);
      expect(error?.message).toContain(slug);
      expect(error?.hint).toContain('slug');
    },
  );

  it('también un `slug` traducido que cae bajo la URL traducida del listado', () => {
    const errors = reservedSegmentErrors([
      page('tutoriales', {
        locale: 'en',
        sourcePath: 'tutoriales/_index.en.md',
        urlSlug: 'tutorials',
      }),
      page('tutoriales/x', { locale: 'en', urlSlug: 'tutorials/page', sourcePath: 'x.en.md' }),
    ]);
    expect(errors.map((error) => error.file)).toEqual(['x.en.md']);
  });

  it('la portada con listado reserva `page` y `per-page` en la raíz', () => {
    const errors = reservedSegmentErrors([page('', { sourcePath: '_index.md' }), page('page')]);
    expect(errors.map((error) => error.file)).toEqual(['page.md']);
  });

  it('una página generada también reserva sus segmentos', () => {
    const generated = page('guia', { kind: 'generated', sourcePath: 'guia/_index.md' });
    expect(reservedSegmentErrors([generated, page('guia/page')])).toHaveLength(1);
  });

  it('un `index.md` no lista su carpeta: no reserva nada', () => {
    const own = page('guia', { sourcePath: 'guia/index.md' });
    expect(reservedSegmentErrors([own, page('guia/page')])).toEqual([]);
  });

  it('ningún error para `guia/pagina` ni para `otra/page` si `otra` no tiene listado', () => {
    expect(
      reservedSegmentErrors([guia, page('guia/pagina'), page('otra'), page('otra/page')]),
    ).toEqual([]);
  });

  it('el listado de otro idioma no reserva nada en este', () => {
    expect(reservedSegmentErrors([guia, page('guia/page', { locale: 'en' })])).toEqual([]);
  });
});
