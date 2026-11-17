import type { MissingTranslation } from '../../i18n/translation-policy';
import { MissingTranslation as Policy } from '../../i18n/translation-policy';
import { IssueKind, IssueSeverity, type Issue, type SeoLocaleEntry } from '../tree/types';
import { makeIssue } from './issue';

/**
 * Traducciones que faltan, respetando la política: `omit` es una decisión explícita aunque venga de
 * la config, y una política declarada en algún archivo del grupo también. Solo la ausencia sin
 * declarar nada (lo que `undeclaredMissing` ya define como olvido) es un warning. `policy` sin
 * definir es el conflicto que `resolvePolicies` reporta: archivos del grupo que se contradicen.
 */
export function analyzeMultilingual(
  page: { slug: string; locale: string },
  locales: SeoLocaleEntry[],
  policy: MissingTranslation | undefined,
): Issue[] {
  const issues: Issue[] = [];
  if (policy === undefined) {
    issues.push(
      makeIssue(
        IssueKind.TRANSLATION_POLICY_CONFLICT,
        page,
        'Los archivos del grupo declaran políticas de traducción distintas.',
      ),
    );
  }
  for (const entry of locales) {
    if (entry.status !== 'missing') continue;
    const explicit = entry.declared || entry.policy === Policy.OMIT;
    issues.push(
      makeIssue(
        IssueKind.TRANSLATION_MISSING,
        page,
        explicit
          ? `Sin traducción a «${entry.locale}» (política «${entry.policy}»).`
          : `Falta la traducción a «${entry.locale}» y no se declaró qué hacer.`,
        { severity: explicit ? IssueSeverity.INFO : IssueSeverity.WARNING },
      ),
    );
  }
  return issues;
}
