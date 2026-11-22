import { z } from 'astro/zod';
import { DocsError, formatPath } from '../errors';

/* `folders`: los ajustes por carpeta (listado e índice generado, árbol de la barra lateral). Cada
   ajuste se hereda por separado de la carpeta declarada más cercana (la propia incluida), luego de
   `'*'` (`ALL_FOLDERS`) y, sin nadie que lo declare, del valor por defecto. Es el único sitio que
   resuelve precedencias por carpeta: aplicar cada ajuste es de `core/listing/`, `core/content/` y
   `core/navigation/`. */

/** Cómo se pinta el listado de una carpeta. Mismas cadenas en la config y en el frontmatter. */
export const ListingView = { LIST: 'list', TABLE: 'table', CARDS: 'cards' } as const;
export type ListingView = (typeof ListingView)[keyof typeof ListingView];
/** Valores permitidos de `ListingView` como esquema: zod los lista en el mensaje de error. */
export const ListingViewSchema = z.enum(Object.values(ListingView));

/** Qué árbol lleva la barra lateral de las páginas de una carpeta. */
export const TreeShow = { SECTION: 'section', ALL: 'all' } as const;
export type TreeShow = (typeof TreeShow)[keyof typeof TreeShow];
/** Valores permitidos de `TreeShow` como esquema: zod los lista en el mensaje de error. */
export const TreeShowSchema = z.enum(Object.values(TreeShow));

/** Clave de `folders` con los valores de todo el sitio. */
export const ALL_FOLDERS = '*';

/** Entradas por página de un listado paginado: un entero positivo. */
export const PageSizeSchema = z.number().int().min(1).max(500);

const ListingSettingsSchema = z.strictObject({
  /** ¿Recibe la carpeta una página índice generada? Se hereda; apagado por defecto. */
  generate: z.boolean().optional(),
  /** Cómo se pinta el listado (`ListingView`); por defecto, lista. */
  view: ListingViewSchema.optional(),
  /** Entradas por página de la tabla o las tarjetas; sin él, el de la vista. */
  pageSize: PageSizeSchema.optional(),
  /** Opciones del selector «Por página»; sin ellas, las de la vista. */
  perPageOptions: z.array(PageSizeSchema).min(1).optional(),
  /** `true` (por defecto) pone la portada de la librería a quien no trae imagen. */
  covers: z.boolean().optional(),
});

const TreeSettingsSchema = z.strictObject({
  /** Qué árbol lleva la barra lateral (`TreeShow`); por defecto, el de la sección. */
  show: TreeShowSchema.optional(),
  /** Niveles de grupos de carpeta del árbol automático, contados desde la carpeta que lo declara. */
  depth: z.number().int().min(1).optional(),
});

/** Los ajustes de una carpeta tal como se escriben. */
export const FolderSettingsSchema = z.strictObject({
  listing: ListingSettingsSchema.optional(),
  tree: TreeSettingsSchema.optional(),
});
export type FolderSettingsUser = z.infer<typeof FolderSettingsSchema>;

/** `folders`: claves `'*'` o la ruta de una carpeta del contenido sin barras (`articulos/python`). */
export const FoldersSchema = z.record(z.string(), FolderSettingsSchema);
export type FoldersUserConfig = z.input<typeof FoldersSchema>;

/** Un ajuste efectivo y quién lo declaró: una carpeta o `'*'`; `undefined` si nadie lo declaró (el valor por defecto). */
export interface Effective<T> {
  value: T;
  declaredAt: string | undefined;
}

/** Los ajustes efectivos de una carpeta, cada uno con la carpeta que lo declaró. */
export interface FolderSettings {
  listing: {
    generate: Effective<boolean>;
    view: Effective<ListingView>;
    pageSize: Effective<number | undefined>;
    perPageOptions: Effective<number[] | undefined>;
    covers: Effective<boolean>;
  };
  tree: { show: Effective<TreeShow>; depth: Effective<number | undefined> };
}

