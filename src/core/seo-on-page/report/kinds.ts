import { estimateWidth } from '../pixels';
import { limitOf } from '../pages/inspector/fix-details';
import { IssueKind, type Issue, type SeoPage } from '../tree/types';

/**
 * Lo que el informe sabe de cada tipo de problema además de lo que ya dice el análisis: la clave que
 * se toca, por qué importa y cómo se arregla en general. El texto está en español porque el informe
 * es para pegarlo en una conversación con la IA de quien mantiene un sitio en español.
 */

type Field = 'title' | 'description';

const KEY: Record<IssueKind, string | undefined> = {
  [IssueKind.TITLE_TOO_LONG]: 'seo.title',
  [IssueKind.TITLE_TOO_SHORT]: 'seo.title',
  [IssueKind.DUPLICATE_TITLE]: 'seo.title',
  [IssueKind.DESCRIPTION_MISSING]: 'seo.description',
  [IssueKind.DESCRIPTION_INHERITED]: 'seo.description',
  [IssueKind.DESCRIPTION_TOO_LONG]: 'seo.description',
  [IssueKind.DESCRIPTION_TOO_SHORT]: 'seo.description',
  [IssueKind.DUPLICATE_DESCRIPTION]: 'seo.description',
  [IssueKind.NO_H1]: undefined,
  [IssueKind.MULTIPLE_H1]: undefined,
  [IssueKind.HEADING_SKIP]: undefined,
  [IssueKind.TRANSLATION_MISSING]: undefined,
  [IssueKind.TRANSLATION_POLICY_CONFLICT]: 'translations',
};

/**
 * La clave de frontmatter que arregla el problema (`seo.title`…); `undefined` si se arregla en el
 * cuerpo del archivo o creando otro. En una página externa no hay frontmatter: la clave vive en su
 * entrada `external[]` de docs.config.mjs.
 */
export function keyOf(kind: IssueKind, entry: Pick<SeoPage, 'kind'>): string | undefined {
  const key = KEY[kind];
  return key === undefined ? undefined : scoped(key, entry);
}

/** Una clave de frontmatter tal como se escribe para esa página (en una externa, bajo `external[]`). */
export function scoped(key: string, entry: Pick<SeoPage, 'kind'>): string {
  return entry.kind === 'external' ? `external[].${key}` : key;
}

export const WHY: Record<IssueKind, string> = {
  [IssueKind.TITLE_TOO_LONG]: 'Google recorta los títulos largos con «…» y lo recortado no se lee.',
  [IssueKind.TITLE_TOO_SHORT]:
    'Un título de una palabra no dice qué es la página en el resultado y Google suele reescribirlo.',
  [IssueKind.DUPLICATE_TITLE]:
    'Google solo enseña una de las páginas con el mismo título y la otra compite con ella.',
  [IssueKind.DESCRIPTION_MISSING]:
    'Sin descripción, Google improvisa el fragmento con texto del cuerpo.',
  [IssueKind.DESCRIPTION_INHERITED]:
    'Enseña la descripción genérica del sitio en vez de la de esta página.',
  [IssueKind.DESCRIPTION_TOO_LONG]: 'Google corta las descripciones largas y se pierde el final.',
  [IssueKind.DESCRIPTION_TOO_SHORT]:
    'Con un fragmento tan corto, el buscador tiende a sustituirlo por texto del cuerpo.',
  [IssueKind.DUPLICATE_DESCRIPTION]:
    'Varias páginas enseñan el mismo fragmento: el lector no distingue una de otra.',
  [IssueKind.NO_H1]: 'Sin H1 no hay un encabezado principal que diga de qué trata la página.',
  [IssueKind.MULTIPLE_H1]: 'Más de un H1 diluye de qué trata la página.',
  [IssueKind.HEADING_SKIP]:
    'Saltarse un nivel rompe la estructura que leen los buscadores y los lectores de pantalla.',
  [IssueKind.TRANSLATION_MISSING]: 'El lector en ese idioma no tiene versión propia de la página.',
  [IssueKind.TRANSLATION_POLICY_CONFLICT]:
    'Los archivos del grupo no se ponen de acuerdo y la política que vale es ambigua.',
};

