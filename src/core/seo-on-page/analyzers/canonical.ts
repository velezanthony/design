import { IssueKind, type Issue, type SeoLocaleEntry } from '../tree/types';
import { fixFor, type FixPage } from './fixes';
import { makeIssue } from './issue';

/** Cada idioma es canónico de sí mismo: apuntar al de otro hace que Google fusione las versiones e indexe solo una. */
export function analyzeCanonical(
  page: FixPage & { canonical: string },
  locales: SeoLocaleEntry[],
): Issue[] {
  const own = locales.find((entry) => entry.status === 'present' && entry.locale === page.locale);
  if (own?.status !== 'present' || own.url === page.canonical) return [];
  const other = locales.find((entry) => entry.status === 'present' && entry.url === page.canonical);
  return [
    makeIssue(
      IssueKind.CANONICAL_MISMATCH,
      page,
      other
        ? `El canonical apunta a la versión «${other.locale}», no a la propia.`
        : 'El canonical no es la URL de esta versión de la página.',
      { fix: fixFor(IssueKind.CANONICAL_MISMATCH, page) },
    ),
  ];
}
