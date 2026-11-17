import type { LineResult } from '../../pipeline/types.ts';

const HEADING_ID = /^(#{1,6}\s.*?)\s*\{\s*#[\w-]+\s*\}\s*$/;

/** Quita el `{ #id }` explícito de un encabezado: la librería genera el id del propio texto. */
export function stripHeadingId(line: string, lineNumber: number): LineResult {
  const heading = HEADING_ID.exec(line);
  if (!heading) return { output: line, log: [] };
  return {
    output: heading[1],
    log: [{ kind: 'heading-id', line: lineNumber, detail: line.trim() }],
  };
}
