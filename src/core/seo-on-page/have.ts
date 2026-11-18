import type { Locale } from '../i18n/locale';
import { HaveColumn } from './queries/url-filters';
import { schemaTypes } from './tree/keys';
import { localeCells } from './tree/locale-cells';
import { IssueKind, type SeoPage } from './tree/types';

/** `site` es lo heredado del sitio (no es fallo), `partial` se cubre con respaldo y `no` es una exclusión (noindex). */
export type HaveState = 'own' | 'site' | 'missing' | 'partial' | 'ok' | 'no';

export interface HaveCell {
  state: HaveState;
  /** Lo que acompaña al estado: el tipo del schema propio o los idiomas que faltan / se sirven de respaldo. */
  detail?: string;
}

/** Lo que falta, dicho tras «sin»: la frase de cada columna de «Qué tiene» (la del recuento y la del informe). */
export const LACKS_PHRASES: Record<HaveColumn, string> = {
  desc: 'descripción propia',
  schema: 'schema propio',
  og: 'imagen OG propia',
  h1: 'un H1 único',
  i18n: 'todas las traducciones',
  index: 'indexación',
};

/** Lo que cuenta como «lo tiene»: lo propio y lo que cumple. Lo heredado no: es justo lo que se busca. */
const GOOD: readonly HaveState[] = ['own', 'ok'];

function fromSource(source: 'page' | 'site' | 'none'): HaveCell {
  return {
    state: { page: 'own', site: 'site', none: 'missing' }[source] as HaveState,
  };
}

function schemaOf(entry: SeoPage): HaveCell {
  const own = entry.schemas.filter(({ source }) => source === 'page');
  if (own.length > 0) {
    const types = schemaTypes(own);
    return { state: 'own', detail: types.join(', ') };
  }
  return { state: entry.schemas.length > 0 ? 'site' : 'missing' };
}

function translatedOf(entry: SeoPage, locales: readonly Locale[]): HaveCell {
  const cells = localeCells(entry.locales, locales);
  function where(state: 'missing' | 'fallback') {
    return cells
      .filter((cell) => cell.state === state)
      .map(({ locale }) => locale)
      .join(' ');
  }
  if (cells.some(({ state }) => state === 'missing')) {
    return { state: 'missing', detail: where('missing') };
  }
  if (cells.some(({ state }) => state === 'fallback')) {
    return { state: 'partial', detail: where('fallback') };
  }
  return { state: 'ok' };
}

/** La celda de cada columna para UNA entrada; la página junta las de sus idiomas con `worstCell`. */
export const HAVE_CELLS: Record<
  HaveColumn,
  (entry: SeoPage, locales: readonly Locale[]) => HaveCell
> = {
  [HaveColumn.DESCRIPTION]: (entry) => fromSource(entry.meta.descriptionSource),
  [HaveColumn.SCHEMA]: schemaOf,
  [HaveColumn.OG_IMAGE]: (entry) => fromSource(entry.meta.ogImageSource),
  // El análisis ya sabe si hay un solo H1 (también en las páginas externas): se reutiliza.
  [HaveColumn.H1]: (entry) => ({
    state: entry.issues.some(
      ({ kind }) => kind === IssueKind.NO_H1 || kind === IssueKind.MULTIPLE_H1,
    )
      ? 'missing'
      : 'ok',
  }),
  [HaveColumn.TRANSLATED]: translatedOf,
  [HaveColumn.INDEXABLE]: (entry) => ({ state: entry.meta.noindex ? 'no' : 'ok' }),
};

/** Si una celda cuenta como «lo tiene» (propio o cumple); lo heredado no. */
export function isGood(cell: HaveCell): boolean {
  return GOOD.includes(cell.state);
}
