import { AstroError } from 'astro/errors';
import { INTEGRATION_NAME, type DocsConfig } from '../integration';

/**
 * Plan A: leer la config que la integración adjunta a su propio objeto en `config.integrations`.
 * Hoy Astro descarta esa propiedad (test #1), así que en la práctica el loader recibe la config
 * por argumento (plan B); esto queda por si Astro la conserva algún día.
 */
export function readIntegrationConfig(integrations: readonly { name: string }[]): DocsConfig {
  const found = integrations.find((integration) => integration.name === INTEGRATION_NAME) as
    { resolvedConfig?: DocsConfig } | undefined;
  if (!found?.resolvedConfig) {
    throw new AstroError(
      'El loader de docs no encuentra la config de `@velezanthony/design`.',
      'Pasa la config a `docsLoader()` desde `docs.config.mjs`: `docsLoader(docsConfig)`.',
    );
  }
  return found.resolvedConfig;
}
