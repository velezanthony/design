import { replaceOutsideCode } from '../../pipeline/lines.ts';
import type { LineResult, LogEntry } from '../../pipeline/types.ts';

/** `{ .clase .otra }` justo tras un enlace, imagen o énfasis (la extensión `attr_list`). */
const ATTR_LIST = /(?<=[)\]*])\{\s*(?:\.[\w-]+\s*)+\}/g;

/** Quita las listas de atributos de clase de `attr_list`: la librería no las interpreta. */
export function removeAttrLists(line: string, lineNumber: number): LineResult {
  const log: LogEntry[] = [];
  const output = replaceOutsideCode(line, ATTR_LIST, (match) => {
    log.push({ kind: 'attr-list', line: lineNumber, detail: match[0] });
    return '';
  });
  return { output, log };
}
