/** Aviso de una imagen SEO: no rompe el build, se muestra por `logger.warn`. */
export interface SeoWarning {
  code: 'aspect' | 'size';
  message: string;
}

/* 1200×630 es la proporción que esperan Facebook y WhatsApp para la previsualización. */
const TARGET_RATIO = 1200 / 630;
const RATIO_TOLERANCE = 0.02;
const MAX_BYTES = 300 * 1024;

/** Avisos de una imagen: proporción lejos de ≈1,91:1 (±2 %) o más de 300 KB (WhatsApp). */
export function checkImage(info: { width: number; height: number; bytes: number }): SeoWarning[] {
  const warnings: SeoWarning[] = [];
  const ratio = info.height > 0 ? info.width / info.height : Number.NaN;
  if (!(Math.abs(ratio - TARGET_RATIO) / TARGET_RATIO <= RATIO_TOLERANCE)) {
    warnings.push({
      code: 'aspect',
      message: `La imagen mide ${info.width}×${info.height}; la previsualización espera ≈1,91:1 (1200×630, ±2 %).`,
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
