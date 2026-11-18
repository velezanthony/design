import { THRESHOLDS } from '../../thresholds';
import { IssueKind } from '../../tree/types';

/** El rango recomendado de un campo: caracteres y ancho aproximado en píxeles. */
export interface Limit {
  min: number;
  max: number;
  maxPx: number;
}

const TITLE_LIMIT: Limit = {
  min: THRESHOLDS.titleMin,
  max: THRESHOLDS.titleMax,
  maxPx: THRESHOLDS.titleMaxPx,
};
const DESCRIPTION_LIMIT: Limit = {
  min: THRESHOLDS.descriptionMin,
  max: THRESHOLDS.descriptionMax,
  maxPx: THRESHOLDS.descriptionMaxPx,
};

/** El límite contra el que se mide un problema, si es de longitud; los demás no tienen. */
export function limitOf(kind: IssueKind): Limit | undefined {
  switch (kind) {
    case IssueKind.TITLE_TOO_LONG:
    case IssueKind.TITLE_TOO_SHORT:
      return TITLE_LIMIT;
    case IssueKind.DESCRIPTION_MISSING:
    case IssueKind.DESCRIPTION_INHERITED:
    case IssueKind.DESCRIPTION_TOO_LONG:
    case IssueKind.DESCRIPTION_TOO_SHORT:
      return DESCRIPTION_LIMIT;
    default:
      return undefined;
  }
}

const quoted = (slugs: readonly string[]) => slugs.map((slug) => `«${slug || '/'}»`).join(', ');

/**
 * Cómo comprobar que el problema está arreglado, en una frase y sin mirar fuera del panel: dónde
 * cambia lo que se ve. `related` son los slugs de las páginas con las que chocaba (un duplicado
 * desaparece también de ellas).
 */
export function verifyFor(kind: IssueKind, related: readonly string[]): string {
  const where = related.length > 0 ? ` aquí y en ${quoted(related)}` : ' aquí';
  switch (kind) {
    case IssueKind.TITLE_TOO_LONG:
      return `El título de «Lo que se publica» mide ${THRESHOLDS.titleMax} caracteres o menos.`;
    case IssueKind.TITLE_TOO_SHORT:
      return `El título de «Lo que se publica» mide ${THRESHOLDS.titleMin} caracteres o más.`;
    case IssueKind.DUPLICATE_TITLE:
    case IssueKind.DUPLICATE_DESCRIPTION:
      return `Este aviso desaparece${where}.`;
    case IssueKind.DESCRIPTION_MISSING:
    case IssueKind.DESCRIPTION_INHERITED:
      return '«Fuente» de la descripción pasa a «De la página» en «Lo que se publica».';
    case IssueKind.DESCRIPTION_TOO_SHORT:
      return `La descripción de «Lo que se publica» mide ${THRESHOLDS.descriptionMin} caracteres o más.`;
    case IssueKind.DESCRIPTION_TOO_LONG:
      return `La descripción de «Lo que se publica» mide ${THRESHOLDS.descriptionMax} caracteres o menos.`;
    case IssueKind.NO_H1:
      return '«Encabezados» cuenta un H1.';
    case IssueKind.MULTIPLE_H1:
      return '«Encabezados» cuenta un solo H1.';
    case IssueKind.HEADING_SKIP:
      return '«Encabezados» ya no marca ningún salto de nivel.';
    case IssueKind.TRANSLATION_MISSING:
      return 'El idioma que faltaba aparece en «Traducciones» como presente.';
    case IssueKind.TRANSLATION_POLICY_CONFLICT:
      return 'Todos los archivos de la página declaran la misma política en `translations`.';
    case IssueKind.CANONICAL_MISMATCH:
      return '«Traducciones» muestra para este idioma la misma URL que el canonical de «Lo que se publica».';
    case IssueKind.LINK_TO_NOINDEX:
      return 'Este aviso desaparece de aquí (o la página enlazada deja de ser noindex).';
    case IssueKind.ORPHAN_PAGE:
      return 'Este aviso desaparece: alguna otra página, o la navegación, ya enlaza a esta.';
    case IssueKind.IMAGE_ALT_MISSING:
      return 'Este aviso desaparece: todas las imágenes de la página llevan texto alternativo.';
    case IssueKind.OG_IMAGE_SIZE:
      return `La imagen de «Lo que se publica» mide ${THRESHOLDS.ogWidth}×${THRESHOLDS.ogHeight} (o la misma proporción, más grande).`;
  }
}
