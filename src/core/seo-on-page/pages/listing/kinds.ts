import { IssueKind, type SeoTree } from '../../tree/types';

export interface KindOptions {
  /** «Todos»: marcado cuando no hay filtro de tipo; `count` es cuántos tipos tienen incidencias. */
  all: { checked: boolean; count: number };
  /** Tipos con incidencias, con las PÁGINAS que afectan; de más a menos. */
  withIssues: { kind: IssueKind; count: number; checked: boolean }[];
  /** Tipos que el análisis sabe detectar y hoy no tienen ninguna: se enseñan deshabilitados. */
  without: IssueKind[];
}

/** Los tipos que aparecen en alguna entrada del árbol (sin filtrar): los que tiene sentido elegir. */
export function kindsWithIssues(tree: SeoTree): IssueKind[] {
  const present = new Set(tree.pages.flatMap((page) => page.issues.map((issue) => issue.kind)));
  return Object.values(IssueKind).filter((kind) => present.has(kind));
}

/**
 * Las casillas del desplegable «Tipo de problema». «Todos» marcado equivale a no filtrar por tipo
 * (`kinds` vacío), igual que en la URL: así no hay dos formas de pedir lo mismo.
 */
export function kindOptions(tree: SeoTree, selected: readonly IssueKind[]): KindOptions {
  const slugsByKind = new Map<IssueKind, Set<string>>();
  for (const page of tree.pages) {
    for (const { kind } of page.issues) {
      slugsByKind.set(kind, (slugsByKind.get(kind) ?? new Set()).add(page.slug));
    }
  }
  const all = selected.length === 0;
  const withIssues = Object.values(IssueKind)
    .filter((kind) => slugsByKind.has(kind))
    // `sort` es estable: en los empates queda el orden del catálogo de tipos.
    .sort((left, right) => (slugsByKind.get(right)?.size ?? 0) - (slugsByKind.get(left)?.size ?? 0))
    .map((kind) => ({
      kind,
      count: slugsByKind.get(kind)?.size ?? 0,
      checked: all || selected.includes(kind),
    }));
  return {
    all: { checked: all, count: withIssues.length },
    withIssues,
    without: Object.values(IssueKind).filter((kind) => !slugsByKind.has(kind)),
  };
}
