import type { SiteRoute } from '../core/seo/client-pages';

/** Rutas, cargador de módulos (solo dev) y contador de cambios que la integración comparte con el panel. */
export interface ClientRegistry {
  routes: SiteRoute[];
  load?: (entrypoint: string) => Promise<Record<string, unknown>>;
  version: number;
  /** Las rutas de la librería que el sitio sustituye con un fichero suyo (`routeOverrides`). */
  overrides?: { file: string; route: string }[];
}

const KEY = Symbol.for('@velezanthony/design/client-pages');

/** Compartido por `globalThis`: Node carga la integración y Vite el panel, cada uno con su copia del módulo. */
export function clientRegistry(): ClientRegistry {
  const store = globalThis as unknown as Record<symbol, ClientRegistry | undefined>;
  return (store[KEY] ??= { routes: [], version: 0 });
}
