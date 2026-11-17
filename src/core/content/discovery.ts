import type { ResolvedConfig } from '../config/resolve';
import type { PageSeoOverride } from '../config/schema';
import { collectErrors, DocsError } from '../errors';
import { splitLocale, type Locale } from '../i18n/locale';
import type { MissingTranslation } from '../i18n/translation-policy';
import { findSlugCollisions, toSlug } from './slug';
import { resolveTitle } from './title';

/** Frontmatter de una página nativa que el núcleo entiende (ya validado por `docsSchema()`). */
export interface Frontmatter {
  title?: string;
  order?: number;
  seo?: PageSeoOverride;
  translations?: MissingTranslation;
}

/**
 * Un archivo leído por el adaptador. En las nativas `path` es relativo al directorio de contenido;
 * en las externas, relativo a la raíz del proyecto (`../CHANGELOG.es.md`).
 */
export interface SourceFile {
  kind: 'native' | 'external';
  path: string;
  body: string;
  frontmatter?: Frontmatter;
}

export interface Page {
  slug: string;
  locale: Locale;
  title: string;
  kind: SourceFile['kind'];
  /** Ruta tal como llegó en `SourceFile.path`. */
  sourcePath: string;
  body: string;
  order?: number;
  seo?: PageSeoOverride;
  translations?: MissingTranslation;
}

/** `./x.md` y `x.md` son el mismo archivo. */
const normalize = (file: string) => file.replace(/^(\.\/)+/, '');

/** Ruta del archivo de un idioma: el idioma por defecto es el archivo tal cual; los demás, `x.es.md`. */
export function externalPath(file: string, locale: Locale, defaultLocale: Locale): string {
  const path = normalize(file);
  return locale === defaultLocale ? path : path.replace(/\.md$/, `.${locale}.md`);
}

/** Idiomas en los que una entrada externa PUEDE existir (los declarados o, si no, todos los del sitio). */
function externalLocales(entry: ExternalDoc, cfg: Pick<ResolvedConfig, 'locales'>): Locale[] {
  return entry.locales ?? cfg.locales;
}

/** Lo que el descubrimiento lee de la config: nada de `ui`, que el loader no recibe del módulo virtual. */
type DiscoveryConfig = Omit<ResolvedConfig, 'ui'>;

type ExternalDoc = ResolvedConfig['external'][number];

/** Todas las rutas externas que el adaptador debe intentar leer; las que no existan, se omiten. */
export function externalCandidates(
  cfg: Pick<ResolvedConfig, 'external' | 'locales' | 'defaultLocale'>,
): string[] {
  return cfg.external.flatMap((entry) =>
    externalLocales(entry, cfg).map((locale) =>
      externalPath(entry.file, locale, cfg.defaultLocale),
    ),
  );
}

/** Corre `build` y, si lanza un `DocsError`, lo recoge en vez de interrumpir el descubrimiento. */
function attempt<T>(errors: DocsError[], build: () => T): T | undefined {
  try {
    return build();
  } catch (error) {
    if (error instanceof DocsError) {
      errors.push(error);
      return undefined;
    }
    throw error;
  }
}

function nativePage(file: SourceFile, cfg: DiscoveryConfig, errors: DocsError[]): Page | undefined {
  const located = attempt(errors, () => splitLocale(file.path, cfg.locales, cfg.defaultLocale));
  if (!located) return undefined;
  const title = attempt(errors, () => resolveTitle(file.body, file.frontmatter?.title, file.path));
  if (title === undefined) return undefined;
  return {
    slug: toSlug(located.stem),
    locale: located.locale,
    title,
    kind: 'native',
    sourcePath: file.path,
    body: file.body,
    ...(file.frontmatter?.order !== undefined && { order: file.frontmatter.order }),
    ...(file.frontmatter?.seo && { seo: file.frontmatter.seo }),
    ...(file.frontmatter?.translations && { translations: file.frontmatter.translations }),
  };
}

function externalPages(
  entry: ExternalDoc,
  files: Map<string, SourceFile>,
  cfg: DiscoveryConfig,
  errors: DocsError[],
): Page[] {
  const declared = entry.locales !== undefined;
  const pages: Page[] = [];
  for (const locale of externalLocales(entry, cfg)) {
    const path = externalPath(entry.file, locale, cfg.defaultLocale);
    const file = files.get(path);
    if (!file) {
      // Con idiomas declarados todos son obligatorios; sin declarar, solo el idioma por defecto.
      if (declared || locale === cfg.defaultLocale) {
        errors.push(
          new DocsError(`Falta el archivo externo «${entry.slug}»: ${path}.`, {
            file: path,
            hint: 'Comprueba `external[].file` o declara `locales` sin ese idioma.',
          }),
        );
      }
      continue;
    }
    const title = attempt(errors, () => resolveTitle(file.body, undefined, path));
    if (title === undefined) continue;
    pages.push({
      slug: entry.slug,
      locale,
      title,
      kind: 'external',
      sourcePath: path,
      body: file.body,
      ...(entry.seo && { seo: entry.seo }),
      ...(entry.translations && { translations: entry.translations }),
    });
  }
  return pages;
}

/**
 * El idioma por defecto va sin prefijo, así que su página `es/guia` ocuparía `/es/guia/`, la URL de
 * la página `guia` del idioma `es` (y `es` sería su portada). Se reserva todo prefijo de idioma.
 */
function findLocalePrefixCollisions(pages: Page[], cfg: DiscoveryConfig): DocsError[] {
  const prefixes = cfg.locales.filter((locale) => locale !== cfg.defaultLocale);
  return pages
    .filter((page) => page.locale === cfg.defaultLocale)
    .flatMap((page) => {
      const prefix = prefixes.find((locale) => page.slug.split('/')[0] === locale);
      if (prefix === undefined) return [];
      return [
        new DocsError(
          `El slug «${page.slug}» de «${page.sourcePath}» empieza por el código de idioma «${prefix}» y colisiona con las URLs de ese idioma (/${prefix}/…).`,
          {
            file: page.sourcePath,
            hint: `Renombra el archivo (el idioma por defecto «${cfg.defaultLocale}» va sin prefijo, y «${prefix}» está reservado para sus traducciones).`,
          },
        ),
      ];
    });
}

/**
 * Páginas del sitio a partir de los archivos leídos: nativas por su ruta y externas por la config.
 * Reúne TODOS los fallos (sufijo no configurado, colisión de slugs, archivo ausente, sin título) y
 * los lanza juntos en un único `DocsErrors`.
 */
export function discoverPages(files: SourceFile[], cfg: DiscoveryConfig): Page[] {
  const errors: DocsError[] = [];
  const externalFiles = new Map(
    files.filter((file) => file.kind === 'external').map((file) => [normalize(file.path), file]),
  );
  const pages = [
    ...files
      .filter((file) => file.kind === 'native')
      .flatMap((file) => nativePage(file, cfg, errors) ?? []),
    ...cfg.external.flatMap((entry) => externalPages(entry, externalFiles, cfg, errors)),
  ];
  errors.push(...findLocalePrefixCollisions(pages, cfg));
  errors.push(
    ...findSlugCollisions(
      pages.map((page) => ({ slug: page.slug, locale: page.locale, file: page.sourcePath })),
    ),
  );
  collectErrors(errors);
  return pages;
}
