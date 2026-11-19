/** MkDocs y la librería no generan los mismos ids de encabezado: se reescriben los enlaces `#ancla` a los de la librería (github-slugger). */
import path from 'node:path/posix';

export interface AnchorLog {
  kind: 'anchor';
  file: string;
  detail: string;
}

/** Cómo calcula MkDocs los ids: el de Python-Markdown (sin acentos) o uno propio como `pymdownx.slugs` (con acentos, como GitHub). */
export type SlugStyle = 'python-markdown' | 'unicode';

/** Sufijo de idioma de una página (`guia.es.md` -> `es`). */
const LOCALE_SUFFIX = /\.([a-z]{2}(?:-[A-Za-z]{2,})?)\.md$/;

const EXPLICIT_ID = /\s*\{\s*#([\w-]+)[^}]*\}\s*$/;

interface Heading {
  text: string;
  /** El `{ #id }` que MkDocs respeta y la librería no. */
  explicitId?: string;
}

function strip(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Los encabezados ATX de un documento, sin los de dentro de un bloque de código. */
function headingsOf(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const match = /^#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
    if (!match) continue;
    const explicit = EXPLICIT_ID.exec(match[1]!);
    const raw = explicit ? match[1]!.slice(0, explicit.index) : match[1]!;
    const text = raw
      .replace(/`/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_]{1,3}(?=\S)/g, (found) => (found.startsWith('_') ? found : ''));
    headings.push({ text, ...(explicit && { explicitId: explicit[1]! }) });
  }
  return headings;
}

/** github-slugger: minúsculas, sin puntuación, cada espacio a guion y `-n` si se repite. */
function libraryIds(headings: Heading[]): string[] {
  const occurrences = new Map<string, number>();
  return headings.map(({ text }) => {
    const original = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
      .replace(/ /g, '-');
    let slug = original;
    while (occurrences.has(slug)) {
      occurrences.set(original, (occurrences.get(original) ?? 0) + 1);
      slug = `${original}-${occurrences.get(original)}`;
    }
    occurrences.set(slug, 0);
    return slug;
  });
}

function baseSlug(text: string, style: SlugStyle): string {
  if (style === 'unicode') {
    return text
      .trim()
      .replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '')
      .toLowerCase()
      .replace(/ /g, '-');
  }
  return text
    .normalize('NFKD')
    .replace(/[^\p{ASCII}]/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '-');
}

/** Python-Markdown: el id explícito manda, y un repetido pasa a `id_1`, `id_2`… */
function mkdocsIds(headings: Heading[], style: SlugStyle): string[] {
  const used = new Set<string>();
  return headings.map((heading) => {
    let id = heading.explicitId ?? baseSlug(heading.text, style);
    while (used.has(id) || id === '') {
      const counted = /^(.*)_(\d+)$/.exec(id);
      id = counted ? `${counted[1]}_${Number(counted[2]) + 1}` : `${id}_1`;
    }
    used.add(id);
    return id;
  });
}

/** Id de MkDocs -> id de la librería, por encabezado. Con el original se ven los `{ #id }`, que la conversión ya quitó. */
function idPairs(
  converted: string,
  original: string | undefined,
  style: SlugStyle,
): Map<string, string> {
  const headings = headingsOf(converted);
  const library = libraryIds(headings);
  const source = original === undefined ? headings : headingsOf(original);
  // Si la conversión añadió o quitó encabezados no se pueden emparejar por posición.
  const aligned = source.length === headings.length ? source : headings;
  const pairs = new Map<string, string>();
  mkdocsIds(aligned, style).forEach((id, index) => {
    if (!pairs.has(id)) pairs.set(id, library[index]!);
  });
  return pairs;
}

export function fixAnchors(
  files: ReadonlyMap<string, string>,
  originals: ReadonlyMap<string, string> = new Map(),
  style: SlugStyle = 'python-markdown',
): { files: Map<string, string>; log: AnchorLog[] } {
  const pairs = new Map(
    [...files].map(([file, text]) => [file, idPairs(text, originals.get(file), style)]),
  );
  const libraryOf = new Map(
    [...files].map(([file, text]) => [file, new Set(libraryIds(headingsOf(text)))]),
  );
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
          const resolved =
            twin && !LOCALE_SUFFIX.test(targetFile) && pairs.has(twin) ? twin : targetFile;
          const known = pairs.get(resolved);
          const library = libraryOf.get(resolved);
          if (!known || !library) return whole;
          // El id de MkDocs manda; si no es de MkDocs pero sí de la librería, el texto ya se escribió para ella.
          const match =
            known.get(anchor) ?? (library.has(anchor) ? undefined : stripped(library, anchor));
          if (match === undefined || match === anchor) return whole;
          log.push({ kind: 'anchor', file, detail: `#${anchor} -> #${match}` });
          return `](${target}#${match})`;
        },
      );
    });
    result.set(file, lines.join('\n'));
  }
  return { files: result, log };
}

/** Último recurso: el id de la librería que, sin acentos, es el ancla. */
function stripped(library: ReadonlySet<string>, anchor: string): string | undefined {
  return [...library].find((id) => strip(id) === anchor);
}
