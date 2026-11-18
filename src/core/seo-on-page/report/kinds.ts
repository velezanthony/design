import { scopedKey } from '../key-place';
import { CATALOG } from '../catalog';
import { IssueKind, type Issue, type SeoPage } from '../tree/types';
import { measured } from './format';

/** En español porque el informe se pega en una conversación con la IA de quien mantiene un sitio en español. */

/** Clave de frontmatter que lo arregla; en una externa vive en su entrada `external[]` de docs.config.mjs. */
export function keyOf(kind: IssueKind, entry: Pick<SeoPage, 'kind'>): string | undefined {
  const { key } = CATALOG[kind];
  return key === undefined ? undefined : scopedKey(key, entry.kind);
}

/** Lo que NO hacer o el rango pedido (longitudes siempre como recomendación). */
export function restrictionFor(kind: IssueKind): string | undefined {
  const { limit, restriction } = CATALOG[kind];
  if (limit) return `${limit.min}–${limit.max} caracteres, ≈${limit.maxPx} px (recomendación)`;
  return restriction;
}

/** `text` para leer, `raw` el valor literal para el JSON; sin `raw` no hay valor que copiar. */
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
    case IssueKind.OG_IMAGE_SIZE: {
      const image = meta.ogImage;
      if (image?.width === undefined || image.height === undefined) return { text: issue.message };
      return { text: `${image.src} (${image.width}×${image.height})`, raw: image.src };
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
