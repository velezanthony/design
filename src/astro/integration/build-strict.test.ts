import { describe, expect, it } from 'vitest';
import { buildFailingCase } from '../../testing/case';

/* Reglas estrictas: cada caso es un proyecto mínimo cuya build DEBE fallar con código distinto de 0
   y un mensaje que diga qué archivo o campo arreglar. Comparten un esqueleto (`testing/case.ts`). */

const bilingual = { name: 'Strict', locales: ['en', 'es'] };
const page = (title: string, body = 'Texto.') => `# ${title}\n\n${body}\n`;

describe('reglas estrictas de la build', { timeout: 120_000 }, () => {
  it('sufijo de idioma no configurado: x.fr.md con locales en y es', async () => {
    const { code, output } = await buildFailingCase({
      name: 'unknown-suffix',
      config: bilingual,
      docs: { 'index.md': page('Home'), 'x.fr.md': page('X') },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('x.fr.md');
    expect(output).toContain('fr');
  });

  it('sin H1 ni title: nombra el archivo', async () => {
    const { code, output } = await buildFailingCase({
      name: 'no-title',
      config: bilingual,
      docs: { 'index.md': page('Home'), 'sin-titulo.md': 'Solo texto, sin encabezado.\n' },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('sin-titulo.md');
  });

  it('conflicto de translations en un grupo: nombra ambos archivos', async () => {
    const { code, output } = await buildFailingCase({
      name: 'policy-conflict',
      config: bilingual,
      docs: {
        'index.md': page('Home'),
        'a.md': `---\ntranslations: link\n---\n\n${page('A')}`,
        'a.es.md': `---\ntranslations: omit\n---\n\n${page('A es')}`,
      },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('a.md');
    expect(output).toContain('a.es.md');
  });

  it('ui con clave desconocida: nombra la clave', async () => {
    const { code, output } = await buildFailingCase({
      name: 'ui-unknown-key',
      config: { ...bilingual, ui: { es: { 'search.placeholdr': 'x' } } } as never,
      docs: { 'index.md': page('Home') },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('search.placeholdr');
  });

  it('enlace roto: nombra archivo y línea', async () => {
    const { code, output } = await buildFailingCase({
      name: 'broken-link',
      config: { name: 'Strict' },
      docs: { 'index.md': page('Home', '[roto](./no-existe.md)') },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('index.md:3');
    expect(output).toContain('no-existe.md');
  });

  it('id personalizado `{ #id }` no soportado: enlazarlo es un ancla rota', async () => {
    const { code, output } = await buildFailingCase({
      name: 'stale-custom-id',
      config: { name: 'Strict' },
      docs: {
        'index.md': page('Home', '## Uso { #usage }\n\nVer [uso](#usage).'),
      },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('index.md');
    expect(output).toContain('#usage');
  });

  it('enlace relativo a un external con ancla inexistente: nombra archivo y ancla', async () => {
    const { code, output } = await buildFailingCase({
      name: 'external-broken-anchor',
      config: { name: 'Strict', external: [{ slug: 'changelog', file: 'CHANGELOG.md' }] },
      docs: { 'index.md': page('Home', '[c](../../../CHANGELOG.md#no-existe)') },
      extra: { 'CHANGELOG.md': '# Changelog\n\n## Uno\n' },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('index.md:3');
    expect(output).toContain('#no-existe');
  });

  it('imagen SEO inexistente: nombra la página y el campo', async () => {
    const { code, output } = await buildFailingCase({
      name: 'missing-image',
      config: { name: 'Strict' },
      docs: { 'index.md': `---\nseo:\n  image:\n    src: /no-esta.png\n---\n\n${page('Home')}` },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('index.md');
    expect(output).toContain('seo.image.src');
    expect(output).toContain('/no-esta.png');
  });

  it('favicon de public/ inexistente: nombra el campo y el archivo', async () => {
    const { code, output } = await buildFailingCase({
      name: 'missing-favicon',
      config: { name: 'Strict', favicon: '/no-esta.svg' },
      docs: { 'index.md': page('Home') },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('favicon');
    expect(output).toContain('/no-esta.svg');
  });

  it('un fallo de integración (config inválida) se propaga: gtmId sin privacyUrl', async () => {
    const { code, output } = await buildFailingCase({
      name: 'integration-failure',
      config: { name: 'Strict', gtmId: 'GTM-X' },
      docs: { 'index.md': page('Home') },
    });
    expect(code).not.toBe(0);
    expect(output).toContain('privacyUrl');
  });
});
