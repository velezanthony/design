export { defineDocsConfig } from './config';
export { defineDocsSite, type DocsSiteOptions } from './define-docs-site';
export { docs, INTEGRATION_NAME, type DocsIntegration } from './docs';
export { resolveConfigOrThrow } from '../config';
export type { DocsUserConfig } from '../../core/config/schema';
/** Valores cerrados de `translations.missing` (`MissingTranslation.LINK`); en el frontmatter son las mismas cadenas. */
export { MissingTranslation } from '../../core/i18n/translation-policy';
/** Valores cerrados de `layout` (`PanelState.COLLAPSED`, `LayoutWidth.FULL`). */
export { LayoutWidth, PanelState } from '../../core/config/layout';
/** Valores cerrados de los iconos de `nav` (`NavIcon.GITHUB`). */
export { NavIcon } from '../../core/config/nav';
