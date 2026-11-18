import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageMetadata } from 'astro/assets/utils';
import type { DocsError } from '../../core/errors';
import { checkImage } from '../../core/seo/image-checks';
import {
  imageErrors,
  isRemoteImage,
  publicImagePath,
  type ImageRef,
} from '../../core/seo/image-refs';

interface LocalImage {
  bytes: Buffer;
  width?: number;
  height?: number;
}

/** Lee la imagen de `public/`; `undefined` si no existe o si la ruta se sale de `public/`. */
export async function readPublic(publicDir: URL, src: string): Promise<Buffer | undefined> {
  const base = fileURLToPath(publicDir);
  const file = path.resolve(base, publicImagePath(src));
  if (!file.startsWith(path.join(base, path.sep))) return undefined;
  return readFile(file).catch(() => undefined);
}

async function inspect(bytes: Buffer): Promise<LocalImage> {
  try {
    const { width, height } = await imageMetadata(new Uint8Array(bytes));
    return { bytes, width, height };
  } catch {
    return { bytes };
  }
}

function where(ref: ImageRef) {
  return ref.file ? `${ref.file}: ` : '';
}

/**
 * Comprueba las imágenes SEO: las locales tienen que existir bajo `public/` (error, todos juntos) y
 * se miden con `imageMetadata` de Astro para los avisos de proporción y peso (`checkImage`). Las
 * https no se tocan: sin red ni dimensiones. Cada archivo se lee una sola vez.
 */
export async function checkSeoImages(
  refs: readonly ImageRef[],
  publicDir: URL,
): Promise<{ errors: DocsError[]; warnings: string[] }> {
  const images = new Map<string, LocalImage | undefined>();
  for (const src of new Set(refs.filter((ref) => !isRemoteImage(ref.src)).map((ref) => ref.src))) {
    const bytes = await readPublic(publicDir, src);
    images.set(src, bytes && (await inspect(bytes)));
  }
  const existing = new Set([...images].filter(([, image]) => image).map(([src]) => src));
  const warnings = refs.flatMap((ref) => {
    const image = images.get(ref.src);
    if (!image) return [];
    if (image.width === undefined || image.height === undefined) {
      return [`${where(ref)}${ref.field}: no se pudieron leer las dimensiones de «${ref.src}».`];
    }
    return checkImage({ width: image.width, height: image.height, bytes: image.bytes.length }).map(
      (warning) => `${where(ref)}${ref.field} («${ref.src}»): ${warning.message}`,
    );
  });
  return { errors: imageErrors(refs, existing), warnings };
}

/**
 * Dimensiones de las imágenes locales (las que cuelgan de `public/`), por su `src`, para emitir
 * `og:image:width/height`. Las https, las ausentes y las ilegibles no figuran: el head las emite
 * sin tamaño (la validación y los avisos ya los dio `checkSeoImages` en la carga).
 */
export async function readImageSizes(
  srcs: Iterable<string>,
  publicDir: URL,
): Promise<Map<string, { width: number; height: number }>> {
  const sizes = new Map<string, { width: number; height: number }>();
  for (const src of new Set(srcs)) {
    if (isRemoteImage(src)) continue;
    const bytes = await readPublic(publicDir, src);
    const image = bytes && (await inspect(bytes));
    if (image?.width !== undefined && image.height !== undefined) {
      sizes.set(src, { width: image.width, height: image.height });
    }
  }
  return sizes;
}
