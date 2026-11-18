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
const values = (params: URLSearchParams, name: string) => [
  ...new Set(params.getAll(name).filter((value) => value !== '')),
];

/**
 * Filtros desde la query de la URL. Lo que no se reconoce se ignora en vez de fallar: la URL la
 * puede haber escrito (o estropeado) cualquiera. Los idiomas no se validan aquí porque este módulo
 * no conoce la config; un idioma inexistente simplemente no filtra a nadie.
 */
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

/**
 * Página de la tabla: un entero ≥ 1; lo que no lo sea (vacío, texto, 0, negativo, decimal) es la
 * 1. No vive en `SeoFilters` a propósito: así cualquier enlace que se forma desde los filtros
 * (cambiar la gravedad, «mostrar también lo informativo») vuelve a la página 1 sin acordarse de
 * reiniciarla. Que la pasada del final se acote lo decide `paginate`, que conoce el total.
 */
export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page') ?? '';
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : 1;
}

/**
 * Filas por página: solo valen los tamaños de `PAGE_SIZES`; cualquier otra cosa (vacío, texto,
 * un número que no se ofrece) es el de por defecto. Como `page`, no vive en `SeoFilters`: los
 * enlaces que se forman desde los filtros lo pasan aparte para conservarlo, y el formulario lo
 * envía como un campo más, así cambiarlo reinicia la página (el formulario no lleva `page`).
 */
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

/**
 * Vista de la tabla desde la query. Un valor que no se reconoce es la vista por página, igual que
 * ningún valor: la URL la puede haber escrito cualquiera. `lacks` solo significa algo en «Qué
 * tiene», así que en las demás vistas se descarta. Como `page`, no vive en `SeoFilters`: no filtra
 * qué páginas hay, cambia cómo se ven.
 */
export function parseView(params: URLSearchParams): ViewState {
  const asked = params.get('view') ?? '';
  const view = VIEWS.find((candidate): candidate is SeoView => candidate === asked) ?? SeoView.PAGE;
  const lacks = params.get('lacks') ?? '';
  const column = HAVE_COLUMNS.find((candidate): candidate is HaveColumn => candidate === lacks);
  return view === SeoView.HAVE && column ? { view, lacks: column } : { view };
}

/**
 * Inversa de `parseFilters`, `parsePage`, `parsePerPage` y `parseView`: solo emite lo que filtra, en
 * un orden estable. La página 1, el tamaño por defecto y la vista por página no se escriben, para
 * que la URL canónica de la tabla no cambie.
 */
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

/**
 * Los filtros como pares nombre/valor, listos para campos ocultos de un formulario GET que no es el
 * de filtros (el selector de filas por página). Sale de `serializeFilters`, no de una copia de sus
 * reglas, así la URL que envía ese formulario es la canónica. Lleva también la vista: cambiar el
 * tamaño no debe devolver a «Por página». Sin página ni tamaño: quien envía el
 * formulario pone el suyo, y no llevar `page` es lo que lo devuelve a la primera.
 */
export function filterFields(
  filters: SeoFilters,
  view?: ViewState,
): { name: string; value: string }[] {
  return [...serializeFilters(filters, 1, PAGE_SIZE, view).entries()].map(([name, value]) => ({
    name,
    value,
  }));
}

/**
 * Filtros EFECTIVOS de la tabla. `parseFilters` sigue siendo un lector fiel de la URL; este paso
 * aparte decide el valor por defecto: si la URL no nombra ninguna gravedad ni ningún tipo, la
 * tabla parte de error + aviso, porque casi todas las páginas tienen la incidencia informativa
 * «descripción heredada» y ahogaría los avisos reales. En cuanto la URL nombra una gravedad o un
 * tipo manda lo escrito (un tipo informativo debe verse tal cual), y «todo» se pide con las tres
 * gravedades. Así ninguna URL es ambigua: la misma query da siempre la misma vista, y el
 * formulario (cuyas casillas reflejan estos filtros) reenvía exactamente lo que se ve.
 * `defaulted` avisa a la UI de que hay información oculta, para ofrecer mostrarla.
 */
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
