import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { createVirtualData } from './data';

/* `@velezanthony/design/content` crea el loader con la config que viaja en el módulo virtual, que
   es JSON. Si una opción dejara de ser serializable (una función, una fecha), el loader la recibiría
   vacía o cambiada sin ningún error: este test lo hace saltar en cuanto pase. */
describe('createVirtualData', () => {
  it('la config resuelta sobrevive intacta al viaje por JSON del módulo virtual', () => {
    const resolved = resolveConfig({
      name: 'Completo',
      locales: ['en', 'es'],
      seo: {
        titleSuffix: { en: 'Docs', es: 'Documentación' },
        description: 'Descripción',
        image: { src: '/og.png', alt: 'Tarjeta' },
      },
      translations: { missing: 'omit' },
      external: [
        {
          slug: 'changelog',
          file: '../CHANGELOG.md',
          seo: { noindex: true },
          translations: 'link',
        },
      ],
      sidebar: ['index', { label: 'Guía', items: ['guide'] }],
      nav: [
        { label: 'Guía', dir: 'guide' },
        { label: 'GitHub', href: 'https://github.com/o/r', icon: 'github' },
      ],
      footer: { license: 'MIT', author: { name: 'A', href: 'https://a.dev' } },
      editUrl: 'https://github.com/o/r/edit/main',
      social: { github: 'https://github.com/o/r' },
      ui: { es: { 'search.placeholder': 'Buscar' } },
    });
    const data = createVirtualData(resolved, {
      base: '/r',
      site: 'https://o.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
    });
    /* Todo lo que recibe el loader: la config resuelta sin `ui`, que no viaja. */
    const loaderConfig = Object.fromEntries(
      Object.entries(resolved).filter(([key]) => key !== 'ui'),
    );
    expect(JSON.parse(JSON.stringify(data))).toMatchObject(loaderConfig);
  });
});
