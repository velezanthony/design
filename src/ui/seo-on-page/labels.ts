import type { LengthClass } from '../../core/seo-on-page/pages/inspector/compare';
import type { HeadingProblem } from '../../core/seo-on-page/queries/heading-counts';
import type { Certainty } from '../../core/seo-on-page/certainty';
import type { SiteFile, SiteFileId, SiteFileState } from '../../core/seo-on-page/site-files';
import {
  LACKS_PHRASES,
  type HaveCell,
  type HaveState,
} from '../../core/seo-on-page/pages/listing/have';
import type { HreflangState, MatrixState } from '../../core/seo-on-page/pages/listing/matrix';
import type { ListingTable } from '../../core/seo-on-page/pages/listing/model';
import type { LocaleTone, PageTag } from '../../core/seo-on-page/pages/listing/rows';
import type {
  HaveColumn,
  SeoFilters,
  SeoView,
  ViewState,
} from '../../core/seo-on-page/queries/url-filters';
import type {
  DescriptionSource,
  IssueKind,
  IssueSeverity,
} from '../../core/seo-on-page/tree/types';
import { listOf, plural } from '../../core/shared/text';

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
  'canonical-mismatch': 'Canonical a otro idioma',
  'link-to-noindex': 'Enlace a página noindex',
  'orphan-page': 'Página huérfana',
  'image-alt-missing': 'Imagen sin texto alternativo',
  'og-image-size': 'Imagen social fuera de 1200×630',
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
  issues: 'Qué arreglar',
  published: 'Lo que se publica',
  translations: 'Traducciones',
  schemas: 'Schemas (JSON-LD)',
  outline: 'Encabezados',
} as const;

export type InspectorSection = keyof typeof INSPECTOR_SECTIONS;

/** La línea de «por qué importa» bajo el título de cada sección del inspector. */
export const INSPECTOR_WHY: Record<InspectorSection, string> = {
  issues: 'Lo que este idioma de la página necesita, de más a menos grave.',
  published: 'Lo que leen Google y las redes; a la derecha, cómo lo enseñan.',
  translations:
    'Cada idioma compite por separado en Google: compara campo a campo. Se marca lo que difiere de forma sospechosa.',
  schemas:
    'Qué dice la página de sí misma a los buscadores. Plegado: casi siempre basta con el tipo.',
  outline:
    'Un H1 y sin saltos de nivel: así entienden la estructura los buscadores y los lectores de pantalla.',
};

/** El texto del enlace de «En esta página» de una sección: con el recuento donde lo hay. */
export const inspectorTocText = (section: InspectorSection, count?: number): string =>
  count === undefined ? INSPECTOR_SECTIONS[section] : `${INSPECTOR_SECTIONS[section]} (${count})`;

/** La cabecera de estado del inspector. */
export const INSPECTOR_HEADER_LABELS = {
  back: '← Todas las páginas',
  kicker: 'Inspector',
  localeSwitch: 'Idioma',
  counts: 'Problemas en este idioma',
  /** «1 aviso», «2 errores», «3 info»: la gravedad en palabras, con su recuento. */
  count: (severity: IssueSeverity, count: number) =>
    ({
      error: plural(count, 'error', 'errores'),
      warning: plural(count, 'aviso', 'avisos'),
      info: `${count} info`,
    })[severity],
  indexable: 'Indexable',
  noindex: 'noindex',
  inAll: (total: number) => `En los ${total} idiomas`,
  only: (locales: readonly string[]) => `Solo ${locales.map((l) => l.toUpperCase()).join(', ')}`,
  live: 'Abrir la página real',
  edit: 'Editar el fichero',
};

/** «Qué arreglar»: las filas de cada problema. */
export const FIX_LABELS = {
  empty: 'Nada que arreglar en este idioma.',
  fix: 'Arreglo',
  limit: 'Límite',
  verify: 'Verificar',
  with: 'Con:',
  /** El rango recomendado: «70–160 caracteres, ≈920 px». */
  range: (limit: { min: number; max: number; maxPx: number }) =>
    `${limit.min}–${limit.max} caracteres, ≈${limit.maxPx} px`,
  /** Los límites son una heurística, no una regla de Google: se dice con esta etiqueta. */
  recommendation: 'recomendación',
  recommendationHint: 'Google no fija este límite: recorta según el ancho',
};

