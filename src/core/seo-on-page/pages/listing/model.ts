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
import type { SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';
import { commonIssues, type CommonIssue } from './common';
import { kindOptions, kindsWithIssues, type KindOptions } from './kinds';
import { pageRows, type PageRow } from './rows';

export interface ListingModel {
  /** Los filtros EFECTIVOS (con el valor por defecto aplicado), los que ve el formulario. */
  filters: SeoFilters;
  /** La URL no nombra gravedad ni tipo: la vista por defecto oculta lo informativo. */
  defaulted: boolean;
  perPage: number;
  /** Con la vista por defecto, el enlace para ver también lo informativo; si no, nada. */
  showAllHref: string | undefined;
  form: {
    filters: SeoFilters;
    perPage: number;
    locales: Locale[];
    action: string;
    /** Las casillas del desplegable «Tipo de problema», con «Todos». */
    kinds: KindOptions;
  };
  /** Los tipos de problema que comparten todas las páginas filtradas: se enseñan una vez, no por fila. */
  common: { issues: CommonIssue[]; overviewHref: string };
  /** Las filas de la página actual: una por página (slug), con el enlace a su inspector. */
  rows: PageRow[];
  footer: {
    /**
     * Los filtros ESCRITOS en la URL: en la vista por defecto no llevan `severity`, así pasar de
     * página o cambiar el tamaño no la convierte en una vista con filtros explícitos.
     */
    filters: SeoFilters;
    perPage: number;
    action: string;
    /** Todo cuenta PÁGINAS (slugs): una página en dos idiomas es una. */
    count: { from: number; to: number; total: number; overall: number };
    pagination: { page: number; pages: number; href: (page: number) => string };
  };
}

interface ListingInput {
  tree: SeoTree;
  /** La query de la URL: ahí viven filtros, página y tamaño. */
  params: URLSearchParams;
  /** Idiomas de la config del sitio, para el formulario y las insignias de cada fila. */
  locales: Locale[];
  /** El idioma de cuyo título y enlace se sirve la fila. */
  defaultLocale: Locale;
  links: Pick<PanelLinks, 'pages' | 'inspector' | 'overview'>;
}

/**
 * Pedir TODOS los tipos con incidencias es no filtrar por tipo («Todos» marcado): sin esto, enviar
 * el formulario sin tocar nada fijaría una lista y la vista dejaría de ser la de por defecto. Si el
 * árbol no tiene incidencias no hay «todos» que equivaler, y lo escrito se respeta.
 */
function withoutAllKinds(params: URLSearchParams, tree: SeoTree): URLSearchParams {
  const available = kindsWithIssues(tree);
  const asked = params.getAll('kind');
  if (available.length === 0 || !available.every((kind) => asked.includes(kind))) return params;
  const normalized = new URLSearchParams(params);
  normalized.delete('kind');
  return normalized;
}

/**
 * Todo lo que enseña la tabla de páginas: qué filtros rigen, las filas de la página pedida y los
 * números de la paginación. La pantalla solo lee la URL, llama a esto y pinta.
 *
 * Los filtros eligen PÁGINAS (una entrada que los cumple basta), pero la fila enseña la página
 * entera: todos sus idiomas y problemas. Las filas salen por gravedad y se paginan ya agrupadas.
 */
export function listingModel({
  tree,
  params,
  locales,
  defaultLocale,
  links,
}: ListingInput): ListingModel {
  const { filters, defaulted } = filtersFromUrl(withoutAllKinds(params, tree));
  const perPage = parsePerPage(params);
  const slugs = new Set(filterPages(tree, filters).map((entry) => entry.slug));
  const selected = tree.pages.filter((entry) => slugs.has(entry.slug));
  // Sin gravedad en la URL (solo tipos) se ven todas: no se filtra por gravedad.
  const severities = filters.severities.length > 0 ? filters.severities : undefined;
  const common = commonIssues(selected, {
    ignore: filters.kinds,
    ...(severities && { severities }),
  });
  const result = paginate(
    pageRows(selected, {
      locales,
      defaultLocale,
      common: common.map(({ kind }) => kind),
      ...(severities && { severities }),
      inspector: links.inspector,
    }),
    parsePage(params),
    perPage,
  );
  const written = defaulted ? { ...filters, severities: [] } : filters;
  const action = links.pages();
  return {
    filters,
    defaulted,
    perPage,
    showAllHref: defaulted
      ? links.pages({ ...filters, severities: ALL_SEVERITIES }, 1, perPage)
      : undefined,
    form: { filters, perPage, locales, action, kinds: kindOptions(tree, filters.kinds) },
    common: { issues: common, overviewHref: links.overview() },
    rows: result.rows,
    footer: {
      filters: written,
      perPage,
      action,
      count: {
        from: result.from,
        to: result.to,
        total: result.total,
        overall: new Set(tree.pages.map((entry) => entry.slug)).size,
      },
      pagination: {
        page: result.page,
        pages: result.pages,
        href: (number) => links.pages(written, number, perPage),
      },
    },
  };
}
