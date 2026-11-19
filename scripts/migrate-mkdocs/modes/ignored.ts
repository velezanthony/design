/** Lo que `mkdocs.yml` declara y el migrador no traduce: se enseña al final para que nada se pierda en silencio. */
import type { Mkdocs } from './mkdocs.ts';

/** Datos del sitio que no se copian; la config se rellena a mano. */
const SITE_KEYS: Record<string, string> = {
  site_name: '`name`',
  site_description: '`seo.description`',
  site_url: '`site` de Astro',
  repo_url: '`editUrl` y `social.github`',
  edit_uri: '`editUrl`',
  copyright: '`footer`',
};

/** Claves que no tienen traducción. */
const DROPPED_KEYS: Record<string, string> = {
  theme:
    'tema de Material (paleta, funciones, logo, `custom_dir`): el aspecto lo da la librería; los tokens propios van en `theme` de la config',
  extra_css: 'CSS propio: va en `theme` de la config de la librería',
  extra_javascript: 'JavaScript propio: se añade a mano al layout del sitio',
  hooks: 'hooks de Python',
  validation: 'niveles de validación de MkDocs: la build de la librería es estricta siempre',
  not_in_nav: 'páginas fuera del nav: se publican igual; usa `exclude` para dejarlas fuera',
  draft_docs: 'borradores: usa `exclude`',
  watch: 'carpetas vigiladas',
};

/** Plugins que el migrador traduce, sustituye o no hacen falta. */
const HANDLED_PLUGINS = new Set(['search', 'i18n', 'mkdocstrings', 'same-dir']);

/** Extensiones de Markdown que la conversión entiende. */
const HANDLED_EXTENSIONS = new Set([
  'admonition',
  'attr_list',
  'md_in_html',
  'tables',
  'toc',
  'meta',
  'pymdownx.details',
  'pymdownx.superfences',
  'pymdownx.highlight',
  'pymdownx.inlinehilite',
  'pymdownx.snippets',
  'pymdownx.tabbed',
  'pymdownx.emoji',
]);

function nameOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null) return Object.keys(entry)[0];
  return undefined;
}

export function ignoredByMigrator(mkdocs: Mkdocs): string[] {
  const { raw } = mkdocs;
  const lines: string[] = [];

  const site = Object.keys(SITE_KEYS).filter((key) => key in raw);
  if (site.length > 0) {
    lines.push(
      `No se copian a la config (hazlo a mano): ${site.map((key) => `${key} -> ${SITE_KEYS[key]}`).join('; ')}.`,
    );
  }
  for (const [key, why] of Object.entries(DROPPED_KEYS)) {
    if (key in raw) lines.push(`${key}: ${why}.`);
  }
  if (mkdocs.docsDir !== 'docs') {
    lines.push(
      `docs_dir: ${mkdocs.docsDir}: el migrador solo procesa docs/; lo que viva fuera se publica con \`external\` (la sugerencia de nav ya lo hace).`,
    );
  }

  for (const plugin of mkdocs.plugins) {
    const name = nameOf(plugin);
    if (name !== undefined && !HANDLED_PLUGINS.has(name)) {
      lines.push(`plugin «${name}»: el migrador no lo traduce.`);
    }
    if (name === 'mkdocstrings') {
      lines.push(
        'plugin «mkdocstrings»: las directivas `::: x` quedan como nota salvo que pases --api.',
      );
    }
    if (name === 'i18n' && typeof plugin === 'object') {
      const structure = (plugin.i18n as Record<string, unknown> | null)?.docs_structure;
      if (structure !== undefined && structure !== 'suffix') {
        lines.push(
          `i18n: docs_structure «${String(structure)}»: la librería usa ficheros con sufijo de idioma (guia.es.md); reorganiza los ficheros.`,
        );
      }
    }
  }

  const extensions = Array.isArray(raw.markdown_extensions) ? raw.markdown_extensions : [];
  for (const extension of extensions) {
    const name = nameOf(extension);
    if (name !== undefined && !HANDLED_EXTENSIONS.has(name)) {
      lines.push(`extensión de Markdown «${name}»: sin conversión; el migrador no la toca.`);
    }
  }

  if (mkdocs.excludePatterns.some((pattern) => pattern.startsWith('!'))) {
    lines.push(
      'exclude_docs con `!`: MkDocs respeta la negación aunque el padre esté excluido; en `exclude` manda el último patrón que coincide. Revisa el orden.',
    );
  }
  return lines;
}
