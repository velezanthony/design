import { DocsError, formatPath } from '../errors';
import { isNavPage, isNavSection, type NavItem, type NavSection } from '../config/nav';
import { HOME_SIDEBAR_SLUG, sidebarSlugRefs, toSidebarSlug } from './sidebar-slugs';

/** ¿Pertenece `slug` a la carpeta `dir`? Es la propia carpeta o cuelga de ella: `users-extra` no. */
export function slugInDir(directory: string, slug: string): boolean {
  return slug === directory || slug.startsWith(`${directory}/`);
}

/** ¿Es `slug` de la sección? Lo es si cuelga de su `dir` o si su `sidebar` lo nombra, aunque viva fuera de esa carpeta. */
export function sectionOwns(section: NavSection, slug: string): boolean {
  if (section.dir !== undefined && slugInDir(section.dir, slug)) return true;
  return sidebarSlugRefs(section.sidebar ?? []).some((ref) => toSidebarSlug(ref.slug) === slug);
}

/** Posición en `nav` de la sección a la que pertenece `slug`, o `-1` si no pertenece a ninguna. */
export function sectionIndexOf(nav: readonly NavItem[] | undefined, slug: string): number {
  return (nav ?? []).findIndex((item) => isNavSection(item) && sectionOwns(item, slug));
}

/** Un error por incoherencia de `nav` con las páginas reales; devuelve la lista para sumarla a los demás fallos de la carga. */
export function validateNav(nav: readonly NavItem[], pageSlugs: ReadonlySet<string>): DocsError[] {
  const errors: DocsError[] = [];
  const sections = nav.filter(isNavSection);

  const indexed = nav.flatMap((item, index) =>
    isNavSection(item) ? [{ section: item, index }] : [],
  );
  nav.forEach((item, index) => {
    if (isNavSection(item)) errors.push(...validateSection(item, index, pageSlugs, indexed));
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
        const owner = sections.find((section) => sectionOwns(section, slug));
        if (owner) {
          errors.push(
            new DocsError(
              `${at}: «${item.slug}» pertenece a la sección «${sectionName(owner)}»; una página suelta no puede vivir dentro de una sección.`,
              { hint: 'Quítala del `nav` y deja que la sección la enlace desde su sidebar.' },
            ),
          );
        }
      }
    }
  });
  return errors;
}

/** Cómo se nombra una sección en los mensajes: por su carpeta o, sin ella, por su posición. */
function sectionName(section: NavSection): string {
  return section.dir ?? resolveSectionLabel(section);
}

function resolveSectionLabel(section: NavSection): string {
  const { label } = section;
  return typeof label === 'string' ? label : (Object.values(label)[0] ?? '');
}

function validateSection(
  section: NavSection,
  index: number,
  pageSlugs: ReadonlySet<string>,
  all: readonly { section: NavSection; index: number }[],
): DocsError[] {
  const errors: DocsError[] = [];
  if (section.dir !== undefined && ![...pageSlugs].some((slug) => slugInDir(section.dir!, slug))) {
    errors.push(
      new DocsError(
        `${formatPath(['nav', index, 'dir'])}: no hay ninguna página en «${section.dir}».`,
        { hint: 'Revisa el nombre de la carpeta: es el prefijo del slug de sus páginas.' },
      ),
    );
  }
  for (const { slug, path } of sidebarSlugRefs(section.sidebar ?? [], ['nav', index, 'sidebar'])) {
    const at = formatPath(path);
    const internal = toSidebarSlug(slug);
    if (slug === '' || !pageSlugs.has(internal)) {
      errors.push(
        new DocsError(`${at}: no hay ninguna página con el slug «${slug}».`, {
          hint: `Revisa el slug o créala. La portada se escribe '${HOME_SIDEBAR_SLUG}'.`,
        }),
      );
      continue;
    }
    // Con dos secciones por la misma página se señala la segunda; la dueña por carpeta cuenta aunque vaya detrás.
    const owner = all.find(
      (other) =>
        other.index !== index &&
        (other.index < index
          ? sectionOwns(other.section, internal)
          : other.section.dir !== undefined && slugInDir(other.section.dir, internal)),
    );
    if (owner) {
      errors.push(
        new DocsError(
          `${at}: «${slug}» ya es de la sección nav[${owner.index}]; una página no puede ser de dos secciones.`,
          { hint: 'Déjala en el sidebar de una sola.' },
        ),
      );
    }
  }
  return errors;
}
