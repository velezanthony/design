/** Pipeline puro de un CONJUNTO de documentos: newlines, stubs aparte, transform, anclas, restos y stub-links, en ese orden. */
import { fixAnchors, type SlugStyle } from '../checks/anchors.ts';
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
  /** Cómo genera MkDocs los ids de encabezado (`toc.slugify` de `mkdocs.yml`). */
  slugStyle?: SlugStyle;
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

  const anchors = fixAnchors(converted, normalized, options.slugStyle);
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
