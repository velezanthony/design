import { generatesIndex, type ResolvedIndexes } from '../config/indexes';
import { isNavSection, type NavItem } from '../config/nav';
import type { Locale } from '../i18n/locale';
import { resolveLabel } from '../navigation/label';
import { folderLabel } from '../shared/text';
import type { Page } from './discovery';

/* Las páginas que genera `indexes`: una por idioma en cada carpeta que activa y que no tiene
   `index.md` ni `_index.md`. Su cuerpo es el título y la entradilla; el listado lo añade la ruta. */

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

/** Título de la página generada de `folder`: el de `overrides`, la etiqueta de la sección de `nav` con ese `dir` o el nombre de la carpeta. */
export function generatedTitle({
  folder,
  locale,
  defaultLocale,
  indexes,
  nav,
}: {
  folder: string;
  locale: Locale;
  defaultLocale: Locale;
  indexes: ResolvedIndexes | undefined;
  nav: readonly NavItem[] | undefined;
}): string {
  const title = indexes?.overrides[folder]?.title;
  if (title !== undefined) return resolveLabel(title, locale, defaultLocale);
  const section = (nav ?? []).find((item) => isNavSection(item) && item.dir === folder);
  if (section) return resolveLabel(section.label, locale, defaultLocale);
  return folderLabel(folder);
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
export function generatedListingPages(pages: readonly Page[], config: GeneratedConfig): Page[] {
  const { indexes } = config;
  if (!indexes) return [];
  const taken = new Set(pages.map((page) => page.slug));
  return contentFolders(pages.map((page) => page.slug))
    .filter((folder) => !taken.has(folder) && generatesIndex(indexes, folder))
    .flatMap((folder) =>
      config.locales.map((locale): Page => {
        const title = generatedTitle({
          folder,
          locale,
          defaultLocale: config.defaultLocale,
          indexes,
          nav: config.nav,
        });
        const description = generatedDescription(folder, locale, config.defaultLocale, indexes);
        return {
          slug: folder,
          locale,
          title,
          kind: 'generated',
          sourcePath: `${folder}/_index.md`,
          body: `# ${plainMarkdown(title)}\n${description === undefined ? '' : `\n${plainMarkdown(description)}\n`}`,
          listing: {},
          ...(description !== undefined && { seo: { description } }),
        };
      }),
    );
}
