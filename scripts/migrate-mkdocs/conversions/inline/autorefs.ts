import { replaceOutsideCode } from '../../pipeline/lines.ts';
import type { LineResult, LogEntry } from '../../pipeline/types.ts';

const AUTOREF = /\[([^\]]+)\]\[([A-Za-z_][\w.]*)?\]/g;

/** Autorrefs de mkdocs-autorefs: enlace si se conoce el ancla, texto plano (y registro) si no; sin punto en el símbolo no lo son (`a[0][1]`). */
export function resolveAutorefs(
  line: string,
  lineNumber: number,
  symbols: Record<string, string> | undefined,
): LineResult {
  const log: LogEntry[] = [];
  const output = replaceOutsideCode(line, AUTOREF, (match) => {
    const [whole, text = '', ref] = match;
    const symbol = ref ?? text.replace(/`/g, '');
    if (!symbol.includes('.')) return whole;
    const url = symbols?.[symbol];
    if (url) {
      log.push({ kind: 'autoref', line: lineNumber, detail: `${symbol} -> ${url}` });
      return `[${text}](${url})`;
    }
    log.push({ kind: 'autoref-unresolved', line: lineNumber, detail: symbol });
    return text;
  });
  return { output, log };
}
