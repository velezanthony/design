import type { Locale } from '../../i18n/locale';
import { IssueKind, IssueSeverity } from '../tree/types';

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

/** Inversa de `parseFilters`: solo emite lo que filtra, en un orden estable. */
export function serializeFilters(filters: SeoFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const kind of filters.kinds) params.append('kind', kind);
  for (const severity of filters.severities) params.append('severity', severity);
  for (const locale of filters.locales) params.append('locale', locale);
  if (filters.text !== '') params.set('q', filters.text);
  return params;
}
