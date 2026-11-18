import type { Locale } from '../../i18n/locale';
import { CATALOG, type Certainty } from '../catalog';
import { keyPlace } from '../key-place';
import { findEntry, pageKey } from '../tree/keys';
import type { Issue, IssueKind, IssueSeverity, SeoPage } from '../tree/types';
import { listOf, plural } from '../../shared/text';
import {
  CERTAINTY_TEXT,
  code,
  dirsText,
  entryLine,
  localesOf,
  SEVERITY_TEXT,
  slugCode,
  unique,
} from './format';
import { currentValue, keyOf, restrictionFor } from './kinds';
import type { ReportContext } from './report';
import type { ReportScope } from './scope';

export interface Hit {
  entry: SeoPage;
  issue: Issue;
}

/** Los problemas del alcance: los de sus entradas, restringidos a las gravedades y tipos pedidos. */
export function hitsOf(scope: ReportScope): Hit[] {
  return scope.entries.flatMap((entry) =>
    entry.issues
      .filter(
        (issue) =>
          (!scope.severities || scope.severities.includes(issue.severity)) &&
          (!scope.kinds || scope.kinds.includes(issue.kind)),
      )
      .map((issue) => ({ entry, issue })),
  );
}

/** Cómo se nombran juntas, cuando un problema afecta a todas, las que no tienen frontmatter. */
const NO_FRONTMATTER = [
  { kind: 'external', label: 'Las externas', place: 'en su entrada de docs.config.mjs' },
  { kind: 'client', label: 'Las páginas Astro', place: 'en su <head>' },
] as const;

export interface IssueEntry {
  kind: IssueKind;
  severity: IssueSeverity;
  certainty: Certainty;
  hits: Hit[];
  bulk: boolean;
  verify: string;
}

/** Con qué páginas chocan los problemas, sin las que ya están en la lista. */
function relatedLines(hits: readonly Hit[], context: ReportContext): string[] {
  const listed = new Set(hits.map(({ entry }) => pageKey(entry)));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const { issue } of hits) {
    for (const { slug, locale } of issue.related ?? []) {
      const key = pageKey({ slug, locale });
      if (listed.has(key) || seen.has(key)) continue;
      seen.add(key);
      const other = findEntry(context.tree.pages, slug, locale);
      lines.push(`  - ${other ? `${code(other.sourcePath)} ` : ''}(${slugCode(slug)}, ${locale})`);
    }
  }
  return lines.length === 0 ? [] : ['- Con las que choca, fuera de este alcance:', ...lines];
}

export function sectionOf(
  index: number,
  item: IssueEntry,
  priority: { pages: number; percent: number; entries: number; locales: Locale[] },
  scope: ReportScope,
  context: ReportContext,
): string[] {
  const { kind, hits, bulk } = item;
  const key = keyOf(kind, { kind: 'native' });
  function valueOf({ entry, issue }: Hit) {
    return currentValue(entry, issue)?.text ?? '';
  }
  const values = unique(hits.map(valueOf));
  // «El mismo en todas», o el mismo en todas las de cada idioma (la descripción del sitio por idioma).
  const byLocale = context.locales
    .map((locale) => ({
      locale,
      values: unique(hits.filter(({ entry }) => entry.locale === locale).map(valueOf)),
    }))
    .filter((own) => own.values.length > 0);
  const sameEverywhere = values.length === 1;
  const sameByLocale = !sameEverywhere && byLocale.every((own) => own.values.length === 1);
  const stated = sameEverywhere || sameByLocale;
  const extent = scope.single
    ? listOf(priority.locales)
    : `${plural(priority.pages, 'página', 'páginas')} (${priority.percent} %), ${bulk ? plural(priority.entries, 'entrada', 'entradas') : listOf(priority.locales)}`;
  const lines = [
    '',
    `## ${index}. ${context.kindLabels[kind]} — ${SEVERITY_TEXT[item.severity]} — ${CERTAINTY_TEXT[item.certainty]} — ${extent}`,
  ];

  // Agrupar solo vale si decir «en todos» no esconde nada: con valores distintos, cada fichero cuenta.
  const grouped = bulk && stated;
  if (grouped) {
    const directories = dirsText(
      context,
      localesOf(
        hits.map(({ entry }) => entry),
        context.locales,
      ),
    );
    const where = directories
      ? `cada fichero de ${directories}`
      : 'cada fichero de las páginas afectadas';
    lines.push(`- Ficheros y clave: ${key ? `${code(key)} en el frontmatter de ` : ''}${where}`);
    for (const { kind: pageKind, label, place } of NO_FRONTMATTER) {
      const pages = unique(
        hits
          .filter(({ entry }) => entry.kind === pageKind)
          .map(({ entry }) => slugCode(entry.slug)),
      );
      const own = keyOf(kind, { kind: pageKind });
      if (pages.length > 0 && own) {
        lines.push(
          `  - ${label} (${pages.join(', ')}) no tienen frontmatter: ${code(own)} ${place}`,
        );
      }
    }
  } else {
    lines.push(`- ${key ? `Ficheros y clave: ${code(key)} en` : 'Ficheros:'}`);
    for (const { entry, issue } of hits) {
      const own = entry.kind === 'native' ? undefined : keyOf(kind, entry);
      const value = stated ? '' : ` — ${currentValue(entry, issue)?.text ?? ''}`;
      lines.push(
        entryLine(entry, `${own ? ` — ${code(own)} ${keyPlace(entry.kind)}` : ''}${value}`),
      );
    }
  }
  if (sameEverywhere) {
    lines.push(`- Valor actual: ${values[0]}${hits.length > 1 ? ' (el mismo en todas)' : ''}`);
  } else if (sameByLocale) {
    const own = byLocale.map(({ locale, values: [value] }) => `${locale} ${value}`);
    const repeated = hits.length > byLocale.length ? ' (el mismo en todas las de cada idioma)' : '';
    lines.push(`- Valor actual: ${own.join(' · ')}${repeated}`);
  }
  lines.push(...relatedLines(hits, context));
  lines.push(`- Por qué: ${CATALOG[kind].why}`);
  const fixes = unique(hits.map(({ issue }) => issue.fix));
  const fix = fixes.length === 1 && fixes[0] !== undefined && !bulk ? fixes[0] : CATALOG[kind].fix;
  lines.push(`- Arreglo: ${fix}`);
  const restriction = restrictionFor(kind);
  if (restriction) lines.push(`- Restricción: ${restriction}`);
  lines.push(`- Verificar: ${item.verify}`);
  return lines;
}
