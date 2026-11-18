import type { Locale } from '../../i18n/locale';
import type { SeoFilters, ViewState } from '../queries/url-filters';

/** Puerto: el núcleo no conoce `base` ni las rutas inyectadas; lo implementa `astro/` (`devHrefs`). */
export interface PanelLinks {
  /** La tabla de páginas, con los filtros, la página, el tamaño y la vista que se pidan. */
  pages(filters?: SeoFilters, page?: number, perPage?: number, view?: ViewState): string;
  /** El inspector de una página e idioma (slug vacío = portada). */
  inspector(target: { slug: string; locale: Locale }): string;
  /** La vista general del panel. */
  overview(): string;
}
