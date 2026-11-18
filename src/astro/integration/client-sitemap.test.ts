import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import type { SiteRoute } from '../../core/seo/client-pages';
import { buildSitemap } from '../../core/seo/sitemap';
import type { ClientRegistry } from '../data/client-registry';
import { addClientPagesToSitemap } from './client-sitemap';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Un `dist/` con los ficheros dados (ruta → contenido) y su URL. */
function dist(files: Record<string, string>): URL {
  const root = mkdtempSync(join(tmpdir(), 'design-dist-'));
  dirs.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return pathToFileURL(`${root}/`);
}

const route = (pattern: string, regex: RegExp): SiteRoute => ({
  pattern,
  entrypoint: `src/pages${pattern}.astro`,
  params: [],
  generate: () => `${pattern}/`,
  match: (path) => regex.test(path),
});
const registry = (routes: SiteRoute[]): ClientRegistry => ({ routes, version: 1 });
const html = (head = '') => `<html><head><title>x</title>${head}</head><body></body></html>`;
const docsSitemap = buildSitemap(new Map([['guide', { en: '/guide/' }]]), new URL('https://x.dev'));
const where = { site: 'https://x.dev', base: '/', index: false };

describe('addClientPagesToSitemap', () => {
  it('añade al sitemap las páginas del cliente indexables, leídas de lo que se generó', async () => {
    const dir = dist({
      'sitemap.xml': docsSitemap,
      'cv/index.html': html(),
      'privacy/index.html': html('<meta name="robots" content="noindex">'),
      'guide/index.html': html(),
    });
    const added = await addClientPagesToSitemap(
      {
        dir,
        pages: [{ pathname: 'cv/' }, { pathname: 'privacy/' }, { pathname: 'guide/' }],
        ...where,
      },
      registry([route('/cv', /^\/cv\/$/), route('/privacy', /^\/privacy\/$/)]),
    );
    const xml = readFileSync(new URL('sitemap.xml', dir), 'utf8');
    expect(added).toBe(1);
    expect(xml).toContain('<loc>https://x.dev/guide/</loc>');
    expect(xml).toContain('<loc>https://x.dev/cv/</loc>');
    expect(xml).not.toContain('privacy');
  });

  it('un canonical relativo se resuelve contra la URL publicada: la página sigue siendo canónica', async () => {
    const dir = dist({
      'sitemap.xml': docsSitemap,
      'cv/index.html': html('<link rel="canonical" href="./">'),
    });
    const added = await addClientPagesToSitemap(
      { dir, pages: [{ pathname: 'cv/' }], ...where },
      registry([route('/cv', /^\/cv\/$/)]),
    );
    expect(added).toBe(1);
  });

  it('con un índice de sitemaps, escribe en el de páginas', async () => {
    const dir = dist({ 'sitemap-pages.xml': docsSitemap, 'cv/index.html': html() });
    await addClientPagesToSitemap(
      { dir, pages: [{ pathname: 'cv/' }], ...where, index: true },
      registry([route('/cv', /^\/cv\/$/)]),
    );
    expect(readFileSync(new URL('sitemap-pages.xml', dir), 'utf8')).toContain('https://x.dev/cv/');
  });

  it('también lee el formato de build por ficheros (`cv.html`)', async () => {
    const dir = dist({ 'sitemap.xml': docsSitemap, 'cv.html': html() });
    const added = await addClientPagesToSitemap(
      { dir, pages: [{ pathname: 'cv' }], ...where },
      registry([route('/cv', /^\/cv$/)]),
    );
    expect(added).toBe(1);
  });

  it('sin páginas del cliente no toca el sitemap', async () => {
    const dir = dist({ 'sitemap.xml': docsSitemap });
    expect(await addClientPagesToSitemap({ dir, pages: [], ...where }, registry([]))).toBe(0);
    expect(readFileSync(new URL('sitemap.xml', dir), 'utf8')).toBe(docsSitemap);
  });
});
