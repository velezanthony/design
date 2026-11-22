import { folderKeyPath, folderSettings, type ResolvedFolders } from '../config/folders';
import { DocsError } from '../errors';
import type { Locale } from '../i18n/locale';
import type { Page, PageKind } from './discovery';
import { isListingFile } from './slug';

/* Los índices generados. Si una carpeta tiene uno lo decide `folders` (`listing.generate`, heredable):
   - con `index.md` (página escrita a mano), gana el `index.md` y el loader lo informa;
   - con `_index.md`, la página del índice es la suya: pone el H1, la entradilla y el `seo`;
   - sin ninguno, se genera una página por idioma: solo el título y el listado;
   - un `_index.md` en una carpeta sin `generate` es un error (casi seguro, un olvido).
   El título de una carpeta sin `_index.md` llega por un puerto (`labelOf`): sale de la navegación, que
   este módulo no conoce. */

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

/** ¿Lista esta página su carpeta? Las generadas y las de un `_index.md` (en cualquier idioma). Sin `kind`, nativa (el valor por defecto de la colección). */
export function listsFolder(page: { kind?: PageKind; sourcePath: string }): boolean {
  const kind = page.kind ?? 'native';
  return kind === 'generated' || (kind === 'native' && isListingFile(page.sourcePath));
}

/** ¿Tiene la carpeta `generate` encendido, propio o heredado? */
function generates(folders: ResolvedFolders, folder: string): boolean {
  return folderSettings(folders, folder).listing.generate.value;
}

/** Páginas de cada carpeta (las que tienen por slug la propia carpeta), por carpeta. */
function folderPages(pages: readonly Page[]): Map<string, Page[]> {
  const byFolder = new Map<string, Page[]>();
  for (const page of pages) byFolder.set(page.slug, [...(byFolder.get(page.slug) ?? []), page]);
  return byFolder;
}

/** Carpetas con índice generado: `generate` efectivo y sin `index.md`. Incluye la raíz si tiene `_index.md`. */
export function listingFolders(pages: readonly Page[], folders: ResolvedFolders): string[] {
  const own = folderPages(pages);
  const candidates = new Set(contentFolders(pages.map((page) => page.slug)));
  if (own.get('')?.some(listsFolder)) candidates.add('');
  return [...candidates].filter(
    (folder) =>
      generates(folders, folder) && !(own.get(folder) ?? []).some((page) => !listsFolder(page)),
  );
}

/** Carpetas con `generate` efectivo cuyo índice es un `index.md` (o un README): una por carpeta, con el archivo del idioma por defecto. */
export function replacedListings(
  pages: readonly Page[],
  folders: ResolvedFolders,
): { folder: string; file: string }[] {
  const own = folderPages(pages);
  return contentFolders(pages.map((page) => page.slug)).flatMap((folder) => {
    const handwritten = (own.get(folder) ?? []).filter((page) => !listsFolder(page));
    if (handwritten.length === 0 || !generates(folders, folder)) return [];
    // El archivo sin sufijo de idioma (`index.md`) antes que sus traducciones (`index.en.md`).
    const [first] = handwritten
      .map((page) => page.sourcePath)
      .sort((left, right) => left.split('.').length - right.split('.').length);
    return [{ folder, file: first! }];
  });
}

/** Un error por cada `_index.md` de una carpeta sin `generate` efectivo, con la clave que lo enciende. */
export function listingSourceErrors(pages: readonly Page[], folders: ResolvedFolders): DocsError[] {
  return pages
    .filter((page) => page.kind === 'native' && listsFolder(page))
    .filter((page) => !generates(folders, page.slug))
    .map(
      (page) =>
        new DocsError('Este `_index.md` no se publica: su carpeta no tiene índice generado.', {
          file: page.sourcePath,
          hint: `Enciéndelo en la config con \`${folderKeyPath(page.slug, 'listing', 'generate')}: true\`, o borra el archivo.`,
        }),
    );
}

/** Escapa lo que el Markdown leería como formato: el título generado es texto. */
function plainMarkdown(text: string): string {
  return text.replace(/[\\`*_[\]<>#~|!]/g, (char) => `\\${char}`);
}

/** Lo que hace falta para generar las páginas de los índices. */
export interface GeneratedListingOptions {
  folders: ResolvedFolders;
  locales: readonly Locale[];
  /** Título de una carpeta sin `_index.md` (`folderTitles`, de la navegación). */
  labelOf: (folder: string, locale: Locale) => string;
  /** Descripción SEO de un índice sin `_index.md` (`listing.description`, con `{title}`). */
  describe: (title: string, locale: Locale) => string;
}

/** Páginas generadas, una por idioma, de cada carpeta con índice generado que no tiene `_index.md` (en ningún idioma). Su cuerpo es solo el título; el listado lo añade la ruta. `sourcePath` es el `_index.md` que tendría la carpeta. */
export function generatedListingPages(
  pages: readonly Page[],
  { folders, locales, labelOf, describe }: GeneratedListingOptions,
): Page[] {
  const taken = new Set(pages.map((page) => page.slug));
  return listingFolders(pages, folders)
    .filter((folder) => !taken.has(folder))
    .flatMap((folder) =>
      locales.map((locale): Page => {
        const title = labelOf(folder, locale);
        return {
          slug: folder,
          locale,
          title,
          kind: 'generated',
          sourcePath: `${folder}/_index.md`,
          body: `# ${plainMarkdown(title)}\n`,
          seo: { description: describe(title, locale) },
        };
      }),
    );
}
