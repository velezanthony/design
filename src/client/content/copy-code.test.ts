import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { codeText, initCopyCode } from './copy-code';

function page(body: string) {
  return parseHTML(`<!doctype html><html><body>${body}</body></html>`).document;
}

describe('codeText', () => {
  it('es el texto del bloque sin el salto final que añade el resaltado', () => {
    const doc = page('<pre><code><span>npm</span> <span>i</span>\n</code></pre>');
    expect(codeText(doc.querySelector('pre')!)).toBe('npm i');
  });

  it('conserva las líneas internas y la sangría', () => {
    const doc = page('<pre><code>a\n  b\n</code></pre>');
    expect(codeText(doc.querySelector('pre')!)).toBe('a\n  b');
  });
});

describe('initCopyCode', () => {
  const labels = { copy: 'Copiar', copied: 'Copiado', failed: 'Error al copiar' };

  function setup(
    writeText: (text: string) => Promise<void> = () => Promise.resolve(),
    body = '<pre class="astro-code"><code>npm i\n</code></pre>',
  ) {
    const document = page(body);
    const timers: (() => void)[] = [];
    initCopyCode(document, {
      clipboard: { writeText },
      labels,
      resetAfterMs: 1500,
      schedule: (cb) => void timers.push(cb),
    });
    function button() {
      return document.querySelector<HTMLButtonElement>('button.docs-copy');
    }
    function click() {
      return button()!.dispatchEvent(new document.defaultView!.Event('click'));
    }
    function flush() {
      return new Promise((resolve) => setTimeout(resolve, 0));
    }
    return { document, button, click, flush, timers };
  }

  it('envuelve cada bloque con un botón de copiar etiquetado', () => {
    const { document, button } = setup();
    const wrapper = document.querySelector('.docs-code')!;
    expect(wrapper.querySelector('pre')).not.toBeNull();
    expect(button()!.parentElement).toBe(wrapper);
    expect(button()!.getAttribute('type')).toBe('button');
    expect(button()!.getAttribute('aria-label')).toBe('Copiar');
    expect(button()!.textContent).toBe('Copiar');
  });

  it('el botón queda fuera del texto copiable', () => {
    const { document } = setup();
    expect(codeText(document.querySelector('pre')!)).toBe('npm i');
  });

  it('copia el texto del bloque y confirma', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const { button, click, flush } = setup(writeText);
    click();
    await flush();
    expect(writeText).toHaveBeenCalledWith('npm i');
    expect(button()!.textContent).toBe('Copiado');
    expect(button()!.getAttribute('data-state')).toBe('copied');
  });

  it('vuelve a la etiqueta inicial pasado el tiempo', async () => {
    const { button, click, flush, timers } = setup();
    click();
    await flush();
    expect(timers).toHaveLength(1);
    timers[0]!();
    expect(button()!.textContent).toBe('Copiar');
    expect(button()!.hasAttribute('data-state')).toBe(false);
  });

  it('si el portapapeles rechaza, lo dice sin lanzar', async () => {
    const { button, click, flush } = setup(() => Promise.reject(new Error('denied')));
    click();
    await flush();
    expect(button()!.textContent).toBe('Error al copiar');
    expect(button()!.getAttribute('data-state')).toBe('error');
  });

  it('sin portapapeles no añade botones', () => {
    const document = page('<pre class="astro-code"><code>x</code></pre>');
    initCopyCode(document, { clipboard: undefined, labels });
    expect(document.querySelector('button')).toBeNull();
  });

  it('no envuelve dos veces un bloque ya mejorado', () => {
    const { document } = setup();
    initCopyCode(document, { clipboard: { writeText: () => Promise.resolve() }, labels });
    expect(document.querySelectorAll('button.docs-copy')).toHaveLength(1);
    expect(document.querySelectorAll('.docs-code')).toHaveLength(1);
  });

  it('trata cada bloque por separado', () => {
    const { document } = setup(
      undefined,
      '<pre class="astro-code"><code>a</code></pre><pre class="astro-code"><code>b</code></pre>',
    );
    expect(document.querySelectorAll('button.docs-copy')).toHaveLength(2);
  });

  it('ignora los pre que no son bloques de código resaltados', () => {
    const { document } = setup(undefined, '<pre>plano</pre>');
    expect(document.querySelector('button')).toBeNull();
  });

  it('en un diagrama de Mermaid copia el código original, aunque el SVG ya esté dibujado', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const { document } = parseHTML(
      '<div class="docs-mermaid" data-mermaid><pre class="astro-code" data-language="mermaid"><code>graph TD\n  A--&gt;B</code></pre>' +
        '<div class="docs-mermaid-figure"><svg><text>A</text><text>B</text></svg></div></div>',
    );
    initCopyCode(document, { clipboard: { writeText }, labels });
    const frame = document.querySelector('.docs-mermaid > .docs-code')!;
    expect(frame.querySelector('pre')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('button.docs-copy')!.click();
    expect(writeText).toHaveBeenCalledWith('graph TD\n  A-->B');
  });
});
