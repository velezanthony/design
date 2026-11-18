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
  const match = API_DIRECTIVE.exec(lines[start] ?? '');
  const identifier = match?.[2];
  if (identifier === undefined) return undefined;
  const lineNumber = offset + start + 1;
  let next = start + 1;
  for (let lineIndex = start + 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? '';
    if (line.trim() === '') continue;
    if (indentOf(line) >= 4) next = lineIndex + 1;
    else break;
  }
  const generated = resolveApi?.(identifier);
  if (generated === undefined) {
    return {
      output: [
        ':::note[API reference]',
        `The reference of \`${identifier}\` is generated from the package docstrings in the original repository.`,
        ':::',
      ],
      log: [{ kind: 'api-unresolved', line: lineNumber, detail: identifier }],
      next,
    };
  }
  return {
    output: generated.split('\n'),
    log: [{ kind: 'api', line: lineNumber, detail: identifier }],
    next,
  };
}
