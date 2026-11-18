import type { LocaleTone, PageTag } from '../../core/seo-on-page/pages/listing/rows';
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
  lede: 'Ordenadas por gravedad. Despliega una fila para ver cada idioma.',
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
