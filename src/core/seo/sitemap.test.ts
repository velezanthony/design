import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import { buildAvailability, type Availability, type UrlPolicy } from '../i18n/availability';
import { DocsError } from '../errors';
import { fallbackRoutes } from '../i18n/translation-policy';
import { buildSitemap, SITEMAP_STYLESHEET_PATH } from './sitemap';

const site = new URL('https://x.dev');
const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

describe('buildSitemap', () => {
  const av: Availability = new Map([
    ['install', { en: '/repo/install/', es: '/repo/es/install/' }],
    ['changelog', { en: '/repo/changelog/' }],
  ]);

  it('es un único urlset con URLs absolutas', () => {
    const xml = buildSitemap(av, site);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(locs(xml)).toEqual([
      'https://x.dev/repo/install/',
      'https://x.dev/repo/es/install/',
      'https://x.dev/repo/changelog/',
    ]);
  });

  it('enlaza su hoja de estilo con una ruta relativa, para que funcione bajo cualquier base', () => {
    const [, stylesheet] = buildSitemap(av, site).split('\n');
    expect(stylesheet).toBe('<?xml-stylesheet type="text/css" href="_design/sitemap.css"?>');
    expect(SITEMAP_STYLESHEET_PATH).toBe('/_design/sitemap.css');
  });

  it('una pareja lista ambos alternates en cada URL', () => {
    const xml = buildSitemap(av, site);
    const block = xml.split('<url>')[1];
    expect(block).toContain('rel="alternate" hreflang="en" href="https://x.dev/repo/install/"');
    expect(block).toContain('rel="alternate" hreflang="es" href="https://x.dev/repo/es/install/"');
  });

  it('una página de un solo idioma no lleva alternates', () => {
    const xml = buildSitemap(new Map([['changelog', { en: '/repo/changelog/' }]]), site);
    expect(xml).not.toContain('xhtml:link');
  });

  it('exactamente 50 000 URLs pasan y 50 001 lanzan con el número y el límite', () => {
    const many = (count: number): Availability =>
      new Map(Array.from({ length: count }, (_, i) => [`p${i}`, { en: `/repo/p${i}/` }]));
    expect(locs(buildSitemap(many(50_000), site))).toHaveLength(50_000);
    const attempt = () => buildSitemap(many(50_001), site);
    expect(attempt).toThrow(DocsError);
    expect(attempt).toThrow(/50001.*50000|50 001.*50 000/);
  });

  it('las páginas noindex salen y desaparecen de los alternates de sus gemelas', () => {
    const xml = buildSitemap(av, site, new Set(['/repo/es/install/']));
    expect(locs(xml)).toEqual(['https://x.dev/repo/install/', 'https://x.dev/repo/changelog/']);
    expect(xml).not.toContain('hreflang="es"');
    expect(xml).not.toContain('xhtml:link');
  });

  it('escapa los caracteres especiales de XML', () => {
    const xml = buildSitemap(new Map([['a&b', { en: '/repo/a&b/' }]]), site);
    expect(locs(xml)).toEqual(['https://x.dev/repo/a&amp;b/']);
  });

  it('las rutas de reserva y la 404 presentes en el build no aparecen', () => {
    const pages: Page[] = [
      { slug: 'changelog', locale: 'en', title: 'c', kind: 'native', body: '', sourcePath: 'c.md' },
    ];
    const real = buildAvailability(pages, url);
    const routes = fallbackRoutes(
      real,
      new Map([['changelog', 'fallback']]),
      { locales: ['en', 'es'], defaultLocale: 'en' },
      url,
    );
    expect(routes).toHaveLength(1);
    const xml = buildSitemap(real, site);
    expect(xml).not.toContain('/repo/es/changelog/');
    expect(xml).not.toContain('404');
    expect(xml).not.toContain('xhtml:link');
  });
});
