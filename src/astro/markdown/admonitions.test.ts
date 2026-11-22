import { AstroError } from 'astro/errors';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import {
  docFileURL,
  externalFileURL,
  nonDocFileURL,
  project,
  renderMarkdown,
} from '../../testing/markdown';
import { admonitions } from './admonitions';
import { createMarkdownEnv } from './env';

const env = createMarkdownEnv(
  resolveConfig({
    site: { name: 'x' },
    i18n: { locales: ['en', 'es'] },
    content: { external: [{ slug: 'changelog', file: 'CHANGELOG.md' }] },
  }),
  project,
);
function render(source: string, fileURL = docFileURL('a.md')) {
  return renderMarkdown(source, {
    fileURL,
    features: { directive: true },
    plugins: [admonitions(env)],
  });
}
async function fails(source: string, fileURL = docFileURL('a.md')) {
  return render(source, fileURL).then(
    () => undefined,
    (error: unknown) => error as Error,
  );
}

describe('admonitions: directivas', () => {
  it('con título dado: aside note de su tipo con ese título', async () => {
    const html = await render(':::warning[Careful]\nCuerpo\n:::');
    expect(html).toContain(
      '<aside class="admonition" data-kind="warning" role="note" aria-label="Careful">',
    );
    expect(html).toContain('<p class="admonition-title">Careful</p>');
    expect(html).toContain('<p>Cuerpo</p>');
  });

  it('sin título usa el nombre del tipo en el idioma de la página', async () => {
    expect(await render(':::note\nx\n:::', docFileURL('a.es.md'))).toContain(
      '<p class="admonition-title">Nota</p>',
    );
    expect(await render(':::note\nx\n:::', docFileURL('a.md'))).toContain(
      '<p class="admonition-title">Note</p>',
    );
    expect(await render(':::tip\nx\n:::', externalFileURL('CHANGELOG.es.md'))).toContain(
      '<p class="admonition-title">Consejo</p>',
    );
  });

  it.each(['note', 'info', 'tip', 'warning', 'danger', 'question'])(
    'admite el tipo %s',
    async (kind) => {
      expect(await render(`:::${kind}\nx\n:::`)).toContain(`data-kind="${kind}"`);
    },
  );

  it('el cuerpo conserva bloques anidados (lista, código) y otras admoniciones', async () => {
    const html = await render('::::note\n- a\n- b\n\n```js\nx()\n```\n\n:::tip\nint\n:::\n::::');
    expect(html).toContain('<li>a</li>');
    expect(html).toContain('<pre>');
    expect(html).toContain('data-kind="tip"');
    expect(html.indexOf('data-kind="tip"')).toBeGreaterThan(html.indexOf('data-kind="note"'));
  });

  it('un tipo desconocido falla con AstroError que nombra archivo y tipo', async () => {
    const error = await fails(':::bogus\nx\n:::');
    expect(error).toBeInstanceOf(AstroError);
    expect(error!.message).toContain('bogus');
    expect(error!.message).toContain('src/content/docs/a.md');
  });

  it('en un external también falla, con su archivo', async () => {
    const error = await fails(':::nope\nx\n:::', externalFileURL('CHANGELOG.md'));
    expect(error!.message).toContain('nope');
    expect(error!.message).toContain('CHANGELOG.md');
  });

  it('los contenedores tabs/tab no son asunto suyo (no los rechaza)', async () => {
    expect(await fails('::::tabs\n:::tab[A]\na\n:::\n::::')).toBeUndefined();
  });

  it('también convierte el Markdown que no es documentación', async () => {
    const html = await render(':::note\nx\n:::', nonDocFileURL('about.md'));
    expect(html).toContain('class="admonition"');
  });
});

describe('admonitions: desplegable {collapsed}', () => {
  it('produce details cerrado con summary como título', async () => {
    const html = await render(':::tip[Más detalles]{collapsed}\nCuerpo\n:::');
    expect(html).toContain('<details class="admonition" data-kind="tip">');
    expect(html).toContain('<summary class="admonition-title">Más detalles</summary>');
    expect(html).not.toContain('open');
    expect(html).not.toContain('<aside');
  });

  it('sin título usa el del tipo localizado', async () => {
    expect(await render(':::warning{collapsed}\nx\n:::', docFileURL('a.es.md'))).toContain(
      '<summary class="admonition-title">Advertencia</summary>',
    );
  });

  it('un atributo desconocido falla con AstroError y el archivo', async () => {
    const error = await fails(':::note{foo}\nx\n:::');
    expect(error).toBeInstanceOf(AstroError);
    expect(error!.message).toContain('foo');
    expect(error!.message).toContain('src/content/docs/a.md');
  });

  it('collapsed con valor tampoco es válido (es un atributo sin valor)', async () => {
    expect(await fails(':::note{collapsed=no}\nx\n:::')).toBeInstanceOf(AstroError);
  });
});
