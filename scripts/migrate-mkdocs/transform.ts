/**
 * Transformación pura de Markdown de MkDocs Material al Markdown de `@velezanthony/design`.
 *
 * Sin E/S: recibe el texto y unas funciones opcionales de resolución, y devuelve el texto nuevo
 * más un registro de todo lo que ha tocado. Así se puede probar entera y reutilizar en cualquier
 * migración futura (la CLI de esta carpeta solo la envuelve con ficheros).
 */

export type LogKind =
  | 'admonition'
  | 'admonition-alias'
  | 'admonition-unknown'
  | 'alert'
  | 'collapsed'
  | 'tabs'
  | 'icon'
  | 'attr-list'
  | 'heading-id'
  | 'html-wrapper'
  | 'frontmatter'
  | 'api'
  | 'api-unresolved'
  | 'autoref'
  | 'autoref-unresolved'
  | 'link'
  | 'anchor';

export interface LogEntry {
  kind: LogKind;
  /** Línea (1-based) aproximada del original; en cuerpos anidados es relativa a su bloque. */
  line: number;
  detail: string;
}

export interface TransformOptions {
  /** Markdown que sustituye a `::: identificador` (mkdocstrings). Sin él, queda una nota. */
  resolveApi?: (identifier: string) => string | undefined;
  /** Símbolo de API -> URL relativa del ancla generada, para las referencias `[X][símbolo]`. */
  symbols?: Record<string, string>;
  /** Devuelve un destino nuevo para un enlace, o `undefined` para dejarlo como está. */
  rewriteHref?: (href: string) => string | undefined;
}

export interface TransformResult {
  markdown: string;
  log: LogEntry[];
}

/** Tipos de directiva que entiende la librería. */
const NATIVE_TYPES = new Set(['note', 'info', 'tip', 'warning', 'danger', 'question']);

/** Alias de MkDocs Material -> tipo de la librería. */
const ALIASES: Record<string, string> = {
  abstract: 'note',
  summary: 'note',
  tldr: 'note',
  quote: 'note',
  cite: 'note',
  success: 'tip',
  check: 'tip',
  done: 'tip',
  hint: 'tip',
  important: 'tip',
  failure: 'danger',
  fail: 'danger',
  missing: 'danger',
  bug: 'danger',
  error: 'danger',
  example: 'info',
  todo: 'info',
  attention: 'warning',
  caution: 'warning',
  help: 'question',
  faq: 'question',
};

/** Tipos con una alerta de GitHub equivalente 1:1. */
const ALERTS: Record<string, string> = { note: 'NOTE', tip: 'TIP', warning: 'WARNING' };

/** Claves de frontmatter que solo entiende MkDocs Material. */
const MKDOCS_ONLY_KEYS = ['hide', 'search', 'status'];

const ADMONITION = /^(\s*)(!!!|\?\?\?\+?)\s+([\w-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*$/;
const TAB = /^(\s*)===\s+"((?:[^"\\]|\\.)*)"\s*$/;
const API_DIRECTIVE = /^(\s*):::\s+([A-Za-z_][\w.]*)\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const HTML_OPEN = /^\s*<div\b[^>]*\bmarkdown\b[^>]*>\s*$/;
const HTML_CLOSE = /^\s*<\/div>\s*$/;
const ICON = /:(?:material|octicons|fontawesome|simple)-[\w-]+:(?:\{[^}]*\})?[ \t]?/g;
const ATTR_LIST = /(?<=[)\]*])\{\s*(?:\.[\w-]+\s*)+\}/g;
const HEADING_ID = /^(#{1,6}\s.*?)\s*\{\s*#[\w-]+\s*\}\s*$/;
const AUTOREF = /\[([^\]]+)\]\[([A-Za-z_][\w.]*)?\]/g;
const LINK = /\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g;

