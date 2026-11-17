import type { Issue, SeoPage, SeoTree } from '../tree/types';
import type { SeoFilters } from './url-filters';

/** Un problema cumple tipo Y gravedad a la vez (un filtro vacío no restringe). */
function matchesIssue(issue: Issue, filters: SeoFilters): boolean {
  return (
    (filters.kinds.length === 0 || filters.kinds.includes(issue.kind)) &&
    (filters.severities.length === 0 || filters.severities.includes(issue.severity))
  );
}

function matchesText(page: SeoPage, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (needle === '') return true;
  return [page.slug, page.title, page.meta.title].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

/** Páginas que cumplen todos los filtros, conservando el orden del árbol. */
export function filterPages(tree: SeoTree, filters: SeoFilters): SeoPage[] {
  const filtersIssues = filters.kinds.length > 0 || filters.severities.length > 0;
  return tree.pages.filter(
    (page) =>
      (filters.locales.length === 0 || filters.locales.includes(page.locale)) &&
      matchesText(page, filters.text) &&
      (!filtersIssues || page.issues.some((issue) => matchesIssue(issue, filters))),
  );
}
