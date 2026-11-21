import { describe, expect, it } from 'vitest';

import { applyAnalytics } from '../../core/analytics/resolve';
import { resolveConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { createVirtualData } from '../virtual/data';
import { docNavTrees, docRoutes, docView, type DocRoute } from './doc';
import type { DocData } from '../loader/schema';

function site(user: Partial<DocsUserConfig> = {}) {
  return createVirtualData(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
    publicDir: 'file:///site/public/',
    root: 'file:///site/',
  });
}

function doc(slug: string, locale: string, extra: Partial<DocData> = {}): DocData {
  return {
    slug,
    locale,
    title: `${slug || 'Home'} ${locale}`,
    sourcePath: `${slug || 'index'}${locale === 'en' ? '' : `.${locale}`}.md`,
    ...extra,
  };
}

const all = [
  doc('', 'en'),
  doc('', 'es'),
  doc('guide', 'en'),
  doc('guide', 'es'),
  doc('only-en', 'en', { order: 3 }),
];

function route(routes: DocRoute[], slug: string, locale: string) {
  return routes.find((docRoute) => docRoute.slug === slug && docRoute.locale === locale)!;
}

describe('docRoutes', () => {
  it('una ruta por página real; el idioma por defecto va sin prefijo y la portada es undefined', () => {
    const routes = docRoutes(all, site());
    expect(routes.map((docRoute) => docRoute.param)).toEqual([
      undefined,
      'es',
      'guide',
      'es/guide',
      'only-en',
    ]);
    expect(routes.every((docRoute) => docRoute.kind === 'page')).toBe(true);
  });

  it('con política link u omit no hay rutas de reserva', () => {
    expect(docRoutes(all, site()).filter((docRoute) => docRoute.kind === 'fallback')).toHaveLength(
      0,
    );
    expect(
      docRoutes(all, site({ translations: { missing: 'omit' } })).filter(
        (docRoute) => docRoute.kind === 'fallback',
      ),
    ).toHaveLength(0);
  });

  it('con política fallback: una ruta de reserva por idioma ausente, del contenido original', () => {
    const routes = docRoutes(all, site({ translations: { missing: 'fallback' } }));
    const fallback = routes.filter((docRoute) => docRoute.kind === 'fallback');
    expect(fallback).toHaveLength(1);
    expect(fallback[0]).toMatchObject({
      param: 'es/only-en',
      slug: 'only-en',
      locale: 'es',
      contentLocale: 'en',
      canonical: '/repo/only-en/',
    });
  });

  it('sitio monolingüe: sin prefijos ni reservas', () => {
    const mono = site({ locales: ['en'] });
    expect(docRoutes([doc('guide', 'en')], mono).map((docRoute) => docRoute.param)).toEqual([
      'guide',
    ]);
  });
});

describe('docView: página real', () => {
  const config = site({ editUrl: 'https://github.com/o/r/edit/main', repoRoot: '.' });
  const view = docView({ route: route(docRoutes(all, config), 'guide', 'es'), data: all, config });

  it('idioma, textos del idioma, portada, nombre y base', () => {
    expect(view.lang).toBe('es');
    expect(view.strings['skipToContent']).toBe('Saltar al contenido');
    expect(view.homeHref).toBe('/repo/es/');
    expect(view.siteName).toBe('Docs');
    expect(view.baseUrl).toBe('/repo/');
    expect(view.indexable).toBe(true);
    expect(view.fallback).toBeUndefined();
  });

  it('hrefs de cada idioma en que existe y página actual en la barra lateral', () => {
    expect(view.hrefs).toEqual({ en: '/repo/guide/', es: '/repo/es/guide/' });
    expect(view.current).toBe('/repo/es/guide/');
    expect(JSON.stringify(view.sidebar)).toContain('/repo/es/guide/');
  });

  it('head: título, canonical absoluto, hreflang y og:locale', () => {
    function find(tag: string, key: string, value: string) {
      return view.head.find((headTag) => headTag.tag === tag && headTag.attrs[key] === value);
    }
    expect(view.head[0]).toMatchObject({ tag: 'title' });
    expect(find('link', 'rel', 'canonical')!.attrs['href']).toBe('https://x.dev/repo/es/guide/');
    expect(find('link', 'hreflang', 'en')).toBeDefined();
    expect(find('meta', 'property', 'og:locale')!.attrs['content']).toBe('es');
  });

  it('anterior y siguiente salen del orden de la barra lateral', () => {
    expect(view.prev?.href).toBe('/repo/es/');
  });
});

