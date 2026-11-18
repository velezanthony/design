import type { Locale } from '../../i18n/locale';
import { IssueKind, IssueSeverity } from '../tree/types';
import { PAGE_SIZE, PAGE_SIZES } from './paginate';
import { ACTIONABLE_SEVERITIES } from '../severity';

/** Filtros de la tabla. Vacío = sin restricción; los distintos campos se combinan con Y. */
export interface SeoFilters {
  kinds: IssueKind[];
  severities: IssueSeverity[];
  locales: Locale[];
  text: string;
}

export const EMPTY_FILTERS: SeoFilters = { kinds: [], severities: [], locales: [], text: '' };

const KINDS: readonly string[] = Object.values(IssueKind);
const SEVERITIES: readonly string[] = Object.values(IssueSeverity);

/** Valores repetidos de un parámetro, sin vacíos ni duplicados y en su orden de aparición. */
function values(params: URLSearchParams, name: string) {
  return [...new Set(params.getAll(name).filter((value) => value !== ''))];
}

/** Lo no reconocido se ignora: la URL la puede escribir cualquiera; los idiomas no se validan aquí (no conoce la config). */
export function parseFilters(params: URLSearchParams): SeoFilters {
  return {
    kinds: values(params, 'kind').filter((value): value is IssueKind => KINDS.includes(value)),
    severities: values(params, 'severity').filter((value): value is IssueSeverity =>
      SEVERITIES.includes(value),
    ),
    locales: values(params, 'locale'),
    text: params.get('q') ?? '',
  };
}

/** Entero ≥ 1, o la 1. No vive en `SeoFilters` para que cambiar un filtro vuelva a la página 1; `paginate` acota el final. */
export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page') ?? '';
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : 1;
}

/** Solo valen los tamaños de `PAGE_SIZES`. No vive en `SeoFilters`: cambiarlo reinicia la página. */
export function parsePerPage(params: URLSearchParams): number {
  const size = PAGE_SIZES.find((candidate) => String(candidate) === params.get('per'));
  return size ?? PAGE_SIZE;
}

/** Las formas de ver la tabla: una fila por página, por idioma, la matriz de idiomas o «Qué tiene». */
export const SeoView = { PAGE: 'page', LOCALE: 'locale', MATRIX: 'matrix', HAVE: 'have' } as const;
export type SeoView = (typeof SeoView)[keyof typeof SeoView];

/** Las columnas de «Qué tiene»; su clave va a la URL en `lacks`. */
export const HaveColumn = {
  DESCRIPTION: 'desc',
  SCHEMA: 'schema',
  OG_IMAGE: 'og',
  H1: 'h1',
  TRANSLATED: 'i18n',
  INDEXABLE: 'index',
} as const;
export type HaveColumn = (typeof HaveColumn)[keyof typeof HaveColumn];

const VIEWS: readonly string[] = Object.values(SeoView);
const HAVE_COLUMNS: readonly string[] = Object.values(HaveColumn);

/** La vista de la tabla y, en «Qué tiene», la columna por la que quedarse solo con lo que le falta. */
export interface ViewState {
  view: SeoView;
  lacks?: HaveColumn;
}

/** Valor desconocido es la vista por página; `lacks` solo vale en «Qué tiene». No vive en `SeoFilters`: no filtra, cambia cómo se ve. */
export function parseView(params: URLSearchParams): ViewState {
  const asked = params.get('view') ?? '';
  const view = VIEWS.find((candidate): candidate is SeoView => candidate === asked) ?? SeoView.PAGE;
  const lacks = params.get('lacks') ?? '';
  const column = HAVE_COLUMNS.find((candidate): candidate is HaveColumn => candidate === lacks);
  return view === SeoView.HAVE && column ? { view, lacks: column } : { view };
}

/** Inversa de los `parse*`: solo emite lo que filtra, en orden estable; página 1, tamaño y vista por defecto no se escriben. */
export function serializeFilters(
  filters: SeoFilters,
  page = 1,
  perPage: number = PAGE_SIZE,
  view: ViewState = { view: SeoView.PAGE },
): URLSearchParams {
  const params = new URLSearchParams();
  for (const kind of filters.kinds) params.append('kind', kind);
  for (const severity of filters.severities) params.append('severity', severity);
  for (const locale of filters.locales) params.append('locale', locale);
  if (filters.text !== '') params.set('q', filters.text);
  if (view.view !== SeoView.PAGE) params.set('view', view.view);
  if (view.view === SeoView.HAVE && view.lacks) params.set('lacks', view.lacks);
  if (page > 1) params.set('page', String(page));
  if (perPage !== PAGE_SIZE && PAGE_SIZES.some((size) => size === perPage)) {
    params.set('per', String(perPage));
  }
  return params;
}

/** Pares para campos ocultos del selector de filas, salidos de `serializeFilters` para ser canónicos; con vista, sin página ni tamaño. */
export function filterFields(
  filters: SeoFilters,
  view?: ViewState,
): { name: string; value: string }[] {
  return [...serializeFilters(filters, 1, PAGE_SIZE, view).entries()].map(([name, value]) => ({
    name,
    value,
  }));
}

/** Por defecto (sin gravedad ni tipo en la URL) parte de error + aviso: la informativa «descripción heredada» ahogaría los avisos reales; `defaulted` avisa a la UI. */
export function filtersFromUrl(params: URLSearchParams): {
  filters: SeoFilters;
  defaulted: boolean;
} {
  const filters = parseFilters(params);
  const defaulted = filters.severities.length === 0 && filters.kinds.length === 0;
  return {
    filters: defaulted ? { ...filters, severities: [...ACTIONABLE_SEVERITIES] } : filters,
    defaulted,
  };
}
