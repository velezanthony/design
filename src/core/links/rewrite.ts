import type { Page } from '../content/discovery';
import { DEFAULT_CONTENT_DIR, normalizePath } from '../content/content-dir';
import { DocsError } from '../errors';
import { pageUrl, type UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { fenceMask } from './fences';

/** Lo que `rewriteLinks` necesita saber del sitio: sus páginas, cómo son sus URLs y sus recursos. */
export interface PageIndex {
  pages: readonly Page[];
  url: UrlPolicy;
  /** Rutas (como las de `sourcePath`, ya normalizadas) de recursos publicados que no son páginas. */
  assets?: ReadonlySet<string>;
  /** Carpeta de las páginas nativas relativa a la raíz del proyecto; puede estar fuera de él (`../docs`). */
  contentDir?: string;
}

/** Enlace interno ya resuelto a una página; `validateAnchors` comprueba su ancla. */
export interface LinkRef {
  file: string;
  line: number;
  slug: string;
  locale: Locale;
  anchor?: string;
}

/** Imagen del cuerpo (`![alt](src)`): la ruta tal como se escribió y su texto alternativo (vacío si no hay). */
export interface BodyImage {
  file: string;
  line: number;
  src: string;
  alt: string;
}

const INLINE_LINK = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)((?:\s+"[^"]*"|\s+'[^']*')?)\s*\)/g;
const DEFINITION = /^( {0,3}\[[^\]]+\]:\s*)(<[^>]*>|\S+)/;
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/)/i;

/** `./x.md` y `x.md` son la misma ruta. */
function stripDot(path: string) {
  return path.replace(/^(\.\/)+/, '');
}

/** Resuelve `target` contra el directorio de `fromPath`: `../README.md` + `./A.md` → `../A.md`. */
function resolvePath(fromPath: string, target: string): string {
  return normalizePath([...fromPath.split('/').slice(0, -1), target].join('/'));
}

/** Página a la que apunta `resolved`; los `sourcePath` nativos cuelgan del contenido y los externos de la raíz, así que se busca por ruta real. */
function findTarget(
  resolved: string,
  decoded: string,
  from: Page,
  index: PageIndex,
): Page | undefined {
  const { pages } = index;
  const contentDir = normalizePath(index.contentDir ?? DEFAULT_CONTENT_DIR);
  const sameKind = pages.find(
    (page) => page.kind === from.kind && stripDot(page.sourcePath) === resolved,
  );
  if (sameKind) return sameKind;
  if (from.kind === 'native') {
    const fromRoot = resolvePath(`${contentDir}/${from.sourcePath}`, decoded);
    return pages.find((page) => page.kind === 'external' && stripDot(page.sourcePath) === fromRoot);
  }
  const prefix = `${contentDir}/`;
  if (!resolved.startsWith(prefix)) return undefined;
  const inside = resolved.slice(prefix.length);
  return pages.find((page) => page.kind === 'native' && page.sourcePath === inside);
}

