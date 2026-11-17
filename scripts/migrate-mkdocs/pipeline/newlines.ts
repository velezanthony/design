/**
 * El estilo de salto de línea de un fichero. La conversión trabaja siempre con LF (sus patrones
 * no cuentan con `\r`), y al escribir se restaura el estilo original para que `git diff` muestre
 * solo la conversión y no todo el fichero reescrito.
 */

export function splitNewlineStyle(text: string): { text: string; crlf: boolean } {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/\n/g) ?? []).length - crlf;
  return { text: text.replace(/\r\n/g, '\n'), crlf: crlf > lf };
}

export const applyNewlineStyle = (text: string, crlf: boolean) =>
  crlf ? text.replace(/\n/g, '\r\n') : text;
