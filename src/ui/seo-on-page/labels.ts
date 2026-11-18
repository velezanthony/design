import type { HaveCell, HaveState } from '../../core/seo-on-page/pages/listing/have';
import type { HreflangState, MatrixState } from '../../core/seo-on-page/pages/listing/matrix';
import type { ListingTable } from '../../core/seo-on-page/pages/listing/model';
import type { LocaleTone, PageTag } from '../../core/seo-on-page/pages/listing/rows';
import type { HaveColumn, SeoView } from '../../core/seo-on-page/queries/url-filters';
import type {
  DescriptionSource,
  IssueKind,
  IssueSeverity,
} from '../../core/seo-on-page/tree/types';

/* Datos de presentación del panel (textos y tonos), no un componente: por eso vive en la raíz de
   `seo-on-page/` y no en un nivel atómico. Lo consumen átomos, moléculas, organismos y el contenedor.
   El panel es una herramienta de desarrollo en español: no pasa por el catálogo de textos de la
   interfaz (que es de las páginas del sitio, por idioma). Todo su texto de dominio vive aquí. */

export const KIND_LABELS: Record<IssueKind, string> = {
  'title-too-long': 'Título demasiado largo',
  'title-too-short': 'Título demasiado corto',
  'description-missing': 'Sin descripción',
  'description-inherited': 'Descripción heredada del sitio',
  'description-too-long': 'Descripción demasiado larga',
  'description-too-short': 'Descripción demasiado corta',
  'duplicate-title': 'Título duplicado',
  'duplicate-description': 'Descripción duplicada',
  'no-h1': 'Sin H1',
  'multiple-h1': 'Varios H1',
  'heading-skip': 'Salto de encabezados',
  'translation-missing': 'Traducción ausente',
  'translation-policy-conflict': 'Políticas de traducción en conflicto',
};

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  error: 'Error',
  warning: 'Aviso',
  info: 'Info',
};

/** Texto de la gravedad en plural, para los contadores de la vista general. */
export const SEVERITY_PLURALS: Record<IssueSeverity, string> = {
  error: 'Errores',
  warning: 'Avisos',
  info: 'Informativos',
};

/** El tono (de `Tag`) con el que se pinta cada gravedad: rojo, ámbar y apagado. */
export const SEVERITY_TONES = {
  error: 'danger',
  warning: 'wip',
  info: 'neutral',
} as const satisfies Record<IssueSeverity, 'danger' | 'wip' | 'neutral'>;

export const DESCRIPTION_SOURCE_LABELS: Record<DescriptionSource, string> = {
  page: 'De la página',
  site: 'Heredada del sitio',
  none: 'Sin descripción',
};

/** La portada tiene slug vacío; en pantalla se enseña como la raíz. */
export const slugLabel = (slug: string) => (slug === '' ? '/' : slug);

/** Los textos de la paginación de la tabla: el componente es genérico y el idioma lo pone el panel. */
export const PAGINATION_LABELS = {
  nav: 'Paginación de la tabla',
  previous: '← Anterior',
  next: 'Siguiente →',
  page: (number: number) => `Página ${number}`,
};

export const PANEL_NAME = 'SEO on page';

/** Las pantallas del panel, para su navegación y su `<title>`. */
export const SCREEN_LABELS = {
  overview: 'Resumen',
  pages: 'Páginas',
} as const;

/**
 * Las secciones del inspector: el `id` de cada encabezado y su texto, en el orden de la página. Es la
 * única fuente: el inspector pinta de aquí sus encabezados y el panel construye con ellos «En esta
 * página», así no pueden desincronizarse.
 */
export const INSPECTOR_SECTIONS = {
  published: 'Lo que se publica',
  previews: 'Vistas previas',
  issues: 'Problemas',
  schemas: 'Schemas (JSON-LD)',
  outline: 'Encabezados',
  translations: 'Traducciones',
} as const;

/** Las etiquetas de una página en la tabla; «Solo EN» lleva el idioma en el que sí existe. */
export const tagLabel = (tag: PageTag): string =>
  ({
    home: 'Portada',
    only: `Solo ${tag.kind === 'only' ? tag.locale.toUpperCase() : ''}`,
    external: 'Externa',
    noindex: 'noindex',
  })[tag.kind];

/** Ayuda al ratón de las etiquetas que no se explican solas. */
export const TAG_HINTS: Partial<Record<PageTag['kind'], string>> = {
  external: 'Generada desde un fichero fuera de las docs',
  noindex: 'Los buscadores no deben indexarla',
};

/** Texto (oculto) de la insignia de idioma: el color y el glifo solos no bastan. */
export const LOCALE_TONE_LABELS: Record<LocaleTone, string> = {
  error: 'error',
  warning: 'aviso',
  info: 'informativo',
  ok: 'sin problemas',
  missing: 'no existe',
};