/** Rangos `[inicio, fin)` de los códigos en línea de una línea (backticks de igual longitud). */
function codeSpans(line: string): [number, number][] {
  const spans: [number, number][] = [];
  const runs = [...line.matchAll(/`+/g)];
  for (let index = 0; index < runs.length; index++) {
    const run = runs[index];
    if (!run) continue;
    const close = runs.findIndex(
      (candidate, position) => position > index && candidate[0].length === run[0].length,
    );
    const closing = runs[close];
    if (!closing) continue;
    spans.push([run.index, closing.index + closing[0].length]);
    index = close;
  }
  return spans;
}

function inside(spans: [number, number][], index: number) {
  return spans.some(([start, end]) => index >= start && index < end);
}

interface Context {
  from: Page;
  index: PageIndex;
  refs: LinkRef[];
  images: BodyImage[];
  errors: DocsError[];
}

/** Pone `./` a las imágenes sin él: Astro las importa como módulos y una ruta «bare» no se encontraría. */
function dotImageTarget(rawTarget: string): string {
  const angled = rawTarget.startsWith('<');
  const target = angled ? rawTarget.slice(1, -1) : rawTarget;
  if (EXTERNAL.test(target) || target.startsWith('./') || target.startsWith('../'))
    return rawTarget;
  return angled ? `<./${target}>` : `./${target}`;
}

/** Nuevo destino de un enlace o `undefined` si se deja como estaba (externo, ancla o recurso). */
function rewriteTarget(rawTarget: string, line: number, context: Context): string | undefined {
  const { from, index, refs, errors } = context;
  const target = rawTarget.startsWith('<') ? rawTarget.slice(1, -1) : rawTarget;
  if (EXTERNAL.test(target)) return undefined;
  const hash = target.indexOf('#');
  const rawPath = hash === -1 ? target : target.slice(0, hash);
  const anchor = hash === -1 ? undefined : target.slice(hash + 1);
  const withAnchor = anchor ? { anchor } : {};

  if (rawPath === '') {
    refs.push({ file: from.sourcePath, line, slug: from.slug, locale: from.locale, ...withAnchor });
    return undefined;
  }

  const [path = rawPath] = rawPath.split('?');
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    // Una codificación inválida se busca tal cual: acabará como enlace roto.
  }
  const resolved = resolvePath(from.sourcePath, decoded);
  if (!/\.md$/i.test(resolved)) {
    if (index.assets?.has(resolved)) return undefined;
    errors.push(brokenLink(rawTarget, from, line, 'no es una página ni un recurso publicado'));
    return undefined;
  }
  const found = findTarget(resolved, decoded, from, index);
  if (!found) {
    errors.push(brokenLink(rawTarget, from, line, 'no es una página publicada'));
    return undefined;
  }
  // La gemela del idioma de origen manda; si no existe, se enlaza la página que sí existe.
  const twin = index.pages.find(
    (page) => page.kind === found.kind && page.slug === found.slug && page.locale === from.locale,
  );
  const destination = twin ?? found;
  refs.push({
    file: from.sourcePath,
    line,
    slug: destination.slug,
    locale: destination.locale,
    ...withAnchor,
  });
  return pageUrl(destination.slug, destination.locale, index.url) + (anchor ? `#${anchor}` : '');
}

function brokenLink(target: string, from: Page, line: number, reason: string): DocsError {
  return new DocsError(`El enlace «${target}» ${reason}.`, {
    file: from.sourcePath,
    line,
    hint: 'Apunta a un archivo Markdown publicado o declara el recurso.',
  });
}

/** Reescribe los enlaces relativos hacia la URL destino y devuelve enlaces, imágenes y rotos; ignora código, externos y rutas absolutas. */
export function rewriteLinks(
  body: string,
  from: Page,
  index: PageIndex,
): { body: string; refs: LinkRef[]; images: BodyImage[]; errors: DocsError[] } {
  const context: Context = { from, index, refs: [], images: [], errors: [] };
  const mask = fenceMask(body);
  const lines = body.split('\n').map((text, lineIndex) => {
    if (mask[lineIndex]) return text;
    const spans = codeSpans(text);
    const definition = DEFINITION.exec(text);
    if (definition?.[2] !== undefined) {
      const replaced = rewriteTarget(definition[2], lineIndex + 1, context);
      return replaced === undefined
        ? text
        : definition[1] + replaced + text.slice(definition[0].length);
    }
    return text.replace(
      INLINE_LINK,
      (
        match: string,
        bang: string,
        label: string,
        target: string,
        title: string,
        offset: number,
      ) => {
        if (inside(spans, offset)) return match;
        if (bang) {
          context.images.push({
            file: from.sourcePath,
            line: lineIndex + 1,
            src: target.startsWith('<') ? target.slice(1, -1) : target,
            alt: label,
          });
          const dotted = dotImageTarget(target);
          return dotted === target ? match : `![${label}](${dotted}${title})`;
        }
        const replaced = rewriteTarget(target, lineIndex + 1, context);
        return replaced === undefined ? match : `[${label}](${replaced}${title})`;
      },
    );
  });
  return {
    body: lines.join('\n'),
    refs: context.refs,
    images: context.images,
    errors: context.errors,
  };
}
