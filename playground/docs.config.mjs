import { defineDocsConfig, MissingTranslation, NavIcon } from '@velezanthony/design/integration';
import sidebar from './sidebar.generated.mjs';

/* El snapshot trae el árbol entero de snake-orm: cada grupo de primer nivel pasa a ser el sidebar
   de su sección de la cabecera (`nav`). */
const [, users, contributors] = sidebar;

/* Snapshot de la documentación de snake-orm, generado con `scripts/migrate-mkdocs`. */
export default defineDocsConfig({ site: { name: 'SnakeORM', social: { github: 'https://github.com/velezanthony/snake-orm' }, footer: {
    license: { label: 'MIT', href: 'https://github.com/velezanthony/snake-orm/blob/main/LICENSE' },
  }, seo: { titleSuffix: 'SnakeORM', description: {
      en: 'A dataclass-first, type-first Python ORM where the type system is the single source of truth.',
      es: 'Un ORM de Python con dataclasses y tipado como única fuente de verdad.',
    }, image: {
      src: '/og.png',
      alt: { en: 'SnakeORM documentation', es: 'Documentación de SnakeORM' },
    }, schema: [
      {
        '@type': 'SoftwareSourceCode',
        name: 'SnakeORM',
        codeRepository: 'https://github.com/velezanthony/snake-orm',
        programmingLanguage: 'Python',
        license: 'https://github.com/velezanthony/snake-orm/blob/main/LICENSE',
      },
    ] }, analytics: { privacyUrl: {
    en: 'https://velezanthony.github.io/en/privacy/',
    es: 'https://velezanthony.github.io/privacidad/',
  } } }, i18n: { locales: ['en', 'es'], defaultLocale: 'en', missing: MissingTranslation.LINK }, content: { external: [
    {
      slug: 'changelog',
      file: './src/content/CHANGELOG.md',
      /* El changelog solo existe en inglés, como en el repo original. */
      translations: MissingTranslation.LINK,
    },
  ], nav: [
    { label: { en: 'Guide', es: 'Guía' }, dir: 'users', sidebar: users.items },
    {
      label: { en: 'Contributing', es: 'Colaborar' },
      dir: 'contributors',
      sidebar: contributors.items,
    },
    { label: 'Changelog', slug: 'changelog' },
    {
      label: 'GitHub',
      href: 'https://github.com/velezanthony/snake-orm',
      icon: NavIcon.GITHUB,
    },
  ], sidebar: ['index', 'showcase', 'changelog'], editUrl: 'https://github.com/velezanthony/snake-orm/edit/main', repoRoot: './src/content' } });