/** Textos de la barra de longitud: «corto» y «largo» van en palabras, no solo en color. */
export const METER_LABELS = {
  short: 'corto',
  long: 'largo',
  /** Lo que lee un lector de pantalla: «21 de 60 caracteres». */
  reading: (value: number, max: number) => `${value} de ${max} caracteres`,
  min: (min: number) => `mínimo ${min}`,
  max: (max: number) => `máximo ${max}`,
};

/** El desplegable «Tipo de problema»: el resumen cambia en vivo con `client/forms/kinds-all.ts`. */
export const KINDS_LABELS = {
  summary: 'Tipo de problema',
  all: 'Todos',
  withIssues: 'Con incidencias',
  without: (count: number) => `Sin incidencias (${count})`,
  /** Plantillas del resumen del título; el cliente rellena `{on}` y `{total}`. */
  countAll: '· todos',
  countSome: '· {on} de {total}',
};

/** Textos de la tabla de páginas agrupada. */
export const PAGES_TABLE_LABELS = {
  empty: 'Ninguna página cumple los filtros.',
  caption: 'Páginas, una fila por página, ordenadas por gravedad',
  detail: 'Detalle por idioma',
  noOwnIssues: 'Nada propio',
  inspect: 'Inspeccionar',
  missingLocale: (locale: string) => `No hay versión en ${locale.toUpperCase()}.`,
  description: 'Descripción',
  title: 'Título',
  issues: 'Problemas',
};

/** El aviso de lo que comparten todas las páginas filtradas. */
export const COMMON_ISSUE_LABELS = {
  region: 'Común a todas las páginas',
  affects: (pages: number, entries: number) =>
    `Afecta a ${pages === 1 ? 'la' : 'las'} ${pages} ${pages === 1 ? 'página' : 'páginas'} (${entries} ${entries === 1 ? 'entrada' : 'entradas'})`,
  why: 'así que no se repite en cada fila: así se ven las diferencias entre páginas.',
  fix: 'Cómo arreglarlo',
  overview: 'Ver en la vista general',
};

/** Una marca de celda (matriz, «Qué tiene»): glifo + palabra, que el color solo no basta. `tone` es el de `Tag`. */
interface MarkLabel {
  glyph: string;
  text: string;
  tone: 'neutral' | 'accent' | 'faint' | 'live' | 'wip' | 'danger';
}

/** Las vistas de la tabla: el nombre de cada una en el selector y la frase que abre la pantalla. */
export const VIEW_LABELS: Record<SeoView, { name: string; lede: string }> = {
  page: {
    name: 'Por página',
    lede: 'Ordenadas por gravedad. Despliega una fila para ver cada idioma.',
  },
  locale: {
    name: 'Por idioma',
    lede: 'Una fila por página y idioma, ordenadas por gravedad.',
  },
  matrix: {
    name: 'Matriz de idiomas',
    lede: 'En qué idiomas existe cada página y cómo se anuncian a los buscadores.',
  },
  have: {
    name: 'Qué tiene',
    lede: 'Qué tiene cada página de lo suyo y qué hereda del sitio.',
  },
};

/** El selector de vista. */
export const VIEW_SWITCH_LABELS = { group: 'Vista' };

/** La barra de filtros. */
export const FILTER_LABELS = {
  form: 'Filtrar páginas',
  search: 'Buscar por slug o título',
  placeholder: 'slug o título',
  severity: 'Gravedad',
  locale: 'Idioma',
  apply: 'Filtrar',
  clear: 'Limpiar',
};

const pagesOf = (count: number) => `${count} ${count === 1 ? 'página' : 'páginas'}`;

/** Lo que falta, dicho tras «sin»: la frase de cada columna de «Qué tiene». */
const LACKS_PHRASES: Record<HaveColumn, string> = {
  desc: 'descripción propia',
  schema: 'schema propio',
  og: 'imagen OG propia',
  h1: 'un H1 único',
  i18n: 'todas las traducciones',
  index: 'indexación',
};

/** El recuento sobre la tabla: cuenta filas de la vista y dice qué son (páginas o entradas). */
export function headCount(table: ListingTable, total: number): string {
  switch (table.view) {
    case 'locale':
      return `${total} ${total === 1 ? 'entrada' : 'entradas'} página + idioma`;
    case 'matrix':
      return `${pagesOf(total)} × ${table.locales.length} idiomas · ${table.complete} ${table.complete === 1 ? 'completa' : 'completas'}`;
    case 'have':
      return table.lacks ? `${pagesOf(total)} sin ${LACKS_PHRASES[table.lacks]}` : pagesOf(total);
    case 'page':
      return pagesOf(total);
  }
}

/** Lo que cuentan las filas del pie: entradas en «Por idioma», páginas en el resto. */
export const rowsUnit = (view: SeoView) => (view === 'locale' ? 'entradas' : 'páginas');

