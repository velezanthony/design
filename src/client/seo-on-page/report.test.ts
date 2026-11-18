import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { initReport } from './report';

const PAGE = `
  <button data-report-open="site" hidden>Copiar para la IA</button>
  <button data-report-open="filter" hidden>copiarlas</button>
  <button data-copy-prompt="Arregla el título" data-copied="Copiado" data-failed="No se pudo" hidden>
    <span data-label>Copiar prompt</span>
  </button>
  <dialog data-report-dialog data-copied="Copiado" data-failed="No se pudo copiar">
    <button data-report-close>Cerrar</button>
    <input type="radio" name="s" value="site" data-report-scope checked>
    <input type="radio" name="s" value="filter" data-report-scope>
    <input type="radio" name="s" value="page" data-report-scope disabled>
    <input type="radio" name="s" value="locale" data-report-scope>
    <select data-report-locale><option value="en" selected>en</option><option value="es">es</option></select>
    <input type="checkbox" data-report-json>
    <pre data-report-preview></pre>
    <span data-report-meta></span>
    <span data-report-status></span>
    <button data-report-copy>Copiar</button>
    <textarea hidden data-report-text="site" data-size-plain="3 líneas" data-size-json="9 líneas">MD site</textarea>
    <textarea hidden data-report-json-text="site">JSON site</textarea>
    <textarea hidden data-report-text="filter" data-size-plain="f1" data-size-json="f2">MD filter</textarea>
    <textarea hidden data-report-json-text="filter">JSON filter</textarea>
    <textarea hidden data-report-text="locale:en" data-size-plain="e1" data-size-json="e2">MD en</textarea>
    <textarea hidden data-report-json-text="locale:en">JSON en</textarea>
    <textarea hidden data-report-text="locale:es" data-size-plain="s1" data-size-json="s2">MD es</textarea>
    <textarea hidden data-report-json-text="locale:es">JSON es</textarea>
  </dialog>`;

function setup({
  clipboard = { writeText: vi.fn().mockResolvedValue(undefined) } as Pick<
    Clipboard,
    'writeText'
  > | null,
  html = PAGE,
  showModal = true,
} = {}) {
  const { document, window } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const dialog = document.querySelector<HTMLDialogElement>('[data-report-dialog]');
  const modal = vi.fn();
  if (dialog && showModal) dialog.showModal = modal;
  const scheduled: (() => void)[] = [];
  initReport(document, {
    clipboard: clipboard ?? undefined,
    schedule: (callback) => void scheduled.push(callback),
  });
  function query<T extends Element = HTMLElement>(selector: string) {
    return document.querySelector<T>(selector)!;
  }
  function click(element: Element) {
    return element.dispatchEvent(new window.Event('click', { bubbles: true }));
  }
  function change(element: Element) {
    return element.dispatchEvent(new window.Event('change', { bubbles: true }));
  }
  /** linkedom no desmarca los demás radios del grupo ni deja asignar `select.value`: se hace a mano. */
  function choose(value: string) {
    for (const radio of document.querySelectorAll<HTMLInputElement>('[data-report-scope]')) {
      radio.checked = radio.value === value;
    }
    change(query('[data-report-scope][value="' + value + '"]'));
  }
  function pick(locale: string) {
    const select = query<HTMLSelectElement>('[data-report-locale]');
    for (const option of select.querySelectorAll('option')) {
      if (option.value === locale) option.setAttribute('selected', '');
      else option.removeAttribute('selected');
    }
    change(select);
  }
  function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { document, dialog, modal, scheduled, $: query, click, change, choose, pick, flush };
}

describe('initReport: sin portapapeles', () => {
  it('los botones se quedan ocultos: uno que no puede funcionar es peor que ninguno', () => {
    const { $ } = setup({ clipboard: null });
    expect($('[data-report-open="site"]').hasAttribute('hidden')).toBe(true);
    expect($('[data-copy-prompt]').hasAttribute('hidden')).toBe(true);
  });
});

describe('initReport: botones', () => {
  it('con portapapeles muestra los botones que sin JavaScript no funcionarían', () => {
    const { $ } = setup();
    expect($('[data-report-open="site"]').hasAttribute('hidden')).toBe(false);
    expect($('[data-copy-prompt]').hasAttribute('hidden')).toBe(false);
  });

  it('una página sin diálogo ni botones no rompe nada', () => {
    expect(() => setup({ html: '<p>nada</p>' })).not.toThrow();
  });
});

describe('initReport: abrir el diálogo', () => {
  it('abre como modal con el alcance que pide el botón y su texto', () => {
    const { $, click, modal } = setup();
    click($('[data-report-open="filter"]'));
    expect(modal).toHaveBeenCalledTimes(1);
    expect($<HTMLInputElement>('[data-report-scope][value="filter"]').checked).toBe(true);
    expect($('[data-report-preview]').textContent).toBe('MD filter');
    expect($('[data-report-meta]').textContent).toBe('f1');
  });

  it('si el alcance pedido está deshabilitado, usa el primero que se puede elegir', () => {
    const { $, click } = setup();
    $<HTMLInputElement>('[data-report-scope][value="filter"]').disabled = true;
    click($('[data-report-open="filter"]'));
    expect($('[data-report-preview]').textContent).toBe('MD site');
  });

  it('sin `showModal` (un entorno viejo) lo abre poniendo `open`', () => {
    const { $, click, dialog } = setup({ showModal: false });
    click($('[data-report-open="site"]'));
    expect(dialog?.hasAttribute('open')).toBe(true);
  });
});

