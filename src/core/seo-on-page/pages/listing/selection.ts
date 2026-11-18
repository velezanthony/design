import { filterPages } from '../../queries/filter';
import {
  filtersFromUrl,
  parseView,
  SeoView,
  type SeoFilters,
  type ViewState,
} from '../../queries/url-filters';
import type { IssueSeverity, SeoPage, SeoTree } from '../../tree/types';
import { kindsWithIssues } from './kinds';
import { ALL_SEVERITIES } from '../../severity';

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

export interface ListingSelection {
  view: ViewState;
  /** Los filtros EFECTIVOS (con el valor por defecto aplicado). */
  filters: SeoFilters;
  /** La URL no nombra gravedad ni tipo: la vista por defecto oculta lo informativo. */
  defaulted: boolean;
  /**
   * Los filtros ESCRITOS en la URL: sin gravedad si la URL no la nombra (aunque una vista de
   * inventario enseñe todas), para que los enlaces no conviertan lo implícito en explícito.
   */
  written: SeoFilters;
  /** Las entradas (página + idioma) que cumplen los filtros. */
  matching: SeoPage[];
  /** Esas páginas con TODOS sus idiomas: lo que enseñan las vistas por página, matriz y «Qué tiene». */
  selected: SeoPage[];
  /** «Por idioma» cuenta y enseña entradas; las demás vistas, páginas. */
  byEntry: boolean;
  /** Las gravedades que se ven; sin gravedad en la URL (solo tipos) se ven todas y es `undefined`. */
  severities: IssueSeverity[] | undefined;
}

/**
 * Qué páginas elige la URL de la tabla. Es la única fuente: la tabla y el informe «Copiar para la IA»
 * parten de aquí, así lo que se copia es exactamente lo que se ve.
 *
 * Los filtros eligen PÁGINAS (una entrada que los cumple basta). La matriz y «Qué tiene» son
 * inventario, no lista de problemas: sin filtros en la URL enseñan todas las páginas. Con el «error +
 * aviso» por defecto, una página limpia sin schema propio desaparecería justo de la vista que sirve
 * para encontrarla.
 */
/** Las vistas de inventario (matriz, «Qué tiene») listan todas las páginas, no solo las con problemas. */
export function isInventoryView(view: SeoView): boolean {
  return view === SeoView.MATRIX || view === SeoView.HAVE;
}

export function selectListing(tree: SeoTree, params: URLSearchParams): ListingSelection {
  const view = parseView(params);
  const parsed = filtersFromUrl(withoutAllKinds(params, tree));
  const inventory = isInventoryView(view.view);
  const { filters, defaulted } =
    inventory && parsed.defaulted
      ? { filters: { ...parsed.filters, severities: [...ALL_SEVERITIES] }, defaulted: false }
      : parsed;
  const matching = filterPages(tree, filters);
  const slugs = new Set(matching.map((entry) => entry.slug));
  return {
    view,
    filters,
    defaulted,
    written: parsed.defaulted ? { ...filters, severities: [] } : filters,
    matching,
    selected: tree.pages.filter((entry) => slugs.has(entry.slug)),
    byEntry: view.view === SeoView.LOCALE,
    severities: filters.severities.length > 0 ? filters.severities : undefined,
  };
}
