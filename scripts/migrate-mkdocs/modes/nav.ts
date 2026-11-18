/**
 * Convierte el `nav` de `mkdocs.yml` en el `sidebar` de la config de docs.
 *
 * Las páginas pasan a slugs (los títulos salen del `h1` de cada página); las secciones, a grupos
 * con la etiqueta en inglés y la traducción de `nav_translations` para `es`.
 */

export type NavEntry = string | { [title: string]: NavEntry[] | string };

export type SidebarEntry = string | { label: { en: string; es: string }; items: SidebarEntry[] };

/** `index.md` -> `index`, `a/index.md` -> `a`, `a/b.md` -> `a/b`. */
function slugOf(file: string): string {
  const stem = file.replace(/\.md$/, '');
  if (stem === 'index') return 'index';
  return stem.endsWith('/index') ? stem.slice(0, -'/index'.length) : stem;
}

export function navToSidebar(
  nav: NavEntry[],
  translations: Record<string, string>,
): SidebarEntry[] {
  return nav.map((entry): SidebarEntry => {
    if (typeof entry === 'string') return slugOf(entry);
    const [title, value] = Object.entries(entry)[0] ?? ['', []];
    if (typeof value === 'string') return slugOf(value);
    return {
      label: { en: title, es: translations[title] ?? title },
      items: navToSidebar(value, translations),
    };
  });
}
