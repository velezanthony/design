import { FENCE } from '../../pipeline/lines.ts';
import type { BlockResult } from '../../pipeline/types.ts';

/** Apertura de un fence con, como mucho, `text` de etiqueta (nada de atributos). */
const FENCE_OPEN = /^(\s*)(`{3,}|~{3,})\s*(text)?\s*$/;
const SQL_START = /^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH)\b/;

/**
 * Lenguaje que se deduce sin riesgo del cuerpo de un bloque sin etiquetar: `console` si la primera
 * línea es una orden (`$ `, con su salida debajo si la hay) y `sql` si empieza por una sentencia.
 * Nunca adivina Python ni nada más: ante la duda, `undefined`.
 */
function inferLanguage(body: string[]): string | undefined {
  const first = body.find((row) => row.trim() !== '')?.trim();
  if (first === undefined) return undefined;
  if (first.startsWith('$ ')) return 'console';
  if (SQL_START.test(first)) return 'sql';
  return undefined;
}

/** Índice de la línea que cierra el fence abierto en `start`, o `undefined` si no se cierra. */
function closingIndex(lines: string[], start: number, char: string, length: number) {
  for (let lineIndex = start + 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? '';
    const fence = FENCE.exec(line)?.[1];
    if (fence && fence[0] === char && fence.length >= length && line.trim() === fence) {
      return lineIndex;
    }
  }
  return undefined;
}

/**
 * Un bloque de código con fence, de la apertura al cierre (o al final si no se cierra). Su
 * contenido NO se toca nunca: es la razón de que el resto de unidades no vean el código. Lo único
 * que hace es etiquetar la apertura cuando el lenguaje es inequívoco.
 */
export function convertFence(
  lines: string[],
  start: number,
  offset: number,
): BlockResult | undefined {
  const open = FENCE.exec(lines[start] ?? '')?.[1];
  if (!open) return undefined;
  const char = open.charAt(0);
  const close = closingIndex(lines, start, char, open.length);
  const next = close === undefined ? lines.length : close + 1;
  const output = lines.slice(start, next);
  const log: BlockResult['log'] = [];

  const bare = FENCE_OPEN.exec(lines[start] ?? '');
  const language =
    bare && close !== undefined ? inferLanguage(lines.slice(start + 1, close)) : undefined;
  if (bare && language) {
    log.push({
      kind: 'code-language',
      line: offset + start + 1,
      detail: `${bare[3] ?? 'none'} -> ${language}`,
    });
    output[0] = `${bare[1]}${bare[2]}${language}`;
  }
  return { output, log, next };
}
