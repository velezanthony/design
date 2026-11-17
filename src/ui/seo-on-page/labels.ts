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
