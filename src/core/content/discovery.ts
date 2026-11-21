import type { ResolvedConfig } from '../config/resolve';
import type { ListingFrontmatter, PageSeoOverride } from '../config/schema';
import { collectErrors, DocsError } from '../errors';
import { localizedPath, splitLocale, type Locale } from '../i18n/locale';
import type { MissingTranslation } from '../i18n/translation-policy';
import type { EntryIndex, Frontmatter } from './frontmatter';
import {
  findSlugCollisions,
  findUrlCollisions,
  listingFolder,
  slugProblem,
  toSlug,
  urlSlugOf,
} from './slug';
import { resolveTitle } from './title';

/** Archivo leído: `path` es relativo al contenido en nativas y a la raíz del proyecto en externas. */
export interface SourceFile {
  kind: 'native' | 'external';
  path: string;
  body: string;
  frontmatter?: Frontmatter;
}

/** De dónde sale una página: un `.md` de `content`, una entrada de `external[]` o un índice generado (una carpeta sin `index.md`). */
export type PageKind = SourceFile['kind'] | 'generated';

/**
 * Una página en un idioma. `slug` es su IDENTIDAD: sale del archivo sin el sufijo de idioma
 * (`guia.md` y `guia.en.md` son `guia`), empareja las traducciones y es lo que nombran la config
 * (`sidebar`, `nav`), las políticas y los mapas por página. `urlSlug` es su URL cuando el
 * frontmatter la fija con `slug`; sin él la URL sale de la identidad (`urlSlugOf`).
 */