describe('docView: edición', () => {
  it('editFile es el editPath de la entrada; sin editUrl no hay enlace', () => {
    const config = site({ editUrl: 'https://github.com/o/r/edit/main' });
    const data = [doc('guide', 'en', { editPath: 'docs/guide.md' })];
    const pageView = docView({ route: docRoutes(data, config)[0]!, data, config });
    expect(pageView.editUrl).toBe('https://github.com/o/r/edit/main');
    expect(pageView.editFile).toBe('docs/guide.md');
    const none = site();
    expect(
      docView({ route: docRoutes(data, none)[0]!, data, config: none }).editUrl,
    ).toBeUndefined();
  });

  it('sin editPath no se ofrece edición aunque haya editUrl', () => {
    const config = site({ editUrl: 'https://github.com/o/r/edit/main' });
    const data = [doc('guide', 'en')];
    expect(docView({ route: docRoutes(data, config)[0]!, data, config }).editUrl).toBeUndefined();
  });
});

describe('docView: noindex', () => {
  const config = site();
  const data = [doc('guide', 'en'), doc('guide', 'es', { seo: { noindex: true } })];
  const view = docView({ route: route(docRoutes(data, config), 'guide', 'es'), data, config });

  it('robots noindex, no indexable, y sin hreflang entre las gemelas', () => {
    expect(view.indexable).toBe(false);
    expect(view.head.some((headTag) => headTag.attrs['name'] === 'robots')).toBe(true);
    expect(view.head.some((headTag) => headTag.attrs['hreflang'])).toBe(false);
  });

  it('sigue siendo alcanzable desde el selector de idioma', () => {
    expect(view.hrefs['es']).toBe('/repo/es/guide/');
  });
});

describe('docView: ruta de reserva', () => {
  const config = site({
    translations: { missing: 'fallback' },
    editUrl: 'https://github.com/o/r/edit/main',
  });
  const data = [doc('', 'en'), doc('only-en', 'en', { editPath: 'docs/only-en.md' })];
  const view = docView({ route: route(docRoutes(data, config), 'only-en', 'es'), data, config });

  it('idioma de la ruta, aviso con el original, no indexable', () => {
    expect(view.lang).toBe('es');
    expect(view.fallback).toEqual({ originalLocale: 'en', href: '/repo/only-en/' });
    expect(view.indexable).toBe(false);
    expect(view.current).toBe('/repo/es/only-en/');
  });

  it('head: noindex y canonical al ORIGINAL, sin alternates', () => {
    expect(view.head.find((headTag) => headTag.attrs['rel'] === 'canonical')!.attrs['href']).toBe(
      'https://x.dev/repo/only-en/',
    );
    expect(view.head.some((headTag) => headTag.attrs['name'] === 'robots')).toBe(true);
    expect(view.head.some((headTag) => headTag.attrs['hreflang'])).toBe(false);
  });

  it('selector de idioma sin gemela en es; edición apunta al archivo original', () => {
    expect(view.hrefs).toEqual({ en: '/repo/only-en/' });
    expect(view.editFile).toBe('docs/only-en.md');
  });

  it('la barra lateral es la de es y contiene la ruta de reserva', () => {
    expect(JSON.stringify(view.sidebar)).toContain('/repo/es/only-en/');
  });
});

