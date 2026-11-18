import { describe, expect, it, vi } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { codeLanguages } from './code-languages';
import { createMarkdownEnv } from './env';
import { mermaid } from './mermaid';
import { SHIKI_LANG_ALIAS } from './code-languages';

const warn = vi.fn();
const env = createMarkdownEnv(resolveConfig({ name: 'x' }), project, warn);
function render(source: string, fileURL = docFileURL('a.md')) {
  return renderMarkdown(source, {
    fileURL,
    plugins: [mermaid(env), codeLanguages(env, SHIKI_LANG_ALIAS)],
  });
}
const diagram = '```mermaid\ngraph TD\n  A-->B\n```';

describe('mermaid', () => {
  it('envuelve el diagrama en su contenedor, con el código fuente legible dentro de un pre', async () => {
    const html = await render(diagram);
    expect(html).toContain('<div class="docs-mermaid" data-mermaid>');
    expect(html).toMatch(/<code>graph TD\n {2}A--&gt;B\n?<\/code><\/pre>/);
  });

  it('el pre lleva el mismo marcado que un bloque de código: así recibe su etiqueta de lenguaje y el botón de copiar', async () => {
    const html = await render(diagram);
    expect(html).toContain('<pre class="astro-code" data-language="mermaid" tabindex="0"><code>');
  });

  it('el lenguaje de la etiqueta es el que escribió el autor', async () => {
    expect(await render('```Mermaid\nA-->B\n```')).toContain('data-language="Mermaid"');
  });

  it('no se resalta: sin los spans de Shiki', async () => {
    expect(await render(diagram)).not.toContain('<span');
  });

  it('escapa el HTML del código fuente', async () => {
    const html = await render('```mermaid\nA["<b>x</b>"]\n```');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>');
  });

  it('el lenguaje se reconoce sin distinguir mayúsculas', async () => {
    expect(await render('```Mermaid\nA-->B\n```')).toContain('data-mermaid');
  });

  it('no avisa de lenguaje desconocido', async () => {
    warn.mockClear();
    await render(diagram);
    expect(warn).not.toHaveBeenCalled();
  });

  it('no toca otros bloques de código', async () => {
    const html = await render('```js\nx\n```');
    expect(html).not.toContain('data-mermaid');
  });

  it('no toca Markdown que no es documentación', async () => {
    expect(await render(diagram, nonDocFileURL('x.md'))).not.toContain('data-mermaid');
  });
});
