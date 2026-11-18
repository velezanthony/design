import { DocsError } from '../errors';
import type { Locale } from '../i18n/locale';

/** `guide/index` → `guide`; `index` → `` (portada). Solo colapsa el segmento completo `index`. */
export function toSlug(stem: string): string {
  if (stem === 'index') return '';
  return stem.endsWith('/index') ? stem.slice(0, -'/index'.length) : stem;
}

export interface SlugOwner {
  slug: string;
  locale: Locale;
  file: string;
}

/** Un error por cada par (slug, idioma) con más de un archivo, nombrándolos todos. */
export function findSlugCollisions(owners: SlugOwner[]): DocsError[] {
  const byKey = new Map<string, SlugOwner[]>();
  for (const owner of owners) {
    const key = `${owner.locale}\0${owner.slug}`;
    byKey.set(key, [...(byKey.get(key) ?? []), owner]);
  }
  return [...byKey.values()]
    .filter((group): group is [SlugOwner, ...SlugOwner[]] => group.length > 1)
    .map((group) => {
      const files = group.map((owner) => owner.file);
      return new DocsError(
        `El slug «${group[0].slug || '(portada)'}» (${group[0].locale}) lo reclaman varios archivos: ${files.join(', ')}.`,
        { file: files[0], hint: 'Deja un solo archivo por slug e idioma.' },
      );
    });
}
