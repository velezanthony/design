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

/* Cinco tutoriales y un `_index.md` con tarjetas de dos en dos: tres páginas. */
const tutorials = ['a', 'b', 'c', 'd', 'e'].map((name) =>
  doc(`tutoriales/${name}`, 'es', { seo: { description: `Sobre ${name}.` } }),
);
const listing = doc('tutoriales', 'es', {
  title: 'Tutoriales',
  listing: true,
  sourcePath: 'docs/tutoriales/_index.md',
  index: { layout: 'cards', pageSize: 2 },
});
const data = [doc(''), listing, ...tutorials];

function routeOf(routes: DocRoute[], param: string | undefined) {
  return routes.find((route) => route.param === param)!;
}

describe('docRoutes: índices paginados', () => {
  it('la página 1 en la URL de la carpeta y las demás en /2/, /3/…, también en la reserva', () => {
    const params = docRoutes(data, site()).map((route) => route.param);
    expect(params).toEqual(
      expect.arrayContaining([
        'tutoriales',
        'tutoriales/2',
        'tutoriales/3',
        'en/tutoriales',
        'en/tutoriales/2',
        'en/tutoriales/3',
      ]),
    );
    expect(params).not.toContain('tutoriales/4');
  });

  it('cada ruta sabe su página y el total', () => {
    const routes = docRoutes(data, site());
    expect(routeOf(routes, 'tutoriales')).toMatchObject({ slug: 'tutoriales', pages: 3 });
    expect(routeOf(routes, 'tutoriales').page).toBeUndefined();
    expect(routeOf(routes, 'tutoriales/2')).toMatchObject({
      slug: 'tutoriales',
      kind: 'page',
      page: 2,
      pages: 3,
    });
    expect(routeOf(routes, 'en/tutoriales/3')).toMatchObject({ kind: 'fallback', page: 3 });
  });

  it('la lista no se pagina', () => {
    const list = data.map((item) =>
      item === listing ? { ...item, index: { layout: 'list' as const, pageSize: 2 } } : item,
    );
    const params = docRoutes(list, site()).map((route) => route.param);
    expect(params).not.toContain('tutoriales/2');
  });

  it('una página real que ocupa la URL de una página del listado rompe el build', () => {
    expect(() => docRoutes([...data, doc('tutoriales/2')], site())).toThrow(/tutoriales\/2/);
  });
});

describe('docView: páginas de un índice paginado', () => {
  const routes = docRoutes(data, site());

  it('la página 1: indexable, canonical a sí misma y `rel=next`', () => {
    const view = docView({ route: routeOf(routes, 'tutoriales'), config: site(), data });
    expect(view.indexable).toBe(true);
    const links = view.head.filter((tag) => tag.tag === 'link');
    expect(links).toContainEqual({
      tag: 'link',
      attrs: { rel: 'next', href: 'https://x.dev/repo/tutoriales/2/' },
    });
    expect(links.some((tag) => tag.attrs.rel === 'prev')).toBe(false);
  });

  it('la página 2: noindex, canonical a sí misma, título con la página y prev/next', () => {
    const view = docView({ route: routeOf(routes, 'tutoriales/2'), config: site(), data });
    expect(view.indexable).toBe(false);
    const attrs = view.head.map((tag) => tag.attrs);
    expect(attrs).toContainEqual({ name: 'robots', content: 'noindex' });
    expect(attrs).toContainEqual({
      rel: 'canonical',
      href: 'https://x.dev/repo/tutoriales/2/',
    });
    expect(attrs).toContainEqual({ rel: 'prev', href: 'https://x.dev/repo/tutoriales/' });
    expect(attrs).toContainEqual({ rel: 'next', href: 'https://x.dev/repo/tutoriales/3/' });
    expect(attrs.some((tag) => tag.rel === 'alternate')).toBe(false);
    const title = view.head.find((tag) => tag.tag === 'title')!.content;
    expect(title).toBe('Tutoriales · Página 2 de 3 | Blog');
  });

  it('la página 2 marca en la barra lateral la entrada del índice', () => {
    const view = docView({ route: routeOf(routes, 'tutoriales/2'), config: site(), data });
    expect(view.current).toBe('/repo/tutoriales/');
  });
});

