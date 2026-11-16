import type { MdastPluginDefinition, PluginFactoryContext } from 'satteri';
import type { ResolvedConfig } from '../../core/config/resolve';
import { externalCandidates } from '../../core/content/discovery';
import type { Locale } from '../../core/i18n/locale';
import { splitLocale } from '../../core/i18n/locale';
import { defaultStrings, mergeUiStrings, type UiStrings } from '../../core/i18n/ui-strings';
import { createScope, shouldTransform, type Scope } from './path-filter';

/** Lo que los plugins necesitan saber del sitio, calculado una vez al configurar la integración. */
export interface MarkdownEnv {
  root: URL;
  scope: Scope;
  locales: Locale[];
  defaultLocale: Locale;
  /** Catálogo de UI por idioma, con los textos del consumidor ya fusionados. */
  strings: Record<Locale, UiStrings>;
  /** Avisos que no rompen la build (lenguajes de código desconocidos…). */
  warn: (message: string) => void;
}

type EnvConfig = Pick<ResolvedConfig, 'locales' | 'defaultLocale' | 'ui' | 'external'>;

export function createMarkdownEnv(
  config: EnvConfig,
  root: URL,
  warn: (message: string) => void = () => {},
): MarkdownEnv {
  return {
    root,
    scope: createScope(root, externalCandidates(config)),
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    strings: mergeUiStrings(defaultStrings, config.ui),
    warn,
  };
}

/**
 * Idioma de un archivo: el sufijo de su nombre (`guide.es.md`, `CHANGELOG.es.md`); sin sufijo, o con
 * uno que no es de un idioma declarado, el idioma por defecto. Vale igual para nativos y `external`.
 */
export function localeOf(env: MarkdownEnv, fileURL: URL | undefined): Locale {
  const name = fileURL ? decodeURIComponent(fileURL.pathname.split('/').pop() ?? '') : '';
  try {
    return splitLocale(name, env.locales, env.defaultLocale).locale;
  } catch {
    return env.defaultLocale;
  }
}

/** Catálogo de UI en el idioma del archivo. */
export function stringsOf(env: MarkdownEnv, fileURL: URL | undefined): UiStrings {
  return env.strings[localeOf(env, fileURL)] ?? env.strings[env.defaultLocale]!;
}

/** Ruta del archivo respecto a la raíz del proyecto, para los mensajes de error. */
export function fileLabel(env: MarkdownEnv, fileURL: URL | undefined): string {
  if (!fileURL) return '(archivo desconocido)';
  const { href } = fileURL;
  return decodeURI(
    href.startsWith(env.root.href) ? href.slice(env.root.href.length) : fileURL.pathname,
  );
}

/** Lo que recibe un plugin ya gateado: archivo, catálogo del idioma y ruta legible. */
export interface DocContext {
  fileURL: URL;
  file: string;
  strings: UiStrings;
  env: MarkdownEnv;
}

/**
 * Factoría de plugin que solo participa en la documentación (nativa y `external`): para cualquier
 * otro Markdown devuelve `null` y Sätteri deja el plugin fuera de ese documento.
 */
export function docsPlugin(
  env: MarkdownEnv,
  build: (doc: DocContext) => MdastPluginDefinition,
): (ctx: PluginFactoryContext) => MdastPluginDefinition | null {
  return ({ fileURL }) => {
    if (!fileURL || !shouldTransform(fileURL, env.scope)) return null;
    return build({ fileURL, file: fileLabel(env, fileURL), strings: stringsOf(env, fileURL), env });
  };
}
