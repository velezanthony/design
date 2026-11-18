/** Modo carpeta (`--out`): convierte `docs/` + `mkdocs.yml` a otra carpeta sin tocar nunca el origen. */
import path from 'node:path';
import { parse } from 'yaml';
import { cleanGeneratedApi } from '../api/api-postprocess.ts';
import { checkOutput } from '../checks/leftovers.ts';
import { navToSidebar, type NavEntry } from './nav.ts';
import { runPipeline } from '../pipeline/pipeline.ts';
import { createLinkRewriter } from './rewrite-links.ts';
import { formatLeftovers, formatStubs } from '../io/report.ts';
import { transformMkdocs, type LogEntry } from '../pipeline/transform.ts';

const IMAGE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;

export interface ToFolderOptions {
  repo: string;
  out: string;
  repoUrl: string;
  branch: string;
  api?: string;
  external: string[];
  externalOut?: string;
  sidebarOut?: string;
  report?: string;
}

/** Lo que el modo necesita del mundo exterior: inyectado para probarlo sin disco (como `InPlaceIo`). */
export interface ToFolderIo {
  readText: (file: string) => string;
  /** Crea las carpetas que falten. */
  writeText: (file: string, text: string) => void;
  /** Crea las carpetas que falten. */
  copyFile: (from: string, to: string) => void;
  /** Todos los ficheros bajo `directory`, con rutas relativas a ella. */
  listFiles: (directory: string) => string[];
  removeDirectory: (directory: string) => void;
  print: (line: string) => void;
  printError: (line: string) => void;
}

export interface Mkdocs {
  nav: NavEntry[];
  excludePatterns: string[];
  plugins: Array<Record<string, unknown> | string>;
}

/** Lee `mkdocs.yml`; sus etiquetas `!!python/name:` no las conoce `yaml` y aquí no aportan nada. */
export function parseMkdocs(text: string): Mkdocs {
  const parsed = parse(text.replace(/!!python\/name:\S+/g, ''), {
    strict: false,
    uniqueKeys: false,
  }) as {
    nav: NavEntry[];
    exclude_docs?: string;
    plugins?: Array<Record<string, unknown> | string>;
  };
  return {
    nav: parsed.nav,
    excludePatterns: (parsed.exclude_docs ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    plugins: parsed.plugins ?? [],
  };
}

/** Una barra final excluye la carpeta; sin ella, solo ese fichero. */
export function isExcluded(patterns: string[], relative: string) {
  return patterns.some((pattern) =>
    pattern.endsWith('/') ? relative.startsWith(pattern) : relative === pattern,
  );
}

/** Qué se convierte, qué se copia y qué se deja fuera, a partir de los ficheros de `docs/`. */
export function planCopies(allFiles: string[], patterns: string[]) {
  const all = [...allFiles].sort();
  const markdown = all.filter((file) => file.endsWith('.md') && !isExcluded(patterns, file));
  const images = all.filter((file) => IMAGE.test(file) && !isExcluded(patterns, file));
  return {
    markdown,
    images,
    skipped: all.filter((file) => !markdown.includes(file) && !images.includes(file)),
    excluded: all.filter((file) => file.endsWith('.md') && isExcluded(patterns, file)),
  };
}

/** Devuelve el código de salida: 1 si quedan restos de sintaxis MkDocs. */
export function runToFolder(io: ToFolderIo, options: ToFolderOptions): number {
  const repo = path.resolve(options.repo);
  const out = path.resolve(options.out);
  const repoBlobUrl = `${options.repoUrl.replace(/\/$/, '')}/blob/${options.branch}`;
  const docs = path.join(repo, 'docs');

  const mkdocs = parseMkdocs(io.readText(path.join(repo, 'mkdocs.yml')));
  const { markdown, images, skipped, excluded } = planCopies(
    io.listFiles(docs),
    mkdocs.excludePatterns,
  );

  const externalOut = options.externalOut ? path.resolve(options.externalOut) : undefined;
  const externals = new Map<string, string>();
  for (const file of options.external) {
    if (!externalOut) throw new Error('--external needs --external-out');
    externals.set(
      file,
      path
        .relative(out, path.join(externalOut, path.basename(file)))
        .split(path.sep)
        .join('/'),
    );
  }

  const rewriter = createLinkRewriter({
    published: new Set([...markdown, ...images]),
    repoBlobUrl,
    docsDirInRepo: 'docs',
    externals,
  });

  const api: Record<string, string> = options.api ? JSON.parse(io.readText(options.api)) : {};
  let strippedApiLinks = 0;
  function resolveApi(id: string) {
    const generated = api[id];
    if (generated === undefined) return undefined;
    const cleaned = cleanGeneratedApi(generated);
    strippedApiLinks += cleaned.stripped;
    return cleaned.markdown;
  }

  io.removeDirectory(out);
  const sources = new Map(markdown.map((file) => [file, io.readText(path.join(docs, file))]));
  const result = runPipeline(sources, { resolveApi, rewriteHref: rewriter });
  const report: Record<string, LogEntry[]> = { ...result.log };

  for (const [file, text] of result.files) io.writeText(path.join(out, file), text);
  for (const file of images) io.copyFile(path.join(docs, file), path.join(out, file));

  /* Los ficheros externos: sus enlaces relativos salen de `docs/`, así que van al repositorio. */
  const externalOutputs = new Map<string, string>();
  for (const file of externals.keys()) {
    const converted = transformMkdocs(io.readText(path.join(repo, file)), {
      rewriteHref: createLinkRewriter({
        published: new Set(),
        repoBlobUrl,
        docsDirInRepo: '.',
        externals: new Map(),
      })('x'),
    });
    io.writeText(path.join(externalOut!, path.basename(file)), converted.markdown);
    externalOutputs.set(file, converted.markdown);
    if (converted.log.length > 0) report[`(external) ${file}`] = converted.log;
  }

  if (options.sidebarOut) {
    const i18n = mkdocs.plugins.find(
      (
        plugin,
      ): plugin is Record<
        string,
        { languages?: Array<{ locale: string; nav_translations?: Record<string, string> }> }
      > => typeof plugin === 'object' && 'i18n' in plugin,
    );
    const es =
      i18n?.i18n?.languages?.find((language) => language.locale === 'es')?.nav_translations ?? {};
    const sidebar = navToSidebar(mkdocs.nav, es);
    io.writeText(
      path.resolve(options.sidebarOut),
      `// Generado por scripts/migrate-mkdocs desde el nav de mkdocs.yml.\nexport default ${JSON.stringify(sidebar, null, 2)};\n`,
    );
  }

  const counts: Record<string, number> = {};
  for (const entries of Object.values(report)) {
    for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }
  if (options.report) io.writeText(path.resolve(options.report), JSON.stringify(report, null, 1));

  const externalCheck = checkOutput(
    new Map([...externalOutputs].map(([file, text]) => [`(external) ${file}`, text])),
  );
  const leftovers = [...result.leftovers, ...externalCheck.leftovers];
  io.print(
    JSON.stringify(
      {
        markdown: markdown.length,
        images: images.length,
        skipped: skipped.length,
        excluded,
        strippedApiLinks,
        counts,
        stubs: result.stubs.length,
        leftovers: leftovers.length,
      },
      null,
      2,
    ),
  );
  for (const line of formatStubs(result.stubs, 'docs')) io.print(line);
  if (leftovers.length > 0) {
    io.printError('Restos de sintaxis MkDocs sin convertir:');
    for (const line of formatLeftovers(leftovers)) io.printError(`  ${line}`);
  }
  return leftovers.length > 0 ? 1 : 0;
}
