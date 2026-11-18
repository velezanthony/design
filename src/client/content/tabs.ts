import { withTransition, type MotionPreference } from '../transition';

/** Índice al que lleva una tecla desde la pestaña actual; `undefined` para cualquier otra. */
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

/** Convierte cada `.docs-tabs` en pestañas accesibles (`data-enhanced`); sin JS los paneles quedan apilados con su etiqueta. */
export function initTabs(
  htmlDocument: Document,
  motion: MotionPreference = { matches: false },
): void {
  for (const root of htmlDocument.querySelectorAll<HTMLElement>(
    '.docs-tabs:not([data-enhanced])',
  )) {
    const panels = [...root.querySelectorAll<HTMLElement>(':scope > .docs-tab-panel')];
    if (!panels.length) continue;

    const group = ++groups;
    const list = htmlDocument.createElement('div');
    list.className = 'docs-tablist';
    list.setAttribute('role', 'tablist');

    const tabs = panels.map((panel, index) => {
      const label = panel.querySelector('.docs-tab-label')?.textContent?.trim();
      const tab = htmlDocument.createElement('button');
      tab.type = 'button';
      tab.className = 'docs-tab';
      tab.id = `docs-tabs-${group}-tab-${index}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `docs-tabs-${group}-panel-${index}`);
      tab.textContent = label || String(index + 1);
      panel.id = `docs-tabs-${group}-panel-${index}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      list.append(tab);
      return tab;
    });

    function select(index: number) {
      tabs.forEach((tab, position) => {
        const on = position === index;
        tab.setAttribute('aria-selected', String(on));
        tab.setAttribute('tabindex', on ? '0' : '-1');
        if (on) panels[position]!.removeAttribute('hidden');
        else panels[position]!.setAttribute('hidden', '');
      });
    }

    /* Lo que hace quien visita: con transición, y sin ella si ya está seleccionada. */
    function show(index: number) {
      if (tabs[index]!.getAttribute('aria-selected') === 'true') return;
      root.style.setProperty('view-transition-name', 'docs-tabs');
      void withTransition(() => select(index), { htmlDocument, motion, kind: 'tabs' }).then(() =>
        root.style.removeProperty('view-transition-name'),
      );
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => show(index));
      tab.addEventListener('keydown', (event) => {
        const target = nextTabIndex((event as KeyboardEvent).key, index, tabs.length);
        if (target === undefined) return;
        event.preventDefault();
        show(target);
        tabs[target]!.focus();
      });
    });

    root.prepend(list);
    root.setAttribute('data-enhanced', '');
    select(0);
  }
}
