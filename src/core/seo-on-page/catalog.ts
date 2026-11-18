import { THRESHOLDS } from './thresholds';
import { slugLabel } from './tree/keys';
import { IssueKind, IssueSeverity } from './tree/types';

/** `rule` es un hecho; `heuristic` una recomendación (Google no fija límites, recorta por ancho). */
export type Certainty = 'rule' | 'heuristic';

/** El rango recomendado de un campo: caracteres y ancho aproximado en píxeles. */
export interface Limit {
  min: number;
  max: number;
  maxPx: number;
}

/** Lo que el dominio sabe de un tipo de problema; quien lo muestra o lo cuenta lo lee de aquí. */
export interface IssueRule {
  /** La de por defecto; un analizador puede fijar otra según el caso (traducciones, imagen social). */
  severity: IssueSeverity;
  certainty: Certainty;
  /** El rango contra el que se mide, si es un problema de longitud. */
  limit?: Limit;
  /** Clave de frontmatter que lo arregla. */
  key?: string;
  /** Lo que NO hacer o el rango pedido; los límites de longitud salen de `limit`. */
  restriction?: string;
  /** En español porque el informe se pega en una conversación con la IA de quien mantiene un sitio en español. */
  why: string;
  /** Cómo se arregla en general, para cuando afecta a varias páginas con archivos distintos. */
  fix: string;
  /** Dónde cambia lo que se ve; `related` son las páginas con las que chocaba un duplicado. */
  verify: (related: readonly string[]) => string;
}

const OG_SIZE = `${THRESHOLDS.ogWidth}×${THRESHOLDS.ogHeight}`;

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

function quoted(slugs: readonly string[]) {
  return slugs.map((slug) => `«${slugLabel(slug)}»`).join(', ');
}

/** «aquí», o «aquí y en …» cuando el duplicado choca con otras páginas. */
function disappears(related: readonly string[]) {
  return `Este aviso desaparece${related.length > 0 ? ` aquí y en ${quoted(related)}` : ' aquí'}.`;
}

