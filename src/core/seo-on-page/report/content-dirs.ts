import type { Locale } from '../../i18n/locale';
import type { SeoTree } from '../tree/types';

/**
 * La carpeta de contenido de cada idioma: el prefijo común, por carpetas enteras, de los archivos de
 * sus páginas nativas. Las externas y las del cliente se quedan fuera (sus archivos viven donde
 * diga la config o en `src/pages/`). Es lo que
 * permite al informe decir «en cada fichero de `src/content/docs/es/`» sin listarlos uno a uno.
 */
export function contentDirs(tree: SeoTree): Partial<Record<Locale, string>> {
  const folders = new Map<Locale, string[][]>();
  for (const page of tree.pages) {
    if (page.kind !== 'native') continue;
    const parts = page.sourcePath.split('/').slice(0, -1);
    folders.set(page.locale, [...(folders.get(page.locale) ?? []), parts]);
  }
  const dirs: Partial<Record<Locale, string>> = {};
  for (const [locale, all] of folders) {
    const [first = [], ...rest] = all;
    const common = rest.reduce((prefix, parts) => {
      let length = 0;
      while (length < prefix.length && prefix[length] === parts[length]) length++;
      return prefix.slice(0, length);
    }, first);
    dirs[locale] = common.length === 0 ? '' : `${common.join('/')}/`;
  }
  return dirs;
}
