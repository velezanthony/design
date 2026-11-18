/** Red de seguridad: lista la sintaxis de MkDocs que la conversión no entendió, mirando el RESULTADO, y reconoce los stubs de snippet. */
import { FENCE } from '../pipeline/lines.ts';

export type LeftoverKind = 'admonition' | 'tab' | 'icon' | 'snippet';

export interface Leftover {
  file: string;
  /** Línea (1-based) del texto que se ha comprobado, es decir, de la SALIDA. */
  line: number;
  kind: LeftoverKind;
  preview: string;
}

export interface SnippetStub {
  file: string;
  /** Fichero que incluye, tal cual está escrito (relativo a la raíz del repo en MkDocs). */
  include: string;
}

const PREVIEW_LENGTH = 80;

const PATTERNS: Array<[LeftoverKind, RegExp]> = [
  ['admonition', /^\s*(?:!!!|\?\?\?\+?) ?[\w-]+/],
  ['tab', /^\s*===[+!]?\s+"/],
  ['icon', /:(?:material|octicons|fontawesome|simple)-[\w-]+:/],
  ['snippet', /--8<--/],
];

/** Sustituye el código en línea por espacios (misma longitud), para no detectar lo que es código. */
export function maskInlineCode(line: string) {
  return line.replace(/(`+)[^`]*?\1/g, (code) => ' '.repeat(code.length));
}

function preview(line: string) {
  const text = line.trim();
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;
}

/** Líneas fuera de fences con su número (1-based). Un fence sin cerrar llega hasta el final. */
export function* proseLines(markdown: string): Generator<[number, string]> {
  let fence: { char: string; length: number } | undefined;
  for (const [index, line] of markdown.split('\n').entries()) {
    const marker = FENCE.exec(line)?.[1];
    if (fence) {
      if (
        marker &&
        marker[0] === fence.char &&
        marker.length >= fence.length &&
        line.trim() === marker
      ) {
        fence = undefined;
      }
      continue;
    }
    if (marker) {
      fence = { char: marker.charAt(0), length: marker.length };
      continue;
    }
    yield [index + 1, line];
  }
}

export function findLeftovers(file: string, markdown: string): Leftover[] {
  const found: Leftover[] = [];
  for (const [line, text] of proseLines(markdown)) {
    const masked = maskInlineCode(text);
    for (const [kind, pattern] of PATTERNS) {
      if (pattern.test(masked)) found.push({ file, line, kind, preview: preview(text) });
    }
  }
  return found;
}

/** Página cuyo cuerpo son solo includes de snippet: no se convierte, se avisa de que mejor se publica como `external[]` (devuelve el primero). */
export function findSnippetStub(file: string, markdown: string): SnippetStub | undefined {
  const lines = markdown.split('\n');
  let start = 0;
  if (lines[0] === '---') {
    const close = lines.indexOf('---', 1);
    if (close !== -1) start = close + 1;
  }
  const body = lines
    .slice(start)
    .join('\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => line.trim() !== '');
  const includes = body.map((line) => /^;?--8<--\s+["']([^"']+)["']\s*$/.exec(line.trim()));
  const onlyIncludesAndTitles = body.every(
    (line, index) => includes[index] || /^#{1,6}\s/.test(line),
  );
  const first = includes.find((match) => match !== null);
  if (!first || !onlyIncludesAndTitles) return undefined;
  return { file, include: first[1]! };
}

/** Restos y stubs de un conjunto de ficheros ya convertidos, ordenados por fichero y línea. */
export function checkOutput(files: ReadonlyMap<string, string>): {
  leftovers: Leftover[];
  stubs: SnippetStub[];
} {
  const leftovers: Leftover[] = [];
  const stubs: SnippetStub[] = [];
  for (const [file, markdown] of [...files].sort(([left], [right]) => left.localeCompare(right))) {
    const stub = findSnippetStub(file, markdown);
    if (stub) {
      stubs.push(stub);
      continue;
    }
    leftovers.push(...findLeftovers(file, markdown));
  }
  return { leftovers, stubs };
}
