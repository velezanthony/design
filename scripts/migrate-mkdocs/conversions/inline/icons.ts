import { replaceOutsideCode } from '../../pipeline/lines.ts';
import type { LineResult, LogEntry } from '../../pipeline/types.ts';

/** `:material-x:`, `:octicons-x-16:`, `:fontawesome-brands-x:`, `:simple-x:`, con `{ .lg }` opcional. */
const ICON = /:(?:material|octicons|fontawesome|simple)-[\w-]+:(?:\{[^}]*\})?[ \t]?/g;

/** Quita los códigos de icono de Material: la librería no tiene esas fuentes de iconos. */
export function removeIcons(line: string, lineNumber: number): LineResult {
  const log: LogEntry[] = [];
  const output = replaceOutsideCode(line, ICON, (match) => {
    log.push({ kind: 'icon', line: lineNumber, detail: match[0].trim() });
    return '';
  });
  return { output, log };
}
