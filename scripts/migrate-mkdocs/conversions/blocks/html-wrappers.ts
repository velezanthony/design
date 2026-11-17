import type { LogEntry } from '../../pipeline/types.ts';

const HTML_OPEN = /^\s*<div\b[^>]*\bmarkdown\b[^>]*>\s*$/;
const HTML_CLOSE = /^\s*<\/div>\s*$/;

/**
 * Las tarjetas de Material (`<div class="grid cards" markdown>`) envuelven Markdown en HTML. La
 * librería no lo necesita: se descartan el `<div>`, su cierre y el `---` con cuatro espacios que
 * separa las tarjetas. Es una función de paso (no consume bloques): el contenido de dentro sigue
 * convirtiéndose como cualquier otro, por eso devuelve la profundidad nueva.
 */
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
