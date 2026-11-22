import type { ResolvedConfig } from '../config/resolve';
import type { Page } from '../content/discovery';
import { DocsError } from '../errors';

/** Una imagen SEO declarada en algún sitio: de qué campo viene y, si es de una página, de cuál. */
export interface ImageRef {
  src: string;
  field: string;
  file?: string;
}

const FIELD = 'seo.image.src';

/** Imágenes SEO de la config base y de los overrides de cada página (frontmatter o `external`). */
export function collectImageRefs(
  base: ResolvedConfig['site']['seo']['image'],
  pages: readonly Page[],
): ImageRef[] {
  return [
    ...(base ? [{ src: base.src, field: FIELD }] : []),
    ...pages.flatMap((page) =>
      page.seo?.image ? [{ src: page.seo.image.src, field: FIELD, file: page.sourcePath }] : [],
    ),
  ];
}

/** Las URLs https no se comprueban: no hay red en el build ni dimensiones que leer. */
export function isRemoteImage(src: string): boolean {
  return src.startsWith('https://');
}

/** Ruta de una imagen de `public/` sin la barra inicial: `/img/og.png` → `img/og.png`. */
export function publicImagePath(src: string): string {
  return src.slice(1);
}

/** Un error por imagen local que no existe, con archivo y campo; el adaptador dice cuáles existen. */
export function imageErrors(refs: readonly ImageRef[], existing: ReadonlySet<string>): DocsError[] {
  return refs
    .filter((ref) => !isRemoteImage(ref.src) && !existing.has(ref.src))
    .map(
      (ref) =>
        new DocsError(`${ref.field}: la imagen «${ref.src}» no existe en \`public/\`.`, {
          ...(ref.file !== undefined && { file: ref.file }),
          hint: 'Coloca el archivo en `public/` o usa una URL https.',
        }),
    );
}
