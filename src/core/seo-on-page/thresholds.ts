import { OG_IMAGE } from '../seo/image-checks';

/** Se miden en caracteres del texto FINAL (`<title>` con sufijo); son orientativos, los buscadores recortan por píxeles. */
export const THRESHOLDS = {
  /** Más de ~60 caracteres (≈ 600 px) se recorta con «…». */
  titleMax: 60,
  /** Menos de ~15 caracteres (sufijo incluido) Google suele reescribirlo. */
  titleMin: 15,
  /** Se enseña en ~155–160 caracteres en escritorio (menos en móvil). */
  descriptionMax: 160,
  /** Por debajo de ~70 el buscador tiende a sustituirlo por texto del cuerpo. */
  descriptionMin: 70,
  /** Mismos límites en píxeles (≈580 título, ≈920 descripción); se enseñan como estimación. */
  titleMaxPx: 580,
  descriptionMaxPx: 920,
  /** Más de un H1 diluye de qué trata la página: debe haber exactamente uno. */
  maxH1: 1,
  /** La imagen social: la misma medida y tolerancia con las que avisa el build. */
  ogWidth: OG_IMAGE.width,
  ogHeight: OG_IMAGE.height,
  ogRatioTolerance: OG_IMAGE.ratioTolerance,
} as const;
