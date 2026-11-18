import { THRESHOLDS } from '../thresholds';
import { IssueKind, IssueSeverity, type Issue, type MetaNode, type PageImage } from '../tree/types';
import { fixFor, type FixPage } from './fixes';
import { makeIssue } from './issue';

/** Cuántas imágenes se nombran en el mensaje; el resto se cuenta. */
const SHOWN = 3;

/** `![](x)` no distingue imagen decorativa de olvido, así que el alt vacío cuenta como ausente; la decorativa es `<img alt="">`. */
export function analyzeAltText(page: FixPage, images: PageImage[] | undefined): Issue[] {
  const missing = (images ?? []).filter((image) => image.alt === '');
  if (missing.length === 0) return [];
  const shown = missing.slice(0, SHOWN).map((image) => `«${image.src}»`);
  const rest = missing.length - shown.length;
  return [
    makeIssue(
      IssueKind.IMAGE_ALT_MISSING,
      page,
      `${missing.length === 1 ? 'Una imagen sin' : `${missing.length} imágenes sin`} texto alternativo: ${shown.join(', ')}${rest > 0 ? ` y ${rest} más` : ''}.`,
      {
        value: missing.length,
        fix: fixFor(IssueKind.IMAGE_ALT_MISSING, page, {
          images: missing.slice(0, SHOWN).map((image) => image.src),
        }),
      },
    ),
  ];
}

/** Recomendado 1200×630 (≈1,91:1): otra proporción se recorta en redes; menos de 1200 de ancho solo se ve peor. */
export function analyzeOgImage(
  page: FixPage,
  meta: Pick<MetaNode, 'ogImage' | 'ogImageSource'>,
): Issue[] {
  const { ogImage } = meta;
  if (ogImage?.width === undefined || ogImage.height === undefined) return [];
  const { width, height } = ogImage;
  const ideal = THRESHOLDS.ogWidth / THRESHOLDS.ogHeight;
  const cropped = Math.abs(width / height - ideal) / ideal > THRESHOLDS.ogRatioTolerance;
  if (!cropped && width >= THRESHOLDS.ogWidth) return [];
  const size = `${THRESHOLDS.ogWidth}×${THRESHOLDS.ogHeight}`;
  return [
    makeIssue(
      IssueKind.OG_IMAGE_SIZE,
      page,
      cropped
        ? `La imagen social mide ${width}×${height}: con otra proporción que ${size} las redes la recortan.`
        : `La imagen social mide ${width}×${height}, menos de los ${THRESHOLDS.ogWidth} px de ancho recomendados.`,
      {
        severity: cropped ? IssueSeverity.WARNING : IssueSeverity.INFO,
        value: width,
        limit: THRESHOLDS.ogWidth,
        fix: fixFor(IssueKind.OG_IMAGE_SIZE, page, {
          og: { source: meta.ogImageSource, width, height },
        }),
      },
    ),
  ];
}
