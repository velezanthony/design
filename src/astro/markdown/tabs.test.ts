import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { admonitions } from './admonitions';
import { createMarkdownEnv } from './env';
import { tabs } from './tabs';

const env = createMarkdownEnv(resolveConfig({ name: 'x', locales: ['en', 'es'] }), project);
function render(source: string, fileURL = docFileURL('a.md')) {
  return renderMarkdown(source, {
    fileURL,
    features: { directive: true },
    plugins: [admonitions(env), tabs(env)],
  });
}

describe('tabs', () => {
  const two = '::::tabs\n:::tab[npm]\nnpm i\n:::\n:::tab[pnpm]\npnpm add\n:::\n::::';

  it('emite la estructura que `initTabs` realza: un panel con su etiqueta por pestaña', async () => {
    const html = await render(two);
    expect(html).toContain('<div class="docs-tabs">');
    expect(html.match(/class="docs-tab-panel"/g)).toHaveLength(2);
    expect(html).toContain('<div class="docs-tab-label">npm</div>');
    expect(html).toContain('<div class="docs-tab-label">pnpm</div>');
    expect(html.indexOf('npm</div>')).toBeLessThan(html.indexOf('npm i'));
    expect(html.indexOf('npm i')).toBeLessThan(html.indexOf('pnpm</div>'));
  });

  it('sin JS todos los paneles están en el HTML, sin hidden ni roles', async () => {
    const html = await render(two);
    expect(html).not.toContain('hidden');
    expect(html).not.toContain('role=');
    expect(html).toContain('npm i');
    expect(html).toContain('pnpm add');
  });

  it('el contenido de un panel conserva bloques anidados, también admoniciones', async () => {
    const html = await render(
      ':::::tabs\n::::tab[A]\n```sh\nx\n```\n\n:::note\nint\n:::\n::::\n:::::',
    );
    expect(html).toContain('<pre>');
    expect(html).toContain('data-kind="note"');
  });

  it('un grupo con varias pestañas y otro grupo son independientes', async () => {
    const html = await render(`${two}\n\ntexto\n\n${two}`);
    expect(html.match(/class="docs-tabs"/g)).toHaveLength(2);
  });

  it('una pestaña sin etiqueta falla con el archivo', async () => {
    const error = await render('::::tabs\n:::tab\nx\n:::\n::::').catch(
      (caught: unknown) => caught as Error,
    );
    expect(error).toBeInstanceOf(AstroError);
    expect((error as Error).message).toContain('src/content/docs/a.md');
  });

  it('`tab` fuera de `tabs` falla', async () => {
    const error = await render(':::tab[A]\nx\n:::').catch((caught: unknown) => caught as Error);
    expect(error).toBeInstanceOf(AstroError);
    expect((error as Error).message).toContain('tab');
  });

  it('`tabs` solo admite `tab` dentro', async () => {
    const error = await render('::::tabs\n:::note\nx\n:::\n::::').catch(
      (caught: unknown) => caught as Error,
    );
    expect(error).toBeInstanceOf(AstroError);
  });

  it('no toca el Markdown que no es documentación', async () => {
    expect(await render(two, nonDocFileURL('x.md'))).not.toContain('docs-tabs');
  });
});
