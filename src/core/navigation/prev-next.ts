import type { SidebarLeaf } from './sidebar';

/** Hojas vecinas de `slug` en el orden aplanado del sidebar; salta las `link` y cuenta las `fallback`. */
export function prevNext(
  order: SidebarLeaf[],
  slug: string,
): { prev?: SidebarLeaf; next?: SidebarLeaf } {
  const index = order.findIndex((leaf) => leaf.slug === slug && !leaf.badge);
  if (index === -1) return {};
  const prev = order
    .slice(0, index)
    .reverse()
    .find((leaf) => !leaf.badge);
  const next = order.slice(index + 1).find((leaf) => !leaf.badge);
  return { ...(prev && { prev }), ...(next && { next }) };
}
