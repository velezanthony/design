import { describe, expect, it } from 'vitest';
import { siteFiles, type SiteFilesFacts } from './site-files';

const facts = (extra: Partial<SiteFilesFacts> = {}): SiteFilesFacts => ({
  url: { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' },
  locales: ['en'],
  sitemapUrls: 12,
  robots: false,
  llms: false,
  privacyPage: false,
  ...extra,
});

const entry = (id: string, extra: Partial<SiteFilesFacts> = {}) =>
  siteFiles(facts(extra)).find((file) => file.id === id)!;

describe('siteFiles', () => {
  it('devuelve las entradas en el orden en que las enseña el panel', () => {
    expect(siteFiles(facts()).map((file) => file.id)).toEqual([
      'sitemap',
      'robots',
      'llms',
      'not-found',
      'favicon',
      'privacy',
      'pagefind',
    ]);
  });

  it('el sitemap lo genera la librería, con su recuento de URLs y enlace con la base', () => {
    expect(entry('sitemap')).toMatchObject({
      state: 'generated',
      path: '/sitemap.xml',
      href: '/repo/sitemap.xml',
      urls: 12,
    });
  });

  it('robots.txt y llms.txt: presentes en public/ se enlazan; ausentes son un estado, no un problema', () => {
    expect(entry('robots', { robots: true })).toMatchObject({
      state: 'present',
      href: '/repo/robots.txt',
    });
    expect(entry('llms', { llms: true })).toMatchObject({
      state: 'present',
      href: '/repo/llms.txt',
    });
    const absent = entry('robots');
    expect(absent.state).toBe('absent');
    expect(absent).not.toHaveProperty('href');
    expect(entry('llms').state).toBe('absent');
  });

  it('la 404 se genera por idioma: el principal sin prefijo y los demás con él', () => {
    expect(entry('not-found', { locales: ['en', 'es'] })).toMatchObject({
      state: 'generated',
      href: '/repo/404/',
      links: [
        { locale: 'en', href: '/repo/404/' },
        { locale: 'es', href: '/repo/es/404/' },
      ],
    });
  });

  it('favicon: sin config es el del paquete; con uno local, el de public/; https tal cual', () => {
    expect(entry('favicon')).toMatchObject({
      state: 'generated',
      path: '/_design/favicon.png',
      href: '/repo/_design/favicon.png',
    });
    expect(entry('favicon', { favicon: '/favicon.svg' })).toMatchObject({
      state: 'present',
      path: '/favicon.svg',
      href: '/repo/favicon.svg',
    });
    expect(entry('favicon', { favicon: 'https://cdn.dev/i.png' })).toMatchObject({
      state: 'present',
      href: 'https://cdn.dev/i.png',
    });
  });

  it('privacidad: solo se genera con privacy.page; si no, no aplica y sin enlaces', () => {
    const off = entry('privacy');
    expect(off.state).toBe('not-applicable');
    expect(off).not.toHaveProperty('href');
    expect(entry('privacy', { privacyPage: true, locales: ['en', 'es'] })).toMatchObject({
      state: 'generated',
      href: '/repo/privacy/',
      links: [
        { locale: 'en', href: '/repo/privacy/' },
        { locale: 'es', href: '/repo/es/privacidad/' },
      ],
    });
  });

  it('pagefind/ solo existe tras la build: sin enlace en desarrollo', () => {
    const pagefind = entry('pagefind');
    expect(pagefind).toMatchObject({ state: 'build-only', path: '/pagefind/' });
    expect(pagefind).not.toHaveProperty('href');
  });
});
