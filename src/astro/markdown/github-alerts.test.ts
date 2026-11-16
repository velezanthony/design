import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../core/config/resolve';
import { docFileURL, externalFileURL, project, renderMarkdown } from '../../testing/markdown';
import { admonitions } from './admonitions';
import { createMarkdownEnv } from './env';
import { githubAlerts } from './github-alerts';

const env = createMarkdownEnv(
  resolveConfig({
    name: 'x',
    locales: ['en', 'es'],
    external: [{ slug: 'changelog', file: 'CHANGELOG.md' }],
  }),
  project,
);
const render = (source: string, fileURL = docFileURL('a.md')) =>
  renderMarkdown(source, {
    fileURL,
    features: { directive: true },
    plugins: [githubAlerts(env), admonitions(env)],
  });

describe('githubAlerts', () => {
  it('la salida es IDÉNTICA a `:::warning` sin título', async () => {
    const alert = await render('> [!WARNING]\n> Cuidado', docFileURL('a.es.md'));
    const directive = await render(':::warning\nCuidado\n:::', docFileURL('a.es.md'));
    expect(alert).toBe(directive);
    expect(alert).toContain('data-kind="warning"');
    expect(alert).toContain('<p class="admonition-title">Advertencia</p>');
    expect(alert).toContain('<p>Cuidado</p>');
  });

  it('IMPORTANT usa los colores de info y el título Important', async () => {
    const html = await render('> [!IMPORTANT]\n> x');
    expect(html).toContain('data-kind="info"');
    expect(html).toContain('<p class="admonition-title">Important</p>');
    expect(await render('> [!IMPORTANT]\n> x', docFileURL('a.es.md'))).toContain('>Importante<');
  });

  it('CAUTION se pinta como danger con su título', async () => {
    const html = await render('> [!CAUTION]\n> x', docFileURL('a.es.md'));
    expect(html).toContain('data-kind="danger"');
    expect(html).toContain('>Precaución<');
  });

  it.each([
    ['NOTE', 'note'],
    ['TIP', 'tip'],
    ['IMPORTANT', 'info'],
    ['WARNING', 'warning'],
    ['CAUTION', 'danger'],
  ])('mapea %s a %s', async (marker, kind) => {
    expect(await render(`> [!${marker}]\n> x`)).toContain(`data-kind="${kind}"`);
  });

  it('no distingue mayúsculas del marcador', async () => {
    expect(await render('> [!tip]\n> x')).toContain('data-kind="tip"');
    expect(await render('> [!Note]\n> x')).toContain('data-kind="note"');
  });

  it('un marcador desconocido deja el blockquote intacto, sin error', async () => {
    const html = await render('> [!FOO]\n> x');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('admonition');
  });

  it('con texto detrás del marcador en la misma línea tampoco es una alerta', async () => {
    const html = await render('> [!NOTE] algo\n> x');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('admonition');
  });

  it('una cita normal no se toca', async () => {
    expect(await render('> solo una cita')).toContain('<blockquote>');
  });

  it('un marcador solo, sin cuerpo, produce la admonición vacía', async () => {
    const html = await render('> [!TIP]');
    expect(html).toContain('data-kind="tip"');
    expect(html).not.toContain('<blockquote>');
  });

  it('conserva el resto de bloques de la cita (lista, código) y el inline del primer párrafo', async () => {
    const html = await render('> [!NOTE]\n> hola *mundo*\n>\n> - a\n> - b\n');
    expect(html).toContain('<em>mundo</em>');
    expect(html).toContain('<li>a</li>');
  });

  it('también en los external', async () => {
    const html = await render('> [!NOTE]\n> x', externalFileURL('CHANGELOG.es.md'));
    expect(html).toContain('>Nota<');
  });

  it('una alerta anidada dentro de otra admonición también se transforma', async () => {
    const html = await render('::::note\n> [!TIP]\n> x\n::::');
    expect(html).toContain('data-kind="tip"');
  });
});
