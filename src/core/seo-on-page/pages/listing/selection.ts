import { filterPages, withoutNoindex } from '../../queries/filter';
import {
  filtersFromUrl,
  parseFilters,
  parseView,
  SeoView,
  type SeoFilters,
  type ViewState,
} from '../../queries/url-filters';
import type { IssueSeverity, SeoPage, SeoTree } from '../../tree/types';
import { kindsWithIssues } from './kinds';
import { ALL_SEVERITIES } from '../../severity';
import { slugsOf } from '../../tree/keys';

/** Sin esto, enviar el formulario sin tocar nada fijaría una lista y dejaría la vista por defecto; sin incidencias se respeta lo escrito. */
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
  /** Filtros escritos en la URL: sin gravedad si no la nombra, para no volver explícito lo implícito. */
  written: SeoFilters;
  /** El árbol que se ve: sin las noindex si se ocultan. Recuentos, tipos y total salen de él. */
  visible: SeoTree;
  /** Las entradas (página + idioma) que cumplen los filtros. */
  matching: SeoPage[];
  /** Esas páginas con TODOS sus idiomas: lo que enseñan las vistas por página, matriz y «Qué tiene». */
  selected: SeoPage[];
  /** «Por idioma» cuenta y enseña entradas; las demás vistas, páginas. */
  byEntry: boolean;
  /** Las gravedades que se ven; sin gravedad en la URL (solo tipos) se ven todas y es `undefined`. */
  severities: IssueSeverity[] | undefined;
}

/** Fuente única de la tabla y del informe «Copiar para la IA»; matriz y «Qué tiene» son inventario: sin filtros enseñan todas las páginas. */
/** Las vistas de inventario (matriz, «Qué tiene») listan todas las páginas, no solo las con problemas. */
export function isInventoryView(view: SeoView): boolean {
  return view === SeoView.MATRIX || view === SeoView.HAVE;
}

export function selectListing(tree: SeoTree, params: URLSearchParams): ListingSelection {
  const view = parseView(params);
  // Los tipos disponibles son los del árbol que se ve: ocultar las noindex puede quitar alguno.
  const visible = withoutNoindex(tree, parseFilters(params));
  const parsed = filtersFromUrl(withoutAllKinds(params, visible));
  const inventory = isInventoryView(view.view);
  const { filters, defaulted } =
    inventory && parsed.defaulted
      ? { filters: { ...parsed.filters, severities: [...ALL_SEVERITIES] }, defaulted: false }
      : parsed;
  const matching = filterPages(visible, filters);
  const slugs = slugsOf(matching);
  return {
    view,
    filters,
    defaulted,
    written: parsed.defaulted ? { ...filters, severities: [] } : filters,
    visible,
    matching,
    selected: visible.pages.filter((entry) => slugs.has(entry.slug)),
    byEntry: view.view === SeoView.LOCALE,
    severities: filters.severities.length > 0 ? filters.severities : undefined,
  };
}
