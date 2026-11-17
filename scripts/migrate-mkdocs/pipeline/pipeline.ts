/**
 * Pipeline de un CONJUNTO de documentos, puro (sin E/S). Orden fijo:
 *
 *   1. `newlines`    cada fichero se normaliza a LF (se restaura al final).
 *   2. `leftovers`   los stubs de snippet (`--8<-- "X"`) se apartan: no se convierten.
 *   3. `transform`   el pipeline de un documento (frontmatter, bloques, texto corrido).
 *   4. `anchors`     las anclas sin acentos de MkDocs, con todos los ficheros a la vista.
 *   5. `leftovers`   comprobación de restos sobre el RESULTADO.
 *   6. `stub-links`  enlaces que apuntan a un stub (se avisa, no se reescriben).
 *
 * Los enlaces `.md` relativos no se tocan salvo que se pase `rewriteHref` (el modo carpeta lo
 * necesita; `--in-place` no, porque la librería resuelve los `.md` relativos ella sola).
 */
import { fixAccentAnchors } from '../checks/anchors.ts';
import { findStubLinks, type StubLink } from '../checks/stub-links.ts';
import {
  checkOutput,
  findSnippetStub,
  type Leftover,
  type SnippetStub,
} from '../checks/leftovers.ts';
import { applyNewlineStyle, splitNewlineStyle } from './newlines.ts';
import { transformMkdocs, type LogEntry, type TransformOptions } from './transform.ts';

export interface PipelineOptions {
  resolveApi?: TransformOptions['resolveApi'];
  symbols?: TransformOptions['symbols'];
  /** Reescritor de enlaces por fichero (ruta relativa a `docs/`). */
  rewriteHref?: (file: string) => TransformOptions['rewriteHref'];
}

export interface PipelineResult {
  /** Todos los ficheros de entrada (los stubs, sin tocar), con su estilo de salto de línea. */
  files: Map<string, string>;
  /** Registro por fichero; solo los que tienen algo que contar. */
  log: Record<string, LogEntry[]>;
  stubs: SnippetStub[];
  leftovers: Leftover[];
  /** Enlaces a un stub: dejarán de apuntar a algo cuando se borre. */
  stubLinks: StubLink[];
}

export function runPipeline(
  input: ReadonlyMap<string, string>,
  options: PipelineOptions = {},
): PipelineResult {
  const log: Record<string, LogEntry[]> = {};
  const styles = new Map<string, boolean>();
  const normalized = new Map<string, string>();
  const converted = new Map<string, string>();
  const stubText = new Map<string, string>();

  for (const [file, original] of input) {
    const { text, crlf } = splitNewlineStyle(original);
    styles.set(file, crlf);
    normalized.set(file, text);
    if (findSnippetStub(file, text)) {
      stubText.set(file, text);
      continue;
    }
    const result = transformMkdocs(text, {
      resolveApi: options.resolveApi,
      symbols: options.symbols,
      rewriteHref: options.rewriteHref?.(file),
    });
    converted.set(file, result.markdown);
    if (result.log.length > 0) log[file] = result.log;
  }

  const anchors = fixAccentAnchors(converted);
  for (const entry of anchors.log) {
    (log[entry.file] ??= []).push({ kind: 'anchor', line: 0, detail: entry.detail });
  }

  const final = new Map<string, string>();
  for (const file of input.keys()) {
    final.set(file, stubText.get(file) ?? anchors.files.get(file) ?? '');
  }
  const { leftovers, stubs } = checkOutput(final);

  const files = new Map<string, string>();
  for (const [file, text] of final) files.set(file, applyNewlineStyle(text, styles.get(file)!));
  return { files, log, stubs, leftovers, stubLinks: findStubLinks(final, stubs) };
}
