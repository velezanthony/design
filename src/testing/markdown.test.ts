import { describe, expect, it } from 'vitest';
import { docFileURL, externalFileURL, nonDocFileURL, renderMarkdown } from './markdown';

describe('URLs de archivo de prueba', () => {
  it('docFileURL cuelga de src/content/docs', () => {
    expect(docFileURL('guide.es.md').pathname).toMatch(/\/src\/content\/docs\/guide\.es\.md$/);
  });

  it('externalFileURL queda fuera de src/content/docs', () => {
    const url = externalFileURL('CHANGELOG.md');
    expect(url.pathname).toMatch(/\/CHANGELOG\.md$/);
    expect(url.pathname).not.toContain('/src/content/docs/');
  });

  it('nonDocFileURL queda dentro del proyecto pero fuera de los docs', () => {
    const url = nonDocFileURL('page.md');
    expect(url.pathname).toContain('/src/');
    expect(url.pathname).not.toContain('/src/content/docs/');
  });

  it('las tres devuelven URL file:', () => {
    for (const url of [docFileURL('a.md'), externalFileURL('a.md'), nonDocFileURL('a.md')]) {
      expect(url.protocol).toBe('file:');
    }
  });
});

describe('renderMarkdown', () => {
  it('renderiza Markdown a HTML', async () => {
    expect(await renderMarkdown('**hola**', { fileURL: docFileURL('a.md') })).toBe(
      '<p><strong>hola</strong></p>\n',
    );
  });

  it('pasa el fileURL a los plugins (factoría) y las directivas se activan con features', async () => {
    const seen: string[] = [];
    const html = await renderMarkdown('x:y', {
      fileURL: docFileURL('a.es.md'),
      features: { directive: true },
      plugins: [
        (ctx) => {
          seen.push(ctx.fileURL?.pathname ?? 'sin-url');
          return { name: 'espía', textDirective() {} };
        },
      ],
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/a\.es\.md$/);
    expect(html).toContain('x');
  });
});
