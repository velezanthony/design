import { describe, expect, it } from 'vitest';

import { applyAnalytics } from '../../core/analytics/resolve';
import { resolveConfig } from '../../core/config/resolve';
import type { DocsUserConfig } from '../../core/config/schema';
import { createVirtualData } from '../virtual/data';
import { docRoutes, docView, type DocRoute } from './doc';
import type { DocData } from '../loader/schema';

const site = (user: Partial<DocsUserConfig> = {}) =>
  createVirtualData(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
    publicDir: 'file:///site/public/',
  });

const doc = (slug: string, locale: string, extra: Partial<DocData> = {}): DocData => ({
  slug,
  locale,
  title: `${slug || 'Home'} ${locale}`,
  sourcePath: `${slug || 'index'}${locale === 'en' ? '' : `.${locale}`}.md`,
  ...extra,
});

const all = [
  doc('', 'en'),
  doc('', 'es'),
  doc('guide', 'en'),
  doc('guide', 'es'),
  doc('only-en', 'en', { order: 3 }),
];

const route = (routes: DocRoute[], slug: string, locale: string) =>
  routes.find((r) => r.slug === slug && r.locale === locale)!;

describe('docRoutes', () => {
  it('una ruta por página real; el idioma por defecto va sin prefijo y la portada es undefined', () => {
    const routes = docRoutes(all, site());
    expect(routes.map((r) => r.param)).toEqual([undefined, 'es', 'guide', 'es/guide', 'only-en']);
    expect(routes.every((r) => r.kind === 'page')).toBe(true);
  });

  it('con política link u omit no hay rutas de reserva', () => {
    expect(docRoutes(all, site()).filter((r) => r.kind === 'fallback')).toHaveLength(0);
    expect(
      docRoutes(all, site({ translations: { missing: 'omit' } })).filter(
        (r) => r.kind === 'fallback',
      ),
    ).toHaveLength(0);
  });

  it('con política fallback: una ruta de reserva por idioma ausente, del contenido original', () => {
    const routes = docRoutes(all, site({ translations: { missing: 'fallback' } }));
    const fallback = routes.filter((r) => r.kind === 'fallback');
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
    expect(docRoutes([doc('guide', 'en')], mono).map((r) => r.param)).toEqual(['guide']);
  });
});

describe('docView: página real', () => {
  const cfg = site({ editUrl: 'https://github.com/o/r/edit/main', repoRoot: '.' });
  const view = docView({ route: route(docRoutes(all, cfg), 'guide', 'es'), data: all, cfg });

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
    const find = (tag: string, key: string, value: string) =>
      view.head.find((h) => h.tag === tag && h.attrs[key] === value);
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
    const cfg = site({ editUrl: 'https://github.com/o/r/edit/main' });
    const data = [doc('guide', 'en', { editPath: 'docs/guide.md' })];
    const v = docView({ route: docRoutes(data, cfg)[0]!, data, cfg });
    expect(v.editUrl).toBe('https://github.com/o/r/edit/main');
    expect(v.editFile).toBe('docs/guide.md');
    const none = site();
    expect(docView({ route: docRoutes(data, none)[0]!, data, cfg: none }).editUrl).toBeUndefined();
  });

  it('sin editPath no se ofrece edición aunque haya editUrl', () => {
    const cfg = site({ editUrl: 'https://github.com/o/r/edit/main' });
    const data = [doc('guide', 'en')];
    expect(docView({ route: docRoutes(data, cfg)[0]!, data, cfg }).editUrl).toBeUndefined();
  });
});

describe('docView: noindex', () => {
  const cfg = site();
  const data = [doc('guide', 'en'), doc('guide', 'es', { seo: { noindex: true } })];
  const view = docView({ route: route(docRoutes(data, cfg), 'guide', 'es'), data, cfg });

  it('robots noindex, no indexable, y sin hreflang entre las gemelas', () => {
    expect(view.indexable).toBe(false);
    expect(view.head.some((h) => h.attrs['name'] === 'robots')).toBe(true);
    expect(view.head.some((h) => h.attrs['hreflang'])).toBe(false);
  });

  it('sigue siendo alcanzable desde el selector de idioma', () => {
    expect(view.hrefs['es']).toBe('/repo/es/guide/');
  });
});

