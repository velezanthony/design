import type { IntegrationResolvedRoute } from 'astro';
import type { ViteDevServer } from 'vite';
import { clientRoutes } from '../../core/seo/client-pages';
import { clientRegistry } from '../data/client-registry';

/** `astro:routes:resolved`: guarda las páginas que el cliente tiene en `src/pages/`. */
export function rememberClientRoutes(routes: IntegrationResolvedRoute[]): void {
  const registry = clientRegistry();
  registry.routes = clientRoutes(routes).map((route) => ({
    pattern: route.pattern,
    entrypoint: route.entrypoint,
    params: route.params,
    generate: route.generate,
  }));
  registry.version += 1;
}

/**
 * `astro:server:setup`: los módulos de las páginas se cargan con el Vite del servidor (así su
 * `getStaticPaths` ve las colecciones), y cualquier cambio de fichero invalida lo ya leído.
 */
export function watchClientPages(server: Pick<ViteDevServer, 'ssrLoadModule' | 'watcher'>): void {
  const registry = clientRegistry();
  registry.load = (entrypoint) => server.ssrLoadModule(`/${entrypoint}`);
  server.watcher.on('change', () => {
    registry.version += 1;
  });
}
