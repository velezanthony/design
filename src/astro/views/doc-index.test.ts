import { describe, expect, it } from 'vitest';

import { resolveConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { createVirtualData } from '../virtual/data';
import { docRoutes, docView, type DocRoute } from './doc';
import { docIndexView, sizeHrefs } from './doc-index';
import type { DocData } from '../loader/schema';

function site(user: Partial<DocsUserConfig> = {}) {
  return createVirtualData(
    resolveConfig({
      name: 'Blog',
      locales: ['es', 'en'],
      defaultLocale: 'es',
      translations: { missing: 'fallback' },
      ...user,
    }),
    {
      base: '/repo',
      site: 'https://x.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
      publicDir: 'file:///site/public/',
      root: 'file:///site/',
    },
  );
}

function doc(slug: string, locale = 'es', extra: Partial<DocData> = {}): DocData {
  return {
    slug,
    locale,
    title: `${slug.split('/').pop()} ${locale}`,
    sourcePath: `docs/${slug}${locale === 'es' ? '' : `.${locale}`}.md`,
    ...extra,
  };
}

/* Cinco artículos y un `_index.md` con tarjetas de dos en dos: tres páginas. */
const articles = ['a', 'b', 'c', 'd', 'e'].map((name) =>
  doc(`articulos/${name}`, 'es', { seo: { description: `Sobre ${name}.` } }),
);
const listing = doc('articulos', 'es', {
  title: 'Artículos',
  listing: true,
  sourcePath: 'docs/articulos/_index.md',
  index: { layout: 'cards', pageSize: 2 },
});
const data = [doc(''), listing, ...articles];

function routeOf(routes: DocRoute[], param: string | undefined) {
  return routes.find((route) => route.param === param)!;
}

describe('docRoutes: índices paginados', () => {
  it('la página 1 en la URL de la carpeta y las demás en /2/, /3/…, también en la reserva', () => {
    const params = docRoutes(data, site()).map((route) => route.param);
    expect(params).toEqual(
      expect.arrayContaining([
        'articulos',
        'articulos/2',
        'articulos/3',
        'en/articulos',
        'en/articulos/2',
        'en/articulos/3',
      ]),
    );
    expect(params).not.toContain('articulos/4');
  });

  it('cada ruta sabe su página y el total', () => {
    const routes = docRoutes(data, site());
    expect(routeOf(routes, 'articulos')).toMatchObject({ slug: 'articulos', pages: 3 });
    expect(routeOf(routes, 'articulos').page).toBeUndefined();
    expect(routeOf(routes, 'articulos/2')).toMatchObject({
      slug: 'articulos',
      kind: 'page',
      page: 2,
      pages: 3,
    });
    expect(routeOf(routes, 'en/articulos/3')).toMatchObject({ kind: 'fallback', page: 3 });
  });

  it('la lista no se pagina', () => {
    const list = data.map((item) =>
      item === listing ? { ...item, index: { layout: 'list' as const, pageSize: 2 } } : item,
    );
    const params = docRoutes(list, site()).map((route) => route.param);
    expect(params).not.toContain('articulos/2');
  });

  it('una página real que ocupa la URL de una página del listado rompe el build', () => {
    expect(() => docRoutes([...data, doc('articulos/2')], site())).toThrow(/articulos\/2/);
  });
});

describe('docView: páginas de un índice paginado', () => {
  const routes = docRoutes(data, site());

  it('la página 1: indexable, canonical a sí misma y `rel=next`', () => {
    const view = docView({ route: routeOf(routes, 'articulos'), config: site(), data });
    expect(view.indexable).toBe(true);
    const links = view.head.filter((tag) => tag.tag === 'link');
    expect(links).toContainEqual({
      tag: 'link',
      attrs: { rel: 'next', href: 'https://x.dev/repo/articulos/2/' },
    });
    expect(links.some((tag) => tag.attrs.rel === 'prev')).toBe(false);
  });

  it('la página 2: noindex, canonical a sí misma, título con la página y prev/next', () => {
    const view = docView({ route: routeOf(routes, 'articulos/2'), config: site(), data });
    expect(view.indexable).toBe(false);
    const attrs = view.head.map((tag) => tag.attrs);
    expect(attrs).toContainEqual({ name: 'robots', content: 'noindex' });
    expect(attrs).toContainEqual({
      rel: 'canonical',
      href: 'https://x.dev/repo/articulos/2/',
    });
    expect(attrs).toContainEqual({ rel: 'prev', href: 'https://x.dev/repo/articulos/' });
    expect(attrs).toContainEqual({ rel: 'next', href: 'https://x.dev/repo/articulos/3/' });
    expect(attrs.some((tag) => tag.rel === 'alternate')).toBe(false);
    const title = view.head.find((tag) => tag.tag === 'title')!.content;
    expect(title).toBe('Artículos · Página 2 de 3 | Blog');
  });

  it('la página 2 marca en la barra lateral la entrada del índice', () => {
    const view = docView({ route: routeOf(routes, 'articulos/2'), config: site(), data });
    expect(view.current).toBe('/repo/articulos/');
  });
});

describe('docIndexView', () => {
  const routes = docRoutes(data, site());
  const dates = new Map([
    ['docs/articulos/a.md', '2026-01-01T00:00:00+00:00'],
    ['docs/articulos/b.md', '2026-03-01T00:00:00+00:00'],
    ['docs/articulos/c.md', '2026-02-01T00:00:00+00:00'],
    ['docs/articulos/d.md', '2025-01-01T00:00:00+00:00'],
  ]);

  function view(
    param: string | undefined,
    extra: Partial<Parameters<typeof docIndexView>[0]> = {},
  ) {
    return docIndexView({ route: routeOf(routes, param), config: site(), data, dates, ...extra });
  }

  it('una página sin listado no lleva índice', () => {
    expect(view(undefined)).toBeUndefined();
  });

  it('tarjetas: lo sin publicar primero, luego lo más reciente; la página 1 lleva todas las entradas', () => {
    const first = view('articulos')!;
    expect(first).toMatchObject({ layout: 'cards', page: 1, pages: 3, total: 5, perPage: 2 });
    // La página 1 trae todas: sin JavaScript se ven las `perPage` primeras y el selector cambia cuántas.
    expect(first.all).toBe(true);
    expect(first.items.map((item) => item.slug)).toEqual([
      'articulos/e',
      'articulos/b',
      'articulos/c',
      'articulos/a',
      'articulos/d',
    ]);
    const third = view('articulos/3')!;
    expect(third.all).toBe(false);
    expect(third.items.map((item) => item.slug)).toEqual(['articulos/d']);
  });

  it('las opciones «Por página» llevan el tamaño de las rutas estáticas', () => {
    expect(view('articulos')!.perPageOptions).toEqual([2, 12, 24, 48]);
  });

  it('la página 1 sabe las URLs de cada tamaño: el de la config, las estáticas; los demás, con la query', () => {
    expect(view('articulos')!.sizes).toEqual([
      {
        perPage: 2,
        pages: 3,
        hrefs: ['/repo/articulos/', '/repo/articulos/2/', '/repo/articulos/3/'],
      },
      { perPage: 12, pages: 1, hrefs: ['/repo/articulos/?por=12'] },
      { perPage: 24, pages: 1, hrefs: ['/repo/articulos/?por=24'] },
      { perPage: 48, pages: 1, hrefs: ['/repo/articulos/?por=48'] },
    ]);
    expect(view('en/articulos')!.sizes[1]!.hrefs).toEqual(['/repo/en/articulos/?por=12']);
    expect(view('articulos/2')!.sizes).toEqual([]);
  });

  it('cada entrada con su resumen, su fecha (sin fecha si no tiene commit) y su portada', () => {
    const [unpublished, latest] = view('articulos')!.items;
    expect(unpublished).toMatchObject({ summary: 'Sobre e.', cover: { kind: 'placeholder' } });
    expect(unpublished!.updated).toBeUndefined();
    expect(latest!.updated).toBe('2026-03-01T00:00:00+00:00');
  });

  it('las URLs de todas las páginas del listado, la 1 en la carpeta', () => {
    expect(view('articulos/2')!.hrefs).toEqual([
      '/repo/articulos/',
      '/repo/articulos/2/',
      '/repo/articulos/3/',
    ]);
    expect(view('en/articulos/2')!.hrefs[1]).toBe('/repo/en/articulos/2/');
  });

  it('desde la página 2 lleva el título de la página (el cuerpo del _index.md no se repite)', () => {
    expect(view('articulos')!.heading).toBeUndefined();
    expect(view('articulos/2')!.heading).toEqual({
      title: 'Artículos',
      page: 'Página 2 de 3',
    });
  });

  it('la portada: `false` de la página, imagen con alt y política `image: false` del listado', () => {
    const covered = data.map((item) => {
      if (item.slug === 'articulos/e') return { ...item, index: { cover: false as const } };
      if (item.slug === 'articulos/b')
        return { ...item, index: { cover: { src: '/b.png' }, imageAlt: 'B' } };
      if (item === listing) return { ...item, index: { layout: 'cards' as const, image: false } };
      return item;
    });
    const items = docIndexView({
      route: routeOf(docRoutes(covered, site()), 'articulos'),
      config: site(),
      data: covered,
      dates,
    })!.items;
    expect(items.find((item) => item.slug === 'articulos/e')!.cover).toEqual({ kind: 'none' });
    expect(items.find((item) => item.slug === 'articulos/b')!.cover).toEqual({
      kind: 'image',
      source: { src: '/b.png' },
      alt: 'B',
    });
    expect(items.find((item) => item.slug === 'articulos/c')!.cover).toEqual({ kind: 'none' });
  });

  it('lista: las secciones en orden del árbol y sus encabezados para el índice de la página', () => {
    const user: Partial<DocsUserConfig> = {
      nav: [{ label: { es: 'Desarrollo', en: 'Development' }, sidebar: ['articulos/a'] }],
    };
    const list = data.map((item) =>
      item === listing ? { ...item, index: { layout: 'list' as const } } : item,
    );
    const result = docIndexView({
      route: routeOf(docRoutes(list, site(user)), 'articulos'),
      config: site(user),
      data: list,
      dates,
      headings: [{ depth: 2, slug: 'desarrollo', text: 'Otra' }],
    })!;
    expect(result.layout).toBe('list');
    expect(result.sections.map((section) => section.label)).toEqual(['Desarrollo', undefined]);
    expect(result.headings).toEqual([{ depth: 2, slug: 'desarrollo-1', text: 'Desarrollo' }]);
    expect(result.pages).toBe(1);
  });

  it('un índice generado por `indexes` usa las opciones de la config', () => {
    const generated = doc('articulos', 'es', {
      title: 'Artículos',
      kind: 'generated',
      listing: true,
      sourcePath: 'docs/articulos/_index.md',
    });
    const config = site({ indexes: { layout: 'table', pageSize: 10 } });
    const items = [doc(''), generated, ...articles];
    const result = docIndexView({
      route: routeOf(docRoutes(items, config), 'articulos'),
      config,
      data: items,
      dates,
    })!;
    expect(result).toMatchObject({ layout: 'table', pages: 1, total: 5 });
  });
});

describe('sizeHrefs', () => {
  it('con otro tamaño, la página 1 lleva solo `por` y las demás también `pagina`', () => {
    expect(sizeHrefs('/repo/articulos/', 9, 3)).toEqual([
      '/repo/articulos/?por=9',
      '/repo/articulos/?por=9&pagina=2',
      '/repo/articulos/?por=9&pagina=3',
    ]);
  });
});

describe('docIndexView: `_index.en.md` con `slug` propio', () => {
  const translated = [
    doc(''),
    listing,
    doc('articulos', 'en', {
      title: 'Articles',
      listing: true,
      urlSlug: 'articles',
      sourcePath: 'docs/articulos/_index.en.md',
      index: { layout: 'cards', pageSize: 2 },
    }),
    ...articles,
    doc('articulos/a', 'en', { urlSlug: 'articles/a-in-english' }),
  ];
  const routes = docRoutes(translated, site());

  it('sus páginas cuelgan de su URL y cada entrada enlaza su URL en inglés (o la reserva)', () => {
    const view = docIndexView({
      route: routeOf(routes, 'en/articles/2'),
      config: site(),
      data: translated,
    });
    expect(view!.hrefs).toEqual([
      '/repo/en/articles/',
      '/repo/en/articles/2/',
      '/repo/en/articles/3/',
    ]);
    const first = docIndexView({
      route: routeOf(routes, 'en/articles'),
      config: site(),
      data: translated,
    });
    const hrefs = first!.items.map((item) => item.href);
    expect(hrefs).toContain('/repo/en/articles/a-in-english/');
    expect(hrefs).toContain('/repo/en/articulos/b/');
  });

  it('la página 2 del listado en inglés es canónica de sí misma bajo la URL traducida', () => {
    const view = docView({
      route: routeOf(routes, 'en/articles/2'),
      config: site(),
      data: translated,
    });
    const canonical = view.head.find((tag) => tag.attrs['rel'] === 'canonical');
    expect(canonical?.attrs['href']).toBe('https://x.dev/repo/en/articles/2/');
  });
});