/** «Lo que se publica». */
export const PUBLISHED_LABELS = {
  title: '<title>',
  description: 'Descripción',
  canonical: 'Canonical',
  noindex: 'Noindex',
  file: 'Fichero',
  noDescription: '—',
  /** El ancho es una estimación con la tabla de Arial: se dice siempre. */
  width: (px: number, max: number) => `≈${px}/${max} px`,
  widthHint: 'Ancho estimado con una fuente tipo Arial, no medido',
  indexed: 'No · en el sitemap',
  notIndexed: 'Sí · fuera del sitemap',
  serp: 'Resultado de búsqueda',
  og: 'Open Graph',
};

/** «Traducciones»: la tabla de comparación. */
export const COMPARE_LABELS = {
  caption: 'Comparación de campos entre los idiomas de la página',
  field: 'Campo',
  title: 'Título',
  length: 'Longitud',
  description: 'Descripción',
  descriptionLength: 'Longitud desc.',
  descriptionSource: 'Fuente desc.',
  issues: 'Problemas',
  differs: 'difiere',
  none: '—',
  noIssues: 'Sin problemas',
  /** Lo que dice la celda de longitud cuando difiere. */
  lengthNotes: {
    low: '(corto)',
    edge: '(al límite)',
    long: '(largo)',
    none: '(sin texto)',
    ok: '',
  } satisfies Record<LengthClass, string>,
  missing: (policy: string, declared: boolean) =>
    `Falta · política ${policy}${declared ? ' (declarada)' : ' (sin declarar)'}`,
  unknown: 'Sin datos',
};

/** «Schemas (JSON-LD)». */
export const SCHEMA_LABELS = {
  none: 'Esta página no declara ningún schema.',
  site: 'Del sitio',
  page: 'De la página',
  inPages: (pages: number) =>
    `en ${pages === 1 ? 'la' : 'las'} ${plural(pages, 'página', 'páginas')}`,
};

/** «Encabezados». */
export const HEADINGS_LABELS = {
  ok: '✓ Un H1 · sin saltos de nivel',
  empty: 'Sin encabezados.',
  counts: 'Encabezados por nivel',
  total: 'Total',
  outline: 'Esquema de encabezados',
  problem(problem: HeadingProblem): string {
    switch (problem.kind) {
      case 'no-h1':
        return 'Sin H1';
      case 'multiple-h1':
        return `${problem.count} H1: debería haber uno`;
      case 'skip':
        return `Salto de H${problem.from} a H${problem.to}`;
    }
  },
};

/** Las etiquetas de una página en la tabla; «Solo EN» lleva el idioma en el que sí existe. */
export const tagLabel = (tag: PageTag): string =>
  ({
    home: 'Portada',
    only: `Solo ${tag.kind === 'only' ? tag.locale.toUpperCase() : ''}`,
    fallback: `Respaldo ${tag.kind === 'fallback' ? tag.locales.map((locale) => locale.toUpperCase()).join(' ') : ''}`,
    external: 'Externa',
    client: 'Astro',
    replaces: 'Sustituye',
    noindex: 'noindex',
  })[tag.kind];

/** Ayuda al ratón de las etiquetas que no se explican solas. */
export const TAG_HINTS: Partial<Record<PageTag['kind'], string>> = {
  external: 'Generada desde un fichero fuera de las docs',
  client: 'Página del sitio en src/pages/, leída de lo que publica su <head>',
  replaces: 'Tu página de src/pages/ ocupa esta URL en lugar de la que generaría la librería',
  fallback: 'En esos idiomas no hay traducción: se sirve el texto del idioma por defecto',
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

/** El desplegable «Tipo de problema»: el resumen cambia en vivo con `client/seo-on-page/kinds-all.ts`. */
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
    `Afecta a ${pages === 1 ? 'la' : 'las'} ${plural(pages, 'página', 'páginas')} (${plural(entries, 'entrada', 'entradas')})`,
  why: 'así que no se repite en cada fila: así se ven las diferencias entre páginas.',
  fix: 'Cómo arreglarlo',
  overview: 'Ver en la vista general',
};

export const ROUTE_OVERRIDE_LABELS = {
  region: 'Rutas de la librería que sustituye el sitio',
  title: (count: number) => `Tu sitio sustituye ${plural(count, 'ruta', 'rutas')} de la librería`,
  why: 'Se publican sus páginas, y el panel analiza esas en lugar de las de la librería.',
  /** La ruta tal como se visita: `index` es `/`, `es/index` es `/es/`. */
  path: (route: string) => `/${route.replace(/(^|\/)index$/, '$1')}`,
};

