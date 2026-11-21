import { DocsError, formatPath } from '../errors';
import type { Page } from '../content/discovery';
import type { Locale } from '../i18n/locale';
import { resolveLabel } from '../navigation/label';
import { humanize } from '../navigation/sidebar';
import { isNavSection, type NavItem } from './nav';
import type { Label } from './schema';

/* Índices generados: el listado de las páginas de una carpeta. Lo pide un `index.md` con
   `_index.md` (convención de Hugo) o, en una carpeta sin `index.md` ni `_index.md`, la sección
   `indexes` de la config. Aquí vive lo que decide la config: qué carpetas, con qué disposición y con qué portadas. */

/** Disposición del listado. Mismas cadenas en la config y en el frontmatter. */
export const IndexLayout = { LIST: 'list', TABLE: 'table', CARDS: 'cards' } as const;
export type IndexLayout = (typeof IndexLayout)[keyof typeof IndexLayout];

/** Entradas por página de cada disposición: las tarjetas de 12 en 12 (filas completas a 2 y a 3 columnas) y
    la tabla de 10 en 10, la medida redonda de una tabla. La lista no se pagina. */
export const DEFAULT_PAGE_SIZES: Record<IndexLayout, number> = { list: 10, table: 10, cards: 12 };

/** Opciones del selector «Por página» de cada disposición; la lista no lo lleva. */
export const DEFAULT_PER_PAGE_OPTIONS: Record<IndexLayout, number[]> = {
  list: [],
  table: [10, 25, 50],
  cards: [12, 24, 48],
};

/** `include: 'all'`: todas las carpetas sin `index.md`. */
export const ALL_FOLDERS = 'all';

/** Lo que se puede fijar para una carpeta en `indexes.overrides`. */
export interface IndexOverride {
  layout?: IndexLayout;
  pageSize?: number;
  /** Opciones del selector «Por página». */
  perPageOptions?: number[];
  /** Política de portadas del listado: `true` pone la de la librería a quien no trae imagen. */
  image?: boolean;
  /** Título de la página generada (no se usa si la carpeta tiene `index.md`). */
  title?: Label;
  /** Entradilla y `seo.description` de la página generada. */
  description?: Label;
}

/** Lo que escribe el consumidor en `indexes`: todo es opcional. */
export interface IndexesUserConfig {
  layout?: IndexLayout;
  pageSize?: number;
  perPageOptions?: number[];
  image?: boolean;
  /** `'all'` (por defecto) o las carpetas exactas que reciben un índice generado. */
  include?: typeof ALL_FOLDERS | string[];
  /** Carpetas que no lo reciben aunque `include` las abarque. */
  exclude?: string[];
  overrides?: Record<string, IndexOverride>;
}

export interface ResolvedIndexes {
  layout: IndexLayout;
  /** Sin él, el de la disposición (`DEFAULT_PAGE_SIZES`). */
  pageSize?: number;
  /** Sin él, las de la disposición (`DEFAULT_PER_PAGE_OPTIONS`). */
  perPageOptions?: number[];
  image: boolean;
  include: typeof ALL_FOLDERS | string[];
  exclude: string[];
  overrides: Record<string, IndexOverride>;
}

/** Completa `indexes` con los valores por defecto. */
export function resolveIndexes(user: IndexesUserConfig): ResolvedIndexes {
  return {
    layout: user.layout ?? IndexLayout.LIST,
    ...(user.pageSize !== undefined && { pageSize: user.pageSize }),
    ...(user.perPageOptions !== undefined && { perPageOptions: user.perPageOptions }),
    image: user.image ?? true,
    include: user.include ?? ALL_FOLDERS,
    exclude: user.exclude ?? [],
    overrides: user.overrides ?? {},
  };
}

/** Carpetas de las que cuelga alguna página (también las intermedias), en orden de aparición; la raíz no cuenta. */
export function contentFolders(slugs: Iterable<string>): string[] {
  const folders = new Set<string>();
  for (const slug of slugs) {
    const segments = slug.split('/');
    for (let depth = 1; depth < segments.length; depth++) {
      folders.add(segments.slice(0, depth).join('/'));
    }
  }
  return [...folders];
}

/** ¿Recibe `folder` un índice generado (si no tiene `index.md`)? Sin `indexes`, nunca. */
export function generatesIndex(indexes: ResolvedIndexes | undefined, folder: string): boolean {
  if (!indexes || indexes.exclude.includes(folder)) return false;
  return indexes.include === ALL_FOLDERS || indexes.include.includes(folder);
}

/** Un error por cada carpeta de `include`, `exclude` u `overrides` sin páginas. */
export function validateIndexFolders(
  indexes: ResolvedIndexes,
  folders: ReadonlySet<string>,
): DocsError[] {
  const named: { path: (string | number)[]; folder: string }[] = [
    ...(indexes.include === ALL_FOLDERS ? [] : indexes.include).map((folder, index) => ({
      path: ['indexes', 'include', index],
      folder,
    })),
    ...indexes.exclude.map((folder, index) => ({ path: ['indexes', 'exclude', index], folder })),
    ...Object.keys(indexes.overrides).map((folder) => ({
      path: ['indexes', 'overrides', folder],
      folder,
    })),
  ];
  return named
    .filter(({ folder }) => !folders.has(folder))
    .map(
      ({ path, folder }) =>
        new DocsError(`${formatPath(path)}: no hay ninguna carpeta «${folder}» con páginas.`, {
          hint: 'Es la ruta de la carpeta dentro del contenido, sin barras (articulos, guia/avanzado).',
        }),
    );
}

