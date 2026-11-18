import type { SiteRoute } from '../../core/seo/client-pages';

/**
 * Lo que la integración sabe de las páginas del cliente y el panel necesita: las rutas (de
 * `astro:routes:resolved`), cómo cargar un módulo (el Vite de `astro:server:setup`, solo en dev) y
 * un contador que sube con cada cambio, para invalidar lo ya leído.
 */
export interface ClientRegistry {
  routes: SiteRoute[];
  load?: (entrypoint: string) => Promise<Record<string, unknown>>;
  version: number;
}

const KEY = Symbol.for('@velezanthony/design/client-pages');

/**
 * El registro, compartido por `globalThis`: la integración la carga Node y el panel la carga Vite,
 * así que cada uno tiene su copia de este módulo; el proceso, en cambio, es el mismo.
 */
export function clientRegistry(): ClientRegistry {
  const store = globalThis as unknown as Record<symbol, ClientRegistry | undefined>;
  return (store[KEY] ??= { routes: [], version: 0 });
}
