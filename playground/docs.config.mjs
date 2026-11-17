import { defineDocsConfig, MissingTranslation, NavIcon } from '@velezanthony/design/integration';
import sidebar from './sidebar.generated.mjs';

/* El snapshot trae el árbol entero de snake-orm: cada grupo de primer nivel pasa a ser el sidebar
   de su sección de la cabecera (`nav`). */
const [, users, contributors] = sidebar;

/* Snapshot de la documentación de snake-orm, generado con `scripts/migrate-mkdocs`. */
export default defineDocsConfig({
  name: 'SnakeORM',
  locales: ['en', 'es'],
  defaultLocale: 'en',
  seo: {
    titleSuffix: 'SnakeORM',
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
  /* Cabecera como la de snake-orm: dos secciones por carpeta, una página suelta y el repo. */
  nav: [
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
  ],
  /* Páginas sin sección: la portada, la muestra de componentes y el changelog. */
  sidebar: ['index', 'showcase', 'changelog'],
  /* Raíz de «repo» simulada: así `docs/users/x.md` y `CHANGELOG.md` salen como en snake-orm. */
  editUrl: 'https://github.com/velezanthony/snake-orm/edit/main',
  repoRoot: './src/content',
  social: { github: 'https://github.com/velezanthony/snake-orm' },
  footer: {
    license: { label: 'MIT', href: 'https://github.com/velezanthony/snake-orm/blob/main/LICENSE' },
  },
});
