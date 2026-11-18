import { scopedKey } from '../key-place';
import { THRESHOLDS } from '../thresholds';
import { IssueKind, type Issue, type OgImageSource, type SeoPageKind } from '../tree/types';

/** De la página, lo que hace falta para decir DÓNDE se arregla algo. */
export interface FixPage {
  slug: string;
  locale: string;
  kind: SeoPageKind;
  /** Archivo fuente de ESTA página (en una externa, el de su idioma). */
  sourcePath: string;
}

/** Lo que algunos problemas necesitan además para ser concretos. */
export interface FixDetail {
  related?: Issue['related'];
  /** El encabezado que salta de nivel, y desde qué nivel saltó. */
  heading?: { text: string; depth: number; skipFrom: number };
  missingLocale?: string;
  defaultLocale?: string;
  /** Idiomas en los que la página existe (para nombrar los archivos del grupo). */
  groupLocales?: string[];
  /** Rutas (`src`) de las imágenes sin texto alternativo. */
  images?: string[];
  /** La imagen social que no cumple: quién la declara y cuánto mide. */
  og?: { source: OgImageSource; width: number; height: number };
}

/**
 * Archivo de la misma página en otro idioma. La convención es la del descubrimiento (y de
 * `externalPath`): el idioma por defecto es el archivo tal cual y los demás llevan `.<idioma>.md`.
 */
export function siblingPath(
  sourcePath: string,
  ownLocale: string,
  locale: string,
  defaultLocale: string,
): string {
  const base =
    ownLocale === defaultLocale
      ? sourcePath
      : sourcePath.replace(
          new RegExp(`\\.${ownLocale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.md$`),
          '.md',
        );
  return locale === defaultLocale ? base : base.replace(/\.md$/, `.${locale}.md`);
}

/**
 * DÓNDE se declara una clave de la página: en una nativa, el frontmatter de su archivo; en una
 * externa (`external[]`, p. ej. el CHANGELOG) no hay frontmatter que valga, vive en la entrada de
 * `docs.config.mjs`. Decirlo mal mandaría a editar un archivo cuyo cambio no tendría efecto.
 */
function where(page: FixPage, key: string): string {
  const scoped = `\`${scopedKey(key, page.kind)}\``;
  if (page.kind === 'client')
    return `${scoped} de \`${page.sourcePath}\` (o lo que le pase a su layout)`;
  return page.kind === 'external'
    ? `${scoped} de la entrada «${page.slug}» en docs.config.mjs`
    : `${scoped} en el frontmatter de \`${page.sourcePath}\``;
}

/** Los arreglos que en un `.astro` se dicen en HTML (encabezados, idiomas, canonical). */
function clientFix(kind: IssueKind, file: string, detail: FixDetail): string | undefined {
  switch (kind) {
    case IssueKind.NO_H1:
      return `Añade un \`<h1>\` a ${file}.`;
    case IssueKind.MULTIPLE_H1:
      return `Deja un solo \`<h1>\` en ${file} y baja los demás a \`<h2>\`.`;
    case IssueKind.HEADING_SKIP: {
      const { heading } = detail;
      if (!heading) return `Corrige en ${file} el encabezado que salta de nivel.`;
      return `En ${file}, cambia «${heading.text}» de \`<h${heading.depth}>\` a \`<h${heading.skipFrom + 1}>\`: sigue a un \`<h${heading.skipFrom}>\`.`;
    }
    case IssueKind.TRANSLATION_MISSING: {
      const locale = detail.missingLocale ?? '';
      return `Crea la versión en ${locale} y declárala con \`<link rel="alternate" hreflang="${locale}">\` en ${file}.`;
    }
    case IssueKind.CANONICAL_MISMATCH:
      return `Haz que el \`<link rel="canonical">\` de ${file} apunte a su propia URL.`;
    default:
      return undefined;
  }
}

const basename = (path: string) => path.split('/').pop() ?? path;

const slugs = (related: Issue['related']) =>
  (related ?? []).map((other) => `«${other.slug || '/'}»`).join(', ');

/**
 * Qué cambiar y dónde para arreglar un problema, en una frase de acción. Pura: sale del tipo, de la
 * página y del detalle, sin leer nada más.
 */
