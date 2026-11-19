import { clientPagePaths, type ClientPage, type RouteParams } from '../../core/seo/client-pages';
import { readHead } from '../../core/seo/html-head';
import { clientSitemapEntries, type SitemapEntry } from '../../core/seo/sitemap';
import { clientRegistry, type ClientRegistry } from '../registry';

export interface ClientPages {
  pages: ClientPage[];
  /** Las rutas o páginas que no se pudieron leer, con el porqué. */
  failures: { entrypoint: string; message: string }[];
}

interface Where {
  /** Dónde escucha el servidor de desarrollo (`http://localhost:4321`). */
  origin: string;
  /** El dominio publicado: los enlaces relativos del `<head>` se resuelven contra él. */
  site: string;
  base: string;
}

interface Deps {
  registry: ClientRegistry;
  fetch: (url: URL) => Promise<Response>;
}

const cache = new WeakMap<ClientRegistry, { key: string; result: ClientPages }>();

/** Páginas de `src/pages/` leídas como un visitante (pidiendo cada URL al servidor de dev); sin servidor no devuelve nada. */
export async function loadClientPages(
  where: Where,
  deps: Deps = { registry: clientRegistry(), fetch: (url) => fetch(url) },
): Promise<ClientPages> {
  const { registry } = deps;
  const { load } = registry;
  if (!load) return { pages: [], failures: [] };
  /* `staticPaths` es una declaración y no hereda el descarte de `undefined`: se fija en una constante. */
  const loadModule = load;
  const key = `${registry.version}\0${where.origin}\0${where.site}\0${where.base}`;
  const cached = cache.get(registry);
  if (cached?.key === key) return cached.result;

  async function staticPaths(route: { entrypoint: string }): Promise<RouteParams[]> {
    const module = await loadModule(route.entrypoint);
    if (typeof module.getStaticPaths !== 'function') {
      throw new Error('La ruta es dinámica y no exporta getStaticPaths.');
    }
    const paths = (await module.getStaticPaths({ paginate: () => [] })) as {
      params: RouteParams;
    }[];
    return paths.map(({ params }) => params);
  }
  const { pages: refs, failures } = await clientPagePaths(registry.routes, staticPaths, where.base);

  const read = await Promise.all(
    refs.map(async (ref): Promise<ClientPage | undefined> => {
      const response = await deps.fetch(new URL(ref.path, where.origin));
      if (!response.ok) {
        failures.push({
          entrypoint: ref.entrypoint,
          message: `${ref.path} responde ${response.status}.`,
        });
        return undefined;
      }
      return { ...ref, head: readHead(await response.text(), new URL(ref.path, where.site)) };
    }),
  );
  const result = { pages: read.filter((page) => page !== undefined), failures };
  cache.set(registry, { key, result });
  return result;
}

/** Páginas del cliente para el sitemap en dev; en build las añade `astro:build:done` desde `dist/`. */
export async function loadClientSitemapEntries(
  where: Where,
  deps?: Deps,
  /** Fecha por archivo de página (`entrypoint`), para el `lastmod`. */
  dates?: ReadonlyMap<string, string>,
): Promise<SitemapEntry[]> {
  const { pages } = await loadClientPages(where, deps);
  return clientSitemapEntries(pages, new URL(where.site), dates);
}