export interface Page {
  slug: string;
  /** URL propia, sin idioma ni base: el `slug` del frontmatter. Solo existe si se declaró. */
  urlSlug?: string;
  locale: Locale;
  title: string;
  kind: PageKind;
  /** Ruta tal como llegó en `SourceFile.path`. */
  sourcePath: string;
  body: string;
  order?: number;
  seo?: PageSeoOverride;
  translations?: MissingTranslation;
  /** Su ficha en los listados (resumen, portada): el bloque `index:` del frontmatter. */
  index?: EntryIndex;
  /** Presente si lista su carpeta: el bloque `listing:` de su `_index.md` (`{}` sin él, y en las generadas). */
  listing?: ListingFrontmatter;
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

/** `guide/README` → `guide/index`: un README hace de índice de su carpeta si esta no tiene `index`. */
function readmeAsIndex(stem: string, locale: Locale, indexKeys: ReadonlySet<string>): string {
  if (stem !== 'README' && !stem.endsWith('/README')) return stem;
  const asIndex = `${stem.slice(0, -'README'.length)}index`;
  return indexKeys.has(`${locale}\0${asIndex}`) ? stem : asIndex;
}

/** Los `index` nativos que existen, por idioma y carpeta: lo que decide si un README los sustituye. */
function nativeIndexKeys(files: SourceFile[], config: DiscoveryConfig): Set<string> {
  const keys = files
    .filter((file) => file.kind === 'native')
    .flatMap((file) => {
      // Los fallos de idioma los cuenta `nativePage`; aquí solo importa quién tiene `index`.
      const located = attempt([], () =>
        splitLocale(file.path, config.locales, config.defaultLocale),
      );
      return located && /(^|\/)index$/.test(located.stem)
        ? [`${located.locale}\0${located.stem}`]
        : [];
    });
  return new Set(keys);
}

/** Carpetas con un `index` nativo en algún idioma: ahí un `_index.md` no cuenta. */
function indexedFolders(indexKeys: ReadonlySet<string>): Set<string> {
  return new Set([...indexKeys].map((key) => toSlug(key.split('\0')[1] ?? '')));
}

/** Los `_index.md` que no cuentan porque su carpeta tiene un `index.md`: el loader avisa de cada uno. */
export function ignoredListings(files: SourceFile[], config: DiscoveryConfig): string[] {
  const indexed = indexedFolders(nativeIndexKeys(files, config));
  return files
    .filter((file) => file.kind === 'native')
    .flatMap((file) => {
      const located = attempt([], () =>
        splitLocale(file.path, config.locales, config.defaultLocale),
      );
      const folder = located && listingFolder(located.stem);
      return folder !== undefined && indexed.has(folder) ? [file.path] : [];
    });
}

/** El `slug` del frontmatter si vale como URL; si no, apunta el fallo y la página sigue con la URL de su archivo. */
function ownUrlSlug(
  file: SourceFile,
  config: DiscoveryConfig,
  errors: DocsError[],
): string | undefined {
  const slug = file.frontmatter?.slug;
  if (slug === undefined) return undefined;
  const problem = slugProblem(slug, config.locales);
  if (!problem) return slug;
  errors.push(
    new DocsError(`slug: «${slug}» ${problem.message}.`, { file: file.path, hint: problem.hint }),
  );
  return undefined;
}

/** Lo que todas las páginas nativas comparten: los `index` que existen y las carpetas que tienen uno. */
interface NativeIndexes {
  keys: ReadonlySet<string>;
  folders: ReadonlySet<string>;
}

function nativePage(
  file: SourceFile,
  config: DiscoveryConfig,
  errors: DocsError[],
  indexes: NativeIndexes,
): Page | undefined {
  const located = attempt(errors, () =>
    splitLocale(file.path, config.locales, config.defaultLocale),
  );
  if (!located) return undefined;
  const folder = listingFolder(located.stem);
  if (folder !== undefined && indexes.folders.has(folder)) return undefined;
  const title = attempt(errors, () => resolveTitle(file.body, file.frontmatter?.title, file.path));
  if (title === undefined) return undefined;
  const urlSlug = ownUrlSlug(file, config, errors);
  return {
    slug: folder ?? toSlug(readmeAsIndex(located.stem, located.locale, indexes.keys)),
    ...(urlSlug !== undefined && { urlSlug }),
    ...(folder !== undefined && { listing: file.frontmatter?.listing ?? {} }),
    locale: located.locale,
    title,
    kind: 'native',
    sourcePath: file.path,
    body: file.body,
    ...(file.frontmatter?.order !== undefined && { order: file.frontmatter.order }),
    ...(file.frontmatter?.seo && { seo: file.frontmatter.seo }),
    ...(file.frontmatter?.translations && { translations: file.frontmatter.translations }),
    ...(file.frontmatter?.index && { index: file.frontmatter.index }),
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
      // `index` y `carpeta/index` colapsan como en los nativos: así un README externo puede ser la portada.
      slug: toSlug(entry.slug),
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
      const prefix = prefixes.find((locale) => urlSlugOf(page).split('/')[0] === locale);
      if (prefix === undefined) return [];
      return [
        new DocsError(
          `El slug «${urlSlugOf(page)}» de «${page.sourcePath}» empieza por el código de idioma «${prefix}» y colisiona con las URLs de ese idioma (/${prefix}/…).`,
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
  const keys = nativeIndexKeys(files, config);
  const indexes: NativeIndexes = { keys, folders: indexedFolders(keys) };
  const pages = [
    ...files
      .filter((file) => file.kind === 'native')
      .flatMap((file) => nativePage(file, config, errors, indexes) ?? []),
    ...config.external.flatMap((entry) => externalPages(entry, externalFiles, config, errors)),
  ];
  errors.push(...findLocalePrefixCollisions(pages, config));
  errors.push(
    ...findSlugCollisions(
      pages.map((page) => ({ slug: page.slug, locale: page.locale, file: page.sourcePath })),
    ),
    ...urlCollisions(pages),
  );
  collectErrors(errors);
  return pages;
}

/** Las URLs que reclaman varias páginas de un idioma por culpa de un `slug` del frontmatter. */
export function urlCollisions(pages: readonly Page[]): DocsError[] {
  return findUrlCollisions(
    pages.map((page) => ({
      slug: urlSlugOf(page),
      locale: page.locale,
      file: page.sourcePath,
      explicit: page.urlSlug !== undefined,
    })),
  );
}
