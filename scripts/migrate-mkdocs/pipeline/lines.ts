/** Utilidades de líneas compartidas por las unidades de conversión. Puras. */

/** Apertura (o cierre) de un fence de código: tres o más `` ` `` o `~`. */
export const FENCE = /^\s*(`{3,}|~{3,})/;

export function indentOf(line: string) {
  return line.length - line.trimStart().length;
}
export function unescapeTitle(title: string) {
  return title.replace(/\\(["\\])/g, '$1');
}

/** Rangos `[inicio, fin)` de los spans de código en línea de la línea. */
export function codeRanges(line: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const match of line.matchAll(/(`+)[^`]*?\1/g)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

/**
 * Como `String.replace`, pero ignora las coincidencias que empiezan dentro de un span de código
 * en línea. Una coincidencia que empieza fuera y contiene código (`[`Foo`][a.b]`) sí vale.
 */
export function replaceOutsideCode(
  line: string,
  pattern: RegExp,
  replacer: (match: RegExpMatchArray) => string,
): string {
  const ranges = codeRanges(line);
  let out = '';
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const start = match.index;
    if (ranges.some(([from, to]) => start >= from && start < to)) continue;
    out += line.slice(last, start) + replacer(match);
    last = start + match[0].length;
  }
  return out + line.slice(last);
}

/** Cuántos dos puntos necesita un contenedor para envolver a los que ya hay dentro. */
export function colonsFor(body: string[], minimum: number): number {
  let widest = 0;
  for (const line of body) {
    const run = /^(:{3,})(?=[\w[{]|$)/.exec(line);
    if (run?.[1]) widest = Math.max(widest, run[1].length);
  }
  return Math.max(minimum, widest + 1);
}

/** Envuelve `body` en una directiva `:::type[title]` con los dos puntos que haga falta. */
export function directive(header: string, body: string[], minimum = 3): string[] {
  const colons = ':'.repeat(colonsFor(body, minimum));
  return [`${colons}${header}`, ...body, colons];
}

/** Líneas del cuerpo indentado que empieza en `start`, ya desindentadas, y el índice siguiente. */
export function takeBody(lines: string[], start: number, indent: number): [string[], number] {
  let end = start;
  let last = start;
  while (end < lines.length) {
    const line = lines[end] ?? '';
    if (line.trim() === '') {
      end++;
      continue;
    }
    if (indentOf(line) < indent + 4) break;
    end++;
    last = end;
  }
  const body = lines
    .slice(start, last)
    .map((line) => (line.trim() === '' ? '' : line.slice(indent + 4)));
  /* La línea en blanco que separa la cabecera del cuerpo no pertenece a ninguno de los dos. */
  while (body[0] === '') body.shift();
  return [body, last];
}
