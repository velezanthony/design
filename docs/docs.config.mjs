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
  /* Cuatro secciones, cada una con su barra lateral. El orden de dentro lo marca `order` del
     frontmatter de cada página; la portada de cada carpeta (`index.md`) es la entrada de la sección. */
  nav: [
    { label: 'Concepto', dir: 'concepto' },
    { label: 'Integración', dir: 'integracion' },
    { label: 'Arquitectura', dir: 'arquitectura' },
    { label: 'Mantenimiento', dir: 'mantenimiento' },
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