export function fixFor(kind: IssueKind, page: FixPage, detail: FixDetail = {}): string {
  const file = `\`${page.sourcePath}\``;
  const defaultLocale = detail.defaultLocale ?? page.locale;
  const own = page.kind === 'client' ? clientFix(kind, file, detail) : undefined;
  if (own) return own;
  switch (kind) {
    case IssueKind.TITLE_TOO_LONG:
      return `Acorta el título a ${THRESHOLDS.titleMax} caracteres o menos: ${where(page, 'seo.title')}.`;
    case IssueKind.TITLE_TOO_SHORT:
      return `Alarga el título hasta ${THRESHOLDS.titleMin} caracteres o más: ${where(page, 'seo.title')}.`;
    case IssueKind.DUPLICATE_TITLE:
      return `Dale un título distinto${detail.related?.length ? ` al de ${slugs(detail.related)}` : ''}: ${where(page, 'seo.title')}.`;
    case IssueKind.DESCRIPTION_MISSING:
    case IssueKind.DESCRIPTION_INHERITED:
      return `Escribe una descripción propia de ${THRESHOLDS.descriptionMin} a ${THRESHOLDS.descriptionMax} caracteres: ${where(page, 'seo.description')}.`;
    case IssueKind.DESCRIPTION_TOO_SHORT:
      return `Amplía la descripción hasta ${THRESHOLDS.descriptionMin} caracteres o más: ${where(page, 'seo.description')}.`;
    case IssueKind.DESCRIPTION_TOO_LONG:
      return `Acorta la descripción a ${THRESHOLDS.descriptionMax} caracteres o menos: ${where(page, 'seo.description')}.`;
    case IssueKind.DUPLICATE_DESCRIPTION:
      return `Escribe una descripción distinta${detail.related?.length ? ` a la de ${slugs(detail.related)}` : ''}: ${where(page, 'seo.description')}.`;
    case IssueKind.NO_H1:
      return `Empieza ${file} con un encabezado \`# Título\`.`;
    case IssueKind.MULTIPLE_H1:
      return `Deja un solo \`#\` en ${file} y baja los demás H1 a \`##\`.`;
    case IssueKind.HEADING_SKIP: {
      const { heading } = detail;
      if (!heading) return `Corrige en ${file} el encabezado que salta de nivel.`;
      return `En ${file}, cambia «${heading.text}» de H${heading.depth} a H${heading.skipFrom + 1}: sigue a un H${heading.skipFrom}.`;
    }
    case IssueKind.TRANSLATION_MISSING: {
      const locale = detail.missingLocale ?? '';
      const twin = `\`${siblingPath(page.sourcePath, page.locale, locale, defaultLocale)}\``;
      return page.kind === 'external'
        ? `Crea ${twin} o declara \`external[].translations\` en la entrada «${page.slug}» de docs.config.mjs.`
        : `Crea ${twin} o declara \`translations: omit\` en el frontmatter de ${file}.`;
    }
    case IssueKind.CANONICAL_MISMATCH:
      return `El canonical sale del slug y el idioma de ${file}; no lo apuntes a otro idioma. Revisa \`locales\` y \`defaultLocale\` en docs.config.mjs.`;
    case IssueKind.LINK_TO_NOINDEX:
      return `Quita de ${file} el enlace a ${slugs(detail.related)} o, si debe indexarse, quita \`seo.noindex\` de esa página.`;
    case IssueKind.ORPHAN_PAGE:
      return `Enlaza «${page.slug}» desde el cuerpo de otra página de su idioma (\`[texto](./${basename(page.sourcePath)})\`) o declárala en \`nav\` o \`sidebar\` de docs.config.mjs.`;
    case IssueKind.IMAGE_ALT_MISSING: {
      const images = (detail.images ?? []).map((src) => `\`${src}\``).join(', ');
      return `Describe en ${file} ${images ? `las imágenes ${images}` : 'las imágenes sin texto'}: \`![qué se ve](ruta)\`. Si una es decorativa, escríbela como \`<img alt="">\`.`;
    }
    case IssueKind.OG_IMAGE_SIZE: {
      const size = `${THRESHOLDS.ogWidth}×${THRESHOLDS.ogHeight}`;
      return detail.og?.source === 'page'
        ? `Sustituye la imagen por una de ${size} px: ${where(page, 'seo.image.src')}.`
        : `Sustituye la imagen del sitio por una de ${size} px: \`seo.image.src\` en docs.config.mjs.`;
    }
    case IssueKind.TRANSLATION_POLICY_CONFLICT: {
      if (page.kind === 'external') {
        return `Declara una sola \`external[].translations\` en la entrada «${page.slug}» de docs.config.mjs.`;
      }
      const files = (detail.groupLocales ?? [page.locale])
        .map((locale) => `\`${siblingPath(page.sourcePath, page.locale, locale, defaultLocale)}\``)
        .join(', ');
      return `Haz que \`translations\` valga lo mismo en todos los archivos de la página: ${files}.`;
    }
  }
}
