/**
 * CLI: convierte una carpeta `docs/` de MkDocs Material en contenido de `@velezanthony/design`.
 *
 *   node scripts/migrate-mkdocs/cli.ts \
 *     --repo <raíz del repo origen> --out <carpeta de contenido> \
 *     --repo-url https://github.com/o/r [--branch main] [--api api.json] \
 *     [--external CHANGELOG.md --external-out <carpeta>] [--sidebar-out sidebar.mjs] \
 *     [--report report.json]
 *
 * Lee `<repo>/mkdocs.yml` (nav, `exclude_docs`, traducciones del nav) y `<repo>/docs`. No escribe
 * nunca en el origen. `--api` es el JSON de `generate-api.py` con el Markdown de cada símbolo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import { fixAccentAnchors } from './anchors.ts';
import { cleanGeneratedApi } from './api-postprocess.ts';
import { navToSidebar, type NavEntry } from './nav.ts';
import { createLinkRewriter } from './rewrite-links.ts';
import { transformMkdocs, type LogEntry } from './transform.ts';

const IMAGE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    out: { type: 'string' },
    'repo-url': { type: 'string' },
    branch: { type: 'string', default: 'main' },
    api: { type: 'string' },
    external: { type: 'string', multiple: true, default: [] },
    'external-out': { type: 'string' },
    'sidebar-out': { type: 'string' },
    report: { type: 'string' },
  },
});

const need = (name: keyof typeof values): string => {
  const value = values[name];
  if (typeof value !== 'string') throw new Error(`Missing --${name}`);
  return value;
};

const repo = path.resolve(need('repo'));
const out = path.resolve(need('out'));
const repoBlobUrl = `${need('repo-url').replace(/\/$/, '')}/blob/${values.branch}`;
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
const isExcluded = (rel: string) =>
  excludePatterns.some((pattern) =>
    pattern.endsWith('/') ? rel.startsWith(pattern) : rel === pattern,
  );

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [path.relative(docs, full)];
  });

const all = walk(docs).sort();
const markdown = all.filter((file) => file.endsWith('.md') && !isExcluded(file));
const images = all.filter((file) => IMAGE.test(file) && !isExcluded(file));
const skipped = all.filter((file) => !markdown.includes(file) && !images.includes(file));

const externalOut = values['external-out'] ? path.resolve(values['external-out']) : undefined;
const externals = new Map<string, string>();
for (const file of values.external ?? []) {
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

const api: Record<string, string> = values.api
  ? JSON.parse(fs.readFileSync(values.api, 'utf8'))
  : {};
let strippedApiLinks = 0;
const resolveApi = (id: string) => {
  const generated = api[id];
  if (generated === undefined) return undefined;
  const cleaned = cleanGeneratedApi(generated);
  strippedApiLinks += cleaned.stripped;
  return cleaned.markdown;
};

fs.rmSync(out, { recursive: true, force: true });
const report: Record<string, LogEntry[]> = {};

const converted = new Map<string, string>();
for (const file of markdown) {
  const source = fs.readFileSync(path.join(docs, file), 'utf8');
  const result = transformMkdocs(source, { resolveApi, rewriteHref: rewriter(file) });
  converted.set(file, result.markdown);
  if (result.log.length > 0) report[file] = result.log;
}
/* Segunda pasada, con todos los ficheros a la vista: las anclas sin acentos de MkDocs. */
const anchors = fixAccentAnchors(converted);
for (const entry of anchors.log) {
  (report[entry.file] ??= []).push({ kind: 'anchor', line: 0, detail: entry.detail });
}
for (const [file, text] of anchors.files) {
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
for (const file of externals.keys()) {
  const result = transformMkdocs(fs.readFileSync(path.join(repo, file), 'utf8'), {
    rewriteHref: (href) => {
      const rewritten = createLinkRewriter({
        published: new Set(),
        repoBlobUrl,
        docsDirInRepo: '.',
        externals: new Map(),
      })('x')(href);
      return rewritten;
    },
  });
  fs.mkdirSync(externalOut!, { recursive: true });
  fs.writeFileSync(path.join(externalOut!, path.basename(file)), result.markdown);
  if (result.log.length > 0) report[`(external) ${file}`] = result.log;
}

if (values['sidebar-out']) {
  const i18n = mkdocs.plugins?.find(
    (
      plugin,
    ): plugin is Record<
      string,
      { languages?: Array<{ locale: string; nav_translations?: Record<string, string> }> }
    > => typeof plugin === 'object' && 'i18n' in plugin,
  );
  const es =
    i18n?.i18n.languages?.find((language) => language.locale === 'es')?.nav_translations ?? {};
  const sidebar = navToSidebar(mkdocs.nav, es);
  fs.writeFileSync(
    path.resolve(values['sidebar-out']),
    `// Generado por scripts/migrate-mkdocs desde el nav de mkdocs.yml.\nexport default ${JSON.stringify(sidebar, null, 2)};\n`,
  );
}

const counts: Record<string, number> = {};
for (const entries of Object.values(report)) {
  for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
}
if (values.report) fs.writeFileSync(path.resolve(values.report), JSON.stringify(report, null, 1));
console.log(
  JSON.stringify(
    {
      markdown: markdown.length,
      images: images.length,
      skipped: skipped.length,
      excluded: all.filter((file) => file.endsWith('.md') && isExcluded(file)),
      strippedApiLinks,
      counts,
    },
    null,
    2,
  ),
);
