import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { createVirtualData } from './data';

/* El módulo virtual es JSON: si una opción dejara de ser serializable el loader la recibiría cambiada sin error; este test lo detecta. */
describe('createVirtualData', () => {
  it('la config resuelta sobrevive intacta al viaje por JSON del módulo virtual', () => {
    const resolved = resolveConfig({
      site: {
        name: 'Completo',
        footer: { license: 'MIT', author: { name: 'A', href: 'https://a.dev' } },
        social: { github: 'https://github.com/o/r' },
        seo: {
          titleSuffix: { en: 'Docs', es: 'Documentación' },
          description: 'Descripción',
          image: { src: '/og.png', alt: 'Tarjeta' },
        },
      },
      i18n: {
        locales: ['en', 'es'],
        missing: 'omit',
        ui: { es: { 'search.placeholder': 'Buscar' } },
      },
      content: {
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
        editUrl: 'https://github.com/o/r/edit/main',
      },
    });
    const data = createVirtualData(resolved, {
      base: '/r',
      siteUrl: 'https://o.dev',
      trailingSlash: 'always',
      buildFormat: 'directory',
      publicDir: 'file:///site/public/',
      root: 'file:///site/',
    });
    /* Todo lo que recibe el loader: la config resuelta sin `i18n.ui`, que no viaja. */
    const { ui, ...i18n } = resolved.i18n;
    const travelled = JSON.parse(JSON.stringify(data));
    expect(travelled).toMatchObject({ ...resolved, i18n });
    expect(travelled.i18n).not.toHaveProperty('ui');
    expect(ui).toEqual({ es: { 'search.placeholder': 'Buscar' } });
  });
});
