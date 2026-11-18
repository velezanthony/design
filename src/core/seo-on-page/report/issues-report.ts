import { CATALOG } from '../catalog';
import { fixPriorities } from '../queries/priorities';
import { IssueKind, type SeoPage } from '../tree/types';
import {
  code,
  DO_NOT_TOUCH,
  fenced,
  introOf,
  type JsonPage,
  LIMITS,
  measured,
  unique,
} from './format';
import { hitsOf, sectionOf, type Hit, type IssueEntry } from './issue-section';
import { currentValue, keyOf } from './kinds';
import type { Report, ReportContext } from './report';
import type { ReportScope } from './scope';

function pipe(text: string) {
  return text.replaceAll('|', '\\|');
}

/** La tabla de una página: un idioma por fila, con lo que publica. */
function pageTable(entries: readonly SeoPage[]): string[] {
  const rows = entries.map(({ locale, sourcePath, meta }) => {
    const title = measured(meta.title, meta.titleLength, 'title');
    const description =
      meta.description === undefined
        ? 'sin descripción'
        : `${meta.descriptionSource === 'site' ? 'heredada del sitio' : 'propia'} (${meta.descriptionLength ?? [...meta.description].length})`;
    return `| ${locale} | ${code(sourcePath)} | ${pipe(title)} | ${description} |`;
  });
  return ['| Idioma | Fichero | Título | Descripción |', '|---|---|---|---|', ...rows];
}

/** Encabezados y canonical de cada idioma de la página: lo que hace falta para escribir con sentido. */
function pageContext(entries: readonly SeoPage[]): string[] {
  const lines = ['## Contexto'];
  for (const { locale, headings, meta } of entries) {
    const outline = headings.map(({ depth, text }) => `H${depth} ${text}`).join('; ');
    lines.push(`- Encabezados (${locale}): ${outline || 'ninguno'}`);
    lines.push(`- Canonical (${locale}): ${code(meta.canonical)}`);
  }
  return lines;
}

function verifyText(kind: IssueKind, hits: readonly Hit[]): string {
  if (hits.length === 1) {
    return CATALOG[kind].verify((hits[0]!.issue.related ?? []).map(({ slug }) => slug));
  }
  if (kind === IssueKind.DUPLICATE_TITLE || kind === IssueKind.DUPLICATE_DESCRIPTION) {
    return 'El aviso desaparece de todas las páginas listadas.';
  }
  return CATALOG[kind].verify([]);
}

/** El informe de problemas: una sección por tipo, del más al menos urgente (como «Qué arreglar primero»). */
export function issuesReport(scope: ReportScope, context: ReportContext): Report {
  const hits = hitsOf(scope);
  const slugs = unique(scope.entries.map((entry) => entry.slug));
  // Se ordena igual que el resumen: con solo lo que este alcance cuenta, no con el sitio entero.
  const priorities = fixPriorities(
    {
      pages: scope.entries.map((entry) => ({
        ...entry,
        issues: hits.filter((hit) => hit.entry === entry).map((hit) => hit.issue),
      })),
    },
    { locales: context.locales, inspector: () => '' },
  );
  const items = priorities.map((priority) => {
    const own = hits.filter(({ issue }) => issue.kind === priority.kind);
    return {
      priority,
      item: {
        kind: priority.kind,
        severity: priority.severity,
        certainty: priority.certainty,
        hits: own,
        bulk: slugs.length > 1 && priority.pages === slugs.length,
        verify: verifyText(priority.kind, own),
      } satisfies IssueEntry,
    };
  });

  const lines = introOf(scope, context);
  if (scope.single) lines.push('', ...pageTable(scope.entries));
  if (items.length === 0) lines.push('', 'Sin problemas en este alcance.');
  items.forEach(({ priority, item }, index) => {
    lines.push(...sectionOf(index + 1, item, priority, scope, context));
  });
  if (items.length > 0) lines.push('', ...DO_NOT_TOUCH);
  if (scope.single) lines.push('', ...pageContext(scope.entries));

  const json = {
    site: context.site,
    scope: scope.id,
    limits: LIMITS,
    issues: items.map(({ item }) => ({
      kind: item.kind,
      severity: item.severity,
      certainty: item.certainty,
      pages: item.hits.map(({ entry, issue }): JsonPage => {
        const value = currentValue(entry, issue);
        return {
          slug: entry.slug,
          locale: entry.locale,
          file: entry.sourcePath,
          key: keyOf(item.kind, entry) ?? null,
          current: value?.raw ?? null,
          // El texto sobra si ya va el valor literal: de él salen la longitud y el ancho.
          ...(value?.raw === undefined && { detail: value?.text ?? '' }),
        };
      }),
      verify: item.verify,
    })),
  };
  return {
    markdown: lines.join('\n'),
    json: fenced(json),
    pages: slugs.length,
    entries: scope.entries.length,
  };
}
