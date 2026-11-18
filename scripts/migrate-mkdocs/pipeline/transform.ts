/**
 * Pipeline de UN documento: Markdown de MkDocs Material -> Markdown de `@velezanthony/design`.
 *
 * Sin E/S: recibe el texto y unas funciones opcionales de resolución, y devuelve el texto nuevo
 * más un registro de todo lo que ha tocado. Cada conversión vive en su propio módulo (con su
 * test); aquí solo se COMPONEN, siempre en este orden:
 *
 *   1. `frontmatter`   claves que solo entiende MkDocs (`hide`, `search`, `status`).
 *   2. Línea a línea, y la PRIMERA unidad que reconoce la línea la consume:
 *        a. `fences`          bloques de código: se dejan intactos (solo se etiqueta el lenguaje).
 *        b. `admonitions`     `!!!` / `???` / `???+`  (su cuerpo vuelve a pasar por este mismo paso).
 *        c. `tabs`            `=== "x"`               (ídem).
 *        d. `api-directive`   `::: paquete.Símbolo` de mkdocstrings.
 *        e. `html-wrappers`   `<div markdown>` de las tarjetas: se quita el envoltorio.
 *        f. texto corrido, con estas conversiones en este orden:
 *           `heading-ids` -> `autorefs` -> `icons` -> `attr-lists` -> `links`.
 *
 * El orden importa: lo de código va primero para que nada lo toque; las admonitions y pestañas
 * van antes que el texto corrido porque consumen su cuerpo y lo recursan; en el texto, el id del
 * encabezado y las autorrefs van antes de los iconos y atributos para que `{ #id }` o `[X][a.b]`
 * no se confundan con ellos, y los enlaces van los últimos, con el texto ya limpio.
 *
 * Las pasadas que necesitan VARIOS ficheros a la vez (`anchors.ts`) y la comprobación de restos
 * (`leftovers.ts`) no están aquí: las compone `pipeline.ts`.
 */
import { convertAdmonition } from '../conversions/blocks/admonitions.ts';
import { convertApiDirective } from '../conversions/blocks/api-directive.ts';
import { removeAttrLists } from '../conversions/inline/attr-lists.ts';
import { resolveAutorefs } from '../conversions/inline/autorefs.ts';
import { convertFence } from '../conversions/blocks/fences.ts';
import { cleanFrontmatter } from './frontmatter.ts';
import { stripHeadingId } from '../conversions/inline/heading-ids.ts';
import { stepHtmlWrapper } from '../conversions/blocks/html-wrappers.ts';
import { removeIcons } from '../conversions/inline/icons.ts';
import { rewriteLinks } from '../conversions/inline/links.ts';
import { convertTabs } from '../conversions/blocks/tabs.ts';
import type { LinesResult, LogEntry } from './types.ts';

export type { LogEntry, LogKind } from './types.ts';

export interface TransformOptions {
  /** Markdown que sustituye a `::: identificador` (mkdocstrings). Sin él, queda una nota. */
  resolveApi?: (identifier: string) => string | undefined;
  /** Símbolo de API -> URL relativa del ancla generada, para las referencias `[X][símbolo]`. */
  symbols?: Record<string, string>;
  /** Devuelve un destino nuevo para un enlace, o `undefined` para dejarlo como está. */
  rewriteHref?: (href: string) => string | undefined;
}

export interface TransformResult {
  markdown: string;
  log: LogEntry[];
}

/** Conversión de una línea de texto corrido (fuera de fences), en el orden documentado arriba. */
function convertInline(line: string, options: TransformOptions, lineNumber: number): LinesResult {
  const log: LogEntry[] = [];
  let text = line;
  const steps = [
    (value: string) => stripHeadingId(value, lineNumber),
    (value: string) => resolveAutorefs(value, lineNumber, options.symbols),
    (value: string) => removeIcons(value, lineNumber),
    (value: string) => removeAttrLists(value, lineNumber),
    (value: string) => rewriteLinks(value, lineNumber, options.rewriteHref),
  ];
  for (const step of steps) {
    const result = step(text);
    text = result.output;
    log.push(...result.log);
  }
  return { output: [text], log };
}

function convertLines(lines: string[], options: TransformOptions, offset: number): LinesResult {
  const output: string[] = [];
  const log: LogEntry[] = [];
  let wrapperDepth = 0;
  function recurse(body: string[], bodyOffset: number) {
    return convertLines(body, options, bodyOffset);
  }

  for (let index = 0; index < lines.length; index++) {
    const block =
      convertFence(lines, index, offset) ??
      convertAdmonition(lines, index, offset, recurse) ??
      convertTabs(lines, index, offset, recurse) ??
      convertApiDirective(lines, index, offset, options.resolveApi);
    if (block) {
      output.push(...block.output);
      log.push(...block.log);
      index = block.next - 1;
      continue;
    }

    const lineNumber = offset + index + 1;
    const line = lines[index] ?? '';
    const wrapper = stepHtmlWrapper(line, wrapperDepth, lineNumber);
    wrapperDepth = wrapper.depth;
    log.push(...wrapper.log);
    if (wrapper.skip) continue;

    const inline = convertInline(line, options, lineNumber);
    output.push(...inline.output);
    log.push(...inline.log);
  }
  return { output, log };
}

export function transformMkdocs(source: string, options: TransformOptions = {}): TransformResult {
  const trailingNewline = source.endsWith('\n');
  const lines = (trailingNewline ? source.slice(0, -1) : source).split('\n');
  const frontmatter = cleanFrontmatter(lines);
  const body = convertLines(frontmatter.output, options, lines.length - frontmatter.output.length);
  return {
    markdown: body.output.join('\n') + (trailingNewline ? '\n' : ''),
    log: [...frontmatter.log, ...body.log],
  };
}
