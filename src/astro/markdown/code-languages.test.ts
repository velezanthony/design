import { createShikiHighlighter } from '@astrojs/internal-helpers/shiki';
import { bundledLanguages, type BundledTheme } from 'shiki';
import { describe, expect, it, vi } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, nonDocFileURL, project, renderMarkdown } from '../../testing/markdown';
import { createMarkdownEnv } from './env';
import { codeLanguages, SHIKI_LANG_ALIAS } from './code-languages';

function make(langAlias: Record<string, string> = SHIKI_LANG_ALIAS) {
  const warn = vi.fn();
  const env = createMarkdownEnv(resolveConfig({ name: 'x' }), project, warn);
  function render(source: string, fileURL = docFileURL('a.md')) {
    return renderMarkdown(source, { fileURL, plugins: [codeLanguages(env, langAlias)] });
  }
  return { warn, render };
}

/** Alias que añadimos: Shiki no los trae y los autores los escriben a menudo. */
const ADDED = {
  django: 'jinja',
  htmldjango: 'jinja',
  pycon: 'python',
  env: 'dotenv',
  '.env': 'dotenv',
  terminal: 'shellsession',
  'shell-session': 'shellsession',
};

/** Nombres habituales que Shiki ya resuelve solo: no se aliasan. */
const NATIVE = ['console', 'py', 'js', 'ts', 'yml', 'sh', 'zsh', 'jsonc', 'dockerfile', 'docker'];

describe('SHIKI_LANG_ALIAS', () => {
  it('mapea los lenguajes ausentes en Shiki a gramáticas soportadas', () => {
    expect(SHIKI_LANG_ALIAS).toEqual(ADDED);
  });

  it.each(Object.keys(ADDED))('«%s» no existe en Shiki: el alias es necesario', (alias) => {
    expect(alias in bundledLanguages).toBe(false);
  });

  it.each(NATIVE)('«%s» ya lo resuelve Shiki: no se aliasa', (lang) => {
    expect(lang in bundledLanguages).toBe(true);
    expect(SHIKI_LANG_ALIAS).not.toHaveProperty(lang);
  });
});

describe('resaltado con los alias', () => {
  const sample: Record<string, string> = {
    django: '{% if x %}{{ y }}{% endif %}',
    htmldjango: '{% if x %}<p>{{ y }}</p>{% endif %}',
    pycon: '>>> print(1)\n1',
    env: 'KEY=value',
    '.env': 'KEY=value',
    terminal: '$ ls -la\nfile',
    'shell-session': '$ ls -la\nfile',
    console: '$ ls -la\nfile',
    py: 'x = 1',
    js: 'const x = 1',
    ts: 'const x: number = 1',
    yml: 'a: 1',
    sh: 'echo hi',
    zsh: 'echo hi',
    jsonc: '{ // c\n "a": 1 }',
    dockerfile: 'FROM node',
    docker: 'FROM node',
  };

  const themes: Record<string, BundledTheme> = {
    light: 'github-light-default',
    dark: 'github-dark-default',
  };

  it.each(Object.keys(sample))('«%s» se resalta (no cae a texto plano)', async (lang) => {
    const highlighter = await createShikiHighlighter({
      themes,
      langAlias: { ...SHIKI_LANG_ALIAS },
    });
    const html = await highlighter.codeToHtml(sample[lang]!, lang, {});
    expect(html).toContain('data-language="' + lang + '"');
    expect(html).toMatch(/<span style="color:#/);
  });

  it('un texto plano no lleva colores de token', async () => {
    const highlighter = await createShikiHighlighter({
      themes,
      langAlias: { ...SHIKI_LANG_ALIAS },
    });
    const html = await highlighter.codeToHtml('KEY=value', 'plaintext', {});
    expect(html).not.toMatch(/<span style="color:#/);
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
