/** Los enlaces a algo que el sitio no lleva (código, páginas excluidas) pasan a ser absolutos al repo; el resto se deja para la build estricta. */
import path from 'node:path/posix';

export interface LinkRewriterConfig {
  /** Ficheros publicados, relativos a la carpeta de docs (`users/a.md`, `img/pic.png`). */
  published: ReadonlySet<string>;
  /** Base de blobs del repositorio, sin barra final (`https://github.com/o/r/blob/main`). */
  repoBlobUrl: string;
  /** Carpeta de docs dentro del repositorio (`docs`). */
  docsDirInRepo: string;
  /** Ficheros externos: ruta relativa a la raíz del repo -> ruta relativa a `docs/` hacia su copia. */
  externals: ReadonlyMap<string, string>;
}

export type RewriteHref = (href: string) => string | undefined;

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function createLinkRewriter(config: LinkRewriterConfig): (file: string) => RewriteHref {
  return (file) => (href) => {
    if (href.startsWith('#') || href.startsWith('/') || SCHEME.test(href)) return undefined;
    const match = /^([^#?]*)(.*)$/.exec(href);
    const target = match?.[1] ?? href;
    const suffix = match?.[2] ?? '';
    if (target === '') return undefined;

    /* Ruta resuelta respecto a la carpeta de docs; si empieza por `..` sale de ella. */
    const inDocs = path.normalize(path.join(path.dirname(file), target));
    if (!inDocs.startsWith('..')) {
      if (config.published.has(inDocs)) return undefined;
      return `${config.repoBlobUrl}/${path.join(config.docsDirInRepo, inDocs)}${suffix}`;
    }

    const inRepo = path.normalize(path.join(config.docsDirInRepo, inDocs));
    const external = config.externals.get(inRepo);
    if (external !== undefined) {
      const relative = path.relative(path.dirname(file), external);
      return `${relative.startsWith('.') ? relative : `./${relative}`}${suffix}`;
    }
    return `${config.repoBlobUrl}/${inRepo}${suffix}`;
  };
}
