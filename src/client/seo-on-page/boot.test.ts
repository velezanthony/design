import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { bootPanel } from './boot';

function page(html: string) {
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;
}
const clipboard = { writeText: vi.fn(async () => {}) };

describe('bootPanel', () => {
  it('muestra los botones de «Copiar para la IA» y de cada prompt (nacen ocultos)', () => {
    const doc = page(
      '<button data-report-open="site" hidden>IA</button><button data-copy-prompt="x" hidden>P</button>',
    );
    bootPanel({ doc, clipboard });
    expect(doc.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(false);
    expect(doc.querySelector('[data-copy-prompt]')!.hasAttribute('hidden')).toBe(false);
  });

  it('sin portapapeles no ofrece «Copiar para la IA»', () => {
    const doc = page('<button data-report-open="site" hidden>IA</button>');
    bootPanel({ doc, clipboard: undefined });
    expect(doc.querySelector('[data-report-open]')!.hasAttribute('hidden')).toBe(true);
  });

  it('cablea el desplegable «Tipo de problema»: se cierra al pulsar fuera', () => {
    const doc = page('<details data-popover open><summary>T</summary></details><p>fuera</p>');
    bootPanel({ doc, clipboard });
    doc
      .querySelector('p')!
      .dispatchEvent(new doc.defaultView!.Event('pointerdown', { bubbles: true }));
    expect(doc.querySelector('details')!.hasAttribute('open')).toBe(false);
  });
});
