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
  it.each(['js', 'python', 'django', 'pycon', 'ansi', 'JSON'])(
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

  it('un bloque con fence y sin lenguaje avisa con archivo y línea', async () => {
    const { warn, render } = make();
    await render('texto\n\n```\nx\n```');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'src/content/docs/a.md:3: bloque de código sin lenguaje; usa ```text si es texto plano',
    );
  });

  it('avisa una vez por bloque, también con fence de tildes', async () => {
    const { warn, render } = make();
    await render('```\na\n```\n\n~~~\nb\n~~~\n\n```sh\nc\n```');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]![0]).toContain('a.md:1:');
    expect(warn.mock.calls[1]![0]).toContain('a.md:5:');
  });

  it.each(['text', 'txt', 'plaintext', 'plain', 'TEXT'])(
    'la familia text (%s) es «sin resaltado» explícito y no avisa',
    async (lang) => {
      const { warn, render } = make();
      await render(`\`\`\`${lang}\nx\n\`\`\``);
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it('un bloque con sangría (sin fence) no avisa', async () => {
    const { warn, render } = make();
    await render('texto\n\n    x\n    y');
    expect(warn).not.toHaveBeenCalled();
  });

  it('no avisa en Markdown que no es documentación', async () => {
    const { warn, render } = make();
    await render('```nopelang\nx\n```', nonDocFileURL('x.md'));
    expect(warn).not.toHaveBeenCalled();
  });
});
