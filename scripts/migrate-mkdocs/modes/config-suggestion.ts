/** Del `mkdocs.yml` a un trozo de `docs.config.mjs`: idiomas, política de traducción, exclusiones y nav (con ficheros de fuera de `docs/` como `external`). */
import path from 'node:path/posix';
import type { Mkdocs, MkdocsLanguage } from './mkdocs.ts';
import type { NavEntry } from './nav.ts';

type Label = string | Record<string, string>;
type SidebarItem = string | { label: Label; items: SidebarItem[] };

export interface ExternalSuggestion {
  slug: string;
  file: string;
}

/** Lo que va en `astro.config.mjs` (otro archivo): el origen y la ruta de `site_url`. */
export interface AstroSuggestion {
  site: string;
  base?: string;
}

export interface ConfigSuggestion {
  config: Record<string, unknown>;
  astro?: AstroSuggestion;
  externals: ExternalSuggestion[];
  /** Lo que no se ha podido convertir, para enseñarlo junto a la sugerencia. */
  notes: string[];
}

/** La carpeta de contenido que el migrador procesa. */
const CONTENT_DIR = 'docs';
const URL_START = /^https?:\/\//i;

/** `index.md` -> `index`, `a/index.md` -> `a`, `a/b.md` -> `a/b`. */
function slugOf(file: string): string {
  const stem = file.replace(/\.md$/, '');
  if (stem === 'index') return 'index';
  return stem.endsWith('/index') ? stem.slice(0, -'/index'.length) : stem;
}

/** `getting-started` -> `Getting started`: la etiqueta de una ruta sin título. */
function humanize(file: string): string {
  const words = path.basename(file, '.md').replace(/[-_]+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function labelFor(title: string, languages: readonly MkdocsLanguage[]): Label {
  if (languages.length === 0) return title;
  const byLocale = Object.fromEntries(
    languages.map((language) => [language.locale, language.navTranslations[title] ?? title]),
  );
  return new Set(Object.values(byLocale)).size === 1 ? title : byLocale;
}

/** Todas las rutas de fichero del nav, a cualquier profundidad. */
function navFiles(entries: readonly NavEntry[]): string[] {
  return entries.flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    const value = Object.values(entry)[0];
    if (typeof value === 'string') return URL_START.test(value) ? [] : [value];
    return navFiles(value ?? []);
  });
}

/** `https://o.github.io/repo/` → `site: 'https://o.github.io'`, `base: '/repo'`; en la raíz del dominio, sin `base`. */
function astroFromSiteUrl(siteUrl: string): AstroSuggestion | undefined {
  if (!URL_START.test(siteUrl) || !URL.canParse(siteUrl)) return undefined;
  const { origin, pathname } = new URL(siteUrl);
  const base = pathname.replace(/\/+$/, '');
  return base ? { site: origin, base } : { site: origin };
}

