/** Tipos de las unidades de conversión: funciones puras que devuelven `{ output, log }`. */

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

/** Resultado de una unidad de bloque: lo que sustituye a las líneas consumidas y el índice de la primera sin consumir. */
export interface BlockResult extends LinesResult {
  next: number;
}

/** Recursión del pipeline, inyectada para evitar la dependencia circular; `offset` es la línea del original antes del cuerpo. */
export type Recurse = (lines: string[], offset: number) => LinesResult;
