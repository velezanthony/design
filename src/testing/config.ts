import type { DocsUserConfig } from '../core/config/schema';

/** Un trozo de config de prueba: cualquier grupo puede faltar. Abierto a propósito: los tests de
    validación juntan también trozos inválidos. */
export interface ConfigPart {
  site?: Record<string, unknown> & { seo?: object; analytics?: object };
  i18n?: Record<string, unknown>;
  content?: Record<string, unknown>;
}

/* Junta trozos de config de prueba grupo a grupo (`site`, `i18n`, `content`, y dentro de `site`
   también `seo` y `analytics`): el último manda en cada clave. Un `{ ...base, site: { … } }` perdería
   el `site` de `base` entero. */
export function withConfig(...parts: ConfigPart[]): DocsUserConfig {
  const site: Record<string, unknown> = Object.assign({}, ...parts.map((part) => part.site ?? {}));
  for (const nested of ['seo', 'analytics'] as const) {
    const merged = Object.assign({}, ...parts.map((part) => part.site?.[nested] ?? {}));
    if (Object.keys(merged).length > 0) site[nested] = merged;
  }
  const i18n = Object.assign({}, ...parts.map((part) => part.i18n ?? {}));
  const content = Object.assign({}, ...parts.map((part) => part.content ?? {}));
  return {
    site,
    ...(Object.keys(i18n).length > 0 && { i18n }),
    ...(Object.keys(content).length > 0 && { content }),
  } as DocsUserConfig;
}
