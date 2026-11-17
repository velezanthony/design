import { THRESHOLDS } from '../thresholds';
import { IssueKind, type HeadingNode, type Issue } from '../tree/types';
import { makeIssue } from './issue';

/** Estructura de encabezados: exactamente un H1 y sin saltos de nivel al bajar (H2 → H4). */
export function analyzeHeadings(
  page: { slug: string; locale: string },
  headings: HeadingNode[],
): Issue[] {
  const issues: Issue[] = [];
  const h1Count = headings.filter((heading) => heading.depth === 1).length;

  if (h1Count === 0) {
    issues.push(
      makeIssue(IssueKind.NO_H1, page, 'La página no tiene ningún H1.', {
        value: 0,
        limit: THRESHOLDS.maxH1,
      }),
    );
  } else if (h1Count > THRESHOLDS.maxH1) {
    issues.push(
      makeIssue(IssueKind.MULTIPLE_H1, page, 'La página tiene más de un H1.', {
        value: h1Count,
        limit: THRESHOLDS.maxH1,
      }),
    );
  }

  // Solo importa BAJAR de más; subir de H4 a H2 al cerrar una sección es normal.
  headings.slice(1).forEach((heading, index) => {
    const previous = headings[index];
    if (heading.depth > previous.depth + 1) {
      issues.push(
        makeIssue(
          IssueKind.HEADING_SKIP,
          page,
          `Salto de H${previous.depth} a H${heading.depth} en «${heading.text}».`,
          { value: heading.depth },
        ),
      );
    }
  });
  return issues;
}