describe('docView: dimensiones de la imagen', () => {
  const config = site({ seo: { image: { src: '/og.png', alt: 'Card' } } });
  function head(sizes?: Map<string, { width: number; height: number }>) {
    return docView({
      route: route(docRoutes(all, config), 'guide', 'es'),
      data: all,
      config,
      sizes,
    }).head;
  }
  function content(tags: ReturnType<typeof head>, property: string) {
    return tags.find((headTag) => headTag.attrs['property'] === property)?.attrs['content'];
  }

  it('og:image:width/height salen de los tamaños leídos', () => {
    const tags = head(new Map([['/og.png', { width: 1200, height: 630 }]]));
    expect(content(tags, 'og:image')).toBe('https://x.dev/repo/og.png');
    expect(content(tags, 'og:image:width')).toBe('1200');
    expect(content(tags, 'og:image:height')).toBe('630');
  });

  it('sin tamaños leídos se emite la imagen sin width ni height', () => {
    const tags = head();
    expect(content(tags, 'og:image')).toBe('https://x.dev/repo/og.png');
    expect(content(tags, 'og:image:width')).toBeUndefined();
  });
});

describe('docView: nav con secciones', () => {
  const pages = [
    doc('', 'en'),
    doc('', 'es'),
    doc('showcase', 'en'),
    doc('users/a', 'en'),
    doc('users/b', 'en'),
    doc('users/c', 'en'),
    doc('contributors/x', 'en'),
  ];
  const config = site({
    locales: ['en'],
    nav: [
      { label: 'Guide', dir: 'users' },
      { label: 'Contributing', dir: 'contributors' },
    ],
    sidebar: ['index', 'showcase'],
  });
  function view(slug: string) {
    return docView({ route: route(docRoutes(pages, config), slug, 'en'), data: pages, config });
  }

  it('la barra lateral es la de la sección de la página', () => {
    function slugs(slug: string) {
      return view(slug).sidebar.map((node) => ('slug' in node ? node.slug : node.label));
    }
    expect(slugs('users/b')).toEqual(['users/a', 'users/b', 'users/c']);
    expect(slugs('contributors/x')).toEqual(['contributors/x']);
    expect(slugs('showcase')).toEqual(['', 'showcase']);
  });

  it('anterior y siguiente no salen de la sección', () => {
    expect(view('users/c').next).toBeUndefined();
    expect(view('users/a').prev).toBeUndefined();
    expect(view('users/b').prev?.href).toBe('/repo/users/a/');
    expect(view('showcase').next).toBeUndefined();
  });

  it('entrega las entradas de cabecera con la sección activa', () => {
    const entries = view('users/b').nav;
    expect(entries.map((entry) => [entry.label, entry.current])).toEqual([
      ['Guide', 'true'],
      ['Contributing', undefined],
    ]);
    expect(entries[0]!.href).toBe('/repo/users/a/');
  });

  it('sin `nav` la lista es vacía y la barra lateral es la entera', () => {
    const plain = site({ locales: ['en'] });
    const pageView = docView({
      route: route(docRoutes(pages, plain), 'users/b', 'en'),
      data: pages,
      config: plain,
    });
    expect(pageView.nav).toEqual([]);
    expect(pageView.sidebar.length).toBeGreaterThan(1);
  });
});

