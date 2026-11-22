import { defineDocsSite } from '../../../../index.ts';
import docsConfig from './docs.config.mjs';

export default defineDocsSite(docsConfig, { base: '/idx', site: 'https://example.dev' });
