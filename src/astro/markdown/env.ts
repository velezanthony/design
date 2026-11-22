import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MdastPluginDefinition, PluginFactoryContext } from 'satteri';
import type { NavItem } from '../../core/config/nav';
import type { ConfigPick } from '../../core/config/resolve';
import { externalCandidates } from '../../core/content/discovery';
import type { Locale } from '../../core/i18n/locale';
import { splitLocale } from '../../core/i18n/locale';
import { siteStrings, type UiStrings } from '../../core/i18n/ui-strings';
import { createScope, shouldTransform, type Scope } from './path-filter';

/** Lo que los plugins necesitan saber del sitio, calculado una vez al configurar la integración. */
export interface MarkdownEnv {
  root: URL;
  scope: Scope;
  locales: Locale[];
  defaultLocale: Locale;
  /** Catálogo de UI por idioma, con los textos del consumidor ya fusionados. */
  strings: Record<Locale, UiStrings>;
  /** Secciones de la cabecera: `::nav-tree` pinta sus árboles. */
  nav: readonly NavItem[];
  /** Avisos que no rompen la build (lenguajes de código desconocidos…). */
  warn: (message: string) => void;
}

type EnvConfig = ConfigPick<never, 'locales' | 'defaultLocale' | 'ui', 'external' | 'dir' | 'nav'>;

export function createMarkdownEnv(
  config: EnvConfig,
  root: URL,
  warn: (message: string) => void = () => {},
): MarkdownEnv {
  return {
    root,
    scope: createScope(root, externalCandidates(config), config.content.dir),
    locales: config.i18n.locales,
    defaultLocale: config.i18n.defaultLocale,
    strings: siteStrings(config.i18n.ui, config.i18n.locales),
    nav: config.content.nav ?? [],
    warn,
  };
}

/** Idioma de un archivo por el sufijo de su nombre (`guide.es.md`). Fuera de la documentación, sin sufijo, vale la carpeta más cercana con el nombre de un idioma (`projects/en/x.md`); si no, el idioma por defecto. */
export function localeOf(env: MarkdownEnv, fileURL: URL | undefined): Locale {
  if (!fileURL) return env.defaultLocale;
  const segments = decodeURIComponent(fileURL.pathname).split('/');
  const name = segments.pop() ?? '';
  function isLocale(part: string): part is Locale {
    return env.locales.includes(part as Locale);
  }
  if (name.split('.').slice(1, -1).some(isLocale)) {
    try {
      return splitLocale(name, env.locales, env.defaultLocale).locale;
    } catch {
      return env.defaultLocale;
    }
  }
  if (shouldTransform(fileURL, env.scope)) return env.defaultLocale;
  return segments.reverse().find(isLocale) ?? env.defaultLocale;
}

/** Catálogo de UI en el idioma del archivo. */
export function stringsOf(env: MarkdownEnv, fileURL: URL | undefined): UiStrings {
  return env.strings[localeOf(env, fileURL)] ?? env.strings[env.defaultLocale]!;
}

/** Ruta respecto a la raíz del proyecto para los errores; los archivos de fuera salen con sus `..`. */
export function fileLabel(env: MarkdownEnv, fileURL: URL | undefined): string {
  if (!fileURL) return '(archivo desconocido)';
  if (fileURL.protocol !== 'file:' || env.root.protocol !== 'file:') {
    return decodeURI(fileURL.pathname);
  }
  return path.relative(fileURLToPath(env.root), fileURLToPath(fileURL)).split(path.sep).join('/');
}

/** Lo que recibe un plugin: archivo, catálogo del idioma, ruta legible y si es documentación. */
export interface DocContext {
  fileURL: URL;
  file: string;
  strings: UiStrings;
  env: MarkdownEnv;
  /** `true` en la documentación (`content.dir` y `content.external`); `false` en el resto del Markdown del sitio. */
  inDocs: boolean;
}

/** Plugin para todo el Markdown del sitio que tenga archivo: así cualquier página que pinte `Article` recibe lo mismo que la documentación. */
export function markdownPlugin(
  env: MarkdownEnv,
  build: (doc: DocContext) => MdastPluginDefinition,
): (context: PluginFactoryContext) => MdastPluginDefinition | null {
  return ({ fileURL }) => {
    if (!fileURL) return null;
    return build({
      fileURL,
      file: fileLabel(env, fileURL),
      strings: stringsOf(env, fileURL),
      env,
      inDocs: shouldTransform(fileURL, env.scope),
    });
  };
}
