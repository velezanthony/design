import { defineDocsConfig } from '../../../index.ts';

export default defineDocsConfig({
  name: 'Outside',
  locales: ['en', 'es'],
  content: '../docs',
  external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
  editUrl: 'https://github.com/o/r/edit/main',
  repoRoot: '..',
  nav: [{ label: 'Usuarios', dir: 'users' }],
});
