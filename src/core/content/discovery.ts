import type { ResolvedConfig } from '../config/resolve';
import type { PageSeoOverride } from '../config/schema';
import { collectErrors, DocsError } from '../errors';
import { localizedPath, splitLocale, type Locale } from '../i18n/locale';
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

/** Archivo leído: `path` es relativo al contenido en nativas y a la raíz del proyecto en externas. */
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
function normalize(file: string) {
  return file.replace(/^(\.\/)+/, '');
}

/** Ruta del archivo de un idioma de una entrada externa. */
export function externalPath(file: string, locale: Locale, defaultLocale: Locale): string {
  return localizedPath(normalize(file), locale, defaultLocale);
}

/** Idiomas en los que una entrada externa PUEDE existir (los declarados o, si no, todos los del sitio). */
function externalLocales(entry: ExternalDoc, config: Pick<ResolvedConfig, 'locales'>): Locale[] {
  return entry.locales ?? config.locales;
}

/** Lo que el descubrimiento lee de la config: nada de `ui`, que el loader no recibe del módulo virtual. */
type DiscoveryConfig = Omit<ResolvedConfig, 'ui'>;

type ExternalDoc = ResolvedConfig['external'][number];

/** Todas las rutas externas que el adaptador debe intentar leer; las que no existan, se omiten. */
export function externalCandidates(
  config: Pick<ResolvedConfig, 'external' | 'locales' | 'defaultLocale'>,
): string[] {
  return config.external.flatMap((entry) =>
    externalLocales(entry, config).map((locale) =>
      externalPath(entry.file, locale, config.defaultLocale),
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

function nativePage(
  file: SourceFile,
  config: DiscoveryConfig,
  errors: DocsError[],
): Page | undefined {
  const located = attempt(errors, () =>
    splitLocale(file.path, config.locales, config.defaultLocale),
  );
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
  config: DiscoveryConfig,
  errors: DocsError[],
): Page[] {
  const declared = entry.locales !== undefined;
  const pages: Page[] = [];
  for (const locale of externalLocales(entry, config)) {
    const path = externalPath(entry.file, locale, config.defaultLocale);
    const file = files.get(path);
    if (!file) {
      // Con idiomas declarados todos son obligatorios; sin declarar, solo el idioma por defecto.
      if (declared || locale === config.defaultLocale) {
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

/** `es/guia` en el idioma por defecto chocaría con `guia` en `es`, así que se reserva todo prefijo de idioma. */
function findLocalePrefixCollisions(pages: Page[], config: DiscoveryConfig): DocsError[] {
  const prefixes = config.locales.filter((locale) => locale !== config.defaultLocale);
  return pages
    .filter((page) => page.locale === config.defaultLocale)
    .flatMap((page) => {
      const prefix = prefixes.find((locale) => page.slug.split('/')[0] === locale);
      if (prefix === undefined) return [];
      return [
        new DocsError(
          `El slug «${page.slug}» de «${page.sourcePath}» empieza por el código de idioma «${prefix}» y colisiona con las URLs de ese idioma (/${prefix}/…).`,
          {
            file: page.sourcePath,
            hint: `Renombra el archivo (el idioma por defecto «${config.defaultLocale}» va sin prefijo, y «${prefix}» está reservado para sus traducciones).`,
          },
        ),
      ];
    });
}

/** Páginas a partir de los archivos leídos; reúne todos los fallos y los lanza juntos en un `DocsErrors`. */
export function discoverPages(files: SourceFile[], config: DiscoveryConfig): Page[] {
  const errors: DocsError[] = [];
  const externalFiles = new Map(
    files.filter((file) => file.kind === 'external').map((file) => [normalize(file.path), file]),
  );
  const pages = [
    ...files
      .filter((file) => file.kind === 'native')
      .flatMap((file) => nativePage(file, config, errors) ?? []),
    ...config.external.flatMap((entry) => externalPages(entry, externalFiles, config, errors)),
  ];
  errors.push(...findLocalePrefixCollisions(pages, config));
  errors.push(
    ...findSlugCollisions(
      pages.map((page) => ({ slug: page.slug, locale: page.locale, file: page.sourcePath })),
    ),
  );
  collectErrors(errors);
  return pages;
}
