import type { MdastPluginList } from 'satteri';
import { admonitions } from './admonitions';
import { codeLanguages, SHIKI_LANG_ALIAS } from './code-languages';
import type { MarkdownEnv } from './env';
import { githubAlerts } from './github-alerts';
import { mermaid } from './mermaid';
import { restoreDirectives } from './restore-directives';
import { scrollableTables } from './tables';
import { tabs } from './tabs';

/**
 * Nuestros plugins mdast, en orden: primero los que reclaman directivas y citas, al final
 * `restoreDirectives`, que devuelve a texto las directivas que nadie reclamó. Los `append` del
 * consumidor van antes: sus plugins ya estaban en la lista.
 */
export function markdownPlugins(
  env: MarkdownEnv,
  langAlias: Readonly<Record<string, string>> = SHIKI_LANG_ALIAS,
): MdastPluginList {
  return [
    githubAlerts(env),
    admonitions(env),
    tabs(env),
    scrollableTables(env),
    mermaid(env),
    codeLanguages(env, langAlias),
    restoreDirectives,
  ];
}

/** Alias de Shiki del paquete fusionados con los del consumidor; si ambos definen uno, manda el suyo. */
export function mergeLangAlias(
  consumer: Record<string, string> | undefined,
): Record<string, string> {
  return { ...SHIKI_LANG_ALIAS, ...consumer };
}
