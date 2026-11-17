import { defineCollection } from 'astro:content';
import docsConfig from '../docs.config.mjs';
import { docsLoader } from '../../../../../../loader/index.ts';
import { docsSchema } from '../../../../../../loader/schema.ts';

export const collections = {
  docs: defineCollection({ loader: docsLoader(docsConfig), schema: docsSchema() }),
};
