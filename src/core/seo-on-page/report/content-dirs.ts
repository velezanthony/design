import type { Locale } from '../../i18n/locale';
import type { SeoTree } from '../tree/types';

/** Prefijo común, por carpetas enteras, de las páginas nativas; externas y del cliente quedan fuera. */
export function contentDirs(tree: SeoTree): Partial<Record<Locale, string>> {
  const folders = new Map<Locale, string[][]>();
  for (const page of tree.pages) {
    if (page.kind !== 'native') continue;
    const parts = page.sourcePath.split('/').slice(0, -1);
    folders.set(page.locale, [...(folders.get(page.locale) ?? []), parts]);
  }
  const directories: Partial<Record<Locale, string>> = {};
  for (const [locale, all] of folders) {
    const [first = [], ...rest] = all;
    const common = rest.reduce((prefix, parts) => {
      let length = 0;
      while (length < prefix.length && prefix[length] === parts[length]) length++;
      return prefix.slice(0, length);
    }, first);
    directories[locale] = common.length === 0 ? '' : `${common.join('/')}/`;
  }
  return directories;
}
