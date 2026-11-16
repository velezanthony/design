/**
 * El índice al que lleva una tecla desde la pestaña actual: flechas con vuelta, Inicio y Fin.
 * `undefined` para cualquier otra tecla, que no se toca.
 */
export function nextTabIndex(key: string, current: number, count: number): number | undefined {
  if (count < 1) return undefined;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}

let groups = 0;

/**
 * Convierte cada `.docs-tabs` en un patrón de pestañas accesible: añade una `tablist` con un
 * `tab` por panel (`.docs-tab-panel`, cuya etiqueta es su `.docs-tab-label`), un solo panel
 * visible y teclado con flechas, Inicio y Fin. Sin JavaScript el marcado sigue siendo legible:
 * paneles apilados, cada uno con su etiqueta. El grupo mejorado recibe `data-enhanced`, que el
 * CSS usa para mostrar la lista y ocultar las etiquetas.
 */
export function initTabs(doc: Document): void {
  for (const root of doc.querySelectorAll<HTMLElement>('.docs-tabs:not([data-enhanced])')) {
    const panels = [...root.querySelectorAll<HTMLElement>(':scope > .docs-tab-panel')];
    if (!panels.length) continue;

    const group = ++groups;
    const list = doc.createElement('div');
    list.className = 'docs-tablist';
    list.setAttribute('role', 'tablist');

    const tabs = panels.map((panel, i) => {
      const label = panel.querySelector('.docs-tab-label')?.textContent?.trim();
      const tab = doc.createElement('button');
      tab.type = 'button';
      tab.className = 'docs-tab';
      tab.id = `docs-tabs-${group}-tab-${i}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `docs-tabs-${group}-panel-${i}`);
      tab.textContent = label || String(i + 1);
      panel.id = `docs-tabs-${group}-panel-${i}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      list.append(tab);
      return tab;
    });

    const select = (index: number) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.setAttribute('tabindex', on ? '0' : '-1');
        if (on) panels[i]!.removeAttribute('hidden');
        else panels[i]!.setAttribute('hidden', '');
      });
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (event) => {
        const target = nextTabIndex((event as KeyboardEvent).key, i, tabs.length);
        if (target === undefined) return;
        event.preventDefault();
        select(target);
        tabs[target]!.focus();
      });
    });

    root.prepend(list);
    root.setAttribute('data-enhanced', '');
    select(0);
  }
}
