import { describe, expect, it } from 'vitest';
import { defineMdastPlugin, type MdastPluginList } from 'satteri';
import { docFileURL, renderMarkdown } from '../../testing/markdown';
import { restoreDirectives } from './restore-directives';

function render(source: string, plugins: MdastPluginList = [restoreDirectives]) {
  return renderMarkdown(source, {
    fileURL: docFileURL('a.md'),
    features: { directive: true },
    plugins,
  });
}

describe('restoreDirectives', () => {
  it.each([
    ['x:y', 'Mira x:y aquí'],
    ['12:30', 'A las 12:30 en punto'],
    [':emoji:', 'Un :emoji: suelto'],
    ['http://a.b', 'Visita http://a.b ya'],
    [':cmd[label]{a=b}', 'Texto :cmd[label]{a=b} fin'],
  ])('devuelve %s como texto', async (literal, source) => {
    const html = await render(source);
    expect(html).toContain(literal);
    expect(html.replace(/<[^>]+>/g, '')).toBe(`${source}\n`);
  });

  it('devuelve como texto una directiva de hoja no reclamada', async () => {
    const html = await render('::leaf[txt]');
    expect(html.replace(/<[^>]+>/g, '').trim()).toBe('::leaf[txt]');
  });

  it('no toca una directiva que otro plugin ya reclamó', async () => {
    const claim = defineMdastPlugin({
      name: 'reclama',
      textDirective(node, ctx) {
        if (node.name === 'badge') {
          ctx.replaceNode(node, { type: 'html', value: '<b>reclamada</b>' });
        }
      },
    });
    const html = await render('Una :badge y 12:30', [claim, restoreDirectives]);
    expect(html).toContain('<b>reclamada</b>');
    expect(html).toContain('12:30');
  });
});
