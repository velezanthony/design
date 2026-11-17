import type { Locale } from '../../../i18n/locale';
import { filterPages } from '../../queries/filter';
import { paginate } from '../../queries/paginate';
import {
  ALL_SEVERITIES,
  filtersFromUrl,
  parsePage,
  parsePerPage,
  type SeoFilters,
} from '../../queries/url-filters';
import type { SeoPage, SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';

export interface ListingModel {
  /** Los filtros EFECTIVOS (con el valor por defecto aplicado), los que ve el formulario. */
  filters: SeoFilters;
  /** La URL no nombra gravedad ni tipo: la vista por defecto oculta lo informativo. */
  defaulted: boolean;
  perPage: number;
  /** Con la vista por defecto, el enlace para ver también lo informativo; si no, nada. */
  showAllHref: string | undefined;
  form: { filters: SeoFilters; perPage: number; locales: Locale[]; action: string };
  /** Las filas de la página actual, cada una con el enlace a su inspector. */
  rows: { page: SeoPage; href: string }[];
  footer: {
    /**
     * Los filtros ESCRITOS en la URL: en la vista por defecto no llevan `severity`, así pasar de
     * página o cambiar el tamaño no la convierte en una vista con filtros explícitos.
     */
    filters: SeoFilters;
    perPage: number;
    action: string;
    count: { from: number; to: number; total: number; overall: number };
    pagination: { page: number; pages: number; href: (page: number) => string };
  };
}

interface ListingInput {
  tree: SeoTree;
  /** La query de la URL: ahí viven filtros, página y tamaño. */
  params: URLSearchParams;
  /** Idiomas de la config del sitio, para el formulario. */
  locales: Locale[];
  links: Pick<PanelLinks, 'pages' | 'inspector'>;
}

/**
 * Todo lo que enseña la tabla de páginas: qué filtros rigen, las filas de la página pedida y los
 * números de la paginación. La pantalla solo lee la URL, llama a esto y pinta.
 */
export function listingModel({ tree, params, locales, links }: ListingInput): ListingModel {
  const { filters, defaulted } = filtersFromUrl(params);
  const perPage = parsePerPage(params);
  const result = paginate(filterPages(tree, filters), parsePage(params), perPage);
  const written = defaulted ? { ...filters, severities: [] } : filters;
  const action = links.pages();
  return {
    filters,
    defaulted,
    perPage,
    showAllHref: defaulted
      ? links.pages({ ...filters, severities: ALL_SEVERITIES }, 1, perPage)
      : undefined,
    form: { filters, perPage, locales, action },
    rows: result.rows.map((page) => ({ page, href: links.inspector(page) })),
    footer: {
      filters: written,
      perPage,
      action,
      count: { from: result.from, to: result.to, total: result.total, overall: tree.pages.length },
      pagination: {
        page: result.page,
        pages: result.pages,
        href: (number) => links.pages(written, number, perPage),
      },
    },
  };
}
