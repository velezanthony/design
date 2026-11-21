/** Lectura de `mkdocs.yml`: lo que el migrador usa (nav, idiomas, exclusiones, slugify) y el documento entero para avisar de lo que ignora. */
import { parse } from 'yaml';
import type { SlugStyle } from '../checks/anchors.ts';
import type { NavEntry } from './nav.ts';

export interface MkdocsLanguage {
  locale: string;
  default: boolean;
  /** Título del nav en el idioma por defecto -> su traducción en este. */
  navTranslations: Record<string, string>;
}

export interface Mkdocs {
  nav: NavEntry[];
  excludePatterns: string[];
  plugins: Array<Record<string, unknown> | string>;
  /** Los de `plugins.i18n.languages`; vacío si el sitio tiene un solo idioma. */
  languages: MkdocsLanguage[];
  /** `fallback_to_default` de `i18n`. */
  fallbackToDefault: boolean;
  /** `docs_dir`; por defecto `docs`. */
  docsDir: string;
  /** `site_url` tal cual, si lo hay. */
  siteUrl?: string;
  /** Con `toc.slugify` propio los ids no son los de Python-Markdown. */
  slugStyle: SlugStyle;
  /** El documento tal cual se leyó, para avisar de las claves que no se migran. */
  raw: Record<string, unknown>;
}

const DEFAULT_SLUGIFY = /slugify:\s*!!python\/name:markdown\.extensions\.toc\.slugify\s*$/m;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Lee `mkdocs.yml`; sus etiquetas `!!python/…` no las conoce `yaml` y aquí no aportan nada. */
export function parseMkdocs(text: string): Mkdocs {
  const raw = parse(text.replace(/!!python\/[^\s{[]+/g, ''), {
    strict: false,
    uniqueKeys: false,
  }) as Record<string, unknown>;
  const plugins = (Array.isArray(raw.plugins) ? raw.plugins : []) as Mkdocs['plugins'];
  const i18n = plugins.map((plugin) => (isRecord(plugin) ? plugin.i18n : undefined)).find(isRecord);
  const languages = (Array.isArray(i18n?.languages) ? i18n.languages : [])
    .filter(isRecord)
    .map((language) => ({
      locale: String(language.locale),
      default: language.default === true,
      navTranslations: isRecord(language.nav_translations)
        ? (language.nav_translations as Record<string, string>)
        : {},
    }));
  const toc = (Array.isArray(raw.markdown_extensions) ? raw.markdown_extensions : [])
    .map((extension) => (isRecord(extension) ? extension.toc : undefined))
    .find(isRecord);
  return {
    nav: (Array.isArray(raw.nav) ? raw.nav : []) as NavEntry[],
    excludePatterns: (typeof raw.exclude_docs === 'string' ? raw.exclude_docs : '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#')),
    plugins,
    languages,
    fallbackToDefault: i18n?.fallback_to_default === true,
    docsDir: typeof raw.docs_dir === 'string' ? raw.docs_dir : 'docs',
    ...(typeof raw.site_url === 'string' ? { siteUrl: raw.site_url } : {}),
    slugStyle:
      toc && 'slugify' in toc && !DEFAULT_SLUGIFY.test(text) ? 'unicode' : 'python-markdown',
    raw,
  };
}