/** Cómo se arregla en general, para cuando el problema afecta a varias páginas con archivos distintos. */
export const GENERIC_FIX: Record<IssueKind, string> = {
  [IssueKind.TITLE_TOO_LONG]: 'Acorta el título sin perder lo que distingue a la página.',
  [IssueKind.TITLE_TOO_SHORT]: 'Alarga el título hasta que diga qué es la página.',
  [IssueKind.DUPLICATE_TITLE]: 'Dale a cada página un título que la distinga de las otras.',
  [IssueKind.DESCRIPTION_MISSING]: 'Escribe una descripción propia, un resumen de la página.',
  [IssueKind.DESCRIPTION_INHERITED]: 'Escribe una descripción propia, un resumen de la página.',
  [IssueKind.DESCRIPTION_TOO_LONG]: 'Acorta la descripción conservando lo esencial.',
  [IssueKind.DESCRIPTION_TOO_SHORT]: 'Amplía la descripción con lo que ofrece la página.',
  [IssueKind.DUPLICATE_DESCRIPTION]: 'Escribe una descripción distinta para cada página.',
  [IssueKind.NO_H1]: 'Empieza el archivo con un encabezado `# Título`.',
  [IssueKind.MULTIPLE_H1]: 'Deja un solo `#` y baja los demás H1 a `##`.',
  [IssueKind.HEADING_SKIP]: 'Ajusta el nivel del encabezado para que siga al anterior.',
  [IssueKind.TRANSLATION_MISSING]:
    'Crea la traducción o declara `translations: omit` si es intencionado.',
  [IssueKind.TRANSLATION_POLICY_CONFLICT]:
    'Haz que `translations` valga lo mismo en todos los archivos de la página.',
};

/**
 * Lo que NO se debe hacer o el rango que se pide: la longitud (siempre como recomendación, Google no
 * fija límites), el slug en los duplicados y la traducción que nadie ha pedido.
 */
export function restrictionFor(kind: IssueKind): string | undefined {
  const limit = limitOf(kind);
  if (limit) return `${limit.min}–${limit.max} caracteres, ≈${limit.maxPx} px (recomendación)`;
  if (kind === IssueKind.DUPLICATE_TITLE || kind === IssueKind.DUPLICATE_DESCRIPTION) {
    return 'No cambies el slug ni la URL para distinguirlas.';
  }
  if (kind === IssueKind.TRANSLATION_MISSING) {
    return 'No crees una traducción sin que te lo pidan: declarar la omisión es válido si es intencionado.';
  }
  return undefined;
}

const measured = (text: string, length: number, field: Field) =>
  `«${text}» (${length} car., ≈${estimateWidth(text, field)} px)`;

/**
 * Lo que la página publica ahora mismo en lo que el problema toca. `text` es para leer y `raw` el valor
 * literal (para el bloque JSON); sin `raw` no hay un valor que copiar (no hay descripción, o el
 * problema no es de un campo).
 */
export function currentValue(
  entry: SeoPage,
  issue: Issue,
): { text: string; raw?: string } | undefined {
  const { meta } = entry;
  switch (issue.kind) {
    case IssueKind.TITLE_TOO_LONG:
    case IssueKind.TITLE_TOO_SHORT:
    case IssueKind.DUPLICATE_TITLE:
      return { text: measured(meta.title, meta.titleLength, 'title'), raw: meta.title };
    case IssueKind.DESCRIPTION_MISSING:
    case IssueKind.DESCRIPTION_INHERITED:
    case IssueKind.DESCRIPTION_TOO_LONG:
    case IssueKind.DESCRIPTION_TOO_SHORT:
    case IssueKind.DUPLICATE_DESCRIPTION: {
      const { description } = meta;
      if (description === undefined) return { text: 'sin descripción' };
      const length = meta.descriptionLength ?? [...description].length;
      return {
        text:
          meta.descriptionSource === 'site'
            ? `«${description}» (heredada del sitio, ${length} car.)`
            : measured(description, length, 'description'),
        raw: description,
      };
    }
    case IssueKind.NO_H1:
      return { text: 'sin H1' };
    case IssueKind.MULTIPLE_H1: {
      const h1 = entry.headings.filter(({ depth }) => depth === 1);
      return { text: `${h1.length} H1: ${h1.map(({ text }) => `«${text}»`).join(', ')}` };
    }
    default:
      return { text: issue.message };
  }
}
