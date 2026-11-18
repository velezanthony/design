import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { bootPanel } from './boot';

function page(html: string) {
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}
const clipboard = { writeText: vi.fn(async () => {}) };

describe('bootPanel', () => {
  it('muestra los botones de «Copiar para la IA» y de cada prompt (nacen ocultos)', () => {
    const htmlDocument = page(
      '<button data-report-open="site" hidden>IA</button><button data-copy-prompt="x" hidden>P</button>',
    );
    bootPanel({ htmlDocument, clipboard });
    expect(htmlDocument.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(false);
    expect(htmlDocument.querySelector('[data-copy-prompt]')!.hasAttribute('hidden')).toBe(false);
  });

  it('sin portapapeles no ofrece «Copiar para la IA»', () => {
    const htmlDocument = page('<button data-report-open="site" hidden>IA</button>');
    bootPanel({ htmlDocument, clipboard: undefined });
    expect(htmlDocument.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(true);
  });

  it('cablea el desplegable «Tipo de problema»: se cierra al pulsar fuera', () => {
    const htmlDocument = page(
      '<details data-popover open><summary>T</summary></details><p>fuera</p>',
    );
    bootPanel({ htmlDocument, clipboard });
    htmlDocument
      .querySelector('p')!
      .dispatchEvent(new htmlDocument.defaultView!.Event('pointerdown', { bubbles: true }));
    expect(htmlDocument.querySelector('details')!.hasAttribute('open')).toBe(false);
  });
});
