import { getImage } from 'astro:assets';

/** Lo que `astro:assets` sabe de una imagen importada (la misma forma que `ImageAsset` de las vistas). */
interface ImportedImage {
  src: string;
  width: number;
  height: number;
}

/** Ancho máximo de una portada procesada: el de una tarjeta a dos columnas con densidad 2×. */
const COVER_WIDTH = 960;

/** La URL de una portada importada, optimizada con `astro:assets` al ancho de una tarjeta. */
export async function optimizeCover(asset: ImportedImage): Promise<string> {
  const image = await getImage({
    src: asset as Parameters<typeof getImage>[0]['src'],
    width: Math.min(COVER_WIDTH, asset.width),
  });
  return image.src;
}
