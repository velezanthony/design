import { summarize, type SeoSummary } from '../../queries/summary';
import { ALL_SEVERITIES, EMPTY_FILTERS } from '../../queries/url-filters';
import { IssueKind, IssueSeverity, type SeoTree } from '../../tree/types';
import type { PanelLinks } from '../links';

export interface OverviewModel {
  /** Páginas (por idioma): el total y cuántas tienen problemas, solo informativas o nada. */
  totals: Pick<SeoSummary, 'total' | 'withProblems' | 'informativeOnly' | 'clean'>;
  links: {
    /** La tabla de problemas (su vista por defecto: errores y avisos). */
    problems: string;
    /** La tabla con todas las páginas, informativas y limpias incluidas. */
    all: string;
  };
  /** Una fila por gravedad, de más a menos grave. Los textos los pone la UI. */
  bySeverity: { severity: IssueSeverity; count: number; href: string | undefined }[];
  /** Una fila por tipo de problema, también los de cero. Los textos los pone la UI. */
  byKind: { kind: IssueKind; count: number; href: string | undefined }[];
  schemas: SeoSummary['schemas'];
}

/**
 * Lo que enseña la vista general del panel, calculado: la pantalla y sus componentes solo pintan.
 * Los enlaces llegan hechos (texto) porque el núcleo no sabe formar URLs; ver `PanelLinks`.
 */
export function overviewModel(tree: SeoTree, links: Pick<PanelLinks, 'pages'>): OverviewModel {
  const summary = summarize(tree);
  const filtered = (count: number, filters: Partial<typeof EMPTY_FILTERS>) =>
    count > 0 ? links.pages({ ...EMPTY_FILTERS, ...filters }) : undefined;
  return {
    totals: {
      total: summary.total,
      withProblems: summary.withProblems,
      informativeOnly: summary.informativeOnly,
      clean: summary.clean,
    },
    links: {
      problems: links.pages(),
      all: links.pages({ ...EMPTY_FILTERS, severities: ALL_SEVERITIES }),
    },
    bySeverity: Object.values(IssueSeverity).map((severity) => ({
      severity,
      count: summary.bySeverity[severity],
      href: filtered(summary.bySeverity[severity], { severities: [severity] }),
    })),
    byKind: Object.values(IssueKind).map((kind) => ({
      kind,
      count: summary.byKind[kind],
      href: filtered(summary.byKind[kind], { kinds: [kind] }),
    })),
    schemas: summary.schemas,
  };
}
