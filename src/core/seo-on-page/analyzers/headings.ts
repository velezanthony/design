import { THRESHOLDS } from '../thresholds';
import { IssueKind, type HeadingNode, type Issue } from '../tree/types';
import { outline } from '../queries/outline';
import { fixFor, type FixPage } from './fixes';
import { makeIssue } from './issue';

/** Estructura de encabezados: exactamente un H1 y sin saltos de nivel al bajar (H2 → H4). */
export function analyzeHeadings(page: FixPage, headings: HeadingNode[]): Issue[] {
  const issues: Issue[] = [];
  const h1Count = headings.filter((heading) => heading.depth === 1).length;

  if (h1Count === 0) {
    issues.push(
      makeIssue(IssueKind.NO_H1, page, 'La página no tiene ningún H1.', {
        value: 0,
        limit: THRESHOLDS.maxH1,
        fix: fixFor(IssueKind.NO_H1, page),
      }),
    );
  } else if (h1Count > THRESHOLDS.maxH1) {
    issues.push(
      makeIssue(IssueKind.MULTIPLE_H1, page, 'La página tiene más de un H1.', {
        value: h1Count,
        limit: THRESHOLDS.maxH1,
        fix: fixFor(IssueKind.MULTIPLE_H1, page),
      }),
    );
  }

  // Los saltos los decide `outline`, el mismo esquema que pinta el inspector: una sola regla, así el
  // panel nunca marca un salto que el análisis no cuente, ni al revés.
  for (const item of outline(headings)) {
    if (item.skipFrom === undefined) continue;
    issues.push(
      makeIssue(
        IssueKind.HEADING_SKIP,
        page,
        `Salto de H${item.skipFrom} a H${item.depth} en «${item.text}».`,
        {
          value: item.depth,
          fix: fixFor(IssueKind.HEADING_SKIP, page, {
            heading: { text: item.text, depth: item.depth, skipFrom: item.skipFrom },
          }),
        },
      ),
    );
  }
  return issues;
}