describe('docView: footer', () => {
  const pages = [doc('', 'en'), doc('', 'es'), doc('changelog', 'en'), doc('changelog', 'es')];
  const config = site({
    social: { github: 'https://github.com/x/y' },
    footer: {
      license: 'MIT',
      links: [{ label: { en: 'Changes', es: 'Cambios' }, slug: 'changelog' }],
    },
  });
  function footerOf(locale: string) {
    return docView({ route: route(docRoutes(pages, config), '', locale), data: pages, config })
      .footer;
  }

  it('entrega licencia, autor por defecto y los enlaces ya resueltos para el idioma', () => {
    const footer = footerOf('es');
    expect(footer.license).toEqual({ label: 'MIT' });
    expect(footer.author?.name).toBe('Anthony Velez');
    expect(footer.links.map((link) => [link.label, link.href])).toEqual([
      ['Cambios', '/repo/es/changelog/'],
      ['Repositorio', 'https://github.com/x/y'],
      ['Informar de un error', 'https://github.com/x/y/issues/new'],
    ]);
  });

  it('sin config del footer solo queda el autor', () => {
    const plain = site();
    const pageView = docView({
      route: route(docRoutes(pages, plain), '', 'en'),
      data: pages,
      config: plain,
    });
    expect(pageView.footer).toEqual({
      author: { name: 'Anthony Velez', href: 'https://velezanthony.github.io/' },
      links: [],
    });
  });
});

