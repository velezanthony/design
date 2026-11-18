/** Modo carpeta (`--out`): convierte `docs/` + `mkdocs.yml` a otra carpeta sin tocar nunca el origen. */
import fs from 'node:fs';
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

/** Devuelve el código de salida: 1 si quedan restos de sintaxis MkDocs. */
export function runToFolder(options: ToFolderOptions): number {
  const repo = path.resolve(options.repo);
  const out = path.resolve(options.out);
  const repoBlobUrl = `${options.repoUrl.replace(/\/$/, '')}/blob/${options.branch}`;
  const docs = path.join(repo, 'docs');

  /* mkdocs.yml lleva etiquetas `!!python/name:` que `yaml` no conoce: no aportan nada aquí. */
  const mkdocs = parse(
    fs.readFileSync(path.join(repo, 'mkdocs.yml'), 'utf8').replace(/!!python\/name:\S+/g, ''),
    { strict: false, uniqueKeys: false },
  ) as {
    nav: NavEntry[];
    exclude_docs?: string;
    plugins?: Array<Record<string, unknown> | string>;
  };

  const excludePatterns = (mkdocs.exclude_docs ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  function isExcluded(rel: string) {
    return excludePatterns.some((pattern) =>
      pattern.endsWith('/') ? rel.startsWith(pattern) : rel === pattern,
    );
  }

  function walk(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(full) : [path.relative(docs, full)];
    });
  }

  const all = walk(docs).sort();
  const markdown = all.filter((file) => file.endsWith('.md') && !isExcluded(file));
  const images = all.filter((file) => IMAGE.test(file) && !isExcluded(file));
  const skipped = all.filter((file) => !markdown.includes(file) && !images.includes(file));

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

  const api: Record<string, string> = options.api
    ? JSON.parse(fs.readFileSync(options.api, 'utf8'))
    : {};
  let strippedApiLinks = 0;
  function resolveApi(id: string) {
    const generated = api[id];
    if (generated === undefined) return undefined;
    const cleaned = cleanGeneratedApi(generated);
    strippedApiLinks += cleaned.stripped;
    return cleaned.markdown;
  }

  fs.rmSync(out, { recursive: true, force: true });
  const sources = new Map(
    markdown.map((file) => [file, fs.readFileSync(path.join(docs, file), 'utf8')]),
  );
  const result = runPipeline(sources, { resolveApi, rewriteHref: rewriter });
  const report: Record<string, LogEntry[]> = { ...result.log };

  for (const [file, text] of result.files) {
    const target = path.join(out, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  for (const file of images) {
    const target = path.join(out, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(docs, file), target);
  }

  /* Los ficheros externos: sus enlaces relativos salen de `docs/`, así que van al repositorio. */
  const externalOutputs = new Map<string, string>();
  for (const file of externals.keys()) {
    const converted = transformMkdocs(fs.readFileSync(path.join(repo, file), 'utf8'), {
      rewriteHref: createLinkRewriter({
        published: new Set(),
        repoBlobUrl,
        docsDirInRepo: '.',
        externals: new Map(),
      })('x'),
    });
    fs.mkdirSync(externalOut!, { recursive: true });
    fs.writeFileSync(path.join(externalOut!, path.basename(file)), converted.markdown);
    externalOutputs.set(file, converted.markdown);
    if (converted.log.length > 0) report[`(external) ${file}`] = converted.log;
  }

  if (options.sidebarOut) {
    const i18n = mkdocs.plugins?.find(
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
    fs.writeFileSync(
      path.resolve(options.sidebarOut),
      `// Generado por scripts/migrate-mkdocs desde el nav de mkdocs.yml.\nexport default ${JSON.stringify(sidebar, null, 2)};\n`,
    );
  }

  const counts: Record<string, number> = {};
  for (const entries of Object.values(report)) {
    for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }
  if (options.report)
    fs.writeFileSync(path.resolve(options.report), JSON.stringify(report, null, 1));

  const externalCheck = checkOutput(
    new Map([...externalOutputs].map(([file, text]) => [`(external) ${file}`, text])),
  );
  const leftovers = [...result.leftovers, ...externalCheck.leftovers];
  console.log(
    JSON.stringify(
      {
        markdown: markdown.length,
        images: images.length,
        skipped: skipped.length,
        excluded: all.filter((file) => file.endsWith('.md') && isExcluded(file)),
        strippedApiLinks,
        counts,
        stubs: result.stubs.length,
        leftovers: leftovers.length,
      },
      null,
      2,
    ),
  );
  for (const line of formatStubs(result.stubs, 'docs')) console.log(line);
  if (leftovers.length > 0) {
    console.error('Restos de sintaxis MkDocs sin convertir:');
    for (const line of formatLeftovers(leftovers)) console.error(`  ${line}`);
  }
  return leftovers.length > 0 ? 1 : 0;
}
