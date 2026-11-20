import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { inlineImages } from './images';

const env = createMarkdownEnv(resolveConfig({ name: 'x' }), project);
function render(source: string, fileURL = docFileURL('a.md')) {
  return renderMarkdown(source, { fileURL, plugins: [inlineImages(env)] });
}

describe('inlineImages', () => {
  it('marca el párrafo con texto e imagen: la imagen es parte del texto, no una captura', async () => {
    const html = await render('Pulsa ![engranaje](https://x.test/g.svg) para abrirlo.');
    expect(html).toContain('<p class="docs-inline-images">Pulsa <img');
    expect(html).toContain('para abrirlo.</p>');
  });

  it('una imagen sola en su párrafo se queda como está: es una captura', async () => {
    expect((await render('![captura](https://x.test/c.png)')).trim()).toBe(
      '<p><img src="https://x.test/c.png" alt="captura"></p>',
    );
  });

  it('varias imágenes separadas por saltos de línea no cuentan como texto', async () => {
    const html = await render('![a](https://x.test/a.svg)\n![b](https://x.test/b.svg)');
    expect(html).not.toContain('docs-inline-images');
  });

  it('no toca Markdown que no es documentación', async () => {
    const html = await render('Pulsa ![g](https://x.test/g.svg) ya.', nonDocFileURL('x.md'));
    expect(html).not.toContain('docs-inline-images');
  });
});