describe('docView: analítica y privacidad', () => {
  function withEnv(envValue: string | undefined, user: Partial<DocsUserConfig> = {}) {
    return createVirtualData(
      applyAnalytics(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), envValue),
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

  it('sin analítica no hay gtmId ni enlace de privacidad', () => {
    const view = docView({
      route: route(docRoutes(all, withEnv(undefined)), '', 'en'),
      data: all,
      config: withEnv(undefined),
    });
    expect(view.gtmId).toBeUndefined();
    expect(view.privacyUrl).toBeUndefined();
  });

  it('con analítica cada idioma enlaza la política de su idioma', () => {
    const config = withEnv('GTM-ENV0001', {
      privacyUrl: { en: 'https://x.dev/en/privacy/', es: 'https://x.dev/privacidad/' },
    });
    const routes = docRoutes(all, config);
    const en = docView({ route: route(routes, 'guide', 'en'), data: all, config });
    const es = docView({ route: route(routes, 'guide', 'es'), data: all, config });
    expect(en.gtmId).toBe('GTM-ENV0001');
    expect(en.privacyUrl).toBe('https://x.dev/en/privacy/');
    expect(es.privacyUrl).toBe('https://x.dev/privacidad/');
  });

  it('una privacyUrl explícita sin analítica se enlaza sin gtmId', () => {
    const config = withEnv(undefined, { privacyUrl: '/privacy/' });
    const view = docView({ route: route(docRoutes(all, config), '', 'es'), data: all, config });
    expect(view.privacyUrl).toBe('/privacy/');
    expect(view.gtmId).toBeUndefined();
  });
});

describe('docNavTrees: índice generado (`::nav-tree`)', () => {
  const data = [
    doc('', 'en'),
    doc('guide', 'en', { seo: { description: 'How to start.' } }),
    doc('guide', 'es', { seo: { description: 'Cómo empezar.' } }),
    doc('api', 'en'),
  ];
  const config = site({
    translations: { missing: 'fallback' },
    nav: [
      {
        label: { en: 'Guides', es: 'Guías' },
        sidebar: [{ label: 'Start', items: ['guide', 'api'] }],
      },
    ],
  });
  const routes = docRoutes(data, config);

  it('el árbol de cada sección en el idioma de la página, con las descripciones', () => {
    const [tree] = docNavTrees({ route: route(routes, '', 'en'), config, data });
    expect(tree).toEqual([
      {
        label: 'Start',
        items: [
          { label: 'guide en', href: '/repo/guide/', description: 'How to start.' },
          { label: 'api en', href: '/repo/api/' },
        ],
      },
    ]);
  });

  it('en una ruta de reserva, los textos del contenido original y las URLs del idioma de la ruta', () => {
    const fallback = route(routes, '', 'es');
    expect(fallback.kind).toBe('fallback');
    const [tree] = docNavTrees({ route: fallback, config, data });
    expect(tree).toEqual([
      {
        label: 'Start',
        items: [
          { label: 'guide en', href: '/repo/es/guide/', description: 'How to start.' },
          { label: 'api en', href: '/repo/es/api/' },
        ],
      },
    ]);
  });
});

describe('`slug` propio (URL traducida)', () => {
  const data = [
    doc('', 'en'),
    doc('', 'es'),
    doc('guide', 'en'),
    doc('guide', 'es', { urlSlug: 'guia' }),
    doc('install', 'en', { urlSlug: 'setup' }),
    doc('install', 'es'),
    doc('only-en', 'en', { urlSlug: 'just-english' }),
  ];

  it('la ruta usa el `slug` propio y conserva la identidad del archivo', () => {
    const routes = docRoutes(data, site());
    expect(route(routes, 'guide', 'es')).toMatchObject({ param: 'es/guia', urlSlug: 'guia' });
    expect(route(routes, 'install', 'en')).toMatchObject({ param: 'setup', urlSlug: 'setup' });
    expect(route(routes, 'install', 'es')).toMatchObject({ param: 'es/install' });
  });

  it('la reserva de una traducción ausente: prefijo del idioma y `slug` del original, como hoy', () => {
    const routes = docRoutes(data, site({ translations: { missing: 'fallback' } }));
    expect(route(routes, 'only-en', 'es')).toMatchObject({
      kind: 'fallback',
      param: 'es/just-english',
      urlSlug: 'just-english',
      canonical: '/repo/just-english/',
    });
  });

  it('una reserva que coincide con la URL de una página real rompe la build nombrando ambas', () => {
    const clash = [
      doc('', 'en'),
      doc('a', 'en'),
      doc('b', 'en'),
      doc('b', 'es', { urlSlug: 'a', sourcePath: 'b.es.md' }),
    ];
    expect(() => docRoutes(clash, site({ translations: { missing: 'fallback' } }))).toThrow(
      /\/es\/a\/.*b\.es\.md/s,
    );
  });

  describe('docView de la traducción con `slug`', () => {
    const view = docView({
      route: route(docRoutes(data, site()), 'guide', 'es'),
      data,
      config: site(),
    });

    it('selector de idioma, página actual y barra lateral con las URLs de cada idioma', () => {
      expect(view.hrefs).toEqual({ en: '/repo/guide/', es: '/repo/es/guia/' });
      expect(view.current).toBe('/repo/es/guia/');
      expect(JSON.stringify(view.sidebar)).toContain('/repo/es/guia/');
    });

    it('canonical y hreflang con las URLs traducidas', () => {
      function href(key: string, value: string) {
        return view.head.find((tag) => tag.attrs[key] === value)?.attrs['href'];
      }
      expect(href('rel', 'canonical')).toBe('https://x.dev/repo/es/guia/');
      expect(href('hreflang', 'es')).toBe('https://x.dev/repo/es/guia/');
      expect(href('hreflang', 'en')).toBe('https://x.dev/repo/guide/');
    });

    it('anterior y siguiente enlazan las URLs del idioma de la ruta', () => {
      expect(view.prev?.href).toBe('/repo/es/');
      expect(view.next?.href).toBe('/repo/es/install/');
    });
  });

  it('un listado con `slug` propio pagina bajo su URL (`en/tutorials/2`)', () => {
    const listing = [
      doc('', 'es'),
      doc('tutoriales', 'es', { listing: true, index: { layout: 'cards', pageSize: 1 } }),
      doc('tutoriales', 'en', {
        listing: true,
        urlSlug: 'tutorials',
        index: { layout: 'cards', pageSize: 1 },
      }),
      doc('tutoriales/a', 'es'),
      doc('tutoriales/a', 'en', { urlSlug: 'tutorials/a' }),
      doc('tutoriales/b', 'es'),
      doc('tutoriales/b', 'en'),
    ];
    const config = site({ locales: ['es', 'en'], defaultLocale: 'es' });
    const params = docRoutes(listing, config).map((docRoute) => docRoute.param);
    expect(params).toContain('en/tutorials');
    expect(params).toContain('en/tutorials/2');
    expect(params).toContain('tutoriales/2');
    expect(params).not.toContain('en/tutoriales/2');
  });
});
