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

/** URL de una página (sin idioma ni base): su `slug` del frontmatter o, sin él, su identidad. */
export function urlSlugOf(page: { slug: string; urlSlug?: string }): string {
  return page.urlSlug ?? page.slug;
}

/** Lo que tiene mal un `slug` del frontmatter y cómo arreglarlo. */
export interface SlugProblem {
  message: string;
  hint: string;
}

/** Un segmento de URL: letras y números de cualquier alfabeto, `-`, `_` y `.`. */
const SEGMENT = /^[\p{L}\p{N}_.-]+$/u;
const SHAPE_HINT =
  'Escribe la ruta completa relativa a la raíz del contenido, sin idioma, base ni barras en los extremos: `articles/mi-pagina`.';

/** `undefined` si `slug` vale como URL de una página; si no, la razón y la pista. */
export function slugProblem(slug: string, locales: readonly Locale[]): SlugProblem | undefined {
  if (slug.trim() === '') {
    return {
      message: 'está vacío',
      hint: 'Quita `slug` para usar la URL que sale del nombre del archivo, o escribe la ruta completa (`articles/mi-pagina`).',
    };
  }
  if (slug.startsWith('/') || slug.endsWith('/')) {
    return { message: 'empieza o termina por `/`', hint: SHAPE_HINT };
  }
  const segments = slug.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    return { message: 'tiene `..` o `.` como segmento', hint: SHAPE_HINT };
  }
  if (segments.some((segment) => segment === '')) {
    return { message: 'tiene un segmento vacío (`//`)', hint: SHAPE_HINT };
  }
  const invalid = [
    ...new Set(
      segments.flatMap((segment) =>
        SEGMENT.test(segment) ? [] : [...segment].filter((char) => !SEGMENT.test(char)),
      ),
    ),
  ];
  if (invalid.length > 0) {
    return {
      message: `tiene caracteres no válidos: ${invalid.map((char) => `«${char}»`).join(' ')}`,
      hint: 'Usa letras, números, `-`, `_` y `.`, con `/` entre carpetas.',
    };
  }
  const [first] = segments;
  if (first !== undefined && locales.includes(first)) {
    return {
      message: `empieza por el código de idioma «${first}»`,
      hint: 'El prefijo de idioma lo añade la librería según el archivo (`x.en.md` → `/en/…`): escribe `articles/x`, no `en/articles/x`.',
    };
  }
  if (segments.at(-1) === 'index') {
    return {
      message: 'termina en `/index`',
      hint: 'Escribe la URL de la carpeta (`guide`), sin `/index`.',
    };
  }
  return undefined;
}

/** Dueño de una URL en un idioma; `explicit` si la fija un `slug` del frontmatter. */
export interface UrlOwner extends SlugOwner {
  explicit: boolean;
}

/** Un error por cada URL (slug, idioma) que reclaman varios archivos cuando al menos uno la fija con `slug`; sin `slug`, el choque es de identidad y lo cuenta `findSlugCollisions`. */
export function findUrlCollisions(owners: UrlOwner[]): DocsError[] {
  const byKey = new Map<string, UrlOwner[]>();
  for (const owner of owners) {
    const key = `${owner.locale}\0${owner.slug}`;
    byKey.set(key, [...(byKey.get(key) ?? []), owner]);
  }
  return [...byKey.values()]
    .filter((group): group is [UrlOwner, ...UrlOwner[]] => group.length > 1)
    .filter((group) => group.some((owner) => owner.explicit))
    .map((group) => {
      const first = group.find((owner) => owner.explicit) ?? group[0];
      const files = group.map((owner) => (owner.explicit ? `${owner.file} (slug)` : owner.file));
      return new DocsError(
        `La URL «${first.slug || '(portada)'}» (${first.locale}) la reclaman varios archivos: ${files.join(', ')}.`,
        {
          file: first.file,
          hint: 'Cambia el `slug` del frontmatter: cada página necesita una URL propia en su idioma.',
        },
      );
    });
}
