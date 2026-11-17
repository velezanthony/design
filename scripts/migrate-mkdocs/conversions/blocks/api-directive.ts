import { indentOf } from '../../pipeline/lines.ts';
import type { BlockResult } from '../../pipeline/types.ts';

const API_DIRECTIVE = /^(\s*):::\s+([A-Za-z_][\w.]*)\s*$/;

/**
 * `::: paquete.Símbolo` de mkdocstrings, con sus opciones indentadas debajo. Se sustituye por el
 * Markdown que genera `resolveApi`; sin él queda una nota, porque el contenido sale de las
 * docstrings del repositorio original y no se puede inventar.
 */
export function convertApiDirective(
  lines: string[],
  start: number,
  offset: number,
  resolveApi: ((identifier: string) => string | undefined) | undefined,
): BlockResult | undefined {
  const match = API_DIRECTIVE.exec(lines[start]);
  if (!match) return undefined;
  const lineNumber = offset + start + 1;
  let next = start + 1;
  for (let j = start + 1; j < lines.length; j++) {
    if (lines[j].trim() === '') continue;
    if (indentOf(lines[j]) >= 4) next = j + 1;
    else break;
  }
  const generated = resolveApi?.(match[2]);
  if (generated === undefined) {
    return {
      output: [
        ':::note[API reference]',
        `The reference of \`${match[2]}\` is generated from the package docstrings in the original repository.`,
        ':::',
      ],
      log: [{ kind: 'api-unresolved', line: lineNumber, detail: match[2] }],
      next,
    };
  }
  return {
    output: generated.split('\n'),
    log: [{ kind: 'api', line: lineNumber, detail: match[2] }],
    next,
  };
}
