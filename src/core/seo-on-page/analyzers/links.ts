import { IssueKind, type Issue, type PageLink, type SeoPageFacts } from '../tree/types';
import { fixFor } from './fixes';
import { makeIssue } from './issue';
import { pageKey } from '../tree/keys';

/** Sin los enlaces de TODAS las páginas el grafo está incompleto y no se juzgan huérfanas; el sidebar enlaza a todo, por eso `noindex` solo cuenta desde el cuerpo. */
export function analyzeLinks(
  pages: SeoPageFacts[],
  navigation: ReadonlyMap<string, readonly PageLink[]>,
): Issue[] {
  const byKey = new Map(pages.map((page) => [pageKey(page), page]));
  const issues: Issue[] = [];

  for (const page of pages) {
    if (page.meta.noindex || page.links === undefined) continue;
    const related = page.links.filter((link) => byKey.get(pageKey(link))?.meta.noindex);
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
    for (const link of [...(page.links ?? []), ...(navigation.get(pageKey(page)) ?? [])]) {
      if (pageKey(link) !== pageKey(page)) inbound.add(pageKey(link));
    }
  }
  for (const page of pages) {
    if (page.slug === '' || page.meta.noindex || inbound.has(pageKey(page))) continue;
    issues.push(
      makeIssue(IssueKind.ORPHAN_PAGE, page, 'Ninguna otra página enlaza a esta.', {
        fix: fixFor(IssueKind.ORPHAN_PAGE, page),
      }),
    );
  }
  return issues;
}
