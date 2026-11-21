import { fileURLToPath } from 'node:url';
import { getImage } from 'astro:assets';
import type { CoverView } from '../../core/listing/covers';
import type { IndexView } from '../../core/listing/view';
import type { DocData } from '../loader/schema';
import { docIndexView, listingFor } from '../views/doc-index';
import type { DocRoute } from '../views/doc';
import { resolveCovers, type ImageAsset } from '../views/index-covers';
import { lastModifiedDates } from './last-modified';
import { siteConfig } from './site-config';

/** Ancho máximo de una portada procesada: el de una tarjeta a dos columnas con densidad 2×. */
const COVER_WIDTH = 960;

async function optimize(asset: ImageAsset): Promise<string> {
  const image = await getImage({
    src: asset as Parameters<typeof getImage>[0]['src'],
    width: Math.min(COVER_WIDTH, asset.width),
  });
  return image.src;
}

/** El índice generado de la ruta, listo para pintar (fechas de commit y portadas con `astro:assets`), o `undefined` si su página no lleva listado. */
export async function loadDocIndex(
  route: DocRoute,
  data: DocData[],
  headings: { depth: number; slug: string; text: string }[],
): Promise<IndexView<CoverView> | undefined> {
  if (!listingFor(route, siteConfig, data)) return undefined;
  // Solo commits: lo que aún no está en git no lleva fecha (y va primero).
  const dates = await lastModifiedDates(
    fileURLToPath(siteConfig.root),
    data.map((item) => item.sourcePath),
    { committedOnly: true },
  );
  const view = docIndexView({ route, config: siteConfig, data, dates, headings });
  return view && resolveCovers(view, siteConfig.base, optimize);
}
