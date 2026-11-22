import { defineDocsConfig } from '../../../../index.ts';

export default defineDocsConfig({
  site: { name: 'Outside' },
  i18n: { locales: ['en', 'es'] },
  content: {
    dir: '../docs',
    external: [{ slug: 'changelog', file: '../CHANGELOG.md' }],
    editUrl: 'https://github.com/o/r/edit/main',
    repoRoot: '..',
    nav: [{ label: 'Usuarios', dir: 'users' }],
  },
});
