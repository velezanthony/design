import { replaceOutsideCode } from '../../pipeline/lines.ts';
import type { LineResult, LogEntry } from '../../pipeline/types.ts';

const LINK = /\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g;

/** Aplica `rewriteHref` al destino de cada enlace (el título se conserva). Sin él, no hace nada. */
export function rewriteLinks(
  line: string,
  lineNumber: number,
  rewriteHref: ((href: string) => string | undefined) | undefined,
): LineResult {
  if (!rewriteHref) return { output: line, log: [] };
  const log: LogEntry[] = [];
  const output = replaceOutsideCode(line, LINK, (match) => {
    const next = rewriteHref(match[1]);
    if (next === undefined || next === match[1]) return match[0];
    log.push({ kind: 'link', line: lineNumber, detail: `${match[1]} -> ${next}` });
    return `](${next}${match[2]})`;
  });
  return { output, log };
}
