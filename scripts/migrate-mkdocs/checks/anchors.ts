/** MkDocs genera ids sin acentos (`el-catalogo`) y la librería los conserva (`el-catálogo`): se corrige el ancla si coincide al quitarle los acentos. */
import path from 'node:path/posix';

export interface AnchorLog {
  kind: 'anchor';
  file: string;
  detail: string;
}

/** Sufijo de idioma de una página (`guia.es.md` -> `es`). */
const LOCALE_SUFFIX = /\.([a-z]{2}(?:-[A-Za-z]{2,})?)\.md$/;

function strip(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Aproximación de github-slugger: minúsculas, sin puntuación, espacios a guiones, `-n` si repite. */
function headingIds(markdown: string): Set<string> {
  const ids = new Set<string>();
  const seen = new Map<string, number>();
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const text = heading[1]!
      .replace(/`/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_]{1,3}(?=\S)/g, (match) => (match.startsWith('_') ? match : ''));
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
      .replace(/ /g, '-');
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    ids.add(count === 0 ? base : `${base}-${count}`);
  }
  return ids;
}

export function fixAccentAnchors(files: ReadonlyMap<string, string>): {
  files: Map<string, string>;
  log: AnchorLog[];
} {
  const ids = new Map([...files].map(([file, text]) => [file, headingIds(text)]));
  const log: AnchorLog[] = [];
  const result = new Map<string, string>();

  for (const [file, text] of files) {
    let fenced = false;
    const lines = text.split('\n').map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      if (fenced) return line;
      return line.replace(
        /\]\(([^)#\s]*)#([^)\s]+)\)/g,
        (whole, target: string, anchor: string) => {
          const targetFile =
            target === '' ? file : path.normalize(path.join(path.dirname(file), target));
          /* Desde `x.es.md`, un enlace a `y.md` lleva a la gemela `y.es.md` (lo hace MkDocs con
             i18n y también la librería): sus ids son los que cuentan, no los de `y.md`. */
          const locale = LOCALE_SUFFIX.exec(file)?.[1];
          const twin = locale && targetFile.replace(/\.md$/, `.${locale}.md`);
          const known =
            (twin && !LOCALE_SUFFIX.test(targetFile) && ids.get(twin)) || ids.get(targetFile);
          if (!known || known.has(anchor)) return whole;
          const match = [...known].find((id) => strip(id) === anchor);
          if (!match) return whole;
          log.push({ kind: 'anchor', file, detail: `#${anchor} -> #${match}` });
          return `](${target}#${match})`;
        },
      );
    });
    result.set(file, lines.join('\n'));
  }
  return { files: result, log };
}
