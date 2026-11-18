import type { Locale } from '../../i18n/locale';
import type { IssueKind, SeoTree } from '../tree/types';
import { issuesReport } from './issues-report';
import { lacksReport } from './lacks-report';
import type { ReportScope } from './scope';

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

/** Pura; lo que afecta a todas las páginas se agrupa una vez (carpeta y clave). */
export function buildReport(scope: ReportScope, context: ReportContext): Report {
  return scope.lacks ? lacksReport(scope.lacks, scope, context) : issuesReport(scope, context);
}