/** La tabla «Por idioma». */
export const ENTRIES_TABLE_LABELS = {
  caption: 'Páginas, una fila por idioma, ordenadas por gravedad',
  page: 'Página',
  locale: 'Idioma',
  title: 'Título',
  description: 'Descripción',
  issues: 'Problemas',
  noOwnIssues: 'Nada propio',
  recommendation:
    'Barras de longitud: recomendación (heurística), no regla de Google · la marca es el mínimo',
};

/** La matriz de idiomas. */
export const MATRIX_LABELS = {
  caption: 'Matriz de traducciones: una fila por página, una columna por idioma',
  page: 'Página',
  hreflang: 'hreflang',
  xDefault: 'x-default',
  states: {
    exists: { glyph: '✓', text: 'sí', tone: 'live' },
    missing: { glyph: '✕', text: 'falta', tone: 'wip' },
    fallback: { glyph: '↺', text: 'respaldo', tone: 'neutral' },
    omitted: { glyph: '–', text: 'omitida por política', tone: 'faint' },
  } satisfies Record<MatrixState, MarkLabel>,
  hreflangStates: {
    reciprocal: { glyph: '✓', text: 'recíproco', tone: 'live' },
    unpaired: { glyph: '–', text: 'sin par', tone: 'faint' },
    omitted: { glyph: '–', text: 'omitido (noindex)', tone: 'faint' },
  } satisfies Record<HreflangState, MarkLabel>,
  none: '–',
  legendLabel: 'Leyenda',
  legend: [
    { state: 'exists', text: 'existe' },
    { state: 'missing', text: 'falta (no hay fichero)' },
    { state: 'fallback', text: 'respaldo (se sirve otro idioma)' },
    { state: 'omitted', text: 'omitida por política (intencionado)' },
  ] satisfies { state: MatrixState; text: string }[],
  note: 'hreflang solo cuenta si es recíproco: cada versión enlaza a sí misma y a las demás. «Sin par» no es un fallo cuando la falta es intencionada.',
};

/** «Qué tiene». */
export const HAVE_LABELS = {
  caption: 'Qué tiene cada página: descripción, schema, imagen OG, H1, traducción e indexación',
  page: 'Página',
  why: 'Pulsa una columna para quedarte solo con las páginas que no lo tienen propio.',
  pressed: 'solo sin ello ✕',
  /** `own` es «propio» con el género de la columna; sin él, la columna es un sí o no. */
  columns: {
    desc: { name: 'Descripción', own: 'propia' },
    schema: { name: 'Schema', own: 'propio' },
    og: { name: 'Imagen OG', own: 'propia' },
    h1: { name: 'H1 único' },
    i18n: { name: 'Traducida' },
    index: { name: 'Indexable' },
  } as Record<HaveColumn, { name: string; own?: string }>,
  /** «3/38 propia»; las columnas de sí o no, solo «37/38». */
  count: (column: HaveColumn, good: number, total: number) => {
    const { own } = HAVE_LABELS.columns[column];
    return `${good}/${total}${own ? ` ${own}` : ''}`;
  },
  states: {
    own: { glyph: '●', text: 'propio', tone: 'accent' },
    site: { glyph: '○', text: 'del sitio', tone: 'neutral' },
    missing: { glyph: '✕', text: 'falta', tone: 'wip' },
    partial: { glyph: '↺', text: 'respaldo', tone: 'neutral' },
    ok: { glyph: '✓', text: 'sí', tone: 'live' },
    no: { glyph: '⊘', text: 'noindex', tone: 'wip' },
  } satisfies Record<HaveState, MarkLabel>,
  legendLabel: 'Leyenda',
  legend: [
    { state: 'own', text: 'propio de la página' },
    { state: 'site', text: 'heredado del sitio' },
    { state: 'missing', text: 'falta' },
    { state: 'partial', text: 'respaldo' },
    { state: 'ok', text: 'cumple' },
  ] satisfies { state: HaveState; text: string }[],
  note: '«Del sitio» no es un fallo: es lo que se publica si la página no dice nada. Esta vista sirve para decidir a cuáles merece la pena darles lo suyo, empezando por las de entrada (portada, guías).',
};

/**
 * Lo que dice una celda de «Qué tiene»: la palabra del estado, con su detalle si lo hay («falta es»,
 * «respaldo es», el tipo del schema propio) y, si el estado es «propio» y no hay detalle, con el
 * género de la columna («propia», «propio»).
 */
export function haveCellText(column: HaveColumn, cell: HaveCell): string {
  const { state, detail } = cell;
  if (state === 'own')
    return detail ?? HAVE_LABELS.columns[column].own ?? HAVE_LABELS.states.ok.text;
  const word = HAVE_LABELS.states[state].text;
  return detail ? `${word} ${detail}` : word;
}
