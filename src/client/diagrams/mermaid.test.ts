import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import {
  accessibleTitle,
  initMermaid,
  legibleMinWidth,
  mermaidConfig,
  mermaidThemeVariables,
  type MermaidApi,
} from './mermaid';

const TOKENS: Record<string, string> = {
  '--color-canvas': '#faf9f6',
  '--color-raised': '#f0ede6',
  '--color-ink': '#1d2626',
  '--color-accent-line': '#367c75',
  '--color-accent-soft': '#e2efec',
  '--color-rule': '#d9d3c7',
  '--font-sans': 'IBM Plex Sans, sans-serif',
};
function readToken(name: string) {
  return TOKENS[name] ?? '';
}

describe('mermaidThemeVariables', () => {
  it('toma los colores y la fuente de los tokens del tema', () => {
    const vars = mermaidThemeVariables(readToken, false);
    expect(vars).toMatchObject({
      background: '#faf9f6',
      primaryColor: '#e2efec',
      primaryTextColor: '#1d2626',
      primaryBorderColor: '#367c75',
      lineColor: '#1d2626',
      clusterBorder: '#d9d3c7',
      fontFamily: 'IBM Plex Sans, sans-serif',
      darkMode: false,
    });
  });

  it('recorta los espacios que deja el CSS alrededor del valor', () => {
    expect(mermaidThemeVariables(() => '  #fff ', true)).toMatchObject({
      background: '#fff',
      darkMode: true,
    });
  });
});

describe('mermaidConfig', () => {
  it('no se ejecuta sola, va en modo estricto y parte del tema base', () => {
    expect(mermaidConfig(readToken, false)).toMatchObject({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
    });
  });
});

describe('accessibleTitle', () => {
  it('lee accTitle del código fuente', () => {
    expect(accessibleTitle('graph TD\n  accTitle: Flujo de pedido\n  A-->B')).toBe(
      'Flujo de pedido',
    );
  });

  it('es undefined sin accTitle', () => {
    expect(accessibleTitle('graph TD\n  A-->B')).toBeUndefined();
  });
});

describe('legibleMinWidth', () => {
  it('es el 75 % del ancho natural del viewBox: el texto no baja de 12px', () => {
    expect(legibleMinWidth('-50 -10 2000 1596')).toBe(1500);
  });

  it('redondea hacia arriba', () => {
    expect(legibleMinWidth('0 0 1872.65 222')).toBe(1405);
  });

  it('es undefined sin un viewBox utilizable', () => {
    expect(legibleMinWidth(null)).toBeUndefined();
    expect(legibleMinWidth('0 0 abc 10')).toBeUndefined();
    expect(legibleMinWidth('0 0 0 10')).toBeUndefined();
  });
});

const viewerLabels = {
  expand: 'Open full screen',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Fit',
  close: 'Close',
};

