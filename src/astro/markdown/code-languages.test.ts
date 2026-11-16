import { describe, expect, it, vi } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { codeLanguages, SHIKI_LANG_ALIAS } from './code-languages';

const make = (langAlias: Record<string, string> = SHIKI_LANG_ALIAS) => {
  const warn = vi.fn();
  const env = createMarkdownEnv(resolveConfig({ name: 'x' }), project, warn);
  const render = (source: string, fileURL = docFileURL('a.md')) =>
    renderMarkdown(source, { fileURL, plugins: [codeLanguages(env, langAlias)] });
  return { warn, render };
};

describe('SHIKI_LANG_ALIAS', () => {
  it('mapea los lenguajes ausentes en Shiki a gramáticas soportadas', () => {
    expect(SHIKI_LANG_ALIAS).toEqual({ django: 'jinja', pycon: 'python' });
  });
});

describe('codeLanguages', () => {
  it.each(['js', 'python', 'django', 'pycon', 'text', 'txt', 'plaintext', 'ansi', 'JSON'])(
    'el lenguaje conocido o aliasado %s no avisa',
    async (lang) => {
      const { warn, render } = make();
      await render(`\`\`\`${lang}\nx\n\`\`\``);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it('un lenguaje desconocido avisa con el nombre y el archivo, sin romper el render', async () => {
    const { warn, render } = make();
    const html = await render('```nopelang\nx\n```');
    expect(html).toContain('<pre>');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('nopelang');
    expect(warn.mock.calls[0]![0]).toContain('src/content/docs/a.md');
  });

  it('un alias del consumidor cuenta como conocido', async () => {
    const { warn, render } = make({ ...SHIKI_LANG_ALIAS, miLang: 'js' });
    await render('```miLang\nx\n```');
    expect(warn).not.toHaveBeenCalled();
  });

  it('un bloque sin lenguaje no avisa', async () => {
    const { warn, render } = make();
    await render('```\nx\n```');
    expect(warn).not.toHaveBeenCalled();
  });

  it('no avisa en Markdown que no es documentación', async () => {
    const { warn, render } = make();
    await render('```nopelang\nx\n```', nonDocFileURL('x.md'));
    expect(warn).not.toHaveBeenCalled();
  });
});
