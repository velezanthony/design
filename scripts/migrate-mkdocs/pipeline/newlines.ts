/** La conversión trabaja con LF y al escribir restaura el salto original, para que `git diff` muestre solo la conversión. */

export function splitNewlineStyle(text: string): { text: string; crlf: boolean } {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/\n/g) ?? []).length - crlf;
  return { text: text.replace(/\r\n/g, '\n'), crlf: crlf > lf };
}

export function applyNewlineStyle(text: string, crlf: boolean) {
  return crlf ? text.replace(/\n/g, '\r\n') : text;
}
