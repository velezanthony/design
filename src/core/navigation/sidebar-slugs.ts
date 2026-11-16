import { DocsError, formatPath } from '../errors';
import type { SidebarItem } from '../config/schema';

/** Nombre con el que la config se refiere a la portada (cuyo slug interno es la cadena vacía). */
export const HOME_SIDEBAR_SLUG = 'index';

/**
 * Slug interno de lo que se escribe en `sidebar`: `'index'` es la portada (`''`), el resto tal cual.
 * No hay ambigüedad porque ninguna página puede tener el slug `index`: `index.md` colapsa a `''`.
 */
export const toSidebarSlug = (slug: string): string => (slug === HOME_SIDEBAR_SLUG ? '' : slug);

/** Un slug escrito en un `sidebar` con su ruta en la config (`sidebar[2].items[0]`). */
export interface SidebarSlugRef {
  slug: string;
  path: readonly PropertyKey[];
}

/** Todos los slugs que nombra un `sidebar`, en orden de lectura y con su ruta. */
export function sidebarSlugRefs(
  items: readonly SidebarItem[],
  path: readonly PropertyKey[] = ['sidebar'],
): SidebarSlugRef[] {
  return items.flatMap((item, index): SidebarSlugRef[] => {
    const here = [...path, index];
    if (typeof item === 'string') return [{ slug: item, path: here }];
    return [
      ...(item.slug === undefined ? [] : [{ slug: item.slug, path: [...here, 'slug'] }]),
      ...sidebarSlugRefs(item.items ?? [], [...here, 'items']),
    ];
  });
}

/**
 * Un error por cada slug de `sidebar` que no corresponde a ninguna página (de cualquier idioma),
 * con su ruta en la config (`sidebar[2].items[0]`). Devuelve la lista para sumarla a los demás
 * fallos de la carga en vez de cortar en el primero.
 */
export function validateSidebarSlugs(
  items: readonly SidebarItem[],
  pageSlugs: ReadonlySet<string>,
  path: readonly PropertyKey[] = ['sidebar'],
): DocsError[] {
  return sidebarSlugRefs(items, path)
    .filter(({ slug }) => slug === '' || !pageSlugs.has(toSidebarSlug(slug)))
    .map(
      ({ slug, path: at }) =>
        new DocsError(`${formatPath(at)}: no hay ninguna página con el slug «${slug}».`, {
          hint: `Revisa el slug o créala. La portada se escribe '${HOME_SIDEBAR_SLUG}'.`,
        }),
    );
}