export const CLIENT_FAILURE_LABELS = {
  region: 'Páginas de src/pages/ que no se pudieron leer',
  title: (count: number) =>
    count === 1
      ? '1 página de src/pages/ no se pudo leer'
      : `${count} páginas de src/pages/ no se pudieron leer`,
  why: 'No salen en el panel ni en el sitemap de dev hasta que se lean bien.',
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

/** El recuento sobre la tabla: cuenta filas de la vista y dice qué son (páginas o entradas). */
export function headCount(table: ListingTable, total: number): string {
  switch (table.view) {
    case 'locale':
      return `${plural(total, 'entrada', 'entradas')} página + idioma`;
    case 'matrix':
      return `${plural(total, 'página', 'páginas')} × ${table.locales.length} idiomas · ${plural(table.complete, 'completa', 'completas')}`;
    case 'have':
      return table.lacks
        ? `${plural(total, 'página', 'páginas')} sin ${LACKS_PHRASES[table.lacks]}`
        : plural(total, 'página', 'páginas');
    case 'page':
      return plural(total, 'página', 'páginas');
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

/** «en», «en y es», «en, es y fr». */

/** Un porcentaje con espacio duro: nunca queda el «%» solo en la línea siguiente. */
export const percentText = (percent: number) => `${percent}\u00a0%`;

/** La pantalla de Resumen: su frase de apertura, los indicadores y los títulos de cada tarjeta. */
export const OVERVIEW_LABELS = {
  lede: (siteName: string, pages: number, locales: readonly string[]) =>
    `${siteName} · ${plural(pages, 'página', 'páginas')} en ${listOf(locales)}. Comprobado al guardar.`,
  kpis: {
    region: 'Indicadores',
    health: {
      label: 'Salud',
      formula: (healthy: number, total: number) =>
        `${healthy} sin errores ni avisos ÷ ${plural(total, 'página', 'páginas')}`,
      note: 'Los informativos no la bajan: son mejoras, no fallos.',
    },
    pages: {
      label: 'Páginas',
      sub: (entries: number) => `${plural(entries, 'entrada', 'entradas')} página + idioma`,
    },
    locales: { label: 'Idiomas' },
    problems: {
      label: 'Con problemas',
      sub: (errors: number, warnings: number, entries: number) =>
        `${plural(errors, 'error', 'errores')} · ${warnings} con avisos (${plural(entries, 'entrada', 'entradas')})`,
    },
    info: {
      label: 'Informativas',
      none: 'ninguna',
      sub: (info: { pages: number; entries: number; kinds: IssueKind[] }, total: number) => {
        const [only] = info.kinds;
        const what =
          info.kinds.length === 1 && only
            ? KIND_LABELS[only].toLowerCase()
            : `${info.kinds.length} tipos`;
        const scope = info.pages === total ? 'todas' : `${info.pages} de ${total}`;
        return `${scope}: ${what} (${plural(info.entries, 'entrada', 'entradas')})`;
      },
    },
  },
};

/** Cada tarjeta: título y la línea de «por qué importa». */
export const CARD_LABELS = {
  fix: {
    title: 'Qué arreglar primero',
    why: 'Ordenado por gravedad y por cuántas páginas toca. Los avisos cambian cómo te ve Google; lo informativo es deuda.',
    empty: 'Nada que arreglar.',
    affects: (pages: number, percent: number, locales: readonly string[]) =>
      `${plural(pages, 'página', 'páginas')} (${percentText(percent)}) · ${listOf(locales)}`,
    problems: (pages: number) =>
      `Ver ${pages === 1 ? 'la página' : `las ${pages} páginas`} con problemas`,
    all: 'Ver todas las páginas',
  },
  coverage: {
    title: 'Cobertura de idiomas',
    why: 'Una página sin traducir manda al lector de ese idioma a otro idioma o a un 404.',
    complete: (locales: number) => (locales === 2 ? 'en los dos idiomas' : 'en todos los idiomas'),
    partial: (locales: number) => (locales === 2 ? 'en uno solo' : 'sin algún idioma'),
    bar: (complete: number, pages: number) =>
      `${complete} de ${plural(pages, 'página', 'páginas')} en todos los idiomas`,
    caption: 'Matriz de traducciones: solo las páginas incompletas',
    more: (count: number) => `${plural(count, 'página más', 'páginas más')}`,
    moreIncomplete: (count: number) => `y ${plural(count, 'incompleta más', 'incompletas más')}`,
    allComplete: 'completas',
    note: 'Google ignora el hreflang que no tiene enlace de vuelta: si EN apunta a ES, ES tiene que apuntar a EN.',
    reciprocal: (complete: number) =>
      complete === 1
        ? ' Hoy la página completa es recíproca.'
        : ` Hoy las ${complete} páginas completas son recíprocas.`,
    matrix: 'Ver la matriz completa',
  },
  indexing: {
    title: 'Indexación',
    why: 'Lo que lleva `noindex` no sale en Google; el sitemap le dice qué rastrear.',
    indexable: 'indexables',
    noindex: 'con noindex',
    sitemap: 'URLs en el sitemap',
    ofEntries: (entries: number) => `/ ${plural(entries, 'entrada', 'entradas')}`,
    canonical: 'Canonical propio',
    reasons: 'Por qué no se indexa',
    reasonsUnit: 'entradas página + idioma',
    reasonLabels: {
      noindex: '`noindex` declarado',
      fallback: 'Respaldo de traducción',
      outOfSitemap: 'Fuera del sitemap',
    },
    note: '«No indexada» no siempre es un fallo: un borrador o un respaldo pueden estarlo a propósito. Solo hay que arreglarla si debería salir en Google.',
  },
  schemas: {
    title: 'Schemas (JSON-LD)',
    why: 'Los datos estructurados dicen a los buscadores qué es la página, no solo qué pone.',
    scopes: { site: 'Todo el sitio', home: 'Portada', pages: undefined },
    unit: 'pág.',
    none: 'Sin schema',
  },
  kinds: {
    title: 'Tipos de problema',
    why: 'Gravedad (cuánto importa) y alcance (a cuántas páginas toca) son cosas distintas: se ven por separado.',
    caption: 'Tipos de problema con gravedad, certeza y páginas afectadas',
    type: 'Tipo',
    severity: 'Gravedad',
    pages: 'Páginas',
    empty: 'Ningún tipo de problema.',
    note: 'Las longitudes y el tamaño de la imagen social son una recomendación (heurística): Google no da un límite, recorta según el ancho de la pantalla.',
    clean: (count: number) =>
      `${plural(count, 'comprobación sin problemas', 'comprobaciones sin problemas')}`,
  },
  files: {
    title: 'Ficheros del sitio',
    why: 'Lo que leen los buscadores y los agentes además de las páginas. Que falte uno opcional no es un fallo: aquí solo se dice si está y quién lo pone.',
    open: 'Abrir',
  },
};

/** Regla (un hecho) o heurística (una recomendación): lo que dice la etiqueta y su ayuda. */
export const CERTAINTY_LABELS: Record<Certainty, { text: string; hint: string }> = {
  rule: { text: 'regla', hint: 'Un hecho comprobable: o se cumple o no' },
  heuristic: {
    text: 'heurística',
    hint: 'Una recomendación: Google no fija este límite, recorta según el ancho',
  },
};

/** Cómo se dice quién pone cada fichero del sitio. */
export const FILE_STATE_LABELS: Record<
  SiteFileState,
  { glyph: string; text: string; tone: 'live' | 'faint' | 'neutral' }
> = {
  generated: { glyph: '✓', text: 'Lo genera la librería', tone: 'live' },
  present: { glyph: '✓', text: 'Lo pone el sitio', tone: 'live' },
  absent: { glyph: '—', text: 'No hay', tone: 'faint' },
  'not-applicable': { glyph: '', text: 'No aplica', tone: 'neutral' },
  'build-only': { glyph: '', text: 'Solo en la build', tone: 'neutral' },
};

/**
 * Cada fichero: cómo se llama y qué es (con `código` entre comillas inversas). Los textos son de la
 * interfaz y no de los datos: ausente un robots.txt o un llms.txt no es un problema, y aquí se dice.
 */
export const FILE_LABELS: Record<
  SiteFileId,
  { name: string; describe: (file: SiteFile, locales: readonly string[]) => string; tag?: string }
> = {
  sitemap: {
    name: 'sitemap.xml',
    describe: (file, locales) =>
      `${file.urls ?? 0} URLs (${locales.join(' + ')}), sin las noindex ni las 404. Le dice a Google qué rastrear.`,
  },
  robots: {
    name: 'robots.txt',
    describe: (file) =>
      file.state === 'present'
        ? 'Lo pone el sitio en `public/robots.txt`. Conviene que apunte al sitemap con `Sitemap:`.'
        : 'Opcional. Sin él los buscadores rastrean todo. Si lo añades en `public/robots.txt`, que apunte al sitemap con `Sitemap:`.',
    tag: 'opcional',
  },
  llms: {
    name: 'llms.txt',
    describe: (file) =>
      file.state === 'present'
        ? 'Lo pone el sitio en `public/llms.txt`. Formato propuesto para agentes de IA; Google no lo usa.'
        : 'Opcional. Formato propuesto para agentes de IA; Google no lo usa. Iría en `public/llms.txt`.',
    tag: 'opcional',
  },
  'not-found': {
    name: '404',
    describe: (file) =>
      `Una por idioma (${(file.links ?? []).map((link) => `\`${link.href}\``).join(', ')}), con \`noindex\` y sin schema.`,
  },
  favicon: {
    name: 'favicon',
    describe: (file) =>
      file.state === 'present'
        ? `El del sitio, en \`${file.path}\`.`
        : `En \`${file.path}\`, salvo que el sitio ponga el suyo.`,
  },
  privacy: {
    name: 'Privacidad',
    describe: (file) =>
      file.state === 'generated'
        ? `Una por idioma (${(file.links ?? []).map((link) => `\`${link.href}\``).join(', ')}): la config pide la página propia.`
        : 'Solo se genera con la página de privacidad propia (`privacy.page`). Este sitio no la pide.',
    tag: 'sin página propia',
  },
  pagefind: {
    name: 'pagefind/',
    describe: () => 'Índice del buscador. No existe en desarrollo; se crea al hacer `astro build`.',
    tag: 'build',
  },
};

/**
 * Lo que dicen los filtros de la tabla, en una frase para el informe: «errores + avisos · idioma es ·
 * sin descripción propia». Sin ninguno, todas las páginas. Es lo que el informe del «filtro actual»
 * llama su alcance.
 */
export function reportFilterText(filters: SeoFilters, view: ViewState): string {
  const parts = [
    filters.severities.length > 0 && filters.severities.length < 3
      ? filters.severities.map((severity) => SEVERITY_PLURALS[severity].toLowerCase()).join(' + ')
      : '',
    filters.kinds.length > 0
      ? `tipo ${filters.kinds.map((kind) => KIND_LABELS[kind]).join(', ')}`
      : '',
    filters.locales.length > 0 ? `idioma ${filters.locales.join(', ')}` : '',
    filters.text.trim() !== '' ? `búsqueda «${filters.text.trim()}»` : '',
    view.lacks ? `sin ${LACKS_PHRASES[view.lacks]}` : '',
  ].filter((part) => part !== '');
  return parts.length > 0 ? parts.join(' · ') : 'todas las páginas';
}

/** «Copiar para la IA»: el botón, el diálogo y el botón «Copiar prompt» de cada problema. */
export const REPORT_LABELS = {
  open: 'Copiar para la IA',
  title: 'Copiar para la IA',
  lede: 'Markdown con qué arreglar, dónde, por qué, cómo comprobarlo y con qué certeza.',
  scope: 'Alcance',
  options: {
    page: 'Esta página',
    filter: 'Filtro actual',
    site: 'Todo el sitio',
    locale: 'Un idioma',
  },
  /** La línea bajo cada alcance. */
  subs: {
    page: (slug: string, locales: readonly string[]) =>
      `${slugLabel(slug)} · ${locales.join(' y ')}`,
    filter: (text: string, pages: number) => `${text} · ${plural(pages, 'página', 'páginas')}`,
    site: (pages: number, locales: readonly string[]) =>
      `${plural(pages, 'página', 'páginas')} · ${locales.join(' y ')}`,
    locale: 'Todo el sitio en',
  },
  localeSelect: 'Idioma del informe',
  json: 'Añadir bloque JSON (para scripts y agentes)',
  preview: 'Vista previa del informe',
  copy: 'Copiar',
  copied: 'Copiado',
  failed: 'No se pudo copiar: selecciona el texto',
  close: 'Cerrar',
  prompt: 'Copiar prompt',
  promptCopied: 'Copiado',
  promptFailed: 'No se pudo copiar',
  /** El enlace del recuento de «Qué tiene» cuando se filtra por lo que falta. */
  openLacks: 'copiarlas para la IA',
};
