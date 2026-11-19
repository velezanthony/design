/** Modo carpeta (`--out`): convierte `docs/` + `mkdocs.yml` a otra carpeta sin tocar nunca el origen. */
import path from 'node:path';
import { createApiResolver } from './api-resolver.ts';
import { formatConfigModule, suggestConfig } from './config-suggestion.ts';
import { ignoredByMigrator } from './ignored.ts';
import { checkOutput } from '../checks/leftovers.ts';
import { navToSidebar } from './nav.ts';
import { parseMkdocs } from './mkdocs.ts';
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
  /** Dónde escribir la config sugerida desde `mkdocs.yml`. */
  configOut?: string;
  /** No toca nada (ni `--out`, ni los demás ficheros): enseña el plan. */
  dryRun?: boolean;
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

  const api = createApiResolver(options.api ? io.readText(options.api) : undefined);

  /* Con `--dry-run` se hace todo el cálculo y nada de lo que escribe. */
  const dryRun = options.dryRun ?? false;
  function write(file: string, text: string) {
    if (!dryRun) io.writeText(file, text);
  }
  if (dryRun)
    io.print('DRY-RUN: no se escribe nada (ni --out, ni la barra lateral, ni el informe).');
  else io.removeDirectory(out);
  const sources = new Map(markdown.map((file) => [file, io.readText(path.join(docs, file))]));
  const result = runPipeline(sources, {
    resolveApi: api.resolveApi,
    rewriteHref: rewriter,
    slugStyle: mkdocs.slugStyle,
  });
  const report: Record<string, LogEntry[]> = { ...result.log };

  for (const [file, text] of result.files) write(path.join(out, file), text);
  if (!dryRun) {
    for (const file of images) io.copyFile(path.join(docs, file), path.join(out, file));
  }

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
    write(path.join(externalOut!, path.basename(file)), converted.markdown);
    externalOutputs.set(file, converted.markdown);
    if (converted.log.length > 0) report[`(external) ${file}`] = converted.log;
  }

  if (options.sidebarOut) {
    const es = mkdocs.languages.find((language) => language.locale === 'es')?.navTranslations ?? {};
    const sidebar = navToSidebar(mkdocs.nav, es);
    write(
      path.resolve(options.sidebarOut),
      `// Generado por scripts/migrate-mkdocs desde el nav de mkdocs.yml.\nexport default ${JSON.stringify(sidebar, null, 2)};\n`,
    );
  }

  const counts: Record<string, number> = {};
  for (const entries of Object.values(report)) {
    for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }
  if (options.report) write(path.resolve(options.report), JSON.stringify(report, null, 1));

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
        strippedApiLinks: api.strippedLinks(),
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
  const suggestion = suggestConfig(mkdocs);
  const configModule = formatConfigModule(suggestion);
  if (options.configOut) write(path.resolve(options.configOut), configModule);
  if (dryRun) io.print(`Config sugerida desde mkdocs.yml:\n${configModule}`);
  const ignored = ignoredByMigrator(mkdocs);
  if (ignored.length > 0) {
    io.print('Lo que mkdocs.yml declara y el migrador no traduce:');
    for (const line of ignored) io.print(`  - ${line}`);
  }
  return leftovers.length > 0 ? 1 : 0;
}
