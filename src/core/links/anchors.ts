import { DocsError } from '../errors';
import type { Locale } from '../i18n/locale';
import type { LinkRef } from './rewrite';

/** Ids de encabezado por página (slug + idioma). */
export type HeadingIndex = Map<string, ReadonlySet<string>>;

export const headingKey = (slug: string, locale: Locale): string => `${locale}:${slug}`;

function decode(anchor: string): string {
  try {
    return decodeURIComponent(anchor);
  } catch {
    return anchor;
  }
}

/** Anclas que no coinciden con el id de ningún encabezado del destino, con archivo y línea. */
export function validateAnchors(refs: LinkRef[], headings: HeadingIndex): DocsError[] {
  const errors: DocsError[] = [];
  for (const ref of refs) {
    if (!ref.anchor) continue;
    const ids = headings.get(headingKey(ref.slug, ref.locale));
    if (ids?.has(ref.anchor) || ids?.has(decode(ref.anchor))) continue;
    errors.push(
      new DocsError(
        `El ancla «#${ref.anchor}» no existe en «${ref.slug || '(portada)'}» (${ref.locale}).`,
        {
          file: ref.file,
          line: ref.line,
          hint: 'Los ids siguen las reglas de github-slugger: minúsculas, acentos conservados y -n si se repiten.',
        },
      ),
    );
  }
  return errors;
}
