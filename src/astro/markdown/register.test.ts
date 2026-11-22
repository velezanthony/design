import { describe, expect, it } from 'vitest';
import { defineMdastPlugin, type MdastPluginDefinition, type PluginFactoryContext } from 'satteri';
import { resolveConfig } from '../../core/config/resolve';
import {
  docFileURL,
  externalFileURL,
  nonDocFileURL,
  project,
  renderMarkdown,
} from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { SHIKI_LANG_ALIAS } from './code-languages';
import { markdownPlugins, mergeLangAlias } from './register';

const env = createMarkdownEnv(
  resolveConfig({
    name: 'x',
    locales: ['en', 'es'],
    external: [{ slug: 'changelog', file: 'CHANGELOG.md' }],
  }),
  project,
);

function resolveName(entry: unknown, fileURL: URL): string {
  const context = {
    fileURL,
    sourceFormat: 'markdown',
    source: '',
    data: {},
    features: {},
  } as PluginFactoryContext;
  const plugin = (typeof entry === 'function' ? entry(context) : entry) as MdastPluginDefinition;
  return plugin.name;
}

describe('markdownPlugins: orden', () => {
  it('githubAlerts, admonitions, tabs y restoreDirectives, este último el último', () => {
    const names = markdownPlugins(env).map((entry) => resolveName(entry, docFileURL('a.md')));
    expect(names.indexOf('github-alerts')).toBeLessThan(names.indexOf('admonitions'));
    expect(names.indexOf('admonitions')).toBeLessThan(names.indexOf('tabs'));
    expect(names.at(-1)).toBe('restore-directives');
    expect(names).toEqual(expect.arrayContaining(['github-alerts', 'admonitions', 'tabs']));
  });

  it('navTree reclama `::nav-tree` antes de que restoreDirectives lo devuelva a texto', () => {
    const names = markdownPlugins(env).map((entry) => resolveName(entry, docFileURL('a.md')));
    expect(names.indexOf('nav-tree')).toBeGreaterThan(-1);
    expect(names.indexOf('nav-tree')).toBeLessThan(names.indexOf('restore-directives'));
  });

  it('mermaid va antes de codeLanguages: así este no avisa de un lenguaje que Shiki no conoce', () => {
    const names = markdownPlugins(env).map((entry) => resolveName(entry, docFileURL('a.md')));
    expect(names.indexOf('mermaid')).toBeGreaterThan(-1);
    expect(names.indexOf('mermaid')).toBeLessThan(names.indexOf('code-languages'));
  });
});

function full(source: string, fileURL: URL, consumer: MdastPluginDefinition[] = []) {
  return renderMarkdown(source, {
    fileURL,
    features: { directive: true },
    plugins: [...consumer, ...markdownPlugins(env)],
  });
}

describe('markdownPlugins: integrados', () => {
  it('una alerta de GitHub y una directiva dan la misma salida en un doc nativo y en un external', async () => {
    for (const file of [docFileURL('a.es.md'), externalFileURL('CHANGELOG.es.md')]) {
      expect(await full('> [!WARNING]\n> Cuidado', file)).toBe(
        await full(':::warning\nCuidado\n:::', file),
      );
    }
  });

  it('el Markdown ajeno a la documentación queda intacto, con los literales restaurados', async () => {
    const html = await full('> [!NOTE]\n> x\n\nA las 12:30', nonDocFileURL('x.md'));
    expect(html).toContain('<blockquote>');
    expect(html).toContain('12:30');
  });

  it('sintaxis fuera de alcance: `{ #usage }` no crea id y los iconos salen literales', async () => {
    const html = await full(
      '## Uso { #usage }\n\n:material-check: y :octicons-x:',
      docFileURL('a.md'),
    );
    expect(html).toContain('Uso { #usage }');
    expect(html).not.toContain('id="usage"');
    expect(html).toContain(':material-check:');
    expect(html).toContain(':octicons-x:');
  });

  it('el HTML crudo (details, div align) pasa tal cual', async () => {
    const html = await full(
      '<details><summary>Más</summary>\n\ncuerpo\n\n</details>\n\n<div align="center">x</div>',
      docFileURL('a.md'),
    );
    expect(html).toContain('<details><summary>Más</summary>');
    expect(html).toContain('<div align="center">x</div>');
  });

  it('las tablas salen tal cual: el contenedor desplazable lo pone `Article`', async () => {
    const html = await full('| a |\n|---|\n| 1 |', docFileURL('a.md'));
    expect(html).toContain('<table>');
    expect(html).not.toContain('table-scroll');
  });

  it('una imagen sola en su párrafo sale sin marcar: la captura la marca `Article`', async () => {
    const html = await full('![c](https://x.test/c.png)', docFileURL('a.md'));
    expect(html).toContain('<p><img');
    expect(html).not.toContain('docs-screenshot');
  });

  it('un plugin del consumidor convive con los nuestros', async () => {
    const consumer = defineMdastPlugin({
      name: 'consumidor',
      text(node, context) {
        if (node.value === 'PING')
          context.replaceNode(node, { type: 'html', value: '<i>pong</i>' });
      },
    });
    expect(await full('PING\n\n:::note\nx\n:::', docFileURL('a.md'), [consumer])).toContain(
      '<i>pong</i>',
    );
  });
});

describe('mergeLangAlias', () => {
  it('añade los alias del paquete bajo los del consumidor', () => {
    expect(mergeLangAlias(undefined)).toEqual(SHIKI_LANG_ALIAS);
    expect(mergeLangAlias({ foo: 'js' })).toEqual({ ...SHIKI_LANG_ALIAS, foo: 'js' });
  });

  it('si el consumidor ya define un alias, el suyo manda', () => {
    expect(mergeLangAlias({ django: 'html' }).django).toBe('html');
  });
});
