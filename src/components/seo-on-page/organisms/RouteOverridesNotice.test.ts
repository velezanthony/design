import { describe, expect, it } from 'vitest';
import { render, text } from '../../../testing/render';
import RouteOverridesNotice from './RouteOverridesNotice.astro';

describe('RouteOverridesNotice', () => {
  it('sin sustituciones no pinta nada', async () => {
    expect(
      (await render(RouteOverridesNotice, { overrides: [] })).querySelector('aside'),
    ).toBeNull();
  });

  it('dice cuántas rutas sustituye el sitio y, de cada una, el fichero y la ruta', async () => {
    const htmlDocument = await render(RouteOverridesNotice, {
      overrides: [
        { file: 'src/pages/index.astro', path: '/' },
        { file: 'src/pages/sitemap.xml.ts', path: '/sitemap.xml' },
      ],
    });
    const aside = htmlDocument.querySelector('aside')!;
    expect(text(aside)).toContain('Tu sitio sustituye 2 rutas de la librería');
    expect([...aside.querySelectorAll('li')].map(text)).toEqual([
      'src/pages/index.astro → /',
      'src/pages/sitemap.xml.ts → /sitemap.xml',
    ]);
  });
});
