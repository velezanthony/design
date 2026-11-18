import type { Locale } from '../../i18n/locale';
import type { MissingTranslation } from '../../i18n/translation-policy';
import type { Page } from '../../content/discovery';
import type { ResolvedSchema } from '../../seo/json-ld';

/** Gravedad de un problema, de más a menos. */
export const IssueSeverity = { ERROR: 'error', WARNING: 'warning', INFO: 'info' } as const;
export type IssueSeverity = (typeof IssueSeverity)[keyof typeof IssueSeverity];

/** Los problemas que el análisis sabe detectar. La clave de cada uno es estable (va a las URLs). */
export const IssueKind = {
  TITLE_TOO_LONG: 'title-too-long',
  TITLE_TOO_SHORT: 'title-too-short',
  DESCRIPTION_MISSING: 'description-missing',
  DESCRIPTION_INHERITED: 'description-inherited',
  DESCRIPTION_TOO_LONG: 'description-too-long',
  DESCRIPTION_TOO_SHORT: 'description-too-short',
  DUPLICATE_TITLE: 'duplicate-title',
  DUPLICATE_DESCRIPTION: 'duplicate-description',
  NO_H1: 'no-h1',
  MULTIPLE_H1: 'multiple-h1',
  HEADING_SKIP: 'heading-skip',
  TRANSLATION_MISSING: 'translation-missing',
  TRANSLATION_POLICY_CONFLICT: 'translation-policy-conflict',
} as const;
export type IssueKind = (typeof IssueKind)[keyof typeof IssueKind];

export interface Issue {
  kind: IssueKind;
  severity: IssueSeverity;
  slug: string;
  locale: Locale;
  /** Mensaje corto en español para el panel. */
  message: string;
  /** Qué cambiar y dónde (archivo y clave reales de la página), en una frase. Lo rellenan los analizadores. */
  fix?: string;
  /** Lo medido, cuando procede (la longitud, el número de H1…): la UI pinta «72 / 60». */
  value?: number;
  /** El límite contra el que se midió `value`. */
  limit?: number;
  /**
   * Las OTRAS páginas implicadas, sin la propia (con qué página está duplicado el título, por
   * ejemplo): sin ellas el aviso dice que hay un problema pero no dónde arreglarlo.
   */
  related?: { slug: string; locale: Locale }[];
}

/** Origen de la descripción final: la de la página, la heredada del sitio o ninguna. */
export type DescriptionSource = 'page' | 'site' | 'none';

/** Origen de la imagen social: la de la página, la heredada del sitio o ninguna. */
export type OgImageSource = 'page' | 'site' | 'none';

/** Lo que el `<head>` publica de la página (hechos, sin juicio). */
export interface MetaNode {
  /** `<title>` final, con sufijo. */
  title: string;
  titleLength: number;
  description?: string;
  descriptionSource: DescriptionSource;
  descriptionLength?: number;
  /** Sin sufijo, como en `og:title`. */
  ogTitle: string;
  ogDescription?: string;
  ogImage?: { src: string; alt: string; width?: number; height?: number };
  ogImageSource: OgImageSource;
  /** Ruta canónica con `base` (el panel no conoce `site`; `buildHead` la hace absoluta). */
  canonical: string;
  noindex: boolean;
}

/** Un encabezado tal como lo entrega Astro. */
export interface HeadingNode {
  depth: number;
  slug: string;
  text: string;
}

/** Cómo está la página en un idioma configurado. */
export type SeoLocaleEntry =
  | { locale: Locale; status: 'present'; url: string }
  | {
      locale: Locale;
      status: 'missing';
      /** Política que se aplica a esa ausencia (la del grupo o, sin declarar, la base). */
      policy: MissingTranslation;
      /** Algún archivo del grupo declara `translations`: la ausencia es una decisión explícita. */
      declared: boolean;
    };

/** Los hechos de una página, antes de juzgarlos. */
export interface SeoPageFacts {
  slug: string;
  locale: Locale;
  /** Título de la página (el H1), no el `<title>`. */
  title: string;
  kind: Page['kind'];
  sourcePath: string;
  meta: MetaNode;
  headings: HeadingNode[];
  /** JSON-LD que se publica, con su origen (sitio o página); vacío si nadie declara ninguno. */
  schemas: ResolvedSchema[];
  locales: SeoLocaleEntry[];
  /** `undefined` si los archivos del grupo declaran políticas distintas. */
  policy?: MissingTranslation;
}

export interface SeoPage extends SeoPageFacts {
  issues: Issue[];
}

export interface SeoTree {
  /** Ordenadas por slug y, dentro de él, por idioma. */
  pages: SeoPage[];
}
