import { DEFAULT_CONTENT_DIR } from '../../core/content/content-dir';

/** Qué Markdown transforman nuestros plugins: la documentación nativa (puede estar fuera del proyecto) y los `external`; el resto no se toca. */
export interface Scope {
  /** Prefijo (con barra final) del directorio de documentación nativa. */
  docsPrefix: string;
  /** URL completa de cada archivo `external` posible (todos los idiomas). */
  files: ReadonlySet<string>;
}

/** Una raíz sin barra final resolvería `src/...` como hermana de la carpeta, no como hija. */
function withSlash(root: URL) {
  return root.href.endsWith('/') ? root : new URL(`${root.href}/`);
}

/** `externalFiles` son rutas respecto a `root`; pueden empezar por `./` o salir de la raíz (`../README.md`). */
export function createScope(
  root: URL,
  externalFiles: readonly string[],
  contentDir: string = DEFAULT_CONTENT_DIR,
): Scope {
  const base = withSlash(root);
  return {
    // La barra final evita que `src/content/docs-old/` o `docs.md` cuenten como `docs/`.
    docsPrefix: new URL(`${contentDir.replace(/\/+$/, '')}/`, base).href,
    files: new Set(externalFiles.map((file) => new URL(file, base).href)),
  };
}

/** `true` si el archivo es documentación nativa o un `external` declarado. */
export function shouldTransform(fileURL: URL | undefined, scope: Scope): boolean {
  if (!fileURL) return false;
  return fileURL.href.startsWith(scope.docsPrefix) || scope.files.has(fileURL.href);
}
