/** Los params de una URL concreta de una ruta dinámica (`{ lang: 'en', slug: 'uno' }`). */
export type RouteParams = Record<string, string | undefined>;

/** Lo que el núcleo necesita de una ruta del sitio: la forma neutra de la que da Astro. */
export interface SiteRoute {
  pattern: string;
  /** El fichero de la página, relativo a la raíz del proyecto (`src/pages/cv.astro`). */
  entrypoint: string;
  /** Los params del patrón; sin ninguno, la ruta es fija. */
  params: string[];
  /** Interpola los params en el patrón y devuelve la ruta sin la base (`/en/uno/`). */
  generate: (params?: RouteParams) => string;
}

/** Una página del cliente ya con su URL: la ruta (con la base) y de qué fichero sale. */
export interface ClientPageRef {
  path: string;
  pattern: string;
  entrypoint: string;
}

/** Las páginas de error no son contenido: ni se indexan ni se analizan. */
const ERROR_PAGES = ['/404', '/500'];

/**
 * Las rutas que son páginas del sitio que escribió el cliente en `src/pages/`: las del proyecto,
 * que no son endpoints ni redirecciones ni páginas de error. Las que inyecta la librería no son del
 * proyecto, así que quedan fuera.
 */
export function clientRoutes<T extends { pattern: string; origin: string; type: string }>(
  routes: readonly T[],
): T[] {
  return routes.filter(
    (route) =>
      route.origin === 'project' && route.type === 'page' && !ERROR_PAGES.includes(route.pattern),
  );
}

const withBase = (base: string, path: string) => `${base.replace(/\/$/, '')}${path}`;

/**
 * Las URLs de las páginas del cliente: una por ruta fija y una por cada entrada del
 * `getStaticPaths` de las dinámicas, que da `staticPaths` (quien sabe cargar el módulo). Si una
 * ruta falla al expandirse, se apunta en `failures` y las demás siguen: un error en una página no
 * deja sin datos al resto.
 */
export async function clientPagePaths(
  routes: readonly SiteRoute[],
  staticPaths: (route: SiteRoute) => Promise<RouteParams[]>,
  base: string,
): Promise<{ pages: ClientPageRef[]; failures: { entrypoint: string; message: string }[] }> {
  const pages = new Map<string, ClientPageRef>();
  const failures: { entrypoint: string; message: string }[] = [];
  for (const route of routes) {
    let all: RouteParams[];
    try {
      all = route.params.length === 0 ? [{}] : await staticPaths(route);
    } catch (error) {
      failures.push({ entrypoint: route.entrypoint, message: (error as Error).message });
      continue;
    }
    // Por URL: dos entradas con los mismos params son la misma página.
    for (const params of all) {
      const path = withBase(base, route.generate(params));
      pages.set(path, { path, pattern: route.pattern, entrypoint: route.entrypoint });
    }
  }
  return { pages: [...pages.values()], failures };
}
