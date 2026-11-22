import { DocsError, DocsErrors, formatPath } from '../errors';
import { resolveContent, type ResolvedContent } from './content';
import { resolveI18n, type ResolvedI18n } from './i18n';
import { DocsConfigSchema, type DocsUserConfig } from './schema';
import { resolveSite, type ResolvedSite } from './site';

/** Config con todos los valores por defecto aplicados, con la misma forma que la pública: es la que consume el resto del paquete. */
export interface ResolvedConfig {
  site: ResolvedSite;
  i18n: ResolvedI18n;
  content: ResolvedContent;
}

export type { ResolvedContent, ResolvedI18n, ResolvedSite };

/** Un grupo con solo las claves `Keys`; sin claves, el grupo no se pide. */
type GroupPick<Name extends string, Group, Keys extends keyof Group> = [Keys] extends [never]
  ? unknown
  : { [Key in Name]: Pick<Group, Keys> };

/** Lo que una función necesita de la config resuelta, grupo a grupo: `ConfigPick<'name', 'locales'>` es `{ site: { name }, i18n: { locales } }`. */
export type ConfigPick<
  Site extends keyof ResolvedSite = never,
  I18n extends keyof ResolvedI18n = never,
  Content extends keyof ResolvedContent = never,
> = GroupPick<'site', ResolvedSite, Site> &
  GroupPick<'i18n', ResolvedI18n, I18n> &
  GroupPick<'content', ResolvedContent, Content>;

/** La config resuelta sin los textos de `i18n.ui` (viajan fusionados en `strings`): la que reciben el loader y el módulo virtual. */
export type ConfigWithoutUi = Omit<ResolvedConfig, 'i18n'> & { i18n: Omit<ResolvedI18n, 'ui'> };

/** Valida la config y aplica los valores por defecto; si es inválida lanza `DocsErrors` con la ruta de cada campo. */
export function resolveConfig(user: DocsUserConfig): ResolvedConfig {
  const result = DocsConfigSchema.safeParse(user);
  if (!result.success) {
    throw new DocsErrors(
      result.error.issues.flatMap((issue) => {
        // Una opción desconocida se nombra con su ruta completa (`ui.es.search.placeholdr`).
        if (issue.code === 'unrecognized_keys') {
          return issue.keys.map(
            (key) => new DocsError(`${formatPath([...issue.path, key])}: opción desconocida.`),
          );
        }
        return [new DocsError(`${formatPath(issue.path)}: ${issue.message}`)];
      }),
    );
  }
  const { site, i18n, content } = result.data;
  return { site: resolveSite(site), i18n: resolveI18n(i18n), content: resolveContent(content) };
}
