import { directive, takeBody, unescapeTitle } from '../../pipeline/lines.ts';
import type { BlockResult, LogEntry, Recurse } from '../../pipeline/types.ts';

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

const ADMONITION = /^(\s*)(!!!|\?\?\?\+?)\s+([\w-]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*$/;

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * `!!! tipo "Título"` (y `???` / `???+`) con su cuerpo indentado. Sin título y con equivalente 1:1
 * sale como alerta de GitHub; con título, plegada o anidada, como directiva `:::tipo[Título]`.
 * Los alias de Material y los tipos desconocidos se reducen a un tipo de la librería (y se
 * registran, porque pierden matiz). `recurse` convierte el cuerpo: es lo que permite anidar.
 */
export function convertAdmonition(
  lines: string[],
  start: number,
  offset: number,
  recurse: Recurse,
): BlockResult | undefined {
  const match = ADMONITION.exec(lines[start] ?? '');
  if (!match) return undefined;
  const [, indentText = '', marker, rawType = '', rawTitle] = match;
  const lineNumber = offset + start + 1;
  const [rawBody, next] = takeBody(lines, start + 1, indentText.length);
  const inner = recurse(rawBody, lineNumber);
  const body = inner.output;
  const log: LogEntry[] = [...inner.log];
  function prefix(text: string[]) {
    return text.map((row) => indentText + row);
  }

  let type = rawType.toLowerCase();
  let title = rawTitle === undefined ? '' : unescapeTitle(rawTitle);
  if (!NATIVE_TYPES.has(type)) {
    const alias = ALIASES[type];
    if (alias) {
      log.push({ kind: 'admonition-alias', line: lineNumber, detail: `${type} -> ${alias}` });
      if (!title) title = capitalize(type);
      type = alias;
    } else {
      log.push({ kind: 'admonition-unknown', line: lineNumber, detail: `${type} -> note` });
      if (!title) title = capitalize(type);
      type = 'note';
    }
  }

  const collapsed = marker === '???';
  const alert = ALERTS[type];
  const nested = body.some((row) => /^:{3,}/.test(row));
  if (!title && alert && !collapsed && !nested) {
    log.push({ kind: 'alert', line: lineNumber, detail: `${rawType} -> [!${alert}]` });
    const quoted = body.map((row) => (row === '' ? '>' : `> ${row}`));
    return { output: prefix([`> [!${alert}]`, ...quoted]), log, next };
  }

  log.push({ kind: 'admonition', line: lineNumber, detail: `${marker} ${rawType} -> ${type}` });
  if (collapsed) log.push({ kind: 'collapsed', line: lineNumber, detail: type });
  const label = title ? `[${title}]` : '';
  return {
    output: prefix(directive(`${type}${label}${collapsed ? '{collapsed}' : ''}`, body)),
    log,
    next,
  };
}
