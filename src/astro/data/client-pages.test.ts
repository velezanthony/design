import { describe, expect, it } from 'vitest';
import type { SiteRoute } from '../../core/seo/client-pages';
import { loadClientPages } from './client-pages';
import type { ClientRegistry } from './client-registry';

const site = 'https://x.dev';
const origin = 'http://localhost:4321';

const route = (pattern: string, params: string[] = []): SiteRoute => ({
  pattern,
  entrypoint: `src/pages${pattern}.astro`,
  params,
  generate: (data: Record<string, string | undefined> = {}) =>
    `${pattern.replace(/\[(\w+)\]/g, (_, name: string) => data[name] ?? '')}/`,
});

const page = (title: string, head = '') =>
  `<html><head><title>${title}</title>${head}</head><body></body></html>`;

/** Un servidor de mentira: responde el HTML de cada ruta y apunta lo que le piden. */
function server(pages: Record<string, string>) {
  const asked: string[] = [];
  const fetch = async (url: URL) => {
    asked.push(url.pathname);
    const html = pages[url.pathname];
    return new Response(html ?? 'no', { status: html ? 200 : 404 });
  };
  return { fetch, asked };
}

const registry = (routes: SiteRoute[], modules: Record<string, unknown> = {}): ClientRegistry => ({
  routes,
  version: 1,
  load: async (entrypoint) => modules[entrypoint] as Record<string, unknown>,
});

const load = (reg: ClientRegistry, fetch: (url: URL) => Promise<Response>, base = '/') =>
  loadClientPages({ origin, site, base }, { registry: reg, fetch });

describe('loadClientPages', () => {
  it('pide cada página al servidor y lee su <head>', async () => {
    const { fetch } = server({ '/cv/': page('CV', '<meta name="robots" content="noindex">') });
    const { pages } = await load(registry([route('/cv')]), fetch);
    expect(pages).toEqual([
      expect.objectContaining({
        path: '/cv/',
        entrypoint: 'src/pages/cv.astro',
        head: expect.objectContaining({ title: 'CV', noindex: true }),
      }),
    ]);
  });

  it('expande las rutas dinámicas con el getStaticPaths de su módulo', async () => {
    const { fetch } = server({ '/a/': page('A'), '/b/': page('B') });
    const projects = route('/[slug]', ['slug']);
    const reg = registry([projects], {
      [projects.entrypoint]: {
        getStaticPaths: () => [{ params: { slug: 'a' } }, { params: { slug: 'b' } }],
      },
    });
    const { pages } = await load(reg, fetch);
    expect(pages.map(({ head }) => head.title)).toEqual(['A', 'B']);
  });

  it('los enlaces relativos del <head> se resuelven contra la URL publicada, no la local', async () => {
    const { fetch } = server({ '/repo/cv/': page('CV', '<link rel="canonical" href="./">') });
    const { pages } = await load(registry([route('/cv')]), fetch, '/repo');
    expect(pages[0]!.head.canonical).toBe('https://x.dev/repo/cv/');
  });

  it('una página que no responde 200 o un módulo sin getStaticPaths se apuntan como fallos', async () => {
    const { fetch } = server({});
    const dynamic = route('/[slug]', ['slug']);
    const reg = registry([route('/cv'), dynamic], { [dynamic.entrypoint]: {} });
    const { pages, failures } = await load(reg, fetch);
    expect(pages).toEqual([]);
    expect(failures.map(({ entrypoint }) => entrypoint).sort()).toEqual([
      'src/pages/[slug].astro',
      'src/pages/cv.astro',
    ]);
    expect(failures.find(({ entrypoint }) => entrypoint.endsWith('cv.astro'))!.message).toContain(
      '404',
    );
  });

  it('sin servidor de desarrollo (no hay con qué cargar módulos) no hay páginas del cliente', async () => {
    const { fetch, asked } = server({ '/cv/': page('CV') });
    const reg: ClientRegistry = { routes: [route('/cv')], version: 1 };
    expect(await load(reg, fetch)).toEqual({ pages: [], failures: [] });
    expect(asked).toEqual([]);
  });

  it('mientras no cambie nada reutiliza lo leído; tras un cambio vuelve a pedirlo', async () => {
    const { fetch, asked } = server({ '/cv/': page('CV') });
    const reg = registry([route('/cv')]);
    await load(reg, fetch);
    await load(reg, fetch);
    expect(asked).toEqual(['/cv/']);
    reg.version += 1;
    await load(reg, fetch);
    expect(asked).toEqual(['/cv/', '/cv/']);
  });
});
