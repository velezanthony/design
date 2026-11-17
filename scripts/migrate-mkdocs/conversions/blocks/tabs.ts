import { directive, indentOf, takeBody, unescapeTitle } from '../../pipeline/lines.ts';
import type { BlockResult, LogEntry, Recurse } from '../../pipeline/types.ts';

const TAB = /^(\s*)===\s+"((?:[^"\\]|\\.)*)"\s*$/;

/**
 * Un grupo de pestañas `=== "Etiqueta"` consecutivas (mismo nivel de indentación) pasa a un
 * `::::tabs` con un `:::tab[Etiqueta]` por pestaña. Un texto entre dos `===` parte el grupo en dos.
 */
export function convertTabs(
  lines: string[],
  start: number,
  offset: number,
  recurse: Recurse,
): BlockResult | undefined {
  const first = TAB.exec(lines[start]);
  if (!first) return undefined;
  const indent = first[1].length;
  const log: LogEntry[] = [];
  const blocks: string[][] = [];
  let cursor = start;
  for (;;) {
    const head = TAB.exec(lines[cursor]);
    if (!head) break;
    const [rawBody, next] = takeBody(lines, cursor + 1, indent);
    const inner = recurse(rawBody, offset + cursor + 1);
    log.push(...inner.log);
    blocks.push(directive(`tab[${unescapeTitle(head[2])}]`, inner.output));
    cursor = next;
    let peek = cursor;
    while (peek < lines.length && lines[peek].trim() === '') peek++;
    if (peek < lines.length && TAB.test(lines[peek]) && indentOf(lines[peek]) === indent)
      cursor = peek;
    else break;
  }
  log.push({ kind: 'tabs', line: offset + start + 1, detail: `${blocks.length} tabs` });
  return {
    output: directive('tabs', blocks.flat(), 4).map((row) => first[1] + row),
    log,
    next: cursor,
  };
}
