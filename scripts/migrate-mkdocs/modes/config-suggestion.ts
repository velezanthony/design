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

export interface ConfigSuggestion {
  config: Record<string, unknown>;
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

export function suggestConfig(mkdocs: Mkdocs): ConfigSuggestion {
  const { languages } = mkdocs;
  const externals: ExternalSuggestion[] = [];
  const notes: string[] = [];

  /** Slug de un fichero del nav: nativo si vive en `docs/`; si no, se publica con `external`. */
  function slugFor(file: string): string {
    const inRepo = path.normalize(path.join(mkdocs.docsDir, file));
    if (inRepo.startsWith(`${CONTENT_DIR}/`)) return slugOf(inRepo.slice(CONTENT_DIR.length + 1));
    const known = externals.find((entry) => entry.file === `../${inRepo}`);
    if (known) return known.slug;
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
  return { config, externals, notes };
}

/** El módulo que se enseña y se escribe con `--config-out`: para pegar en `docs.config.mjs`, no para ejecutarlo. */
export function formatConfigModule({ config, notes }: ConfigSuggestion): string {
  return [
    '// Sugerencia generada por scripts/migrate-mkdocs desde mkdocs.yml: pasa lo que quieras a docs.config.mjs.',
    '// Las rutas de `external` suponen el proyecto de Astro en una carpeta del repo (docs-site/, astro/…; no `site/`, que es la salida de MkDocs).',
    ...notes.map((note) => `// AVISO ${note}`),
    `export default ${JSON.stringify(config, null, 2)};`,
    '',
  ].join('\n');
}
