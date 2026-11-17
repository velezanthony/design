/**
 * Tipos compartidos por las unidades de conversión. Cada unidad es una función pura (sin E/S) que
 * recibe texto y devuelve `{ output, log }`: el texto nuevo y un registro de lo que ha tocado.
 */

export type LogKind =
  | 'admonition'
  | 'admonition-alias'
  | 'admonition-unknown'
  | 'alert'
  | 'collapsed'
  | 'tabs'
  | 'icon'
  | 'attr-list'
  | 'heading-id'
  | 'html-wrapper'
  | 'frontmatter'
  | 'api'
  | 'api-unresolved'
  | 'autoref'
  | 'autoref-unresolved'
  | 'link'
  | 'anchor'
  | 'code-language';

export interface LogEntry {
  kind: LogKind;
  /** Línea (1-based) aproximada del original; en cuerpos anidados es relativa a su bloque. */
  line: number;
  detail: string;
}

/** Resultado de una unidad que convierte una línea suelta. */
export interface LineResult {
  output: string;
  log: LogEntry[];
}

/** Resultado de convertir varias líneas (por ejemplo el cuerpo de una admonición). */
export interface LinesResult {
  output: string[];
  log: LogEntry[];
}

/**
 * Resultado de una unidad de bloque: lo que sustituye a las líneas consumidas y el índice de la
 * primera línea que NO ha consumido.
 */
export interface BlockResult extends LinesResult {
  next: number;
}

/**
 * Convierte el cuerpo de un bloque con TODAS las unidades (es la recursión del pipeline). Las
 * unidades de bloque la reciben en vez de importar el pipeline: así no hay dependencia circular y
 * cada una se prueba sola con una recursión de mentira. `offset` es la línea del original justo
 * antes del cuerpo, para que el registro apunte donde toca.
 */
export type Recurse = (lines: string[], offset: number) => LinesResult;
