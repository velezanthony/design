import type { Page } from '../content/discovery';
import { pageUrl, type UrlPolicy } from '../i18n/availability';

/** Separador de commits en el formato de `git log`; no puede aparecer en un nombre de archivo. */
export const COMMIT_MARK = '\u001e';

/** La salida de `git log --name-only --format=<COMMIT_MARK>%cI` como archivo → fecha de su último commit; el log va del más nuevo al más viejo, así que gana la primera vez que aparece. */
export function parseCommitDates(log: string): Map<string, string> {
  const dates = new Map<string, string>();
  let date: string | undefined;
  for (const line of log.split('\n')) {
    if (line.startsWith(COMMIT_MARK)) {
      date = line.slice(COMMIT_MARK.length);
    } else if (line && date && !dates.has(line)) {
      dates.set(line, date);
    }
  }
  return dates;
}

/** URL de cada página → fecha de su archivo; la que no tiene fecha no aparece. */
export function pageLastmods(
  pages: readonly Page[],
  url: UrlPolicy,
  dates: ReadonlyMap<string, string>,
): Map<string, string> {
  const lastmods = new Map<string, string>();
  for (const page of pages) {
    const date = dates.get(page.sourcePath);
    if (date) lastmods.set(pageUrl(page.slug, page.locale, url), date);
  }
  return lastmods;
}
