interface DocsErrorOptions {
  file?: string;
  line?: number;
  hint?: string;
}

/** Error de contenido o de config con el dato que hace falta para arreglarlo: archivo, línea y pista. */
export class DocsError extends Error {
  readonly file?: string;
  readonly line?: number;
  readonly hint?: string;

  constructor(message: string, { file, line, hint }: DocsErrorOptions = {}) {
    super(message);
    this.name = 'DocsError';
    this.file = file;
    this.line = line;
    this.hint = hint;
  }

  /** `archivo:línea: mensaje (pista)`, omitiendo lo que no haya. */
  describe(): string {
    const where = this.file ? `${this.file}${this.line ? `:${this.line}` : ''}: ` : '';
    return `${where}${this.message}${this.hint ? ` (${this.hint})` : ''}`;
  }
}

/** Varios `DocsError` en un solo throw, para no obligar a arreglar los fallos de uno en uno. */
export class DocsErrors extends Error {
  readonly errors: DocsError[];

  constructor(errors: DocsError[]) {
    super(errors.map((error) => error.describe()).join('\n'));
    this.name = 'DocsErrors';
    this.errors = errors;
  }
}

/** Lanza un único `DocsErrors` si hay alguno; si no, no hace nada. */
export function collectErrors(errors: DocsError[]): void {
  if (errors.length > 0) throw new DocsErrors(errors);
}

/** Ruta de un campo de la config legible: `external[0].seo.image`. */
export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((text, key, index) => {
    if (typeof key === 'number') return `${text}[${key}]`;
    // `@type` no es un identificador: va entre corchetes, como se escribiría en el objeto.
    if (String(key).startsWith('@')) return `${text}['${String(key)}']`;
    return index === 0 ? String(key) : `${text}.${String(key)}`;
  }, '');
}
