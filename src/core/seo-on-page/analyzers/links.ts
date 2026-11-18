import { IssueKind, type Issue, type PageLink, type SeoPageFacts } from '../tree/types';
import { fixFor } from './fixes';
import { makeIssue } from './issue';

const keyOf = (page: { slug: string; locale: string }) => `${page.slug}\u0000${page.locale}`;

/**
 * El grafo de enlaces internos, con las páginas del árbol y la navegación de cada una (barra
 * lateral, cabecera y footer: también son enlaces para el rastreador).
 *
 * - Enlaces a páginas `noindex`: solo desde páginas indexables y solo los del CUERPO; el sidebar
 *   enlaza a todo y avisaría en cada página.
 * - Páginas huérfanas: indexables que ninguna otra página enlaza ni desde el cuerpo ni desde la
 *   navegación. La portada no cuenta. Sin los enlaces de TODAS las páginas el grafo está incompleto
 *   y no se juzga a nadie.
 */
export function analyzeLinks(
  pages: SeoPageFacts[],
  navigation: ReadonlyMap<string, readonly PageLink[]>,
): Issue[] {
  const byKey = new Map(pages.map((page) => [keyOf(page), page]));
  const issues: Issue[] = [];

  for (const page of pages) {
    if (page.meta.noindex || page.links === undefined) continue;
    const related = page.links.filter((link) => byKey.get(keyOf(link))?.meta.noindex);
    if (related.length === 0) continue;
    issues.push(
      makeIssue(
        IssueKind.LINK_TO_NOINDEX,
        page,
        `El cuerpo enlaza a ${related.length === 1 ? 'una página' : `${related.length} páginas`} noindex.`,
        {
          value: related.length,
          related,
          fix: fixFor(IssueKind.LINK_TO_NOINDEX, page, { related }),
        },
      ),
    );
  }

  if (pages.some((page) => page.links === undefined)) return issues;
  const inbound = new Set<string>();
  for (const page of pages) {
    for (const link of [...(page.links ?? []), ...(navigation.get(keyOf(page)) ?? [])]) {
      if (keyOf(link) !== keyOf(page)) inbound.add(keyOf(link));
    }
  }
  for (const page of pages) {
    if (page.slug === '' || page.meta.noindex || inbound.has(keyOf(page))) continue;
    issues.push(
      makeIssue(IssueKind.ORPHAN_PAGE, page, 'Ninguna otra página enlaza a esta.', {
        fix: fixFor(IssueKind.ORPHAN_PAGE, page),
      }),
    );
  }
  return issues;
}
