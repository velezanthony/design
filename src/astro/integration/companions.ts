import type { AstroIntegration } from 'astro';

/**
 * Integraciones que el paquete necesita junto a la suya. Hoy ninguna: el sitemap, la búsqueda y la
 * 404 son rutas y hooks propios. La regla de `addCompanions` queda fijada para cuando haga falta.
 */
export const COMPANIONS: AstroIntegration[] = [];

/**
 * Inserta cada compañera justo detrás de la nuestra, y solo si el consumidor no tiene ya una con
 * ese `name` (si la configuró él, manda la suya). Modifica `integrations` en sitio, que es la
 * lista viva de Astro. Si no encuentra la nuestra las añade al final.
 */
export function addCompanions(
  integrations: { name: string }[],
  selfName: string,
  companions: readonly { name: string }[],
): void {
  let at = integrations.findIndex((integration) => integration.name === selfName) + 1;
  if (at === 0) at = integrations.length;
  for (const companion of companions) {
    if (integrations.some((integration) => integration.name === companion.name)) continue;
    integrations.splice(at++, 0, companion);
  }
}