/** Opciones del listado en el frontmatter de un `_index.md`. */
export interface PageListing {
  layout?: IndexLayout;
  pageSize?: number;
  perPageOptions?: number[];
  image?: boolean;
}

/** El listado ya resuelto de una página: de qué carpeta y cómo se pinta. */
export interface ListingOptions {
  folder: string;
  layout: IndexLayout;
  /** Entradas por página de las rutas estáticas (`/carpeta/`, `/carpeta/2/`…). */
  pageSize: number;
  /** Opciones del selector «Por página», ordenadas y con `pageSize` entre ellas; vacío en la lista. */
  perPageOptions: number[];
  image: boolean;
}

/** Las opciones con el tamaño de las rutas estáticas siempre entre ellas, ordenadas y sin repetir. */
function withPageSize(options: readonly number[], pageSize: number): number[] {
  return [...new Set([...options, pageSize])].sort((left, right) => left - right);
}

/** Listado de una página (un `_index.md` o una generada), o `undefined` si no lleva. Precedencia: su `_index.md` → `overrides` de su carpeta → `indexes` → valores por defecto. */
export function listingOptions(
  page: { slug: string; listing?: true; index?: PageListing },
  indexes: ResolvedIndexes | undefined,
): ListingOptions | undefined {
  if (!page.listing) return undefined;
  const own = page.index;
  const folder = page.slug;
  const override = indexes?.overrides[folder];
  const layout = own?.layout ?? override?.layout ?? indexes?.layout ?? IndexLayout.LIST;
  const pageSize =
    own?.pageSize ?? override?.pageSize ?? indexes?.pageSize ?? DEFAULT_PAGE_SIZES[layout];
  const options =
    own?.perPageOptions ??
    override?.perPageOptions ??
    indexes?.perPageOptions ??
    DEFAULT_PER_PAGE_OPTIONS[layout];
  return {
    folder,
    layout,
    pageSize,
    perPageOptions: layout === IndexLayout.LIST ? [] : withPageSize(options, pageSize),
    image: own?.image ?? override?.image ?? indexes?.image ?? true,
  };
}

/** Título de la página generada de `folder`: el de `overrides`, la etiqueta de la sección de `nav` con ese `dir` o el nombre de la carpeta. */
export function generatedTitle(
  folder: string,
  locale: Locale,
  defaultLocale: Locale,
  indexes: ResolvedIndexes | undefined,
  nav: readonly NavItem[] | undefined,
): string {
  const title = indexes?.overrides[folder]?.title;
  if (title !== undefined) return resolveLabel(title, locale, defaultLocale);
  const section = (nav ?? []).find((item) => isNavSection(item) && item.dir === folder);
  if (section) return resolveLabel(section.label, locale, defaultLocale);
  return humanize(folder.split('/').pop() ?? folder);
}

/** Entradilla (y `seo.description`) de la página generada: solo la de `overrides`. */
export function generatedDescription(
  folder: string,
  locale: Locale,
  defaultLocale: Locale,
  indexes: ResolvedIndexes | undefined,
): string | undefined {
  const description = indexes?.overrides[folder]?.description;
  return description === undefined ? undefined : resolveLabel(description, locale, defaultLocale);
}

/** Escapa lo que el Markdown leería como formato: el título y la entradilla generados son texto. */
function plainMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>#~|!]/g, (char) => `\\${char}`);
}

/** Lo que hace falta para generar las páginas de los índices. */
type GeneratedConfig = {
  locales: readonly Locale[];
  defaultLocale: Locale;
  nav?: readonly NavItem[];
  indexes?: ResolvedIndexes;
};

/** Páginas generadas, una por idioma, de cada carpeta que `indexes` activa y no tiene `index.md` ni `_index.md` (en ningún idioma). Su cuerpo es el título y la entradilla; el listado lo añade la ruta. `sourcePath` es el `_index.md` que tendría la carpeta. */
export function generatedIndexPages(pages: readonly Page[], config: GeneratedConfig): Page[] {
  const { indexes } = config;
  if (!indexes) return [];
  const taken = new Set(pages.map((page) => page.slug));
  return contentFolders(pages.map((page) => page.slug))
    .filter((folder) => !taken.has(folder) && generatesIndex(indexes, folder))
    .flatMap((folder) =>
      config.locales.map((locale): Page => {
        const title = generatedTitle(folder, locale, config.defaultLocale, indexes, config.nav);
        const description = generatedDescription(folder, locale, config.defaultLocale, indexes);
        return {
          slug: folder,
          locale,
          title,
          kind: 'generated',
          sourcePath: `${folder}/_index.md`,
          body: `# ${plainMarkdown(title)}\n${description === undefined ? '' : `\n${plainMarkdown(description)}\n`}`,
          listing: true,
          ...(description !== undefined && { seo: { description } }),
        };
      }),
    );
}
