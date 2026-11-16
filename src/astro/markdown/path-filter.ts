/**
 * Qué archivos Markdown transforman nuestros plugins: la documentación nativa
 * (`src/content/docs/`) y los `external` resueltos. El resto del proyecto (páginas `.md` sueltas)
 * no es nuestro y no se toca.
 */
export interface Scope {
  /** Prefijo (con barra final) del directorio de documentación nativa. */
  docsPrefix: string;
  /** URL completa de cada archivo `external` posible (todos los idiomas). */
  files: ReadonlySet<string>;
}

const NATIVE_DIR = 'src/content/docs/';

/** Una raíz sin barra final resolvería `src/...` como hermana de la carpeta, no como hija. */
const withSlash = (root: URL) => (root.href.endsWith('/') ? root : new URL(`${root.href}/`));

/**
 * @param root raíz del proyecto consumidor.
 * @param externalFiles rutas de los `external` respecto a `root` (p. ej. `externalCandidates`);
 * pueden empezar por `./` o salir de la raíz (`../README.md`).
 */
export function createScope(root: URL, externalFiles: readonly string[]): Scope {
  const base = withSlash(root);
  return {
    // La barra final evita que `src/content/docs-old/` o `docs.md` cuenten como `docs/`.
    docsPrefix: new URL(NATIVE_DIR, base).href,
    files: new Set(externalFiles.map((file) => new URL(file, base).href)),
  };
}

/** `true` si el archivo es documentación nativa o un `external` declarado. */
export function shouldTransform(fileURL: URL | undefined, scope: Scope): boolean {
  if (!fileURL) return false;
  return fileURL.href.startsWith(scope.docsPrefix) || scope.files.has(fileURL.href);
}
