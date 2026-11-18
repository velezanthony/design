/** Aviso de una imagen SEO: no rompe el build, se muestra por `logger.warn`. */
export interface SeoWarning {
  code: 'aspect' | 'size';
  message: string;
}

/** La imagen social de las tarjetas grandes: 1200×630 (≈1,91:1); con otra proporción se recorta. */
export const OG_IMAGE = { width: 1200, height: 630, ratioTolerance: 0.02 } as const;

const TARGET_RATIO = OG_IMAGE.width / OG_IMAGE.height;
const MAX_BYTES = 300 * 1024;

/** Avisos de una imagen: proporción lejos de ≈1,91:1 (±2 %) o más de 300 KB (WhatsApp). */
export function checkImage(info: { width: number; height: number; bytes: number }): SeoWarning[] {
  const warnings: SeoWarning[] = [];
  const ratio = info.height > 0 ? info.width / info.height : Number.NaN;
  if (!(Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO <= OG_IMAGE.ratioTolerance)) {
    warnings.push({
      code: 'aspect',
      message: `La imagen mide ${info.width}×${info.height}; la previsualización espera ≈1,91:1 (${OG_IMAGE.width}×${OG_IMAGE.height}, ±${OG_IMAGE.ratioTolerance * 100} %).`,
    });
  }
  if (info.bytes > MAX_BYTES) {
    warnings.push({
      code: 'size',
      message: `La imagen pesa ${Math.round(info.bytes / 1024)} KB y supera los 300 KB que admite la previsualización de WhatsApp.`,
    });
  }
  return warnings;
}
