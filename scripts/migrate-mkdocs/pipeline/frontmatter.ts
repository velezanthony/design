import type { LinesResult, LogEntry } from './types.ts';

/** Claves de frontmatter que solo entiende MkDocs Material. */
const MKDOCS_ONLY_KEYS = ['hide', 'search', 'status'];

/** Quita del frontmatter las claves que solo conoce MkDocs. Devuelve el texto y lo quitado. */
export function cleanFrontmatter(lines: string[]): LinesResult {
  const log: LogEntry[] = [];
  if (lines[0] !== '---') return { output: lines, log };
  const close = lines.indexOf('---', 1);
  if (close === -1) return { output: lines, log };
  const kept: string[] = [];
  let dropping = false;
  for (const [index, line] of lines.slice(1, close).entries()) {
    const key = /^([\w-]+):/.exec(line);
    if (key) {
      dropping = MKDOCS_ONLY_KEYS.includes(key[1] ?? '');
      if (dropping)
        log.push({ kind: 'frontmatter', line: index + 2, detail: `removed key ${key[1]}` });
    } else if (dropping && !/^\s/.test(line) && !line.startsWith('- ')) {
      dropping = false;
    }
    if (!dropping) kept.push(line);
  }
  const rest = lines.slice(close + 1);
  if (kept.every((line) => line.trim() === '')) {
    return { output: rest[0] === '' ? rest.slice(1) : rest, log };
  }
  return { output: ['---', ...kept, '---', ...rest], log };
}
