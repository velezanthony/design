import { defineDocsConfig, NavIcon } from '@velezanthony/design/integration';

/* La documentación de mantenimiento de la librería. La lee una sola persona (quien la mantiene),
   así que va en un único idioma: español. */
export default defineDocsConfig({
  name: 'Design',
  locales: ['es'],
  defaultLocale: 'es',
  seo: {
    description:
      'Cómo funciona y cómo se mantiene @velezanthony/design: el sistema de diseño y el motor de documentación de los repositorios de velezanthony.',
  },
  /* Dos secciones por público, cada una con su barra lateral. Las carpetas son `guia/` y `desarrollo/`;
     los grupos de la barra se declaran aquí (`sidebar`) porque el orden y las agrupaciones no son los de
     las carpetas. Un grupo con `slug` enlaza su propia página (el `index.md` o el archivo que lo abre). */
  nav: [
    {
      label: 'Guía',
      dir: 'guia',
      sidebar: [
        { label: 'Concepto', slug: 'guia', items: ['guia/fuera-del-paquete'] },
        {
          label: 'Primeros pasos',
          slug: 'guia/primeros-pasos',
          items: [
            'guia/disposicion',
            'guia/markdown',
            'guia/navegacion-y-busqueda',
            'guia/rutas-seo-idiomas',
            'guia/analitica-y-privacidad',
          ],
        },
        { label: 'Páginas propias', items: ['guia/layout-propio', 'guia/piezas-sueltas'] },
        { label: 'Panel SEO', items: ['guia/seo-on-page'] },
      ],
    },
    {
      label: 'Desarrollo',
      dir: 'desarrollo',
      sidebar: [
        {
          label: 'Arquitectura',
          slug: 'desarrollo',
          items: ['desarrollo/una-pagina', 'desarrollo/herramientas', 'desarrollo/mapa-de-src'],
        },
        'desarrollo/por-dentro',
        {
          label: 'Mantenimiento',
          slug: 'desarrollo/mantenimiento',
          items: [
            'desarrollo/tests',
            'desarrollo/recetas',
            'desarrollo/versiones',
            'desarrollo/paleta',
          ],
        },
      ],
    },
    { label: 'GitHub', href: 'https://github.com/velezanthony/design', icon: NavIcon.GITHUB },
  ],
  /* «Editar esta página» apunta al archivo real del repo (`docs/src/content/docs/...`). `repoRoot`
     es explícito para no depender de que exista `.git` donde se construye. */
  editUrl: 'https://github.com/velezanthony/design/edit/main',
  repoRoot: '..',
  social: { github: 'https://github.com/velezanthony/design' },
  /* La política es la del portfolio, una para todo el dominio: la analítica exige `privacyUrl`. */
  privacyUrl: 'https://velezanthony.github.io/privacidad/',
  /* Sin licencia en el pie hasta decidirla. La analítica no se declara aquí: el workflow pasa
     `PUBLIC_GTM_ID` desde el secreto del repo, así un build local o un fork sale sin rastreo. */
});
