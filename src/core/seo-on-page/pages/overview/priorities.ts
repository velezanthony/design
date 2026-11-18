import type { Locale } from '../../../i18n/locale';
import { IssueKind, IssueSeverity, type SeoTree } from '../../tree/types';
import { certaintyOf, type Certainty } from '../../certainty';

/** Un tipo de problema del sitio, con lo que hace falta para decidir si arreglarlo ya. */
export interface FixPriority {
  kind: IssueKind;
  /** La peor gravedad con la que aparece. */
  severity: IssueSeverity;
  /** Páginas (slugs) afectadas: un slug en dos idiomas es una. */
  pages: number;
  /** Porcentaje sobre las páginas del sitio; nunca 0 si afecta a alguna. */
  percent: number;
  /** Entradas (página + idioma) afectadas. */
  entries: number;
  /** Idiomas donde ocurre, en el orden de la config. */
  locales: Locale[];
  certainty: Certainty;
  /** Cómo arreglarlo: el de la primera incidencia (cada página tiene su archivo). */
  fix?: string;
  /** Las páginas afectadas con su enlace al inspector; vacío si son demasiadas para listarlas. */
  affected: { slug: string; href: string }[];
}

/** Más páginas que esto no se listan una a una: el recuento y el enlace a la tabla lo dicen mejor. */
export const MAX_LISTED_PAGES = 5;

const RANK: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };
const CATALOG = Object.values(IssueKind);

interface Input {
  /** Idiomas de la config, en su orden. */
  locales: readonly Locale[];
  inspector: (target: { slug: string; locale: Locale }) => string;
}

interface Group {
  severity: IssueSeverity;
  slugs: Map<string, Locale>;
  entries: number;
  locales: Set<Locale>;
  fix: string | undefined;
}

/**
 * Los tipos de problema ordenados por lo que conviene arreglar antes: gravedad primero y, dentro de
 * ella, a cuántas páginas toca. Lo que afecta a TODAS las páginas (con más de una) va al final de su
 * gravedad: es deuda en bloque (p. ej. la descripción heredada), no una tarea que cerrar.
 */
export function fixPriorities(tree: SeoTree, { locales, inspector }: Input): FixPriority[] {
  const total = new Set(tree.pages.map((page) => page.slug)).size;
  const groups = new Map<IssueKind, Group>();
  for (const page of tree.pages) {
    for (const found of page.issues) {
      const group = groups.get(found.kind) ?? {
        severity: found.severity,
        slugs: new Map<string, Locale>(),
        entries: 0,
        locales: new Set<Locale>(),
        fix: found.fix,
      };
      if (RANK[found.severity] < RANK[group.severity]) group.severity = found.severity;
      const first = group.slugs.get(page.slug);
      // El enlace va al primer idioma de la config donde ocurre.
      if (first === undefined || locales.indexOf(page.locale) < locales.indexOf(first)) {
        group.slugs.set(page.slug, page.locale);
      }
      group.entries++;
      group.locales.add(page.locale);
      groups.set(found.kind, group);
    }
  }
  const bulk = (group: Group) => total > 1 && group.slugs.size === total;
  return [...groups]
    .sort(([kindA, a], [kindB, b]) => {
      return (
        RANK[a.severity] - RANK[b.severity] ||
        Number(bulk(a)) - Number(bulk(b)) ||
        b.slugs.size - a.slugs.size ||
        CATALOG.indexOf(kindA) - CATALOG.indexOf(kindB)
      );
    })
    .map(([kind, group]) => ({
      kind,
      severity: group.severity,
      pages: group.slugs.size,
      percent: Math.max(1, Math.round((group.slugs.size / total) * 100)),
      entries: group.entries,
      locales: locales.filter((locale) => group.locales.has(locale)),
      certainty: certaintyOf(kind),
      ...(group.fix !== undefined && { fix: group.fix }),
      affected:
        group.slugs.size > MAX_LISTED_PAGES
          ? []
          : [...group.slugs].map(([slug, locale]) => ({
              slug,
              href: inspector({ slug, locale }),
            })),
    }));
}
