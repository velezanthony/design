import type { MdastPluginList } from 'satteri';
import { admonitions } from './admonitions';
import { codeLanguages, SHIKI_LANG_ALIAS } from './code-languages';
import type { MarkdownEnv } from './env';
import { githubAlerts } from './github-alerts';
import { inlineImages } from './images';
import { mermaid } from './mermaid';
import { navTree } from './nav-tree';
import { restoreDirectives } from './restore-directives';
import { scrollableTables } from './tables';
import { tabs } from './tabs';

/** Nuestros plugins mdast en orden: los que reclaman directivas y citas primero, `restoreDirectives` al final; los `append` del consumidor van antes. */
export function markdownPlugins(
  env: MarkdownEnv,
  langAlias: Readonly<Record<string, string>> = SHIKI_LANG_ALIAS,
): MdastPluginList {
  return [
    githubAlerts(env),
    admonitions(env),
    tabs(env),
    navTree(env),
    scrollableTables(env),
    inlineImages(env),
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
