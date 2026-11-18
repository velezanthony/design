import type { Locale } from '../../i18n/locale';
import { estimateWidth } from '../pixels';
import type { Certainty } from '../catalog';
import { THRESHOLDS } from '../thresholds';
import { slugLabel } from '../tree/keys';
import type { IssueSeverity, SeoPage } from '../tree/types';
import { plural } from '../../shared/text';
import { contentDirs } from './content-dirs';
import type { ReportContext } from './report';
import type { ReportScope } from './scope';

export const SEVERITY_TEXT: Record<IssueSeverity, string> = {
  error: 'error',
  warning: 'aviso',
  info: 'info',
};
export const CERTAINTY_TEXT: Record<Certainty, string> = { rule: 'regla', heuristic: 'heurística' };

export function code(text: string) {
  return `\`${text}\``;
}
export function slugCode(slug: string) {
  return code(slugLabel(slug));
}

export function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

/** Un valor con su longitud y su ancho estimado, tal como lo ve quien escribe el título o la descripción. */
export function measured(text: string, length: number, field: 'title' | 'description') {
  return `«${text}» (${length} car., ≈${estimateWidth(text, field)} px)`;
}

export function fenced(value: unknown) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

/** Los límites de longitud que va en el bloque JSON, siempre como recomendación. */
export const LIMITS = {
  title: [THRESHOLDS.titleMin, THRESHOLDS.titleMax],
  titlePx: THRESHOLDS.titleMaxPx,
  description: [THRESHOLDS.descriptionMin, THRESHOLDS.descriptionMax],
  descriptionPx: THRESHOLDS.descriptionMaxPx,
  kind: 'recommendation',
};

export interface JsonPage {
  slug: string;
  locale: Locale;
  file: string;
  key: string | null;
  /** El valor literal que hay ahora; `null` si no hay (no hay descripción) o el problema no es de un campo. */
  current: string | null;
  /** Qué hay, dicho en palabras, cuando `current` no lo dice. */
  detail?: string;
}

export const DO_NOT_TOUCH = [
  '## No toques',
  '- Slugs, URLs ni canonical.',
  '- Lo que no aparece en este informe: está bien tal como está.',
];

/** Cómo se marca en la lista una página que no es un `.md` de la carpeta de contenido. */
const KIND_MARK: Record<SeoPage['kind'], string> = {
  native: '',
  external: ', externa',
  client: ', página Astro',
};

/** Una entrada como línea de lista: su archivo, su página y su idioma. */
export function entryLine(entry: SeoPage, extra = '') {
  const where = `${slugCode(entry.slug)}, ${entry.locale}${KIND_MARK[entry.kind]}`;
  return `  - ${code(entry.sourcePath)} (${where})${extra}`;
}

export function localesOf(entries: readonly SeoPage[], order: readonly Locale[]) {
  return order.filter((locale) => entries.some((entry) => entry.locale === locale));
}

export function dirsText(context: ReportContext, locales: readonly Locale[]): string {
  const directories = contentDirs(context.tree);
  // Los idiomas que comparten carpeta (`a.md` y `a.es.md`) se dicen juntos, no repetidos.
  const byDirectory = new Map<string, Locale[]>();
  for (const locale of locales) {
    const directory = directories[locale];
    if (directory !== undefined)
      byDirectory.set(directory, [...(byDirectory.get(directory) ?? []), locale]);
  }
  return [...byDirectory]
    .map(([directory, own]) => `${code(directory)} (${own.join(', ')})`)
    .join(' · ');
}

export function introOf(scope: ReportScope, context: ReportContext): string[] {
  const pages = unique(scope.entries.map((entry) => entry.slug)).length;
  const locales = localesOf(scope.entries, context.locales);
  const where = `idiomas ${locales.map(code).join(', ')} (${plural(scope.entries.length, 'entrada', 'entradas')})`;
  const range = scope.single ? where : `${plural(pages, 'página', 'páginas')} · ${where}`;
  const directories = dirsText(context, locales);
  return [
    `# SEO on page — ${context.site} · ${scope.title}`,
    '',
    `Alcance: ${scope.label} · ${range}`,
    ...(directories ? [`Contenido: ${directories}`] : []),
    'Certeza: **regla** = hecho comprobable · **heurística** = recomendación (no la cumplas a costa del sentido)',
  ];
}
