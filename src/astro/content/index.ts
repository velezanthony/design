import { defineCollection } from 'astro:content';
import { AstroError } from 'astro/errors';
import { docsLoaderFromResolved } from '../loader';
import { docsSchema } from '../loader/schema';
import { isMissingVirtualConfig } from './missing-integration';
import type { VirtualConfig } from '../virtual/data';

/**
 * La colección `docs` lista para usar: `src/content.config.ts` queda en
 * `export { collections } from '@velezanthony/design/content';`.
 *
 * La config no se vuelve a leer: se toma del módulo virtual que sirve la integración, que ya la
 * resolvió a partir de lo que `astro.config.mjs` le pasó con `docs(config)`. Hay una sola carga,
 * así que integración y loader no pueden acabar con configs distintas. El `.d.ts` del módulo es
 * una versión autocontenida de `VirtualConfig` (no puede importar nada del paquete): de ahí el cast.
 *
 * El import es dinámico solo para poder explicar el fallo: sin la integración registrada el módulo
 * no resuelve y el error de Vite ("Cannot find module") no dice qué hacer.
 */
const { default: config } = await import('virtual:@velezanthony/design/config').catch(
  (error: unknown) => {
    if (!isMissingVirtualConfig(error)) throw error;
    throw new AstroError(
      'Falta la integración de `@velezanthony/design`',
      'Añade `docs(config)` a `integrations` en astro.config.mjs: `@velezanthony/design/content` toma la config del módulo virtual que sirve la integración.',
    );
  },
);

export const collections = {
  docs: defineCollection({
    loader: docsLoaderFromResolved(config as unknown as VirtualConfig),
    schema: docsSchema(),
  }),
};
