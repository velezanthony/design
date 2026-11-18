import { buildReport, JSON_SEPARATOR, type ReportContext } from './report';
import type { ReportScope } from './scope';
import { estimateSize, sizeLabel } from './size';

/** Lo que el diálogo necesita de un alcance, ya generado: nada se recalcula en el navegador. */
export interface ReportText {
  markdown: string;
  /** El bloque JSON vallado; el diálogo lo añade tras el Markdown si se marca la casilla. */
  json: string;
  /** El tamaño dicho en voz alta, sin y con el bloque JSON. */
  size: { plain: string; withJson: string };
  /** Páginas que cubre el informe: lo que dice la tarjeta del alcance, de la misma fuente. */
  pages: number;
}

/** Genera el informe de cada alcance, bajo el nombre con el que el diálogo lo elige. */
export function reportTexts(
  scopes: Record<string, ReportScope>,
  context: ReportContext,
): Record<string, ReportText> {
  return Object.fromEntries(
    Object.entries(scopes).map(([name, scope]) => {
      const { markdown, json, pages } = buildReport(scope, context);
      return [
        name,
        {
          markdown,
          json,
          size: {
            plain: sizeLabel(estimateSize(markdown)),
            withJson: sizeLabel(estimateSize(markdown + JSON_SEPARATOR + json)),
          },
          pages,
        },
      ];
    }),
  );
}
