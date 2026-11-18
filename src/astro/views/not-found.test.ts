import { describe, expect, it } from 'vitest';

import { applyAnalytics } from '../../core/analytics/resolve';
import { resolveConfig } from '../../core/config/resolve';
import { createVirtualData } from '../virtual/data';
import { notFoundRoutes, notFoundView } from './not-found';

function site(locales: string[], ui = {}) {
  return createVirtualData(resolveConfig({ name: 'Docs', locales, ui }), {
    base: '/repo',
    site: 'https://x.dev',
    trailingSlash: 'always',
    buildFormat: 'directory',
    publicDir: 'file:///site/public/',
  });
}

describe('notFoundRoutes', () => {
  it('uno por idioma que no es el de defecto', () => {
    expect(notFoundRoutes(site(['en', 'es']))).toEqual([{ params: { locale: 'es' } }]);
    expect(notFoundRoutes(site(['es', 'en']))).toEqual([{ params: { locale: 'en' } }]);
  });

  it('monolingüe: ninguna', () => {
    expect(notFoundRoutes(site(['en']))).toEqual([]);
  });
});

describe('notFoundView', () => {
  const cfg = site(['en', 'es'], { es: { 'notFound.title': 'Perdido' } });

  it('no lleva los schemas del sitio: una 404 no es la página que describen', () => {
    const withSchema = createVirtualData(
      resolveConfig({
        name: 'Docs',
        locales: ['en'],
        seo: { schema: [{ '@type': 'SoftwareSourceCode', name: 'Docs' }] },
      }),
      {
        base: '/repo',
        site: 'https://x.dev',
        trailingSlash: 'always',
        buildFormat: 'directory',
        publicDir: 'file:///site/public/',
      },
    );
    const view = notFoundView({ locale: undefined, cfg: withSchema });
    expect(view.head.some((tag) => tag.attrs['type'] === 'application/ld+json')).toBe(false);
  });

  it('/404 (idioma por defecto): head noindex sin canonical y plantillas del resto', () => {
    const view = notFoundView({ locale: undefined, cfg });
    expect(view.lang).toBe('en');
    expect(view.head[0]).toMatchObject({
      tag: 'title',
      content: expect.stringContaining('Page not found'),
    });
    expect(view.head.some((tag) => tag.attrs['name'] === 'robots')).toBe(true);
    expect(view.head.some((tag) => tag.attrs['rel'] === 'canonical')).toBe(false);
    expect(view.head.some((tag) => tag.attrs['hreflang'])).toBe(false);
    expect(view.others.map((other) => other.lang)).toEqual(['es']);
    expect(view.others[0]).toMatchObject({
      title: 'Perdido | Anthony Velez Tapia',
      homeHref: '/repo/es/',
    });
    expect(view.swap).toEqual({ base: '/repo/', locales: ['en', 'es'], defaultLocale: 'en' });
    expect(view.homeHref).toBe('/repo/');
  });

  it('el título del idioma sustituido lleva la plantilla, igual que su propia /es/404/', () => {
    const swapped = notFoundView({ locale: undefined, cfg }).others[0]?.title;
    const own = notFoundView({ locale: 'es', cfg }).head[0];
    expect(own).toMatchObject({ tag: 'title' });
    expect(swapped).toBe(own?.content);
    expect(swapped).toContain('Perdido');
    expect(swapped).not.toBe('Perdido');
  });

  it('/es/404/: su idioma directamente, sin plantillas ni sustitución', () => {
    const view = notFoundView({ locale: 'es', cfg });
    expect(view.lang).toBe('es');
    expect(view.strings['notFound.title']).toBe('Perdido');
    expect(view.others).toEqual([]);
    expect(view.swap).toBeUndefined();
    expect(view.homeHref).toBe('/repo/es/');
  });

  it('monolingüe: sin plantillas ni sustitución', () => {
    const view = notFoundView({ locale: undefined, cfg: site(['en']) });
    expect(view.others).toEqual([]);
    expect(view.swap).toBeUndefined();
  });
});

describe('notFoundView: footer', () => {
  const pages = [
    { slug: '', locale: 'en', title: 'Home', sourcePath: 'index.md' },
    { slug: 'changelog', locale: 'en', title: 'C', sourcePath: 'changelog.md' },
    { slug: 'changelog', locale: 'es', title: 'C', sourcePath: 'changelog.es.md' },
  ];
  const cfg = createVirtualData(
    resolveConfig({
      name: 'Docs',
      locales: ['en', 'es'],
      social: { github: 'https://github.com/x/y' },
      footer: { links: [{ label: { en: 'Changes', es: 'Cambios' }, slug: 'changelog' }] },
    }),
    {
      base: '/repo',
      site: 'https://x.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
      publicDir: 'file:///site/public/',
    },
  );

  it('la 404 lleva el mismo footer, y cada plantilla el de su idioma', () => {
    const view = notFoundView({ locale: undefined, cfg, sizes: new Map(), data: pages });
    expect(view.footer.links.map((link) => [link.label, link.href])).toEqual([
      ['Changes', '/repo/changelog/'],
      ['Repository', 'https://github.com/x/y'],
      ['Report a bug', 'https://github.com/x/y/issues/new'],
    ]);
    expect(view.others[0]?.footer.links[0]).toMatchObject({
      label: 'Cambios',
      href: '/repo/es/changelog/',
    });
  });

  it('sin páginas los enlaces a página se omiten, no se rompen', () => {
    const view = notFoundView({ locale: undefined, cfg });
    expect(view.footer.links.map((link) => link.label)).toEqual(['Repository', 'Report a bug']);
  });
});

describe('notFoundView: analítica y privacidad', () => {
  function on(envValue: string | undefined) {
    return createVirtualData(
      applyAnalytics(resolveConfig({ name: 'Docs', locales: ['en', 'es'] }), envValue),
      {
        base: '/repo',
        site: 'https://x.dev',
        trailingSlash: 'always',
        buildFormat: 'directory',
        publicDir: 'file:///site/public/',
      },
    );
  }

  it('sin analítica la 404 no trae gtmId ni privacidad, tampoco las plantillas', () => {
    const view = notFoundView({ locale: undefined, cfg: on(undefined) });
    expect(view.gtmId).toBeUndefined();
    expect(view.privacyUrl).toBeUndefined();
    expect(view.others[0]?.privacyUrl).toBeUndefined();
  });

  it('con analítica cada 404, y cada plantilla, enlaza la política de su idioma', () => {
    const cfg = on('GTM-ENV0001');
    const view = notFoundView({ locale: undefined, cfg });
    expect(view.gtmId).toBe('GTM-ENV0001');
    expect(view.privacyUrl).toBe('https://velezanthony.github.io/en/privacy/');
    expect(view.others[0]?.privacyUrl).toBe('https://velezanthony.github.io/privacidad/');
    expect(notFoundView({ locale: 'es', cfg }).privacyUrl).toBe(
      'https://velezanthony.github.io/privacidad/',
    );
  });
});