describe('docIndexView', () => {
  const routes = docRoutes(data, site());
  const dates = new Map([
    ['docs/tutoriales/a.md', '2026-01-01T00:00:00+00:00'],
    ['docs/tutoriales/b.md', '2026-03-01T00:00:00+00:00'],
    ['docs/tutoriales/c.md', '2026-02-01T00:00:00+00:00'],
    ['docs/tutoriales/d.md', '2025-01-01T00:00:00+00:00'],
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
    const first = view('tutoriales')!;
    expect(first).toMatchObject({ layout: 'cards', page: 1, pages: 3, total: 5, perPage: 2 });
    // La página 1 trae todas: sin JavaScript se ven las `perPage` primeras y el selector cambia cuántas.
    expect(first.all).toBe(true);
    expect(first.items.map((item) => item.slug)).toEqual([
      'tutoriales/e',
      'tutoriales/b',
      'tutoriales/c',
      'tutoriales/a',
      'tutoriales/d',
    ]);
    const third = view('tutoriales/3')!;
    expect(third.all).toBe(false);
    expect(third.items.map((item) => item.slug)).toEqual(['tutoriales/d']);
  });

  it('las opciones «Por página» llevan el tamaño de las rutas estáticas', () => {
    expect(view('tutoriales')!.perPageOptions).toEqual([2, 12, 24, 48]);
  });

  it('la página 1 sabe las URLs de cada tamaño: el de la config, las estáticas; los demás, con la query', () => {
    expect(view('tutoriales')!.sizes).toEqual([
      {
        perPage: 2,
        pages: 3,
        hrefs: ['/repo/tutoriales/', '/repo/tutoriales/2/', '/repo/tutoriales/3/'],
      },
      { perPage: 12, pages: 1, hrefs: ['/repo/tutoriales/?por=12'] },
      { perPage: 24, pages: 1, hrefs: ['/repo/tutoriales/?por=24'] },
      { perPage: 48, pages: 1, hrefs: ['/repo/tutoriales/?por=48'] },
    ]);
    expect(view('en/tutoriales')!.sizes[1]!.hrefs).toEqual(['/repo/en/tutoriales/?por=12']);
    expect(view('tutoriales/2')!.sizes).toEqual([]);
  });

  it('cada entrada con su resumen, su fecha (sin fecha si no tiene commit) y su portada', () => {
    const [unpublished, latest] = view('tutoriales')!.items;
    expect(unpublished).toMatchObject({ summary: 'Sobre e.', cover: { kind: 'placeholder' } });
    expect(unpublished!.updated).toBeUndefined();
    expect(latest!.updated).toBe('2026-03-01T00:00:00+00:00');
  });

  it('las URLs de todas las páginas del listado, la 1 en la carpeta', () => {
    expect(view('tutoriales/2')!.hrefs).toEqual([
      '/repo/tutoriales/',
      '/repo/tutoriales/2/',
      '/repo/tutoriales/3/',
    ]);
    expect(view('en/tutoriales/2')!.hrefs[1]).toBe('/repo/en/tutoriales/2/');
  });

  it('desde la página 2 lleva el título de la página (el cuerpo del _index.md no se repite)', () => {
    expect(view('tutoriales')!.heading).toBeUndefined();
    expect(view('tutoriales/2')!.heading).toEqual({
      title: 'Tutoriales',
      page: 'Página 2 de 3',
    });
  });

  it('la portada: `false` de la página, imagen con alt y política `image: false` del listado', () => {
    const covered = data.map((item) => {
      if (item.slug === 'tutoriales/e') return { ...item, index: { cover: false as const } };
      if (item.slug === 'tutoriales/b')
        return { ...item, index: { cover: { src: '/b.png' }, imageAlt: 'B' } };
      if (item === listing) return { ...item, index: { layout: 'cards' as const, image: false } };
      return item;
    });
    const items = docIndexView({
      route: routeOf(docRoutes(covered, site()), 'tutoriales'),
      config: site(),
      data: covered,
      dates,
    })!.items;
    expect(items.find((item) => item.slug === 'tutoriales/e')!.cover).toEqual({ kind: 'none' });
    expect(items.find((item) => item.slug === 'tutoriales/b')!.cover).toEqual({
      kind: 'image',
      source: { src: '/b.png' },
      alt: 'B',
    });
    expect(items.find((item) => item.slug === 'tutoriales/c')!.cover).toEqual({ kind: 'none' });
  });

  it('lista: las secciones en orden del árbol y sus encabezados para el índice de la página', () => {
    const user: Partial<DocsUserConfig> = {
      nav: [{ label: { es: 'Esenciales', en: 'Essentials' }, sidebar: ['tutoriales/a'] }],
    };
    const list = data.map((item) =>
      item === listing ? { ...item, index: { layout: 'list' as const } } : item,
    );
    const result = docIndexView({
      route: routeOf(docRoutes(list, site(user)), 'tutoriales'),
      config: site(user),
      data: list,
      dates,
      headings: [{ depth: 2, slug: 'esenciales', text: 'Otra' }],
    })!;
    expect(result.layout).toBe('list');
    expect(result.sections.map((section) => section.label)).toEqual(['Esenciales', undefined]);
    expect(result.headings).toEqual([{ depth: 2, slug: 'esenciales-1', text: 'Esenciales' }]);
    expect(result.pages).toBe(1);
  });

  it('un índice generado por `indexes` usa las opciones de la config', () => {
    const generated = doc('tutoriales', 'es', {
      title: 'Tutoriales',
      kind: 'generated',
      listing: true,
      sourcePath: 'docs/tutoriales/_index.md',
    });
    const config = site({ indexes: { layout: 'table', pageSize: 10 } });
    const items = [doc(''), generated, ...tutorials];
    const result = docIndexView({
      route: routeOf(docRoutes(items, config), 'tutoriales'),
      config,
      data: items,
      dates,
    })!;
    expect(result).toMatchObject({ layout: 'table', pages: 1, total: 5 });
  });
});

