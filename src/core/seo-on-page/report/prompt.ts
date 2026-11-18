import { CATALOG } from '../catalog';
import type { Issue, IssueKind, SeoPage, SeoTree } from '../tree/types';
import { currentValue, keyOf, restrictionFor } from './kinds';

const SEVERITY_TEXT = { error: 'error', warning: 'aviso', info: 'info' } as const;
const CERTAINTY_TEXT = { rule: 'regla', heuristic: 'heurística' } as const;

interface PromptInput {
  site: string;
  /** La página e idioma donde ocurre el problema. */
  entry: SeoPage;
  issue: Issue;
  /** El árbol entero, para el archivo de las páginas con las que choca. */
  tree: SeoTree;
  kindLabels: Record<IssueKind, string>;
}

/** Prompt autosuficiente para UN problema de UNA página e idioma, para pegar sin el informe entero. */
export function issuePrompt({ site, entry, issue, tree, kindLabels }: PromptInput): string {
  const certainty = CATALOG[issue.kind].certainty;
  const key = keyOf(issue.kind, entry);
  const value = currentValue(entry, issue);
  const restriction = restrictionFor(issue.kind);
  const related = issue.related ?? [];
  const relatedFiles = related.map(({ slug, locale }) => {
    const file = tree.pages.find(
      (page) => page.slug === slug && page.locale === locale,
    )?.sourcePath;
    return `\`${slug || '/'}\`${file ? ` (\`${file}\`)` : ''}`;
  });
  return [
    `En el sitio «${site}», la página \`${entry.slug || '/'}\` (idioma ${entry.locale}) tiene este problema de SEO: ${kindLabels[issue.kind]} (${SEVERITY_TEXT[issue.severity]}, ${CERTAINTY_TEXT[certainty]}). ${issue.message}`,
    `Fichero: \`${entry.sourcePath}\``,
    ...(key ? [`Clave: \`${key}\``] : []),
    ...(value ? [`Valor actual: ${value.text}`] : []),
    ...(relatedFiles.length > 0 ? [`Choca con: ${relatedFiles.join(', ')}`] : []),
    `Qué hacer: ${issue.fix ?? CATALOG[issue.kind].fix}`,
    ...(restriction ? [`Restricción: ${restriction}`] : []),
    `Verificar: ${CATALOG[issue.kind].verify(related.map(({ slug }) => slug))}`,
    'No cambies el slug, la URL ni el canonical.',
  ].join('\n');
}
