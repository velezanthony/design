import type { Page } from '../content/discovery';
import { DEFAULT_CONTENT_DIR, normalizePath } from '../content/content-dir';
import { staticExcluder, type StaticFolder } from '../content/static-folders';
import { DocsError } from '../errors';
import { pageUrlOf, type UrlPolicy } from '../i18n/availability';
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
  /** Los `.md` de `content` que `exclude` deja fuera, relativos a esa carpeta: un enlace a ellos tiene su propio error. */
  excluded?: ReadonlySet<string>;
  /** Las carpetas de `static`: un enlace relativo a un archivo suyo se reescribe a su URL publicada. */
  staticFolders?: readonly StaticFolder[];
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

/** El archivo excluido al que apunta `resolved`, en la forma relativa a `content` que guarda `index.excluded`. */
function findExcluded(resolved: string, from: Page, index: PageIndex): string | undefined {
  if (!index.excluded?.size) return undefined;
  if (from.kind === 'native') return index.excluded.has(resolved) ? resolved : undefined;
  const prefix = `${normalizePath(index.contentDir ?? DEFAULT_CONTENT_DIR)}/`;
  const inside = resolved.startsWith(prefix) ? resolved.slice(prefix.length) : undefined;
  return inside !== undefined && index.excluded.has(inside) ? inside : undefined;
}

/** La carpeta de `static` (y su posición en la config) que contiene `resolved`, con la ruta dentro de ella. */
function findStatic(resolved: string, from: Page, index: PageIndex) {
  // `from` cuelga de la raíz del proyecto, igual que los externos; las nativas, de `content`.
  const fromRoot =
    from.kind === 'native'
      ? normalizePath(`${index.contentDir ?? DEFAULT_CONTENT_DIR}/${resolved}`)
      : resolved;
  for (const [position, folder] of (index.staticFolders ?? []).entries()) {
    const source = normalizePath(folder.from);
    if (fromRoot === source) return { position, folder, inside: '' };
    if (fromRoot.startsWith(`${source}/`)) {
      return { position, folder, inside: fromRoot.slice(source.length + 1) };
    }
  }
  return undefined;
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
  const published = findStatic(resolved, from, index);
  if (!/\.md$/i.test(resolved)) {
    if (index.assets?.has(resolved)) return undefined;
    if (published)
      return staticUrl(rawTarget, target.slice(path.length), decoded, published, line, context);
    errors.push(
      brokenLink(rawTarget, from, line, 'no es una página ni un recurso publicado', index),
    );
    return undefined;
  }
  const found = findTarget(resolved, decoded, from, index);
  // Un `.md` de la carpeta que no es página se publica tal cual, como el resto de la carpeta.
  if (!found && published) {
    return staticUrl(rawTarget, target.slice(path.length), decoded, published, line, context);
  }
  if (!found) {
    const excluded = findExcluded(resolved, from, index);
    if (excluded !== undefined) {
      errors.push(
        new DocsError(
          `El enlace «${rawTarget}» apunta a «${excluded}», que \`exclude\` deja fuera de la publicación.`,
          {
            file: from.sourcePath,
            line,
            hint: 'Quita el enlace o saca ese archivo de `content.exclude` en la config.',
          },
        ),
      );
      return undefined;
    }
    errors.push(brokenLink(rawTarget, from, line, 'no es una página publicada', index));
    return undefined;
  }
  // La gemela del idioma de origen (misma identidad) manda; si no existe, se enlaza la página que sí existe. Su URL lleva su `slug` propio.
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
  return pageUrlOf(destination, index.url) + (anchor ? `#${anchor}` : '');
}

/** URL publicada de un archivo de `static` (base + `to` + el resto, con su query y su ancla), o un error si su `exclude` lo deja fuera. */
function staticUrl(
  rawTarget: string,
  suffix: string,
  decoded: string,
  { position, folder, inside }: NonNullable<ReturnType<typeof findStatic>>,
  line: number,
  { from, index, errors }: Context,
): string | undefined {
  if (inside && staticExcluder(folder)(inside)) {
    errors.push(
      new DocsError(
        `El enlace «${rawTarget}» apunta a «${inside}», que \`content.static[${position}].exclude\` deja fuera de la publicación.`,
        {
          file: from.sourcePath,
          line,
          hint: `Quita el enlace o el patrón de \`content.static[${position}].exclude\`.`,
        },
      ),
    );
    return undefined;
  }
  const segments = [...index.url.base.split('/'), ...folder.to.split('/'), ...inside.split('/')];
  const slash = decoded.endsWith('/') ? '/' : '';
  return `/${encodeURI(segments.filter(Boolean).join('/'))}${slash}${suffix}`;
}

function brokenLink(
  target: string,
  from: Page,
  line: number,
  reason: string,
  index: PageIndex,
): DocsError {
  const base = index.url.base.replace(/\/+$/, '');
  return new DocsError(`El enlace «${target}» ${reason}.`, {
    file: from.sourcePath,
    line,
    hint: `Apunta a un .md publicado o a un archivo de una carpeta de \`content.static\` (se reescribe a su URL), o usa una URL absoluta con el base (\`${base}/…\`).`,
  });
}

/** Reescribe los enlaces de un párrafo entero: el texto de un enlace puede partirse en varias líneas. */
function rewriteBlock(block: string, firstLine: number, context: Context): string {
  const spans = codeSpans(block);
  return block.replace(
    INLINE_LINK,
    (match: string, bang: string, label: string, target: string, title: string, offset: number) => {
      if (inside(spans, offset)) return match;
      // La línea donde empieza el enlace, que es donde se busca al avisar.
      const line = firstLine + block.slice(0, offset).split('\n').length - 1;
      if (bang) {
        context.images.push({
          file: context.from.sourcePath,
          line,
          src: target.startsWith('<') ? target.slice(1, -1) : target,
          alt: label,
        });
        const dotted = dotImageTarget(target);
        return dotted === target ? match : `![${label}](${dotted}${title})`;
      }
      const replaced = rewriteTarget(target, line, context);
      return replaced === undefined ? match : `[${label}](${replaced}${title})`;
    },
  );
}

/** Reescribe los enlaces relativos hacia la URL destino y devuelve enlaces, imágenes y rotos; ignora código, externos y rutas absolutas. */
export function rewriteLinks(
  body: string,
  from: Page,
  index: PageIndex,
): { body: string; refs: LinkRef[]; images: BodyImage[]; errors: DocsError[] } {
  const context: Context = { from, index, refs: [], images: [], errors: [] };
  const mask = fenceMask(body);
  const output: string[] = [];
  let block: { first: number; lines: string[] } | undefined;
  function flush() {
    if (!block) return;
    output.push(rewriteBlock(block.lines.join('\n'), block.first, context));
    block = undefined;
  }
  body.split('\n').forEach((text, lineIndex) => {
    const definition = mask[lineIndex] ? null : DEFINITION.exec(text);
    if (mask[lineIndex] || text.trim() === '' || definition) {
      flush();
      if (definition?.[2] !== undefined) {
        const replaced = rewriteTarget(definition[2], lineIndex + 1, context);
        output.push(
          replaced === undefined
            ? text
            : definition[1] + replaced + text.slice(definition[0].length),
        );
      } else output.push(text);
      return;
    }
    block ??= { first: lineIndex + 1, lines: [] };
    block.lines.push(text);
  });
  flush();
  return {
    body: output.join('\n'),
    refs: context.refs,
    images: context.images,
    errors: context.errors,
  };
}