describe('initReport: cambiar lo que se ve', () => {
  it('elegir otro alcance cambia el texto y el tamaño', () => {
    const { $, click, choose } = setup();
    click($('[data-report-open="site"]'));
    choose('filter');
    expect($('[data-report-preview]').textContent).toBe('MD filter');
    expect($('[data-report-meta]').textContent).toBe('f1');
  });

  it('«Un idioma» enseña el informe del idioma elegido en el selector', () => {
    const { $, click, choose, pick } = setup();
    click($('[data-report-open="site"]'));
    choose('locale');
    expect($('[data-report-preview]').textContent).toBe('MD en');
    pick('es');
    expect($('[data-report-preview]').textContent).toBe('MD es');
  });

  it('tocar el selector de idioma elige también el alcance «Un idioma»', () => {
    const { $, click, pick } = setup();
    click($('[data-report-open="site"]'));
    pick('es');
    expect($<HTMLInputElement>('[data-report-scope][value="locale"]').checked).toBe(true);
    expect($('[data-report-preview]').textContent).toBe('MD es');
  });

  it('la casilla JSON añade el bloque tras una línea en blanco y cambia el tamaño', () => {
    const { $, click, change } = setup();
    click($('[data-report-open="site"]'));
    const json = $<HTMLInputElement>('[data-report-json]');
    json.checked = true;
    change(json);
    expect($('[data-report-preview]').textContent).toBe('MD site\n\nJSON site');
    expect($('[data-report-meta]').textContent).toBe('9 líneas');
    json.checked = false;
    change(json);
    expect($('[data-report-preview]').textContent).toBe('MD site');
    expect($('[data-report-meta]').textContent).toBe('3 líneas');
  });

  it('un cambio en cualquier otro campo de la página no toca el diálogo', () => {
    const { $, click, change, document } = setup({ html: `${PAGE}<input id="x">` });
    click($('[data-report-open="site"]'));
    $('[data-report-preview]').textContent = 'intacto';
    change(document.getElementById('x')!);
    expect($('[data-report-preview]').textContent).toBe('intacto');
  });
});

describe('initReport: copiar', () => {
  it('copia lo que se ve (con el JSON si está marcado) y confirma «Copiado»', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { $, click, change, flush } = setup({ clipboard: { writeText } });
    click($('[data-report-open="site"]'));
    const json = $<HTMLInputElement>('[data-report-json]');
    json.checked = true;
    change(json);
    click($('[data-report-copy]'));
    await flush();
    expect(writeText).toHaveBeenCalledWith('MD site\n\nJSON site');
    expect($('[data-report-status]').textContent).toBe('Copiado');
  });

  it('si el portapapeles falla lo dice, para que se seleccione el texto a mano', async () => {
    const { $, click, flush } = setup({
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    click($('[data-report-open="site"]'));
    click($('[data-report-copy]'));
    await flush();
    expect($('[data-report-status]').textContent).toBe('No se pudo copiar');
  });

  it('la confirmación se retira sola, y también al cambiar de alcance', async () => {
    const { $, click, choose, flush, scheduled } = setup();
    click($('[data-report-open="site"]'));
    click($('[data-report-copy]'));
    await flush();
    scheduled.forEach((callback) => callback());
    expect($('[data-report-status]').textContent).toBe('');
    click($('[data-report-copy]'));
    await flush();
    choose('filter');
    expect($('[data-report-status]').textContent).toBe('');
  });
});

describe('initReport: cerrar', () => {
  it('el botón de cerrar cierra el diálogo', () => {
    const { $, click, dialog } = setup();
    const close = vi.fn();
    dialog!.close = close;
    click($('[data-report-close]'));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('pulsar en el fondo (en el propio diálogo) lo cierra, pero no pulsar dentro', () => {
    const { $, click, dialog } = setup();
    const close = vi.fn();
    dialog!.close = close;
    click($('[data-report-preview]'));
    expect(close).not.toHaveBeenCalled();
    click(dialog!);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('sin `close` (un entorno viejo) quita `open`', () => {
    const { $, click, dialog } = setup({ showModal: false });
    click($('[data-report-open="site"]'));
    click($('[data-report-close]'));
    expect(dialog?.hasAttribute('open')).toBe(false);
  });
});

describe('initReport: «Copiar prompt»', () => {
  it('copia el prompt del botón y lo confirma en su etiqueta', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const { $, click, flush } = setup({ clipboard: { writeText } });
    click($('[data-copy-prompt]'));
    await flush();
    expect(writeText).toHaveBeenCalledWith('Arregla el título');
    expect($('[data-label]').textContent).toBe('Copiado');
  });

  it('si falla lo dice en la etiqueta', async () => {
    const { $, click, flush } = setup({
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('no')) },
    });
    click($('[data-copy-prompt]'));
    await flush();
    expect($('[data-label]').textContent).toBe('No se pudo');
  });

  it('la etiqueta vuelve a la de siempre pasado un rato', async () => {
    const { $, click, flush, scheduled } = setup();
    click($('[data-copy-prompt]'));
    await flush();
    scheduled.forEach((callback) => callback());
    expect($('[data-label]').textContent).toBe('Copiar prompt');
  });

  it('dos pulsaciones seguidas no dejan «Copiado» como etiqueta de siempre', async () => {
    const { $, click, flush, scheduled } = setup();
    click($('[data-copy-prompt]'));
    await flush();
    click($('[data-copy-prompt]'));
    await flush();
    scheduled.forEach((callback) => callback());
    expect($('[data-label]').textContent).toBe('Copiar prompt');
  });
});
