import type { Page } from '../content/discovery';
import { DocsError } from '../errors';
import { pageUrl, type UrlPolicy } from '../i18n/availability';
import type { Locale } from '../i18n/locale';
import { fenceMask } from './fences';

/** Carpeta (relativa a la raíz del proyecto) de las páginas nativas; sus `sourcePath` cuelgan de ella. */
export const NATIVE_DOCS_DIR = 'src/content/docs';

/** Lo que `rewriteLinks` necesita saber del sitio: sus páginas, cómo son sus URLs y sus recursos. */
export interface PageIndex {
  pages: readonly Page[];
  url: UrlPolicy;
  /** Rutas (como las de `sourcePath`, ya normalizadas) de recursos publicados que no son páginas. */
  assets?: ReadonlySet<string>;
}

/** Enlace interno ya resuelto a una página; `validateAnchors` comprueba su ancla. */
export interface LinkRef {
  file: string;
  line: number;
  slug: string;
  locale: Locale;
  anchor?: string;
}

const INLINE_LINK = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]+)((?:\s+"[^"]*"|\s+'[^']*')?)\s*\)/g;
const DEFINITION = /^( {0,3}\[[^\]]+\]:\s*)(<[^>]*>|\S+)/;
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/)/i;

/** `./x.md` y `x.md` son la misma ruta. */
const stripDot = (path: string) => path.replace(/^(\.\/)+/, '');

/** Resuelve `target` contra el directorio de `fromPath`: `../README.md` + `./A.md` → `../A.md`. */
function resolvePath(fromPath: string, target: string): string {
  const stack: string[] = [];
  for (const segment of [...fromPath.split('/').slice(0, -1), ...target.split('/')]) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..' && stack.length > 0 && stack[stack.length - 1] !== '..') stack.pop();
    else stack.push(segment);
  }
  return stack.join('/');
}

/**
 * Página a la que apunta `resolved`. Los `sourcePath` nativos cuelgan de la carpeta de docs y los
 * external de la raíz del proyecto, así que un nativo que enlaza a un external lo hace con su ruta
 * real: se vuelve a resolver desde la raíz. Un external solo enlaza a external.
 */
function findTarget(
  resolved: string,
  decoded: string,
  from: Page,
  pages: readonly Page[],
): Page | undefined {
  const sameKind = pages.find(
    (page) => page.kind === from.kind && stripDot(page.sourcePath) === resolved,
  );
  if (sameKind || from.kind !== 'native') return sameKind;
  const fromRoot = resolvePath(`${NATIVE_DOCS_DIR}/${from.sourcePath}`, decoded);
  return pages.find((page) => page.kind === 'external' && stripDot(page.sourcePath) === fromRoot);
}

/** Rangos `[inicio, fin)` de los códigos en línea de una línea (backticks de igual longitud). */
function codeSpans(line: string): [number, number][] {
  const spans: [number, number][] = [];
  const runs = [...line.matchAll(/`+/g)];
  for (let i = 0; i < runs.length; i++) {
    const close = runs.findIndex((run, j) => j > i && run[0].length === runs[i][0].length);
    if (close === -1) continue;
    spans.push([runs[i].index, runs[close].index + runs[close][0].length]);
    i = close;
  }
  return spans;
}

const inside = (spans: [number, number][], index: number) =>
  spans.some(([start, end]) => index >= start && index < end);

interface Context {
  from: Page;
  index: PageIndex;
  refs: LinkRef[];
  errors: DocsError[];
}

/**
 * Imagen relativa sin `./` (`img/a.png`) con el `./` puesto. Astro importa las imágenes de una
 * página como módulos y una ruta sin `./` ni `../` sería un módulo «bare»: no la encontraría aunque
 * en Markdown sea una ruta relativa al archivo. Lo demás (URLs, rutas del sitio, `./`, `../`) no se toca.
 */
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

  const path = rawPath.split('?')[0];
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
  const found = findTarget(resolved, decoded, from, index.pages);
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

/**
 * Reescribe los enlaces relativos del cuerpo hacia la URL de la página publicada de destino y
 * devuelve los enlaces internos (para validar sus anclas) y los rotos (archivo, línea y destino).
 * Ignora bloques de código, código en línea, URLs externas, rutas absolutas del sitio e imágenes.
 */
export function rewriteLinks(
  body: string,
  from: Page,
  index: PageIndex,
): { body: string; refs: LinkRef[]; errors: DocsError[] } {
  const context: Context = { from, index, refs: [], errors: [] };
  const mask = fenceMask(body);
  const lines = body.split('\n').map((text, i) => {
    if (mask[i]) return text;
    const spans = codeSpans(text);
    const definition = DEFINITION.exec(text);
    if (definition) {
      const replaced = rewriteTarget(definition[2], i + 1, context);
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
          const dotted = dotImageTarget(target);
          return dotted === target ? match : `![${label}](${dotted}${title})`;
        }
        const replaced = rewriteTarget(target, i + 1, context);
        return replaced === undefined ? match : `[${label}](${replaced}${title})`;
      },
    );
  });
  return { body: lines.join('\n'), refs: context.refs, errors: context.errors };
}
