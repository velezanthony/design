import type { Locale } from '../../i18n/locale';
import { slugLabel } from '../tree/keys';
import type { ListingSelection } from '../pages/listing/selection';
import type { HaveColumn } from '../queries/url-filters';
import type { IssueKind, IssueSeverity, SeoPage, SeoTree } from '../tree/types';

/** De qué trata un informe: qué entradas del árbol entran y qué problemas se cuentan de ellas. */
export interface ReportScope {
  /** Estable, para el bloque JSON: `page:<slug>`, `locale:<idioma>`, `site` o `filter`. */
  id: string;
  /** El final de la línea de título: «`slug`», «solo `en`», «filtro actual». */
  title: string;
  /** La frase tras «Alcance:»: qué delimita el informe. */
  label: string;
  entries: SeoPage[];
  /** Una sola página (con sus idiomas): lleva su tabla y su contexto. */
  single: boolean;
  /** Solo los problemas de estas gravedades; sin ellas, todos. */
  severities?: IssueSeverity[];
  /** Solo los problemas de estos tipos; sin ellos, todos. */
  kinds?: IssueKind[];
  /** «Qué tiene» filtrado por lo que falta: el informe lista esas páginas y lo que les falta. */
  lacks?: HaveColumn;
}

/** Una página con todos sus idiomas. */
export function pageScope(tree: SeoTree, slug: string): ReportScope {
  return {
    id: `page:${slug}`,
    title: `\`${slugLabel(slug)}\``,
    label: 'esta página',
    entries: tree.pages.filter((entry) => entry.slug === slug),
    single: true,
  };
}

/** Todo el sitio en un idioma. */
export function localeScope(tree: SeoTree, locale: Locale): ReportScope {
  return {
    id: `locale:${locale}`,
    title: `solo \`${locale}\``,
    label: `todo el sitio en \`${locale}\``,
    entries: tree.pages.filter((entry) => entry.locale === locale),
    single: false,
  };
}

/** Todo el sitio, en todos los idiomas. */
export function siteScope(tree: SeoTree): ReportScope {
  return {
    id: 'site',
    title: 'todo el sitio',
    label: 'todo el sitio',
    entries: [...tree.pages],
    single: false,
  };
}

/** `label` lo redacta quien tiene los textos; filtrar por tipo recorta también los problemas, no las páginas. */
export function filterScope(selection: ListingSelection, label: string): ReportScope {
  const { filters, view, byEntry, matching, selected, severities } = selection;
  return {
    id: 'filter',
    title: 'filtro actual',
    label,
    entries: byEntry ? matching : selected,
    single: false,
    ...(severities && { severities }),
    ...(filters.kinds.length > 0 && { kinds: filters.kinds }),
    ...(view.lacks && { lacks: view.lacks }),
  };
}
