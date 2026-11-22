import { describe, expect, it } from 'vitest';

import { resolveConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { createVirtualData } from '../virtual/data';
import { docRoutes, docView, type DocRoute } from './doc';
import { siteContext } from './chrome';
import { docListingView } from './doc-listing';
import type { DocData } from '../loader/schema';

type ListingSettings = NonNullable<NonNullable<DocsUserConfig['folders']>[string]['listing']>;

/** El sitio, con el listado de `tutoriales` encendido: tarjetas de dos en dos salvo que se diga otra cosa. */
function site(
  user: Partial<DocsUserConfig> = {},
  listing: ListingSettings = { view: 'cards', pageSize: 2 },
) {
  return createVirtualData(
    resolveConfig({
      name: 'Blog',
      locales: ['es', 'en'],
      defaultLocale: 'es',
      translations: { missing: 'fallback' },
      folders: { tutoriales: { listing: { generate: true, ...listing } } },
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
  sourcePath: 'docs/tutoriales/_index.md',
});
const data = [doc(''), listing, ...tutorials];

function routeOf(routes: DocRoute[], param: string | undefined) {
  return routes.find((route) => route.param === param)!;
}

describe('docRoutes: índices paginados', () => {
  it('una ruta por posición: las páginas del tamaño por defecto bajo `page/` y cada otro tamaño bajo `per-page/`', () => {
    const params = docRoutes(siteContext(site(), data)).map((route) => route.param);
    expect(params).toEqual(
      expect.arrayContaining([
        'tutoriales',
        'tutoriales/page/2',
        'tutoriales/page/3',
        'tutoriales/per-page/12',
        'tutoriales/per-page/24',
        'tutoriales/per-page/48',
        'en/tutoriales',
        'en/tutoriales/page/2',
        'en/tutoriales/per-page/12',
      ]),
    );
    expect(params).not.toContain('tutoriales/page/4');
    expect(params).not.toContain('tutoriales/per-page/12/page/2');
  });

  it('cada ruta sabe su posición: tamaño, página y total de páginas de ese tamaño', () => {
    const routes = docRoutes(siteContext(site(), data));
    expect(routeOf(routes, 'tutoriales').listingPosition).toEqual({
      perPage: 2,
      page: 1,
      pages: 3,
    });
    expect(routeOf(routes, 'tutoriales/page/2')).toMatchObject({
      slug: 'tutoriales',
      kind: 'page',
      listingPosition: { perPage: 2, page: 2, pages: 3 },
    });
    expect(routeOf(routes, 'tutoriales/per-page/12').listingPosition).toEqual({
      perPage: 12,
      page: 1,
      pages: 1,
    });
    expect(routeOf(routes, 'en/tutoriales/page/3')).toMatchObject({
      kind: 'fallback',
      listingPosition: { page: 3 },
    });
  });

  it('la lista no se pagina', () => {
    const routes = docRoutes(siteContext(site({}, { view: 'list', pageSize: 2 }), data));
    const params = routes.map((route) => route.param);
    expect(params).not.toContain('tutoriales/page/2');
    expect(params.some((param) => param?.includes('per-page'))).toBe(false);
    expect(routeOf(routes, 'tutoriales')).not.toHaveProperty('listingPosition');
  });

  it('una página real que ocupa la URL de una página del listado rompe el build (segunda red)', () => {
    expect(() => docRoutes(siteContext(site(), [...data, doc('tutoriales/page/2')]))).toThrow(
      /tutoriales\/page\/2/,
    );
  });
});

describe('docView: páginas de un índice paginado', () => {
  const routes = docRoutes(siteContext(site(), data));

  function viewOf(param: string) {
    return docView({ route: routeOf(routes, param), site: siteContext(site(), data), data });
  }

  function attrsOf(param: string) {
    return viewOf(param).head.map((tag) => tag.attrs);
  }

  it('la página 1 del tamaño por defecto: indexable, canonical a sí misma y `rel=next`', () => {
    const view = viewOf('tutoriales');
    expect(view.indexable).toBe(true);
    const links = view.head.filter((tag) => tag.tag === 'link');
    expect(links).toContainEqual({
      tag: 'link',
      attrs: { rel: 'next', href: 'https://x.dev/repo/tutoriales/page/2/' },
    });
    expect(links.some((tag) => tag.attrs.rel === 'prev')).toBe(false);
  });

  it('la página 2: noindex, canonical a sí misma, título con la página y prev/next', () => {
    const view = viewOf('tutoriales/page/2');
    expect(view.indexable).toBe(false);
    const attrs = attrsOf('tutoriales/page/2');
    expect(attrs).toContainEqual({ name: 'robots', content: 'noindex' });
    expect(attrs).toContainEqual({
      rel: 'canonical',
      href: 'https://x.dev/repo/tutoriales/page/2/',
    });
    expect(attrs).toContainEqual({ rel: 'prev', href: 'https://x.dev/repo/tutoriales/' });
    expect(attrs).toContainEqual({ rel: 'next', href: 'https://x.dev/repo/tutoriales/page/3/' });
    expect(attrs.some((tag) => tag.rel === 'alternate')).toBe(false);
    const title = view.head.find((tag) => tag.tag === 'title')!.content;
    expect(title).toBe('Tutoriales · Página 2 de 3 | Blog');
  });

  it('otro tamaño: noindex, canonical a sí mismo y sin `rel=prev/next` fuera de su tamaño', () => {
    const view = viewOf('tutoriales/per-page/12');
    expect(view.indexable).toBe(false);
    const attrs = attrsOf('tutoriales/per-page/12');
    expect(attrs).toContainEqual({ name: 'robots', content: 'noindex' });
    expect(attrs).toContainEqual({
      rel: 'canonical',
      href: 'https://x.dev/repo/tutoriales/per-page/12/',
    });
    expect(attrs.some((tag) => tag.rel === 'prev' || tag.rel === 'next')).toBe(false);
  });

  it('las páginas de otro tamaño enlazan prev/next dentro de su tamaño', () => {
    const one = [doc('')];
    const many = [...one, listing, ...tutorials];
    const config = site({}, { view: 'cards', pageSize: 2, perPageOptions: [2, 3] });
    const pagedRoutes = docRoutes(siteContext(config, many));
    const view = docView({
      route: routeOf(pagedRoutes, 'tutoriales/per-page/3/page/2'),
      site: siteContext(config, many),
      data: many,
    });
    const attrs = view.head.map((tag) => tag.attrs);
    expect(attrs).toContainEqual({
      rel: 'prev',
      href: 'https://x.dev/repo/tutoriales/per-page/3/',
    });
    expect(attrs.some((tag) => tag.rel === 'next')).toBe(false);
  });

  it('la página 2 marca en la barra lateral la entrada del índice', () => {
    expect(viewOf('tutoriales/page/2').current).toBe('/repo/tutoriales/');
  });
});

describe('docListingView', () => {
  it('un `index.md` en la carpeta no lista nada aunque `generate` esté encendido', () => {
    const own = doc('tutoriales', 'es', { sourcePath: 'docs/tutoriales/index.md' });
    const items = [doc(''), own, ...tutorials];
    const config = site();
    expect(
      docListingView({
        route: routeOf(docRoutes(siteContext(config, items)), 'tutoriales'),
        site: siteContext(config, items),
        data: items,
      }),
    ).toBeUndefined();
  });

  const routes = docRoutes(siteContext(site(), data));
  const dates = new Map([
    ['docs/tutoriales/a.md', '2026-01-01T00:00:00+00:00'],
    ['docs/tutoriales/b.md', '2026-03-01T00:00:00+00:00'],
    ['docs/tutoriales/c.md', '2026-02-01T00:00:00+00:00'],
    ['docs/tutoriales/d.md', '2025-01-01T00:00:00+00:00'],
  ]);

  function view(param: string | undefined) {
    return docListingView({
      route: routeOf(routes, param),
      site: siteContext(site(), data),
      data,
      dates,
    });
  }

  function paged(param: string) {
    const result = view(param);
    if (!result || result.layout === 'list') throw new Error(`${param} no es un listado paginado`);
    return result;
  }

  it('una página sin listado no lleva índice', () => {
    expect(view(undefined)).toBeUndefined();
  });

  it('tarjetas: lo sin publicar primero, luego lo más reciente; cada página solo trae las suyas', () => {
    const first = paged('tutoriales');
    expect(first).toMatchObject({ layout: 'cards', total: 5, range: { from: 1, to: 2 } });
    expect(first.items.map((item) => item.slug)).toEqual(['tutoriales/e', 'tutoriales/b']);
    expect(paged('tutoriales/page/3').items.map((item) => item.slug)).toEqual(['tutoriales/d']);
    expect(paged('tutoriales/per-page/12').items).toHaveLength(5);
  });

  it('el selector: un tamaño por opción con la URL de su página 1 y el actual marcado', () => {
    expect(paged('tutoriales').sizes).toEqual([
      { size: 2, href: '/repo/tutoriales/', current: true },
      { size: 12, href: '/repo/tutoriales/per-page/12/', current: false },
      { size: 24, href: '/repo/tutoriales/per-page/24/', current: false },
      { size: 48, href: '/repo/tutoriales/per-page/48/', current: false },
    ]);
    expect(paged('tutoriales/per-page/24').sizes?.find((size) => size.current)?.size).toBe(24);
    expect(paged('en/tutoriales').sizes?.[1]?.href).toBe('/repo/en/tutoriales/per-page/12/');
  });

  it('cada entrada con su resumen, su fecha formateada (sin fecha si no tiene commit) y su portada', () => {
    const [unpublished, latest] = paged('tutoriales').items;
    expect(unpublished).toMatchObject({ summary: 'Sobre e.', cover: { kind: 'placeholder' } });
    expect(unpublished!.updated).toBeUndefined();
    expect(latest!.updated).toEqual({ iso: '2026-03-01T00:00:00+00:00', label: '1 mar 2026' });
  });

  it('el paginador enlaza las páginas de su tamaño, la 1 en la carpeta', () => {
    expect(paged('tutoriales/page/2').pager).toEqual({
      page: 2,
      pages: 3,
      hrefs: ['/repo/tutoriales/', '/repo/tutoriales/page/2/', '/repo/tutoriales/page/3/'],
    });
    expect(paged('en/tutoriales/page/2').pager?.hrefs[1]).toBe('/repo/en/tutoriales/page/2/');
    expect(paged('tutoriales/per-page/12').pager).toBeUndefined();
  });

  it('desde la página 2 lleva el título de la página (el cuerpo del _index.md no se repite)', () => {
    expect(paged('tutoriales').pageHeading).toBeUndefined();
    expect(paged('tutoriales/page/2').pageHeading).toEqual({
      title: 'Tutoriales',
      page: 'Página 2 de 3',
    });
  });

  it('contrato con las rutas: todo `href` del paginador y del selector es la URL de una ruta', () => {
    const site_ = siteContext(site(), data);
    const urls = new Set(
      routes.map((route) => `/repo/${route.param === undefined ? '' : `${route.param}/`}`),
    );
    for (const route of routes.filter((candidate) => candidate.listing)) {
      const result = docListingView({ route, site: site_, data, dates });
      if (!result || result.layout === 'list') continue;
      const linked = [
        ...(result.pager?.hrefs ?? []),
        ...(result.sizes ?? []).map((size) => size.href),
      ];
      for (const href of linked) expect(urls, `${route.param} → ${href}`).toContain(href);
    }
  });

  it('la portada: `false` de la página, imagen con alt y política `covers: false` del listado', () => {
    const covered = data.map((item) => {
      if (item.slug === 'tutoriales/e') return { ...item, index: { cover: false as const } };
      if (item.slug === 'tutoriales/b')
        return { ...item, index: { cover: { src: '/b.png' }, imageAlt: 'B' } };
      return item;
    });
    const config = site({}, { view: 'cards', covers: false, pageSize: 12 });
    const result = docListingView({
      route: routeOf(docRoutes(siteContext(config, covered)), 'tutoriales'),
      site: siteContext(config, covered),
      data: covered,
      dates,
    })!;
    if (result.layout === 'list') throw new Error('esperaba tarjetas');
    const { items } = result;
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
    const config = site(user, { view: 'list' });
    const result = docListingView({
      route: routeOf(docRoutes(siteContext(config, data)), 'tutoriales'),
      site: siteContext(config, data),
      data,
      dates,
      headings: [{ depth: 2, slug: 'esenciales', text: 'Otra' }],
    })!;
    if (result.layout !== 'list') throw new Error('esperaba una lista');
    expect(result.sections.map((section) => section.label)).toEqual(['Esenciales', undefined]);
    expect(result.headings).toEqual([{ depth: 2, slug: 'esenciales-1', text: 'Esenciales' }]);
  });

  it('un índice generado (sin `_index.md`) usa las opciones de `folders`, también heredadas', () => {
    const generated = doc('tutoriales', 'es', {
      title: 'Tutoriales',
      kind: 'generated',
      sourcePath: 'docs/tutoriales/_index.md',
    });
    const config = site({
      folders: {
        '*': { listing: { view: 'table', pageSize: 10 } },
        tutoriales: { listing: { generate: true } },
      },
    });
    const items = [doc(''), generated, ...tutorials];
    const result = docListingView({
      route: routeOf(docRoutes(siteContext(config, items)), 'tutoriales'),
      site: siteContext(config, items),
      data: items,
      dates,
    })!;
    expect(result).toMatchObject({ layout: 'table', total: 5 });
    expect(result).not.toHaveProperty('pager');
  });
});

describe('docListingView: tres idiomas', () => {
  it('la portada y la fecha salen del original que elige `sourceLocale`, no del primero que aparece', () => {
    // El paquete solo trae textos de interfaz en es y en: el tercer idioma se añade a la config ya
    // resuelta, que es lo que reciben las vistas.
    const config = { ...site({ translations: { missing: 'link' } }), locales: ['es', 'en', 'fr'] };
    const items = [
      doc(''),
      doc('tutoriales', 'es', { sourcePath: 'docs/tutoriales/_index.md' }),
      // Sin versión en español (el idioma por defecto): la francesa aparece antes que la inglesa.
      doc('tutoriales/x', 'fr', { index: { cover: { src: '/fr.png' } } }),
      doc('tutoriales/x', 'en', { index: { cover: { src: '/en.png' } } }),
    ];
    const result = docListingView({
      route: routeOf(docRoutes(siteContext(config, items)), 'tutoriales'),
      site: siteContext(config, items),
      data: items,
      dates: new Map([
        ['docs/tutoriales/x.fr.md', '2026-01-01T00:00:00+00:00'],
        ['docs/tutoriales/x.en.md', '2026-02-02T00:00:00+00:00'],
      ]),
    })!;
    if (result.layout === 'list') throw new Error('esperaba tarjetas');
    const entry = result.items.find((item) => item.slug === 'tutoriales/x')!;
    expect(entry.cover).toMatchObject({ kind: 'image', source: { src: '/en.png' } });
    expect(entry.updated?.iso).toBe('2026-02-02T00:00:00+00:00');
  });
});

describe('docListingView: `_index.en.md` con `slug` propio', () => {
  const translated = [
    doc(''),
    listing,
    doc('tutoriales', 'en', {
      title: 'Tutorials',
      urlSlug: 'tutorials',
      sourcePath: 'docs/tutoriales/_index.en.md',
    }),
    ...tutorials,
    doc('tutoriales/a', 'en', { urlSlug: 'tutorials/a-in-english' }),
  ];
  const routes = docRoutes(siteContext(site(), translated));

  function paged(param: string) {
    const result = docListingView({
      route: routeOf(routes, param),
      site: siteContext(site(), translated),
      data: translated,
    });
    if (!result || result.layout === 'list') throw new Error(`${param} no es un listado paginado`);
    return result;
  }

  it('sus páginas cuelgan de su URL y cada entrada enlaza su URL en inglés (o la reserva)', () => {
    expect(paged('en/tutorials/page/2').pager?.hrefs).toEqual([
      '/repo/en/tutorials/',
      '/repo/en/tutorials/page/2/',
      '/repo/en/tutorials/page/3/',
    ]);
    expect(paged('en/tutorials').sizes?.[1]?.href).toBe('/repo/en/tutorials/per-page/12/');
    const hrefs = paged('en/tutorials/per-page/12').items.map((item) => item.href);
    expect(hrefs).toContain('/repo/en/tutorials/a-in-english/');
    expect(hrefs).toContain('/repo/en/tutoriales/b/');
  });

  it('la página 2 del listado en inglés es canónica de sí misma bajo la URL traducida', () => {
    const view = docView({
      route: routeOf(routes, 'en/tutorials/page/2'),
      site: siteContext(site(), translated),
      data: translated,
    });
    const canonical = view.head.find((tag) => tag.attrs['rel'] === 'canonical');
    expect(canonical?.attrs['href']).toBe('https://x.dev/repo/en/tutorials/page/2/');
  });
});
