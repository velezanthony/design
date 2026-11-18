import type { LogEntry } from '../../pipeline/types.ts';

const HTML_OPEN = /^\s*<div\b[^>]*\bmarkdown\b[^>]*>\s*$/;
const HTML_CLOSE = /^\s*<\/div>\s*$/;

/** Quita el `<div markdown>` de las tarjetas de Material y sus `---`; no consume bloques, por eso devuelve la profundidad nueva. */
export function stepHtmlWrapper(
  line: string,
  depth: number,
  lineNumber: number,
): { depth: number; skip: boolean; log: LogEntry[] } {
  if (HTML_OPEN.test(line)) {
    return {
      depth: depth + 1,
      skip: true,
      log: [{ kind: 'html-wrapper', line: lineNumber, detail: line.trim() }],
    };
  }
  if (depth > 0) {
    if (HTML_CLOSE.test(line)) return { depth: depth - 1, skip: true, log: [] };
    if (/^\s{4}---\s*$/.test(line)) return { depth, skip: true, log: [] };
  }
  return { depth, skip: false, log: [] };
}