describe('initMermaid', () => {
  function block(source: string) {
    return `<div class="docs-mermaid" data-mermaid><pre><code>${source}</code></pre></div>`;
  }

  function setup(
    body: string,
    render: MermaidApi['render'] = async () => ({ svg: '<svg></svg>' }),
    withViewer = true,
  ) {
    const { document } = parseHTML(`<!doctype html><html><body><main>${body}</main></body></html>`);
    const api: MermaidApi = { initialize: vi.fn(), render: vi.fn(render) };
    const importer = vi.fn(async () => ({ default: api }));
    const listeners: (() => void)[] = [];
    const system = {
      matches: false,
      addEventListener: (_: 'change', cb: () => void) => listeners.push(cb),
    };
    const warn = vi.fn();
    const ready = initMermaid(document, {
      importer,
      readToken,
      system,
      label: 'Diagram',
      viewerLabels: withViewer ? viewerLabels : undefined,
      warn,
    });
    function box() {
      return document.querySelector<HTMLElement>('.docs-mermaid')!;
    }
    return { document, api, importer, system, listeners, warn, ready, box };
  }

  it('sin diagramas no carga mermaid', async () => {
    const { importer, ready } = setup('<p>hola</p>');
    await ready;
    expect(importer).not.toHaveBeenCalled();
  });

  it('con diagramas lo carga una sola vez y lo configura', async () => {
    const { importer, api, ready } = setup(block('A--&gt;B') + block('C--&gt;D'));
    await ready;
    expect(importer).toHaveBeenCalledTimes(1);
    expect(api.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: 'strict', theme: 'base' }),
    );
    expect(api.render).toHaveBeenCalledTimes(2);
  });

  it('renderiza el código fuente tal cual, con su sangría', async () => {
    const { api, ready } = setup(block('mindmap\n  root\n    hijo'));
    await ready;
    expect(vi.mocked(api.render).mock.calls[0]![1]).toBe('mindmap\n  root\n    hijo');
  });

  it('pone el SVG, oculta el código y da al diagrama rol y nombre', async () => {
    const { box, ready } = setup(block('A--&gt;B'), async () => ({ svg: '<svg id="x"></svg>' }));
    await ready;
    expect(box().getAttribute('data-state')).toBe('rendered');
    const figure = box().querySelector('.docs-mermaid-figure')!;
    expect(figure.getAttribute('role')).toBe('img');
    expect(figure.getAttribute('aria-label')).toBe('Diagram');
    expect(figure.querySelector('svg#x')).not.toBeNull();
  });

  it('un diagrama ancho no se encoge por debajo de lo legible: se desplaza', async () => {
    const { box, ready } = setup(block('A--&gt;B'), async () => ({
      svg: '<svg viewBox="0 0 2000 400" style="max-width: 2000px;"></svg>',
    }));
    await ready;
    const svg = box().querySelector<SVGElement>('.docs-mermaid-figure svg')!;
    expect(svg.style.minWidth).toBe('1500px');
  });

  it('el accTitle del diagrama manda sobre la etiqueta genérica', async () => {
    const { box, ready } = setup(block('graph TD\n  accTitle: Flujo de pedido\n  A--&gt;B'));
    await ready;
    expect(box().querySelector('.docs-mermaid-figure')!.getAttribute('aria-label')).toBe(
      'Flujo de pedido',
    );
  });

  it('si un diagrama falla deja el código visible, avisa y sigue con los demás', async () => {
    let calls = 0;
    const { document, warn, ready } = setup(block('roto') + block('bien'), async () => {
      if (++calls === 1) throw new Error('Parse error');
      return { svg: '<svg></svg>' };
    });
    await expect(ready).resolves.toBeUndefined();
    const [first, second] = document.querySelectorAll('.docs-mermaid');
    expect(first!.getAttribute('data-state')).toBe('error');
    expect(first!.querySelector('.docs-mermaid-figure')).toBeNull();
    expect(second!.getAttribute('data-state')).toBe('rendered');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('si mermaid no se puede cargar avisa y deja las páginas intactas', async () => {
    const { document } = parseHTML(`<html><body>${block('A')}</body></html>`);
    const warn = vi.fn();
    const importer = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(
      initMermaid(document, {
        importer,
        readToken,
        system: { matches: false, addEventListener() {} },
        warn,
      }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.docs-mermaid')!.hasAttribute('data-state')).toBe(false);
  });

  it('vuelve a dibujar con el código original cuando cambia data-theme', async () => {
    const { document, api, ready } = setup(block('A--&gt;B'));
    await ready;
    document.documentElement.dataset.theme = 'dark';
    await vi.waitFor(() => expect(api.render).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.render).mock.calls[1]![1]).toBe('A-->B');
    expect(vi.mocked(api.initialize).mock.calls[1]![0]).toMatchObject({
      themeVariables: { darkMode: true },
    });
    expect(document.querySelectorAll('.docs-mermaid-figure')).toHaveLength(1);
  });

  it('vuelve a dibujar cuando cambia el esquema del sistema', async () => {
    const { api, system, listeners, ready } = setup(block('A--&gt;B'));
    await ready;
    system.matches = true;
    for (const cb of listeners) cb();
    await vi.waitFor(() => expect(api.render).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.initialize).mock.calls[1]![0]).toMatchObject({
      themeVariables: { darkMode: true },
    });
  });

  it('un diagrama ya dibujado no se duplica si se inicializa otra vez', async () => {
    const { document, api, ready } = setup(block('A--&gt;B'));
    await ready;
    await initMermaid(document, {
      importer: async () => ({ default: api }),
      readToken,
      system: { matches: false, addEventListener() {} },
    });
    expect(document.querySelectorAll('.docs-mermaid-figure')).toHaveLength(1);
  });
  describe('pantalla completa', () => {
    const svg = '<svg id="docs-mermaid-0" viewBox="0 0 400 200"><g></g></svg>';

    /** Espera al dibujado y sustituye lo que linkedom no implementa de `<dialog>`. */
    async function drawn(body = block('A--&gt;B'), withViewer = true) {
      const ctx = setup(body, async () => ({ svg }), withViewer);
      await ctx.ready;
      const dialog = ctx.document.querySelector<HTMLDialogElement>('dialog');
      if (dialog) {
        Object.assign(dialog, {
          showModal: vi.fn(() => dialog.setAttribute('open', '')),
          close: vi.fn(() => {
            dialog.removeAttribute('open');
            dialog.dispatchEvent(new ctx.document.defaultView!.Event('close'));
          }),
        });
      }
      const expand = ctx.document.querySelector<HTMLButtonElement>('.docs-expand');
      if (expand) expand.focus = vi.fn();
      return { ...ctx, dialog: dialog!, expand: expand! };
    }

    it('el SVG queda dentro del marco de código, tras el pre y con su botón de ampliar', async () => {
      const { box, expand } = await drawn();
      const frame = box().querySelector('.docs-code')!;
      expect(frame.querySelector(':scope > pre')).not.toBeNull();
      expect(frame.querySelector(':scope > .docs-mermaid-figure svg')).not.toBeNull();
      expect(expand.parentElement).toBe(frame);
      expect(expand.getAttribute('type')).toBe('button');
      expect(expand.getAttribute('aria-label')).toBe('Open full screen');
    });

    it('reutiliza el marco que ya puso el botón de copiar en vez de envolver dos veces', async () => {
      const { document, api, ready } = setup(
        '<div class="docs-mermaid" data-mermaid><div class="docs-code"><pre class="astro-code"><code>A--&gt;B</code></pre><button class="docs-copy">Copy</button></div></div>',
      );
      await ready;
      expect(document.querySelectorAll('.docs-code')).toHaveLength(1);
      expect(document.querySelector('.docs-code > .docs-mermaid-figure')).not.toBeNull();
      expect(api.render).toHaveBeenCalledOnce();
    });

    it('al pulsarlo abre el visor con una copia del SVG y el nombre del diagrama', async () => {
      const { document, dialog, expand } = await drawn(
        block('graph TD\n  accTitle: Flujo de pedido\n  A--&gt;B'),
      );
      const event = new document.defaultView!.Event('click', { bubbles: true });
      expand.dispatchEvent(event);
      expect(dialog.showModal).toHaveBeenCalledOnce();
      expect(dialog.getAttribute('aria-label')).toBe('Flujo de pedido');
      const clone = dialog.querySelector('.docs-diagram-canvas svg')!;
      expect(clone.getAttribute('id')).toBe('docs-mermaid-0');
      expect(document.querySelector('.docs-mermaid-figure svg')).not.toBe(clone);
    });

    it('el botón no se duplica cuando el diagrama se vuelve a dibujar', async () => {
      const { document, api, expand } = await drawn();
      document.documentElement.dataset.theme = 'dark';
      await vi.waitFor(() => expect(api.render).toHaveBeenCalledTimes(2));
      expect(document.querySelectorAll('.docs-expand')).toHaveLength(1);
      expect(document.querySelector('.docs-expand')).toBe(expand);
    });

    it('si cambia el tema con el visor abierto lo cierra: el clon tendría los colores viejos', async () => {
      const { document, api, dialog, expand } = await drawn();
      expand.dispatchEvent(new document.defaultView!.Event('click', { bubbles: true }));
      expect(dialog.hasAttribute('open')).toBe(true);
      document.documentElement.dataset.theme = 'dark';
      await vi.waitFor(() => expect(api.render).toHaveBeenCalledTimes(2));
      expect(dialog.hasAttribute('open')).toBe(false);
    });

    it('sin textos del visor no hay botón ni diálogo', async () => {
      const { document } = await drawn(block('A--&gt;B'), false);
      expect(document.querySelector('.docs-expand')).toBeNull();
      expect(document.querySelector('dialog')).toBeNull();
    });

    it('un diagrama que falla no tiene botón de ampliar', async () => {
      const { document, ready } = setup(block('roto'), async () => {
        throw new Error('Parse error');
      });
      await ready;
      expect(document.querySelector('.docs-expand')).toBeNull();
    });
  });
});
