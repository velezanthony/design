import { defineDocsConfig, MissingTranslation } from '@velezanthony/design/integration';
import sidebar from './sidebar.generated.mjs';

/* Snapshot de la documentación de snake-orm, generado con `scripts/migrate-mkdocs`. */
export default defineDocsConfig({
  name: 'SnakeORM',
  locales: ['en', 'es'],
  defaultLocale: 'en',
  seo: {
    titleTemplate: '%s | SnakeORM',
    description: {
      en: 'A dataclass-first, type-first Python ORM where the type system is the single source of truth.',
      es: 'Un ORM de Python con dataclasses y tipado como única fuente de verdad.',
    },
    image: {
      src: '/og.png',
      alt: { en: 'SnakeORM documentation', es: 'Documentación de SnakeORM' },
    },
  },
  translations: { missing: MissingTranslation.LINK },
  /* Fuera de `src/content/docs/`, como el CHANGELOG de la raíz de un repo real. */
  external: [
    {
      slug: 'changelog',
      file: './src/content/CHANGELOG.md',
      /* El changelog solo existe en inglés, como en el repo original. */
      translations: MissingTranslation.LINK,
    },
  ],
  sidebar: [...sidebar, 'changelog'],
  /* Raíz de «repo» simulada: así `docs/users/x.md` y `CHANGELOG.md` salen como en snake-orm. */
  editUrl: 'https://github.com/velezanthony/snake-orm/edit/main',
  repoRoot: './src/content',
  social: { github: 'https://github.com/velezanthony/snake-orm' },
});