describe('docView: ruta de reserva', () => {
  const cfg = site({
    translations: { missing: 'fallback' },
    editUrl: 'https://github.com/o/r/edit/main',
  });
  const data = [doc('', 'en'), doc('only-en', 'en', { editPath: 'docs/only-en.md' })];
  const view = docView({ route: route(docRoutes(data, cfg), 'only-en', 'es'), data, cfg });

  it('idioma de la ruta, aviso con el original, no indexable', () => {
    expect(view.lang).toBe('es');
    expect(view.fallback).toEqual({ originalLocale: 'en', href: '/repo/only-en/' });
    expect(view.indexable).toBe(false);
    expect(view.current).toBe('/repo/es/only-en/');
  });

  it('head: noindex y canonical al ORIGINAL, sin alternates', () => {
    expect(view.head.find((h) => h.attrs['rel'] === 'canonical')!.attrs['href']).toBe(
      'https://x.dev/repo/only-en/',
    );
    expect(view.head.some((h) => h.attrs['name'] === 'robots')).toBe(true);
    expect(view.head.some((h) => h.attrs['hreflang'])).toBe(false);
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
  const cfg = site({ seo: { image: { src: '/og.png', alt: 'Card' } } });
  const head = (sizes?: Map<string, { width: number; height: number }>) =>
    docView({ route: route(docRoutes(all, cfg), 'guide', 'es'), data: all, cfg, sizes }).head;
  const content = (tags: ReturnType<typeof head>, property: string) =>
    tags.find((h) => h.attrs['property'] === property)?.attrs['content'];

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
  const cfg = site({
    locales: ['en'],
    nav: [
      { label: 'Guide', dir: 'users' },
      { label: 'Contributing', dir: 'contributors' },
    ],
    sidebar: ['index', 'showcase'],
  });
  const view = (slug: string) =>
    docView({ route: route(docRoutes(pages, cfg), slug, 'en'), data: pages, cfg });

  it('la barra lateral es la de la sección de la página', () => {
    const slugs = (slug: string) =>
      view(slug).sidebar.map((node) => ('slug' in node ? node.slug : node.label));
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
    const v = docView({
      route: route(docRoutes(pages, plain), 'users/b', 'en'),
      data: pages,
      cfg: plain,
    });
    expect(v.nav).toEqual([]);
    expect(v.sidebar.length).toBeGreaterThan(1);
  });
});

describe('docView: footer', () => {
  const pages = [doc('', 'en'), doc('', 'es'), doc('changelog', 'en'), doc('changelog', 'es')];
  const cfg = site({
    social: { github: 'https://github.com/x/y' },
    footer: {
      license: 'MIT',
      links: [{ label: { en: 'Changes', es: 'Cambios' }, slug: 'changelog' }],
    },
  });
  const footerOf = (locale: string) =>
    docView({ route: route(docRoutes(pages, cfg), '', locale), data: pages, cfg }).footer;

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
    const v = docView({ route: route(docRoutes(pages, plain), '', 'en'), data: pages, cfg: plain });
    expect(v.footer).toEqual({
      author: { name: 'Anthony Velez', href: 'https://velezanthony.github.io/' },
      links: [],
    });
  });
});

describe('docView: analítica y privacidad', () => {
  const withEnv = (envValue: string | undefined, user: Partial<DocsUserConfig> = {}) =>
    createVirtualData(
      applyAnalytics(resolveConfig({ name: 'Docs', locales: ['en', 'es'], ...user }), envValue),
      {
        base: '/repo',
        site: 'https://x.dev',
        trailingSlash: 'always',
        buildFormat: 'directory',
        publicDir: 'file:///site/public/',
      },
    );

  it('sin analítica no hay gtmId ni enlace de privacidad', () => {
    const view = docView({
      route: route(docRoutes(all, withEnv(undefined)), '', 'en'),
      data: all,
      cfg: withEnv(undefined),
    });
    expect(view.gtmId).toBeUndefined();
    expect(view.privacyUrl).toBeUndefined();
  });

  it('con analítica cada idioma enlaza la política del portfolio de su idioma', () => {
    const cfg = withEnv('GTM-ENV0001');
    const routes = docRoutes(all, cfg);
    const en = docView({ route: route(routes, 'guide', 'en'), data: all, cfg });
    const es = docView({ route: route(routes, 'guide', 'es'), data: all, cfg });
    expect(en.gtmId).toBe('GTM-ENV0001');
    expect(en.privacyUrl).toBe('https://velezanthony.github.io/en/privacy/');
    expect(es.privacyUrl).toBe('https://velezanthony.github.io/privacidad/');
  });

  it('una privacyUrl explícita sin analítica se enlaza sin gtmId', () => {
    const cfg = withEnv(undefined, { privacyUrl: '/privacy/' });
    const view = docView({ route: route(docRoutes(all, cfg), '', 'es'), data: all, cfg });
    expect(view.privacyUrl).toBe('/privacy/');
    expect(view.gtmId).toBeUndefined();
  });
});
