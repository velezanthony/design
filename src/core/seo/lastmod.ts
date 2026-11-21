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
      // Las versiones nuevas de git escriben la hora UTC con `Z` y las viejas con `+00:00`: una sola forma.
      date = line.slice(COMMIT_MARK.length).replace(/Z$/, '+00:00');
    } else if (line && date && !dates.has(line)) {
      dates.set(line, date);
    }
  }
  return dates;
}

/** La más reciente de unas fechas ISO; `undefined` si no hay ninguna. */
function newest(candidates: (string | undefined)[]): string | undefined {
  return candidates
    .filter((date): date is string => date !== undefined)
    .reduce<string | undefined>(
      (latest, date) =>
        latest === undefined || Date.parse(date) > Date.parse(latest) ? date : latest,
      undefined,
    );
}

/** URL de cada página → fecha de su archivo; la que no tiene fecha no aparece. Una página con listado (índice generado) cambia también cuando cambia una página de su carpeta: toma la más reciente. */
export function pageLastmods(
  pages: readonly Page[],
  url: UrlPolicy,
  dates: ReadonlyMap<string, string>,
): Map<string, string> {
  const lastmods = new Map<string, string>();
  for (const page of pages) {
    const inFolder = page.listing
      ? pages.filter(
          (other) => other !== page && (page.slug === '' || other.slug.startsWith(`${page.slug}/`)),
        )
      : [];
    const date = newest([
      dates.get(page.sourcePath),
      ...inFolder.map((other) => dates.get(other.sourcePath)),
    ]);
    if (date) lastmods.set(pageUrl(page.slug, page.locale, url), date);
  }
  return lastmods;
}