export function suggestConfig(mkdocs: Mkdocs): ConfigSuggestion {
  const { languages } = mkdocs;
  const externals: ExternalSuggestion[] = [];
  const notes: string[] = [];
  // En MkDocs el README de la raíz de `docs_dir` es la portada si no hay `index.md` nativo.
  const nativeHome = navFiles(mkdocs.nav).some(
    (file) => path.normalize(path.join(mkdocs.docsDir, file)) === `${CONTENT_DIR}/index.md`,
  );

  /** Slug de un fichero del nav: nativo si vive en `docs/`; si no, se publica con `external`. */
  function slugFor(file: string): string {
    const inRepo = path.normalize(path.join(mkdocs.docsDir, file));
    if (inRepo.startsWith(`${CONTENT_DIR}/`)) return slugOf(inRepo.slice(CONTENT_DIR.length + 1));
    const known = externals.find((entry) => entry.file === `../${inRepo}`);
    if (known) return known.slug;
    if (!nativeHome && inRepo === path.normalize(path.join(mkdocs.docsDir, 'README.md'))) {
      externals.push({ slug: 'index', file: `../${inRepo}` });
      return 'index';
    }
    const stem = path.basename(inRepo, '.md').toLowerCase();
    const taken = externals.some((entry) => entry.slug === stem);
    const parent = path.basename(path.dirname(inRepo)).toLowerCase();
    const slug = taken ? `${parent}/${stem}` : stem;
    externals.push({ slug, file: `../${inRepo}` });
    return slug;
  }

  function sidebarOf(entries: NavEntry[]): SidebarItem[] {
    return entries.flatMap((entry): SidebarItem[] => {
      if (typeof entry === 'string') return [slugFor(entry)];
      const [title = '', value] = Object.entries(entry)[0] ?? [];
      if (typeof value === 'string') {
        if (URL_START.test(value)) {
          notes.push(`nav: «${title}» apunta a ${value}; un sidebar no admite enlaces externos.`);
          return [];
        }
        return [slugFor(value)];
      }
      return [{ label: labelFor(title, languages), items: sidebarOf(value ?? []) }];
    });
  }

  const nav = mkdocs.nav.map((entry) => {
    if (typeof entry === 'string') return { label: humanize(entry), slug: slugFor(entry) };
    const [title = '', value] = Object.entries(entry)[0] ?? [];
    const label = labelFor(title, languages);
    if (typeof value === 'string') {
      return URL_START.test(value) ? { label, href: value } : { label, slug: slugFor(value) };
    }
    return { label, sidebar: sidebarOf(value ?? []) };
  });

  const config: Record<string, unknown> = {};
  if (languages.length > 0) {
    config.locales = languages.map((language) => language.locale);
    config.defaultLocale = (languages.find((language) => language.default) ?? languages[0])!.locale;
  }
  if (mkdocs.fallbackToDefault) config.translations = { missing: 'fallback' };
  if (mkdocs.excludePatterns.length > 0) {
    if (mkdocs.docsDir === CONTENT_DIR) config.exclude = mkdocs.excludePatterns;
    else {
      notes.push(
        `exclude_docs: sus patrones son de «${mkdocs.docsDir}», no de docs/; no se copian a \`exclude\`.`,
      );
    }
  }
  if (externals.length > 0) config.external = externals;
  if (nav.length > 0) config.nav = nav;
  const astro = mkdocs.siteUrl === undefined ? undefined : astroFromSiteUrl(mkdocs.siteUrl);
  if (mkdocs.siteUrl !== undefined && !astro) {
    notes.push(
      `site_url: «${mkdocs.siteUrl}» no es una URL http(s); pon \`site\` y \`base\` a mano.`,
    );
  }
  return { config, ...(astro ? { astro } : {}), externals, notes };
}

/** Las líneas de `astro.config.mjs`, que no cabe en el módulo de `docs.config.mjs`. */
function astroLines(astro: AstroSuggestion | undefined): string[] {
  if (!astro) return [];
  const options = [`site: '${astro.site}'`, ...(astro.base ? [`base: '${astro.base}'`] : [])];
  return [
    `// astro.config.mjs (desde site_url): defineDocsSite(docsConfig, { ${options.join(', ')} })`,
  ];
}

/** El módulo que se enseña y se escribe con `--config-out`: para pegar en `docs.config.mjs`, no para ejecutarlo. */
export function formatConfigModule({ config, astro, notes }: ConfigSuggestion): string {
  return [
    '// Sugerencia generada por scripts/migrate-mkdocs desde mkdocs.yml: pasa lo que quieras a docs.config.mjs.',
    '// Las rutas de `external` suponen el proyecto de Astro en una carpeta del repo (docs-site/, astro/…; no `site/`, que es la salida de MkDocs).',
    ...astroLines(astro),
    ...notes.map((note) => `// AVISO ${note}`),
    `export default ${JSON.stringify(config, null, 2)};`,
    '',
  ].join('\n');
}
