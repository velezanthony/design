import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { screenshots } from './images';

const env = createMarkdownEnv(resolveConfig({ name: 'x' }), project);
function render(source: string, fileURL = docFileURL('a.md')) {
  return renderMarkdown(source, { fileURL, plugins: [screenshots(env)] });
}

describe('screenshots', () => {
  it('un párrafo con solo una imagen lleva `docs-screenshot`: es una captura', async () => {
    expect((await render('![captura](https://x.test/c.png)')).trim()).toBe(
      '<p class="docs-screenshot"><img src="https://x.test/c.png" alt="captura"></p>',
    );
  });

  it('un párrafo con texto e imagen no: la imagen es parte del texto', async () => {
    const html = await render('Pulsa ![engranaje](https://x.test/g.svg) para abrirlo.');
    expect(html).toContain('<p>Pulsa <img');
    expect(html).not.toContain('docs-screenshot');
  });

  it('un párrafo con dos imágenes no (insignias seguidas)', async () => {
    const html = await render('![a](https://x.test/a.svg)\n![b](https://x.test/b.svg)');
    expect(html).not.toContain('docs-screenshot');
  });

  it('una imagen enlazada no es una captura (su único hijo es el enlace)', async () => {
    const html = await render('[![a](https://x.test/a.svg)](https://x.test/)');
    expect(html).not.toContain('docs-screenshot');
  });

  it('no toca Markdown que no es documentación', async () => {
    const html = await render('![c](https://x.test/c.png)', nonDocFileURL('x.md'));
    expect(html).not.toContain('docs-screenshot');
  });
});
