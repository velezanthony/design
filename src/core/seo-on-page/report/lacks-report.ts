import { LACKS_PHRASES, HAVE_CELLS, isGood } from '../have';
import type { HaveColumn } from '../queries/url-filters';
import { keyPlace, scopedKey } from '../key-place';
import { IssueKind, type SeoPage } from '../tree/types';
import { plural } from '../../shared/text';
import {
  code,
  DO_NOT_TOUCH,
  entryLine,
  fenced,
  introOf,
  type JsonPage,
  LIMITS,
  unique,
} from './format';
import { LACKS } from './lacks';
import { currentValue, restrictionFor } from './kinds';
import type { Report, ReportContext } from './report';
import type { ReportScope } from './scope';

/** Lo que cada entrada tiene en la columna (para decir qué le falta). */
function lackNote(column: HaveColumn, entry: SeoPage, context: ReportContext): string {
  const cell = HAVE_CELLS[column](entry, context.locales);
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
export function lacksReport(
  column: HaveColumn,
  scope: ReportScope,
  context: ReportContext,
): Report {
  const lacking = scope.entries.filter(
    (entry) => !isGood(HAVE_CELLS[column](entry, context.locales)),
  );
  const slugs = unique(lacking.map((entry) => entry.slug));
  const info = LACKS[column];
  const key = info.key;
  // El alcance cuenta lo que se entrega (las páginas a las que les falta), no todo lo filtrado.
  const lines = introOf({ ...scope, entries: lacking }, context);
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
      lines.push(entryLine(entry, `${external} — ${lackNote(column, entry, context)}`));
    }
    lines.push('', ...DO_NOT_TOUCH);
  }
  const json = {
    site: context.site,
    scope: scope.id,
    limits: LIMITS,
    lacks: column,
    pages: lacking.map((entry): JsonPage => ({
      slug: entry.slug,
      locale: entry.locale,
      file: entry.sourcePath,
      key: key ? scopedKey(key, entry.kind) : null,
      current: column === 'desc' ? (entry.meta.description ?? null) : null,
      detail: lackNote(column, entry, context),
    })),
  };
  return {
    markdown: lines.join('\n'),
    json: fenced(json),
    pages: slugs.length,
    entries: lacking.length,
  };
}
