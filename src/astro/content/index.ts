import { defineCollection } from 'astro:content';
import { AstroError } from 'astro/errors';
import { docsLoaderFromResolved } from '../loader';
import { docsSchema } from '../loader/schema';
import { isMissingVirtualConfig } from './missing-integration';
import type { VirtualConfig } from '../virtual/data';

/** La colección `docs` lista para usar; toma la config del módulo virtual (una sola carga) y el import es dinámico solo para explicar el fallo si falta la integración. */
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
