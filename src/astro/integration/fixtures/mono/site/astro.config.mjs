import { defineDocsSite } from '../../../index.ts';
import docsConfig from './docs.config.mjs';

/* Forma corta: `defineDocsSite` y, en content.config.ts, una línea que toma la config del módulo
   virtual de la integración (aquí apuntando al código fuente en vez de a `@velezanthony/design/content`). */
export default defineDocsSite(docsConfig, { base: '/mono', site: 'https://example.dev' });
