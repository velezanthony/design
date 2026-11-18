import { describe, expect, it } from 'vitest';
import { builtClientPages, clientPagePaths, clientRoutes, type SiteRoute } from './client-pages';

/** Una ruta como la da Astro: `generate` interpola los params en el patrón y pone la barra final. */
const route = (pattern: string, params: string[] = []): SiteRoute => ({
  pattern,
  entrypoint: `src/pages${pattern}.astro`,
  params,
  generate: (data: Record<string, string | undefined> = {}) =>
    `${pattern
      .split('/')
      .map((segment) =>
        segment.replace(/^\[(?:\.\.\.)?(\w+)\]$/, (_, name: string) => data[name] ?? ''),
      )
      .filter(Boolean)
      .map((segment) => `/${segment}`)
      .join('')}/`,
});

describe('clientRoutes', () => {
  const resolved = (pattern: string, extra: { origin?: string; type?: string } = {}) => ({
    pattern,
    origin: 'project',
    type: 'page',
    ...extra,
  });

  it('se queda con las páginas del proyecto', () => {
    const routes = [
      resolved('/cv'),
      resolved('/[...slug]', { origin: 'external' }),
      resolved('/_image', { origin: 'internal' }),
      resolved('/robots.txt', { type: 'endpoint' }),
      resolved('/old', { type: 'redirect' }),
    ];
    expect(clientRoutes(routes).map(({ pattern }) => pattern)).toEqual(['/cv']);
  });

  it('las páginas de error no son contenido', () => {
    expect(clientRoutes([resolved('/404'), resolved('/500'), resolved('/about')])).toHaveLength(1);
  });
});

describe('clientPagePaths', () => {
  const none = async () => [];

  it('una ruta fija da su URL, con la base delante', async () => {
    const { pages } = await clientPagePaths([route('/cv')], none, '/repo');
    expect(pages).toEqual([
      { path: '/repo/cv/', pattern: '/cv', entrypoint: 'src/pages/cv.astro' },
    ]);
  });

  it('en la raíz del dominio la base no añade nada', async () => {
    const { pages } = await clientPagePaths([route('/cv')], none, '/');
    expect(pages.map(({ path }) => path)).toEqual(['/cv/']);
  });

  it('una ruta dinámica da una URL por cada entrada de su getStaticPaths', async () => {
    const projects = route('/[...lang]/[slug]', ['lang', 'slug']);
    const staticPaths = async () => [
      { lang: undefined, slug: 'uno' },
      { lang: 'en', slug: 'uno' },
    ];
    const { pages } = await clientPagePaths([projects], staticPaths, '/');
    expect(pages.map(({ path }) => path)).toEqual(['/uno/', '/en/uno/']);
  });

  it('a las rutas fijas no les pide getStaticPaths', async () => {
    const asked: string[] = [];
    await clientPagePaths(
      [route('/cv')],
      async (r) => {
        asked.push(r.pattern);
        return [];
      },
      '/',
    );
    expect(asked).toEqual([]);
  });

  it('si el getStaticPaths de una ruta falla, se apunta y las demás siguen', async () => {
    const broken = route('/[slug]', ['slug']);
    const { pages, failures } = await clientPagePaths(
      [broken, route('/cv')],
      async () => {
        throw new Error('sin datos');
      },
      '/',
    );
    expect(pages.map(({ path }) => path)).toEqual(['/cv/']);
    expect(failures).toEqual([{ entrypoint: 'src/pages/[slug].astro', message: 'sin datos' }]);
  });

  it('una URL repetida (dos entradas con los mismos params) sale una vez', async () => {
    const dup = route('/[slug]', ['slug']);
    const { pages } = await clientPagePaths([dup], async () => [{ slug: 'a' }, { slug: 'a' }], '/');
    expect(pages).toHaveLength(1);
  });
});

describe('builtClientPages', () => {
  const matching = (pattern: string, regex: RegExp): SiteRoute => ({
    ...route(pattern),
    match: (path) => regex.test(path),
  });

  it('de las páginas generadas, se queda con las que salen de una ruta del cliente', () => {
    const cv = matching('/cv', /^\/cv\/$/);
    const projects = matching('/[slug]', /^\/(?!docs)[^/]+\/$/);
    const pages = builtClientPages(['', 'cv/', 'uno/', 'docs/guide/'], [cv, projects], '/repo');
    expect(pages).toEqual([
      { path: '/repo/cv/', pattern: '/cv', entrypoint: 'src/pages/cv.astro' },
      { path: '/repo/uno/', pattern: '/[slug]', entrypoint: 'src/pages/[slug].astro' },
    ]);
  });

  it('la primera ruta que encaja es la suya, como en el enrutado de Astro', () => {
    const fixed = matching('/cv', /^\/cv\/$/);
    const dynamic = matching('/[slug]', /^\/[^/]+\/$/);
    expect(builtClientPages(['cv/'], [fixed, dynamic], '/')[0]!.pattern).toBe('/cv');
  });

  it('una ruta sin forma de reconocerse no se adivina', () => {
    expect(builtClientPages(['cv/'], [route('/cv')], '/')).toEqual([]);
  });
});