describe('sizeHrefs', () => {
  it('con otro tamaño, la página 1 lleva solo `por` y las demás también `pagina`', () => {
    expect(sizeHrefs('/repo/tutoriales/', 9, 3)).toEqual([
      '/repo/tutoriales/?por=9',
      '/repo/tutoriales/?por=9&pagina=2',
      '/repo/tutoriales/?por=9&pagina=3',
    ]);
  });
});

describe('docIndexView: `_index.en.md` con `slug` propio', () => {
  const translated = [
    doc(''),
    listing,
    doc('tutoriales', 'en', {
      title: 'Tutorials',
      listing: true,
      urlSlug: 'tutorials',
      sourcePath: 'docs/tutoriales/_index.en.md',
      index: { layout: 'cards', pageSize: 2 },
    }),
    ...tutorials,
    doc('tutoriales/a', 'en', { urlSlug: 'tutorials/a-in-english' }),
  ];
  const routes = docRoutes(translated, site());

  it('sus páginas cuelgan de su URL y cada entrada enlaza su URL en inglés (o la reserva)', () => {
    const view = docIndexView({
      route: routeOf(routes, 'en/tutorials/2'),
      config: site(),
      data: translated,
    });
    expect(view!.hrefs).toEqual([
      '/repo/en/tutorials/',
      '/repo/en/tutorials/2/',
      '/repo/en/tutorials/3/',
    ]);
    const first = docIndexView({
      route: routeOf(routes, 'en/tutorials'),
      config: site(),
      data: translated,
    });
    const hrefs = first!.items.map((item) => item.href);
    expect(hrefs).toContain('/repo/en/tutorials/a-in-english/');
    expect(hrefs).toContain('/repo/en/tutoriales/b/');
  });

  it('la página 2 del listado en inglés es canónica de sí misma bajo la URL traducida', () => {
    const view = docView({
      route: routeOf(routes, 'en/tutorials/2'),
      config: site(),
      data: translated,
    });
    const canonical = view.head.find((tag) => tag.attrs['rel'] === 'canonical');
    expect(canonical?.attrs['href']).toBe('https://x.dev/repo/en/tutorials/2/');
  });
});
