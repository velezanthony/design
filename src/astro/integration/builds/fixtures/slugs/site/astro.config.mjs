import { defineDocsSite } from '../../../../index.ts';
import docsConfig from './docs.config.mjs';

export default defineDocsSite(docsConfig, { base: '/sl', site: 'https://example.dev' });