export const CATALOG: Record<IssueKind, IssueRule> = {
  [IssueKind.TITLE_TOO_LONG]: {
    severity: IssueSeverity.WARNING,
    certainty: 'heuristic',
    limit: TITLE_LIMIT,
    key: 'seo.title',
    why: 'Google recorta los títulos largos con «…» y lo recortado no se lee.',
    fix: 'Acorta el título sin perder lo que distingue a la página.',
    verify: () =>
      `El título de «Lo que se publica» mide ${THRESHOLDS.titleMax} caracteres o menos.`,
  },
  [IssueKind.TITLE_TOO_SHORT]: {
    severity: IssueSeverity.WARNING,
    certainty: 'heuristic',
    limit: TITLE_LIMIT,
    key: 'seo.title',
    why: 'Un título de una palabra no dice qué es la página en el resultado y Google suele reescribirlo.',
    fix: 'Alarga el título hasta que diga qué es la página.',
    verify: () => `El título de «Lo que se publica» mide ${THRESHOLDS.titleMin} caracteres o más.`,
  },
  [IssueKind.DESCRIPTION_MISSING]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    limit: DESCRIPTION_LIMIT,
    key: 'seo.description',
    why: 'Sin descripción, Google improvisa el fragmento con texto del cuerpo.',
    fix: 'Escribe una descripción propia, un resumen de la página.',
    verify: () => '«Fuente» de la descripción pasa a «De la página» en «Lo que se publica».',
  },
  [IssueKind.DESCRIPTION_INHERITED]: {
    severity: IssueSeverity.INFO,
    certainty: 'rule',
    limit: DESCRIPTION_LIMIT,
    key: 'seo.description',
    why: 'Enseña la descripción genérica del sitio en vez de la de esta página.',
    fix: 'Escribe una descripción propia, un resumen de la página.',
    verify: () => '«Fuente» de la descripción pasa a «De la página» en «Lo que se publica».',
  },
  [IssueKind.DESCRIPTION_TOO_LONG]: {
    severity: IssueSeverity.WARNING,
    certainty: 'heuristic',
    limit: DESCRIPTION_LIMIT,
    key: 'seo.description',
    why: 'Google corta las descripciones largas y se pierde el final.',
    fix: 'Acorta la descripción conservando lo esencial.',
    verify: () =>
      `La descripción de «Lo que se publica» mide ${THRESHOLDS.descriptionMax} caracteres o menos.`,
  },
  [IssueKind.DESCRIPTION_TOO_SHORT]: {
    severity: IssueSeverity.INFO,
    certainty: 'heuristic',
    limit: DESCRIPTION_LIMIT,
    key: 'seo.description',
    why: 'Con un fragmento tan corto, el buscador tiende a sustituirlo por texto del cuerpo.',
    fix: 'Amplía la descripción con lo que ofrece la página.',
    verify: () =>
      `La descripción de «Lo que se publica» mide ${THRESHOLDS.descriptionMin} caracteres o más.`,
  },
  [IssueKind.DUPLICATE_TITLE]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    key: 'seo.title',
    restriction: 'No cambies el slug ni la URL para distinguirlas.',
    why: 'Google solo enseña una de las páginas con el mismo título y la otra compite con ella.',
    fix: 'Dale a cada página un título que la distinga de las otras.',
    verify: disappears,
  },
  [IssueKind.DUPLICATE_DESCRIPTION]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    key: 'seo.description',
    restriction: 'No cambies el slug ni la URL para distinguirlas.',
    why: 'Varias páginas enseñan el mismo fragmento: el lector no distingue una de otra.',
    fix: 'Escribe una descripción distinta para cada página.',
    verify: disappears,
  },
  [IssueKind.NO_H1]: {
    severity: IssueSeverity.ERROR,
    certainty: 'rule',
    why: 'Sin H1 no hay un encabezado principal que diga de qué trata la página.',
    fix: 'Empieza el archivo con un encabezado `# Título`.',
    verify: () => '«Encabezados» cuenta un H1.',
  },
  [IssueKind.MULTIPLE_H1]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    why: 'Más de un H1 diluye de qué trata la página.',
    fix: 'Deja un solo `#` y baja los demás H1 a `##`.',
    verify: () => '«Encabezados» cuenta un solo H1.',
  },
  [IssueKind.HEADING_SKIP]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    why: 'Saltarse un nivel rompe la estructura que leen los buscadores y los lectores de pantalla.',
    fix: 'Ajusta el nivel del encabezado para que siga al anterior.',
    verify: () => '«Encabezados» ya no marca ningún salto de nivel.',
  },
  [IssueKind.TRANSLATION_MISSING]: {
    // La decide su analizador según la política de traducciones.
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    restriction:
      'No crees una traducción sin que te lo pidan: declarar la omisión es válido si es intencionado.',
    why: 'El lector en ese idioma no tiene versión propia de la página.',
    fix: 'Crea la traducción o declara `translations: omit` si es intencionado.',
    verify: () => 'El idioma que faltaba aparece en «Traducciones» como presente.',
  },
  [IssueKind.TRANSLATION_POLICY_CONFLICT]: {
    severity: IssueSeverity.ERROR,
    certainty: 'rule',
    key: 'translations',
    why: 'Los archivos del grupo no se ponen de acuerdo y la política que vale es ambigua.',
    fix: 'Haz que `translations` valga lo mismo en todos los archivos de la página.',
    verify: () => 'Todos los archivos de la página declaran la misma política en `translations`.',
  },
  [IssueKind.CANONICAL_MISMATCH]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    why: 'Si una versión se declara canónica de otro idioma, Google fusiona las dos y solo indexa una.',
    fix: 'No apuntes el canonical a otro idioma: cada versión es canónica de sí misma.',
    verify: () =>
      '«Traducciones» muestra para este idioma la misma URL que el canonical de «Lo que se publica».',
  },
  [IssueKind.LINK_TO_NOINDEX]: {
    severity: IssueSeverity.INFO,
    certainty: 'rule',
    why: 'Una página que se ve en los resultados empuja al lector y al rastreador hacia otra que no se indexa.',
    fix: 'Quita el enlace o deja de marcar como noindex la página si debe indexarse.',
    verify: () => 'Este aviso desaparece de aquí (o la página enlazada deja de ser noindex).',
  },
  [IssueKind.ORPHAN_PAGE]: {
    severity: IssueSeverity.INFO,
    certainty: 'rule',
    why: 'Sin enlaces entrantes, el rastreador solo la descubre por el sitemap y le llega poca autoridad.',
    fix: 'Enlaza la página desde otra o declárala en la navegación.',
    verify: () => 'Este aviso desaparece: alguna otra página, o la navegación, ya enlaza a esta.',
  },
  [IssueKind.IMAGE_ALT_MISSING]: {
    severity: IssueSeverity.WARNING,
    certainty: 'rule',
    restriction:
      'Describe lo que muestra la imagen; no repitas el nombre del archivo ni rellenes con palabras clave.',
    why: 'Sin texto alternativo, los lectores de pantalla y los buscadores no saben qué muestra la imagen.',
    fix: 'Escribe un texto alternativo que describa cada imagen.',
    verify: () =>
      'Este aviso desaparece: todas las imágenes de la página llevan texto alternativo.',
  },
  [IssueKind.OG_IMAGE_SIZE]: {
    // Warning si la proporción no es la de la tarjeta (se recorta); info si solo es pequeña: lo decide su analizador.
    severity: IssueSeverity.WARNING,
    certainty: 'heuristic',
    restriction: `${OG_SIZE} px (recomendación)`,
    why: 'Con otra proporción, las redes recortan la imagen en la tarjeta; más pequeña, se ve borrosa.',
    fix: `Usa una imagen social de ${OG_SIZE} px.`,
    verify: () =>
      `La imagen de «Lo que se publica» mide ${THRESHOLDS.ogWidth}×${THRESHOLDS.ogHeight} (o la misma proporción, más grande).`,
  },
};
