import { DocsError, formatPath } from '../errors';
import { isNavPage, isNavSection, type NavItem, type NavSection } from '../config/nav';
import { HOME_SIDEBAR_SLUG, sidebarSlugRefs, toSidebarSlug } from './sidebar-slugs';

/** ¿Pertenece `slug` a la carpeta `dir`? Es la propia carpeta o cuelga de ella: `users-extra` no. */
export function slugInDir(directory: string, slug: string): boolean {
  return slug === directory || slug.startsWith(`${directory}/`);
}

/** Posición en `nav` de la sección a la que pertenece `slug`, o `-1` si no pertenece a ninguna. */
export function sectionIndexOf(nav: readonly NavItem[] | undefined, slug: string): number {
  return (nav ?? []).findIndex((item) => isNavSection(item) && slugInDir(item.dir, slug));
}

/**
 * Un error por cada incoherencia de `nav` con las páginas reales, con su ruta en la config
 * (`nav[1].dir`). Lo que se puede juzgar sin páginas (solape de dirs, https) lo valida el esquema.
 * Devuelve la lista para sumarla a los demás fallos de la carga en vez de cortar en el primero.
 */
export function validateNav(nav: readonly NavItem[], pageSlugs: ReadonlySet<string>): DocsError[] {
  const errors: DocsError[] = [];
  const sections = nav.filter(isNavSection);

  nav.forEach((item, index) => {
    if (isNavSection(item)) errors.push(...validateSection(item, index, pageSlugs));
    else if (isNavPage(item)) {
      const slug = toSidebarSlug(item.slug);
      const at = formatPath(['nav', index, 'slug']);
      if (!pageSlugs.has(slug)) {
        errors.push(
          new DocsError(`${at}: no hay ninguna página con el slug «${item.slug}».`, {
            hint: `Revisa el slug o créala. La portada se escribe '${HOME_SIDEBAR_SLUG}'.`,
          }),
        );
      } else {
        const owner = sections.find((section) => slugInDir(section.dir, slug));
        if (owner) {
          errors.push(
            new DocsError(
              `${at}: «${item.slug}» pertenece a la sección «${owner.dir}»; una página suelta no puede vivir dentro de una sección.`,
              { hint: 'Enlázala desde el sidebar de la sección o muévela fuera de su carpeta.' },
            ),
          );
        }
      }
    }
  });
  return errors;
}

function validateSection(
  section: NavSection,
  index: number,
  pageSlugs: ReadonlySet<string>,
): DocsError[] {
  const inDirectory = [...pageSlugs].filter((slug) => slugInDir(section.dir, slug));
  if (inDirectory.length === 0) {
    return [
      new DocsError(
        `${formatPath(['nav', index, 'dir'])}: no hay ninguna página en «${section.dir}».`,
        { hint: 'Revisa el nombre de la carpeta: es el prefijo del slug de sus páginas.' },
      ),
    ];
  }
  const inside = new Set(inDirectory);
  return sidebarSlugRefs(section.sidebar ?? [], ['nav', index, 'sidebar']).flatMap(
    ({ slug, path }): DocsError[] => {
      const at = formatPath(path);
      const internal = toSidebarSlug(slug);
      if (slug === '' || !pageSlugs.has(internal)) {
        return [
          new DocsError(`${at}: no hay ninguna página con el slug «${slug}».`, {
            hint: 'Revisa el slug o créala.',
          }),
        ];
      }
      if (!inside.has(internal)) {
        return [
          new DocsError(
            `${at}: «${slug}» no está dentro de la carpeta «${section.dir}» de su sección.`,
            {
              hint: 'El sidebar de una sección solo ordena las páginas de su carpeta.',
            },
          ),
        ];
      }
      return [];
    },
  );
}
