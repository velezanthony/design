import type { CoverView, EntryCover, IndexView } from '../../core/navigation/index-entries';
import { withBase } from '../../core/shared/urls';

/** Lo que `astro:assets` sabe de una imagen importada; aquí basta con reconocerla. */
export interface ImageAsset {
  src: string;
  width: number;
  height: number;
}

/** Convierte una imagen importada en la URL que se pinta (en la ruta, con `getImage`). */
export type OptimizeImage = (asset: ImageAsset) => Promise<string>;

function isImageAsset(value: unknown): value is ImageAsset {
  return typeof value === 'object' && value !== null && 'src' in value && 'width' in value;
}

async function coverView(
  cover: EntryCover,
  base: string,
  optimize: OptimizeImage,
): Promise<CoverView> {
  if (cover.kind !== 'image') return cover;
  const { source, alt } = cover;
  if ('src' in source) return { kind: 'image', src: withBase(base, source.src), alt };
  /* Con `docsSchema()` sin `image` la ruta no llega a imagen: no hay URL que servir. */
  if (!isImageAsset(source.asset)) return { kind: 'placeholder' };
  return { kind: 'image', src: await optimize(source.asset), alt };
}

/** El índice con cada portada lista para pintar: las de `public/` con la base y las procesadas con `optimize`. */
export async function resolveCovers(
  view: IndexView,
  base: string,
  optimize: OptimizeImage,
): Promise<IndexView<CoverView>> {
  const items = await Promise.all(
    view.items.map(async (item) => ({
      ...item,
      cover: await coverView(item.cover, base, optimize),
    })),
  );
  return { ...view, items };
}
