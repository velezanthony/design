/** Un trozo de un mensaje: texto normal o un nombre de código (una clave, una ruta). */
export interface Span {
  text: string;
  code: boolean;
}

/** Las comillas sin pareja quedan como texto para que un mensaje mal escrito no se coma el resto. */
export function codeSpans(message: string): Span[] {
  const spans: Span[] = [];
  function push(text: string, code: boolean) {
    if (text !== '') spans.push({ text, code });
  }
  const pattern = /`([^`]+)`/g;
  let last = 0;
  for (const match of message.matchAll(pattern)) {
    push(message.slice(last, match.index), false);
    push(match[1]!, true);
    last = match.index + match[0].length;
  }
  push(message.slice(last), false);
  return spans;
}

/** El mismo mensaje sin comillas de código, para donde no cabe HTML (un `title`). */
export function plainText(message: string): string {
  return codeSpans(message)
    .map((span) => span.text)
    .join('');
}
