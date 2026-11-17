import { replaceOutsideCode } from '../../pipeline/lines.ts';
import type { LineResult, LogEntry } from '../../pipeline/types.ts';

const AUTOREF = /\[([^\]]+)\]\[([A-Za-z_][\w.]*)?\]/g;

/**
 * Las referencias cruzadas de mkdocs-autorefs (`[Texto][paquete.Símbolo]`, o `[`paquete.Símbolo`][]`)
 * pasan a enlaces si se conoce el ancla del símbolo; si no, a texto plano y se registra. Sin punto
 * en el símbolo no es una autorref (`a[0][1]`, `[x][y]`): se deja intacto.
 */
export function resolveAutorefs(
  line: string,
  lineNumber: number,
  symbols: Record<string, string> | undefined,
): LineResult {
  const log: LogEntry[] = [];
  const output = replaceOutsideCode(line, AUTOREF, (match) => {
    const [whole, text, ref] = match;
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