/** `folders` resuelto: lo declarado tal cual; la herencia se calcula al preguntar por una carpeta. */
export interface ResolvedFolders {
  declared: Record<string, FolderSettingsUser>;
}

/** Valores por defecto de cada ajuste (aquí y no en el esquema: los pone la resolución). */
const DEFAULTS = {
  listing: {
    generate: false,
    view: ListingView.LIST as ListingView,
    pageSize: undefined,
    perPageOptions: undefined,
    covers: true,
  },
  tree: { show: TreeShow.SECTION as TreeShow, depth: undefined },
} satisfies {
  [Group in keyof FolderSettings]: {
    [Key in keyof FolderSettings[Group]]: FolderSettings[Group][Key] extends Effective<infer T>
      ? T
      : never;
  };
};

/** Completa `folders`: sin declarar, un mapa vacío. */
export function resolveFolders(user: FoldersUserConfig | undefined): ResolvedFolders {
  return { declared: user ?? {} };
}

/** La carpeta y sus antepasados, de la más cercana a la raíz (`a/b/c` → `a/b/c`, `a/b`, `a`). */
function lineage(folder: string): string[] {
  if (folder === '') return [];
  const parts = folder.split('/');
  return parts.map((_part, index) => parts.slice(0, parts.length - index).join('/'));
}

/** Ajustes de `folder`: para cada hoja, la carpeta declarada más cercana (la propia incluida), luego `'*'`, luego el valor por defecto. */
export function folderSettings(folders: ResolvedFolders, folder: string): FolderSettings {
  const declarers = [...lineage(folder), ALL_FOLDERS];
  function effective<Group extends keyof FolderSettings, Key extends keyof FolderSettings[Group]>(
    group: Group,
    key: Key,
  ): FolderSettings[Group][Key] {
    for (const declarer of declarers) {
      const settings = folders.declared[declarer]?.[group] as Record<Key, unknown> | undefined;
      const value = settings?.[key];
      if (value !== undefined) return { value, declaredAt: declarer } as FolderSettings[Group][Key];
    }
    const value = (DEFAULTS[group] as Record<Key, unknown>)[key];
    return { value, declaredAt: undefined } as FolderSettings[Group][Key];
  }
  return {
    listing: {
      generate: effective('listing', 'generate'),
      view: effective('listing', 'view'),
      pageSize: effective('listing', 'pageSize'),
      perPageOptions: effective('listing', 'perPageOptions'),
      covers: effective('listing', 'covers'),
    },
    tree: { show: effective('tree', 'show'), depth: effective('tree', 'depth') },
  };
}

/** Ruta de los ajustes de una carpeta en los mensajes (`folders['articulos/python']`); los de la raíz del contenido son los de `'*'`. */
export function folderKeyPath(folder: string, ...rest: string[]): string {
  return formatPath(['folders', folder === '' ? ALL_FOLDERS : folder, ...rest]);
}

/** Un error por cada clave de `folders` que no es `'*'` ni una carpeta con páginas. */
export function validateFolderKeys(
  folders: ResolvedFolders,
  existing: ReadonlySet<string>,
): DocsError[] {
  return Object.keys(folders.declared)
    .filter((folder) => folder !== ALL_FOLDERS && !existing.has(folder))
    .map((folder) => {
      if (folder === '' || folder.startsWith('/') || folder.endsWith('/')) {
        return new DocsError(
          `${formatPath(['folders', folder])}: carpeta sin barras al principio ni al final.`,
          {
            hint: `Escribe la ruta dentro del contenido (articulos/python), o '${ALL_FOLDERS}' para todo el sitio.`,
          },
        );
      }
      return new DocsError(
        `${formatPath(['folders', folder])}: no hay ninguna carpeta «${folder}» con páginas.`,
        {
          hint: `Es la ruta de la carpeta dentro del contenido, sin barras (articulos, articulos/python), o '${ALL_FOLDERS}' para todo el sitio.`,
        },
      );
    });
}
