import type { Locale } from '../../i18n/locale';
import type { Certainty } from '../certainty';
import { verifyFor } from '../pages/inspector/fix-details';
import { fixPriorities } from '../pages/overview/priorities';
import { HAVE_CELLS, isGood, LACKS_PHRASES } from '../pages/listing/have';
import { THRESHOLDS } from '../thresholds';
import type { HaveColumn } from '../queries/url-filters';
import { estimateWidth } from '../pixels';
import {
  IssueKind,
  type Issue,
  type IssueSeverity,
  type SeoPage,
  type SeoTree,
} from '../tree/types';
import { contentDirs } from './content-dirs';
import { LACKS } from './lacks';
import { currentValue, GENERIC_FIX, keyOf, restrictionFor, WHY } from './kinds';
import { keyPlace, scopedKey } from '../key-place';
import type { ReportScope } from './scope';
import { pageKey } from '../tree/keys';
import { listOf, plural } from '../../shared/text';

/** Lo que el informe necesita saber del sitio, además del alcance. */
export interface ReportContext {
  site: string;
  /** Idiomas de la config, en su orden. */
  locales: readonly Locale[];
  /** El árbol ENTERO: de él salen las carpetas de contenido y las páginas relacionadas. */
  tree: SeoTree;
  /** El nombre de cada tipo de problema, tal como lo llama el panel. */
  kindLabels: Record<IssueKind, string>;
}

export interface Report {
  /** El Markdown, sin el bloque JSON. */
  markdown: string;
  /** El bloque JSON ya vallado (```json), para añadirlo tras el Markdown si se pide. */
  json: string;
  /** Páginas (slugs) y entradas (página + idioma) que cubre. */
  pages: number;
  entries: number;
}

/** Lo que separa el Markdown del bloque JSON al unirlos. */
export const JSON_SEPARATOR = '\n\n';

const SEVERITY_TEXT: Record<IssueSeverity, string> = {
  error: 'error',
  warning: 'aviso',
  info: 'info',
};
const CERTAINTY_TEXT: Record<Certainty, string> = { rule: 'regla', heuristic: 'heurística' };

const code = (text: string) => `\`${text}\``;
const slugOf = (slug: string) => code(slug || '/');

interface Hit {
  entry: SeoPage;
  issue: Issue;
}

