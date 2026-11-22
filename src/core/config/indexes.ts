import { z } from 'astro/zod';
import { DocsError, formatPath } from '../errors';
import type { IndexesUserConfig, IndexOverride } from './schema';

/* La opción `indexes` de la config: el listado por defecto y qué carpetas sin `index.md` ni
   `_index.md` reciben una página generada. Resolver el listado de una página es de `core/listing/`;
   fabricar las páginas generadas, de `core/content/generated-listings.ts`. */

/** Cómo se pinta el listado de una carpeta. Mismas cadenas en la config y en el frontmatter. */
export const ListingView = { LIST: 'list', TABLE: 'table', CARDS: 'cards' } as const;
export type ListingView = (typeof ListingView)[keyof typeof ListingView];
/** Valores permitidos de `ListingView` como esquema: zod los lista en el mensaje de error. */
export const ListingViewSchema = z.enum(Object.values(ListingView));

/** `include: 'all'`: todas las carpetas sin `index.md`. */
export const ALL_FOLDERS = 'all';

export interface ResolvedIndexes {
  layout: ListingView;
  /** Sin él, el de la disposición (`DEFAULT_PAGE_SIZES` de `core/listing/options.ts`). */
  pageSize?: number;
  /** Sin él, las de la disposición (`DEFAULT_PER_PAGE_OPTIONS`). */
  perPageOptions?: number[];
  /** Política de portadas por defecto: `true` pone la de la librería a quien no trae imagen. */
  covers: boolean;
  /** `'all'` (por defecto) o las carpetas exactas que reciben un índice generado. */
  include: typeof ALL_FOLDERS | string[];
  /** Carpetas que no lo reciben aunque `include` las abarque. */
  exclude: string[];
  overrides: Record<string, IndexOverride>;
}

/** Completa `indexes` con los valores por defecto. */
export function resolveIndexes(user: IndexesUserConfig): ResolvedIndexes {
  return {
    layout: user.layout ?? ListingView.LIST,
    ...(user.pageSize !== undefined && { pageSize: user.pageSize }),
    ...(user.perPageOptions !== undefined && { perPageOptions: user.perPageOptions }),
    covers: user.covers ?? true,
    include: user.include ?? ALL_FOLDERS,
    exclude: user.exclude ?? [],
    overrides: user.overrides ?? {},
  };
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
          hint: 'Es la ruta de la carpeta dentro del contenido, sin barras (tutoriales, guia/avanzado).',
        }),
    );
}
