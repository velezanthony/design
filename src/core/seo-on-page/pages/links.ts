import type { Locale } from '../../i18n/locale';
import type { SeoFilters } from '../queries/url-filters';

/**
 * Cómo se forma el enlace a cada pantalla del panel. Es un PUERTO: el núcleo no sabe de `base`, de
 * `trailingSlash` ni de las rutas que inyecta la integración, así que los modelos de `pages/`
 * reciben esta interfaz y devuelven los enlaces ya hechos, como texto. La implementa la capa
 * `astro/` (`devHrefs`), que sí conoce la política de URLs del sitio.
 */
export interface PanelLinks {
  /** La tabla de páginas, con los filtros, la página y el tamaño que se pidan. */
  pages(filters?: SeoFilters, page?: number, perPage?: number): string;
  /** El inspector de una página e idioma (slug vacío = portada). */
  inspector(target: { slug: string; locale: Locale }): string;
  /** La vista general del panel. */
  overview(): string;
}