/** Los problemas del alcance: los de sus entradas, restringidos a las gravedades y tipos pedidos. */
function hitsOf(scope: ReportScope): Hit[] {
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

const unique = <T>(items: readonly T[]) => [...new Set(items)];
const localesOf = (entries: readonly SeoPage[], order: readonly Locale[]) =>
  order.filter((locale) => entries.some((entry) => entry.locale === locale));

function dirsText(ctx: ReportContext, locales: readonly Locale[]): string {
  const dirs = contentDirs(ctx.tree);
  // Los idiomas que comparten carpeta (`a.md` y `a.es.md`) se dicen juntos, no repetidos.
  const byDir = new Map<string, Locale[]>();
  for (const locale of locales) {
    const dir = dirs[locale];
    if (dir !== undefined) byDir.set(dir, [...(byDir.get(dir) ?? []), locale]);
  }
  return [...byDir].map(([dir, own]) => `${code(dir)} (${own.join(', ')})`).join(' · ');
}

/** Cómo se marca en la lista una página que no es un `.md` de la carpeta de contenido. */
const KIND_MARK: Record<SeoPage['kind'], string> = {
  native: '',
  external: ', externa',
  client: ', página Astro',
};

/** Cómo se nombran juntas, cuando un problema afecta a todas, las que no tienen frontmatter. */
const NO_FRONTMATTER = [
  { kind: 'external', label: 'Las externas', place: 'en su entrada de docs.config.mjs' },
  { kind: 'client', label: 'Las páginas Astro', place: 'en su <head>' },
] as const;

/** Una entrada como línea de lista: su archivo, su página y su idioma. */
const entryLine = (entry: SeoPage, extra = '') => {
  const where = `${code(entry.slug ? entry.slug : '/')}, ${entry.locale}${KIND_MARK[entry.kind]}`;
  return `  - ${code(entry.sourcePath)} (${where})${extra}`;
};

function introOf(scope: ReportScope, ctx: ReportContext): string[] {
  const pages = unique(scope.entries.map((entry) => entry.slug)).length;
  const locales = localesOf(scope.entries, ctx.locales);
  const where = `idiomas ${locales.map(code).join(', ')} (${plural(scope.entries.length, 'entrada', 'entradas')})`;
  const range = scope.single ? where : `${plural(pages, 'página', 'páginas')} · ${where}`;
  const dirs = dirsText(ctx, locales);
  return [
    `# SEO on page — ${ctx.site} · ${scope.title}`,
    '',
    `Alcance: ${scope.label} · ${range}`,
    ...(dirs ? [`Contenido: ${dirs}`] : []),
    'Certeza: **regla** = hecho comprobable · **heurística** = recomendación (no la cumplas a costa del sentido)',
  ];
}

const pipe = (text: string) => text.replaceAll('|', '\\|');

/** La tabla de una página: un idioma por fila, con lo que publica. */
function pageTable(entries: readonly SeoPage[]): string[] {
  const rows = entries.map(({ locale, sourcePath, meta }) => {
    const title = `«${meta.title}» (${meta.titleLength} car., ≈${estimateWidth(meta.title, 'title')} px)`;
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

const DO_NOT_TOUCH = [
  '## No toques',
  '- Slugs, URLs ni canonical.',
  '- Lo que no aparece en este informe: está bien tal como está.',
];

interface IssueEntry {
  kind: IssueKind;
  severity: IssueSeverity;
  certainty: Certainty;
  hits: Hit[];
  bulk: boolean;
  verify: string;
}

/** Con qué páginas chocan los problemas, sin las que ya están en la lista. */
function relatedLines(hits: readonly Hit[], ctx: ReportContext): string[] {
  const listed = new Set(hits.map(({ entry }) => pageKey(entry)));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const { issue } of hits) {
    for (const { slug, locale } of issue.related ?? []) {
      const key = pageKey({ slug, locale });
      if (listed.has(key) || seen.has(key)) continue;
      seen.add(key);
      const other = ctx.tree.pages.find((page) => page.slug === slug && page.locale === locale);
      lines.push(`  - ${other ? `${code(other.sourcePath)} ` : ''}(${slugOf(slug)}, ${locale})`);
    }
  }
  return lines.length === 0 ? [] : ['- Con las que choca, fuera de este alcance:', ...lines];
}

function sectionOf(
  index: number,
  item: IssueEntry,
  priority: { pages: number; percent: number; entries: number; locales: Locale[] },
  scope: ReportScope,
  ctx: ReportContext,
): string[] {
  const { kind, hits, bulk } = item;
  const key = keyOf(kind, { kind: 'native' });
  const valueOf = ({ entry, issue }: Hit) => currentValue(entry, issue)?.text ?? '';
  const values = unique(hits.map(valueOf));
  // «El mismo en todas», o el mismo en todas las de cada idioma (la descripción del sitio por idioma).
  const byLocale = ctx.locales
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
    `## ${index}. ${ctx.kindLabels[kind]} — ${SEVERITY_TEXT[item.severity]} — ${CERTAINTY_TEXT[item.certainty]} — ${extent}`,
  ];

  // Agrupar solo vale si decir «en todos» no esconde nada: con valores distintos, cada fichero cuenta.
  const grouped = bulk && stated;
  if (grouped) {
    const dirs = dirsText(
      ctx,
      localesOf(
        hits.map(({ entry }) => entry),
        ctx.locales,
      ),
    );
    const where = dirs ? `cada fichero de ${dirs}` : 'cada fichero de las páginas afectadas';
    lines.push(`- Ficheros y clave: ${key ? `${code(key)} en el frontmatter de ` : ''}${where}`);
    for (const { kind: pageKind, label, place } of NO_FRONTMATTER) {
      const pages = unique(
        hits.filter(({ entry }) => entry.kind === pageKind).map(({ entry }) => slugOf(entry.slug)),
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
  lines.push(...relatedLines(hits, ctx));
  lines.push(`- Por qué: ${WHY[kind]}`);
  const fixes = unique(hits.map(({ issue }) => issue.fix));
  const fix = fixes.length === 1 && fixes[0] !== undefined && !bulk ? fixes[0] : GENERIC_FIX[kind];
  lines.push(`- Arreglo: ${fix}`);
  const restriction = restrictionFor(kind);
  if (restriction) lines.push(`- Restricción: ${restriction}`);
  lines.push(`- Verificar: ${item.verify}`);
  return lines;
}

function verifyText(kind: IssueKind, hits: readonly Hit[]): string {
  if (hits.length === 1) {
    return verifyFor(
      kind,
      (hits[0]!.issue.related ?? []).map(({ slug }) => slug),
    );
  }
  if (kind === IssueKind.DUPLICATE_TITLE || kind === IssueKind.DUPLICATE_DESCRIPTION) {
    return 'El aviso desaparece de todas las páginas listadas.';
  }
  return verifyFor(kind, []);
}

interface JsonPage {
  slug: string;
  locale: Locale;
  file: string;
  key: string | null;
  /** El valor literal que hay ahora; `null` si no hay (no hay descripción) o el problema no es de un campo. */
  current: string | null;
  /** Qué hay, dicho en palabras, cuando `current` no lo dice. */
  detail?: string;
}

const fenced = (value: unknown) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

const LIMITS = {
  title: [THRESHOLDS.titleMin, THRESHOLDS.titleMax],
  titlePx: THRESHOLDS.titleMaxPx,
  description: [THRESHOLDS.descriptionMin, THRESHOLDS.descriptionMax],
  descriptionPx: THRESHOLDS.descriptionMaxPx,
  kind: 'recommendation',
};

/** El informe de problemas: una sección por tipo, del más al menos urgente (como «Qué arreglar primero»). */
function issuesReport(scope: ReportScope, ctx: ReportContext): Report {
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
    { locales: ctx.locales, inspector: () => '' },
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

  const lines = introOf(scope, ctx);
  if (scope.single) lines.push('', ...pageTable(scope.entries));
  if (items.length === 0) lines.push('', 'Sin problemas en este alcance.');
  items.forEach(({ priority, item }, index) => {
    lines.push(...sectionOf(index + 1, item, priority, scope, ctx));
  });
  if (items.length > 0) lines.push('', ...DO_NOT_TOUCH);
  if (scope.single) lines.push('', ...pageContext(scope.entries));

  const json = {
    site: ctx.site,
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

/** Lo que cada entrada tiene en la columna (para decir qué le falta). */
function lackNote(column: HaveColumn, entry: SeoPage, ctx: ReportContext): string {
  const cell = HAVE_CELLS[column](entry, ctx.locales);
  switch (column) {
    case 'desc':
      return entry.meta.descriptionSource === 'site' ? 'heredada del sitio' : 'sin descripción';
    case 'schema':
      return entry.schemas.length > 0 ? 'solo el schema del sitio' : 'sin schema';
    case 'og':
      return entry.meta.ogImageSource === 'site' ? 'imagen del sitio' : 'sin imagen';
    case 'h1':
      return (
        currentValue(entry, {
          kind: entry.issues.some(({ kind }) => kind === IssueKind.MULTIPLE_H1)
            ? IssueKind.MULTIPLE_H1
            : IssueKind.NO_H1,
          severity: 'error',
          slug: entry.slug,
          locale: entry.locale,
          message: '',
        })?.text ?? ''
      );
    case 'i18n':
      return `${cell.state === 'partial' ? 'respaldo' : 'falta'} ${cell.detail ?? ''}`.trim();
    case 'index':
      return 'noindex';
  }
}

/** «Qué tiene» filtrado por lo que falta: las páginas y, de cada una, el archivo y la clave que no tiene. */
function lacksReport(column: HaveColumn, scope: ReportScope, ctx: ReportContext): Report {
  const lacking = scope.entries.filter((entry) => !isGood(HAVE_CELLS[column](entry, ctx.locales)));
  const slugs = unique(lacking.map((entry) => entry.slug));
  const info = LACKS[column];
  const key = info.key;
  // El alcance cuenta lo que se entrega (las páginas a las que les falta), no todo lo filtrado.
  const lines = introOf({ ...scope, entries: lacking }, ctx);
  lines.push(
    '',
    `## Páginas sin ${LACKS_PHRASES[column]} — ${plural(slugs.length, 'página', 'páginas')}`,
  );
  if (slugs.length === 0) {
    lines.push('Ninguna: todas las páginas de este alcance la tienen.');
  } else {
    lines.push(
      key
        ? `- Clave: ${code(key)} en el frontmatter de cada fichero`
        : '- Clave: ninguna, se arregla en el contenido',
    );
    lines.push(`- Por qué: ${info.why}`);
    lines.push(`- Arreglo: ${info.fix}`);
    const restriction =
      column === 'desc' ? restrictionFor(IssueKind.DESCRIPTION_MISSING) : undefined;
    if (restriction) lines.push(`- Restricción: ${restriction}`);
    lines.push(
      '- Verificar: estas páginas dejan de salir al filtrar «Qué tiene» por lo que les falta.',
    );
    lines.push('- Páginas y ficheros:');
    for (const entry of lacking) {
      const external =
        key && entry.kind !== 'native'
          ? ` — ${code(scopedKey(key, entry.kind))} ${keyPlace(entry.kind)}`
          : '';
      lines.push(entryLine(entry, `${external} — ${lackNote(column, entry, ctx)}`));
    }
    lines.push('', ...DO_NOT_TOUCH);
  }
  const json = {
    site: ctx.site,
    scope: scope.id,
    limits: LIMITS,
    lacks: column,
    pages: lacking.map((entry): JsonPage => ({
      slug: entry.slug,
      locale: entry.locale,
      file: entry.sourcePath,
      key: key ? scopedKey(key, entry.kind) : null,
      current: column === 'desc' ? (entry.meta.description ?? null) : null,
      detail: lackNote(column, entry, ctx),
    })),
  };
  return {
    markdown: lines.join('\n'),
    json: fenced(json),
    pages: slugs.length,
    entries: lacking.length,
  };
}

/**
 * El informe «Copiar para la IA» de un alcance, en Markdown y en JSON. Pura: del árbol, el alcance
 * y los nombres de los tipos sale el texto, sin leer nada más. Lo que afecta a todas las páginas se
 * agrupa una vez (carpeta y clave) en lugar de repetirse por página.
 */
export function buildReport(scope: ReportScope, ctx: ReportContext): Report {
  return scope.lacks ? lacksReport(scope.lacks, scope, ctx) : issuesReport(scope, ctx);
}
