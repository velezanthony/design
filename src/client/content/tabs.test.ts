import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';

import { initTabs, nextTabIndex } from './tabs';

describe('nextTabIndex', () => {
  it.each([
    ['ArrowRight', 0, 3, 1],
    ['ArrowRight', 2, 3, 0],
    ['ArrowLeft', 1, 3, 0],
    ['ArrowLeft', 0, 3, 2],
    ['Home', 2, 3, 0],
    ['End', 0, 3, 2],
  ])('%s desde %i de %i va a %i', (key, current, count, expected) => {
    expect(nextTabIndex(key, current, count)).toBe(expected);
  });

  it.each(['Enter', 'a', 'ArrowDown', 'Tab'])('ignora %s', (key) => {
    expect(nextTabIndex(key, 0, 3)).toBeUndefined();
  });

  it('no mueve nada sin pestañas', () => {
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeUndefined();
  });
});

describe('initTabs', () => {
  function group(labels: string[]) {
    return `<div class="docs-tabs">${labels
      .map(
        (label) =>
          `<div class="docs-tab-panel"><div class="docs-tab-label">${label}</div><p>Contenido ${label}</p></div>`,
      )
      .join('')}</div>`;
  }

  function setup(body = group(['npm', 'pnpm', 'yarn'])) {
    const { document } = parseHTML(`<!doctype html><html><body>${body}</body></html>`);
    initTabs(document);
    const root = document.querySelector('.docs-tabs')!;
    function tabs() {
      return [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    }
    function panels() {
      return [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
    }
    function event(type: string, props: object = {}) {
      return Object.assign(new document.defaultView!.Event(type, { cancelable: true }), props);
    }
    function press(index: number, key: string) {
      const e = event('keydown', { key });
      tabs()[index]!.dispatchEvent(e);
      return e;
    }
    return { document, root, tabs, panels, event, press };
  }

  it('construye tablist, tab y tabpanel con sus relaciones aria', () => {
    const { root, tabs, panels } = setup();
    const list = root.querySelector('[role="tablist"]')!;
    expect(list.classList.contains('docs-tablist')).toBe(true);
    expect(root.firstElementChild).toBe(list);
    expect(tabs().map((t) => t.textContent)).toEqual(['npm', 'pnpm', 'yarn']);
    expect(panels()).toHaveLength(3);
    tabs().forEach((tab, i) => {
      expect(tab.classList.contains('docs-tab')).toBe(true);
      expect(tab.getAttribute('type')).toBe('button');
      expect(tab.getAttribute('aria-controls')).toBe(panels()[i]!.id);
      expect(panels()[i]!.getAttribute('aria-labelledby')).toBe(tab.id);
    });
  });

  it('marca el grupo como mejorado y muestra solo la primera pestaña', () => {
    const { root, tabs, panels } = setup();
    expect(root.hasAttribute('data-enhanced')).toBe(true);
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(panels().map((p) => p.hasAttribute('hidden'))).toEqual([false, true, true]);
  });

  it('seleccionar con clic muestra su panel', () => {
    const { tabs, panels, event } = setup();
    tabs()[1]!.dispatchEvent(event('click'));
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(panels().map((p) => p.hasAttribute('hidden'))).toEqual([true, false, true]);
  });

  it('ArrowRight selecciona la siguiente pestaña, enfoca y muestra su panel', () => {
    const { tabs, panels, press } = setup();
    const focus = tabs().map((t) => (t.focus = vi.fn()));
    const e = press(0, 'ArrowRight');
    expect(tabs()[1]!.getAttribute('aria-selected')).toBe('true');
    expect(panels()[1]!.hasAttribute('hidden')).toBe(false);
    expect(panels()[0]!.hasAttribute('hidden')).toBe(true);
    expect(focus[1]).toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
  });

  it('las flechas dan la vuelta y Home/End van a los extremos', () => {
    const { tabs, press } = setup();
    tabs().forEach((t) => (t.focus = vi.fn()));
    press(0, 'ArrowLeft');
    expect(tabs()[2]!.getAttribute('aria-selected')).toBe('true');
    press(2, 'ArrowRight');
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
    press(0, 'End');
    expect(tabs()[2]!.getAttribute('aria-selected')).toBe('true');
    press(2, 'Home');
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('una tecla ajena no cambia la selección ni se cancela', () => {
    const { tabs, press } = setup();
    const e = press(0, 'a');
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
    expect(e.defaultPrevented).toBe(false);
  });

  it('los grupos son independientes y sus ids no chocan', () => {
    const { document, tabs, event } = setup(group(['a', 'b']) + group(['c', 'd']));
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    tabs()[1]!.dispatchEvent(event('click'));
    expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'true',
      'false',
    ]);
  });

  it('no mejora dos veces un grupo ya mejorado', () => {
    const { document, tabs } = setup();
    initTabs(document);
    expect(tabs()).toHaveLength(3);
    expect(document.querySelectorAll('[role="tablist"]')).toHaveLength(1);
  });

  it('deja intacto un grupo sin paneles', () => {
    const { document } = setup('<div class="docs-tabs"></div>');
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    expect(document.querySelector('.docs-tabs')!.hasAttribute('data-enhanced')).toBe(false);
  });

  it('usa un texto de reserva si un panel no tiene etiqueta', () => {
    const { tabs } = setup('<div class="docs-tabs"><div class="docs-tab-panel">x</div></div>');
    expect(tabs()[0]!.textContent).toBe('1');
  });

  describe('con View Transitions', () => {
    function enhanced(api: boolean, reduced = false) {
      const { document } = parseHTML(
        `<!doctype html><html><body>${group(['a', 'b'])}</body></html>`,
      );
      const root = document.querySelector<HTMLElement>('.docs-tabs')!;
      const seen: string[] = [];
      const start = vi.fn((update: () => void) => {
        seen.push(root.style.getPropertyValue('view-transition-name'));
        update();
        return { finished: Promise.resolve() };
      });
      if (api) Object.assign(document, { startViewTransition: start });
      initTabs(document, { matches: reduced });
      const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
      function click(i: number) {
        return tabs[i]!.dispatchEvent(new document.defaultView!.Event('click'));
      }
      return { root, tabs, click, start, seen };
    }

    it('cambia de pestaña dentro de la transición, con el grupo nombrado solo mientras dura', async () => {
      const { root, tabs, click, start, seen } = enhanced(true);
      click(1);
      expect(start).toHaveBeenCalledOnce();
      expect(seen).toEqual(['docs-tabs']);
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
      await new Promise((resolve) => setTimeout(resolve));
      expect(root.style.getPropertyValue('view-transition-name')).toBe('');
    });

    it('sin la API cambia igual', () => {
      const { tabs, click } = enhanced(false);
      click(1);
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    });

    it('con movimiento reducido cambia sin usar la API', () => {
      const { tabs, click, start } = enhanced(true, true);
      click(1);
      expect(start).not.toHaveBeenCalled();
      expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    });

    it('volver a pulsar la pestaña activa no anima', () => {
      const { click, start } = enhanced(true);
      click(0);
      expect(start).not.toHaveBeenCalled();
    });
  });
});