const indentOf = (line: string) => line.length - line.trimStart().length;
const unescapeTitle = (title: string) => title.replace(/\\(["\\])/g, '$1');
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Rangos `[inicio, fin)` de los spans de código en línea de la línea. */
function codeRanges(line: string): Array<[number, number]> {
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
function replaceOutsideCode(
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
function colonsFor(body: string[], minimum: number): number {
  let widest = 0;
  for (const line of body) {
    const run = /^(:{3,})(?=[\w[{]|$)/.exec(line);
    if (run) widest = Math.max(widest, run[1].length);
  }
  return Math.max(minimum, widest + 1);
}

/** Líneas del cuerpo indentado que empieza en `start`, ya desindentadas, y el índice siguiente. */
function takeBody(lines: string[], start: number, indent: number): [string[], number] {
  let end = start;
  let last = start;
  while (end < lines.length) {
    const line = lines[end];
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

/** Quita del frontmatter las claves que solo conoce MkDocs. Devuelve el texto y lo quitado. */
function cleanFrontmatter(lines: string[], log: LogEntry[]): string[] {
  if (lines[0] !== '---') return lines;
  const close = lines.indexOf('---', 1);
  if (close === -1) return lines;
  const kept: string[] = [];
  let dropping = false;
  for (const [index, line] of lines.slice(1, close).entries()) {
    const key = /^([\w-]+):/.exec(line);
    if (key) {
      dropping = MKDOCS_ONLY_KEYS.includes(key[1]);
      if (dropping)
        log.push({ kind: 'frontmatter', line: index + 2, detail: `removed key ${key[1]}` });
    } else if (dropping && !/^\s/.test(line) && !line.startsWith('- ')) {
      dropping = false;
    }
    if (!dropping) kept.push(line);
  }
  const rest = lines.slice(close + 1);
  if (kept.every((line) => line.trim() === '')) {
    return rest[0] === '' ? rest.slice(1) : rest;
  }
  return ['---', ...kept, '---', ...rest];
}

interface Context {
  options: TransformOptions;
  log: LogEntry[];
}

/** Conversión de una línea de texto corrido (fuera de fences). */
function convertInline(line: string, ctx: Context, lineNumber: number): string {
  let out = line;
  const heading = HEADING_ID.exec(out);
  if (heading) {
    ctx.log.push({ kind: 'heading-id', line: lineNumber, detail: out.trim() });
    out = heading[1];
  }

  out = replaceOutsideCode(out, AUTOREF, (match) => {
    const [whole, text, ref] = match;
    const symbol = ref ?? text.replace(/`/g, '');
    if (!symbol.includes('.')) return whole;
    const url = ctx.options.symbols?.[symbol];
    if (url) {
      ctx.log.push({ kind: 'autoref', line: lineNumber, detail: `${symbol} -> ${url}` });
      return `[${text}](${url})`;
    }
    ctx.log.push({ kind: 'autoref-unresolved', line: lineNumber, detail: symbol });
    return text;
  });

  out = replaceOutsideCode(out, ICON, (match) => {
    ctx.log.push({ kind: 'icon', line: lineNumber, detail: match[0].trim() });
    return '';
  });

  out = replaceOutsideCode(out, ATTR_LIST, (match) => {
    ctx.log.push({ kind: 'attr-list', line: lineNumber, detail: match[0] });
    return '';
  });

  const { rewriteHref } = ctx.options;
  if (rewriteHref) {
    out = replaceOutsideCode(out, LINK, (match) => {
      const next = rewriteHref(match[1]);
      if (next === undefined || next === match[1]) return match[0];
      ctx.log.push({ kind: 'link', line: lineNumber, detail: `${match[1]} -> ${next}` });
      return `](${next}${match[2]})`;
    });
  }
  return out;
}

/** Envuelve `body` en una directiva `:::type[title]` con los dos puntos que haga falta. */
function directive(header: string, body: string[], minimum = 3): string[] {
  const colons = ':'.repeat(colonsFor(body, minimum));
  return [`${colons}${header}`, ...body, colons];
}

function convert(lines: string[], ctx: Context, offset: number): string[] {
  const out: string[] = [];
  let fence: { char: string; length: number } | undefined;
  let wrapperDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = offset + i + 1;

    if (fence) {
      out.push(line);
      const close = FENCE.exec(line);
      if (
        close &&
        close[1][0] === fence.char &&
        close[1].length >= fence.length &&
        line.trim() === close[1]
      ) {
        fence = undefined;
      }
      continue;
    }
    const open = FENCE.exec(line);
    if (open) {
      fence = { char: open[1][0], length: open[1].length };
      out.push(line);
      continue;
    }

    const admonition = ADMONITION.exec(line);
    if (admonition) {
      const [, indentText, marker, rawType, rawTitle] = admonition;
      const indent = indentText.length;
      const [rawBody, next] = takeBody(lines, i + 1, indent);
      const body = convert(rawBody, ctx, lineNumber);
      const prefix = (text: string[]) => text.map((row) => indentText + row);

      let type = rawType.toLowerCase();
      let title = rawTitle === undefined ? '' : unescapeTitle(rawTitle);
      if (!NATIVE_TYPES.has(type)) {
        const alias = ALIASES[type];
        if (alias) {
          ctx.log.push({
            kind: 'admonition-alias',
            line: lineNumber,
            detail: `${type} -> ${alias}`,
          });
          if (!title) title = capitalize(type);
          type = alias;
        } else {
          ctx.log.push({ kind: 'admonition-unknown', line: lineNumber, detail: `${type} -> note` });
          if (!title) title = capitalize(type);
          type = 'note';
        }
      }

      const collapsed = marker === '???';
      const alert = ALERTS[type];
      const nested = body.some((row) => /^:{3,}/.test(row));
      if (!title && alert && !collapsed && !nested) {
        ctx.log.push({ kind: 'alert', line: lineNumber, detail: `${rawType} -> [!${alert}]` });
        out.push(
          ...prefix([`> [!${alert}]`, ...body.map((row) => (row === '' ? '>' : `> ${row}`))]),
        );
      } else {
        ctx.log.push({
          kind: 'admonition',
          line: lineNumber,
          detail: `${marker} ${rawType} -> ${type}`,
        });
        if (collapsed) ctx.log.push({ kind: 'collapsed', line: lineNumber, detail: type });
        const label = title ? `[${title}]` : '';
        out.push(...prefix(directive(`${type}${label}${collapsed ? '{collapsed}' : ''}`, body)));
      }
      i = next - 1;
      continue;
    }

    const tab = TAB.exec(line);
    if (tab) {
      const indent = tab[1].length;
      const blocks: string[][] = [];
      let cursor = i;
      for (;;) {
        const head = TAB.exec(lines[cursor]);
        if (!head) break;
        const [rawBody, next] = takeBody(lines, cursor + 1, indent);
        blocks.push(
          directive(`tab[${unescapeTitle(head[2])}]`, convert(rawBody, ctx, offset + cursor + 1)),
        );
        cursor = next;
        let peek = cursor;
        while (peek < lines.length && lines[peek].trim() === '') peek++;
        if (peek < lines.length && TAB.test(lines[peek]) && indentOf(lines[peek]) === indent)
          cursor = peek;
        else break;
      }
      ctx.log.push({ kind: 'tabs', line: lineNumber, detail: `${blocks.length} tabs` });
      out.push(...directive('tabs', blocks.flat(), 4).map((row) => tab[1] + row));
      i = cursor - 1;
      continue;
    }

    const api = API_DIRECTIVE.exec(line);
    if (api) {
      let next = i + 1;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (indentOf(lines[j]) >= 4) next = j + 1;
        else break;
      }
      const generated = ctx.options.resolveApi?.(api[2]);
      if (generated === undefined) {
        ctx.log.push({ kind: 'api-unresolved', line: lineNumber, detail: api[2] });
        out.push(
          ':::note[API reference]',
          `The reference of \`${api[2]}\` is generated from the package docstrings in the original repository.`,
          ':::',
        );
      } else {
        ctx.log.push({ kind: 'api', line: lineNumber, detail: api[2] });
        out.push(...generated.split('\n'));
      }
      i = next - 1;
      continue;
    }

    if (HTML_OPEN.test(line)) {
      wrapperDepth++;
      ctx.log.push({ kind: 'html-wrapper', line: lineNumber, detail: line.trim() });
      continue;
    }
    if (wrapperDepth > 0) {
      if (HTML_CLOSE.test(line)) {
        wrapperDepth--;
        continue;
      }
      if (/^\s{4}---\s*$/.test(line)) continue;
    }

    out.push(convertInline(line, ctx, lineNumber));
  }
  return out;
}

export function transformMkdocs(source: string, options: TransformOptions = {}): TransformResult {
  const log: LogEntry[] = [];
  const trailingNewline = source.endsWith('\n');
  const lines = (trailingNewline ? source.slice(0, -1) : source).split('\n');
  const body = cleanFrontmatter(lines, log);
  const converted = convert(body, { options, log }, lines.length - body.length);
  return { markdown: converted.join('\n') + (trailingNewline ? '\n' : ''), log };
}
