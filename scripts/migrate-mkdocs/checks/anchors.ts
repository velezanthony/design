/**
 * MkDocs genera ids de encabezado SIN acentos (`el-catalogo`) y la librería los conserva, como
 * GitHub (`el-catálogo`). Un enlace `#el-catalogo` válido en MkDocs rompe aquí.
 *
 * Esta pasada trabaja sobre el conjunto de ficheros ya convertidos: calcula los ids de cada uno y,
 * si un ancla no existe pero coincide con un id al quitarle los acentos, la sustituye por él.
 */
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
    const text = heading[1]
      .replace(/`/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_]{1,3}(?=\S)/g, (m) => (m.startsWith('_') ? m : ''));
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
