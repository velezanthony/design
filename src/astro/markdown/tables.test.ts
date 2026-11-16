import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { scrollableTables } from './tables';

const env = createMarkdownEnv(resolveConfig({ name: 'x' }), project);
const render = (source: string, fileURL = docFileURL('a.md')) =>
  renderMarkdown(source, { fileURL, plugins: [scrollableTables(env)] });
const table = '| a | b |\n|---|---|\n| 1 | 2 |';

describe('scrollableTables', () => {
  it('envuelve cada tabla en su contenedor desplazable', async () => {
    const html = await render(`${table}\n\ntexto\n\n${table}`);
    expect(html.match(/<div class="table-scroll" tabindex="0"><table>/g)).toHaveLength(2);
    expect(html.match(/<\/table><\/div>/g)).toHaveLength(2);
  });

  it('el contenedor se puede enfocar con teclado para desplazarlo', async () => {
    expect(await render(table)).toContain('tabindex="0"');
  });

  it('no toca Markdown que no es documentación', async () => {
    expect(await render(table, nonDocFileURL('x.md'))).not.toContain('table-scroll');
  });
});
