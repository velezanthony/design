import { describe, expect, it } from 'vitest';

import type { SidebarNode } from '../../core/navigation/sidebar';
import type { HeadConfig } from '../../core/seo/head';
import { renderDocument } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import DocsLayout from './DocsLayout.astro';

const head: HeadConfig[] = [
  { tag: 'title', attrs: {}, content: 'Guide · Docs' },
  { tag: 'link', attrs: { rel: 'canonical', href: 'https://x.dev/repo/guide/' } },
];
const sidebar: SidebarNode[] = [
  { label: 'Inicio', slug: '', href: '/repo/es/' },
  { label: 'Guía', slug: 'guide', href: '/repo/es/guide/' },
];
const headings = [
  { depth: 2, slug: 'a', text: 'A' },
  { depth: 2, slug: 'b', text: 'B' },
  { depth: 3, slug: 'c', text: 'C' },
];

function props(extra: Record<string, unknown> = {}) {
  return {
    lang: 'es',
    head,
    siteName: 'Docs',
    homeHref: '/repo/es/',
    hrefs: { es: '/repo/es/guide/', en: '/repo/guide/' },
    strings: stringsFor('es'),
    sidebar,
    current: '/repo/es/guide/',
    headings,
    prev: { label: 'Inicio', href: '/repo/es/' },
    next: { label: 'Siguiente', href: '/repo/es/next/' },
    editUrl: 'https://github.com/o/r/edit/main',
    editFile: 'docs/guide.es.md',
    indexable: true,
    baseUrl: '/repo/',
    year: 2026,
    ...extra,
  };
}
function page(extra: Record<string, unknown> = {}, slot = '<h1 id="t">Guía</h1><p>Hola</p>') {
  return renderDocument(DocsLayout, props(extra), { default: slot });
}

describe('DocsLayout: documento', () => {
  it('<html lang> es el idioma de la ruta y el head sale de los datos', async () => {
    const doc = await page();
    expect(doc.documentElement.getAttribute('lang')).toBe('es');
    expect(doc.querySelector('head title')!.textContent).toBe('Guide · Docs');
    expect(doc.querySelector('head link[rel="canonical"]')).not.toBeNull();
  });

  it('script previo al pintado con el tema guardado y theme-color por esquema', async () => {
    const doc = await page();
    const inline = [...doc.querySelectorAll('head script')].find((script) =>
      script.textContent?.includes('localStorage'),
    );
    expect(inline).toBeDefined();
    expect(inline!.getAttribute('type')).not.toBe('module');
    const metas = [...doc.querySelectorAll('head meta[name="theme-color"]')];
    expect(metas.map((meta) => meta.getAttribute('media'))).toEqual([
      '(prefers-color-scheme: light)',
      '(prefers-color-scheme: dark)',
    ]);
  });

  it('el enlace de salto es lo primero y apunta al <main>', async () => {
    const doc = await page();
    const first = doc.body.querySelector('a, button')!;
    expect(first.getAttribute('href')).toBe('#main-content');
    expect(doc.querySelector('main#main-content')).not.toBeNull();
  });

  it('landmarks: un header, un main, un footer, barra lateral y paginación con nombre', async () => {
    const doc = await page();
    expect(doc.querySelectorAll('header')).toHaveLength(1);
    expect(doc.querySelectorAll('main')).toHaveLength(1);
    expect(doc.querySelectorAll('footer')).toHaveLength(1);
    expect(
      doc.querySelector('nav[aria-label="Documentación"] a[aria-current="page"]'),
    ).not.toBeNull();
    expect(doc.querySelector('nav[aria-label="Navegación entre páginas"]')).not.toBeNull();
  });

  it('contenido en la ranura, índice, edición y selector de idioma', async () => {
    const doc = await page();
    expect(doc.querySelector('main h1')!.textContent).toBe('Guía');
    expect(doc.querySelector('nav.toc')).not.toBeNull();
    expect(
      doc.querySelector('a[href="https://github.com/o/r/edit/main/docs/guide.es.md"]'),
    ).not.toBeNull();
    expect(doc.querySelector('header nav[aria-label="Idioma"]')).not.toBeNull();
  });

  it('sin editUrl no hay enlace de edición', async () => {
    const doc = await page({ editUrl: undefined });
    expect(doc.body.textContent).not.toContain('Editar esta página');
  });
});

describe('DocsLayout: Pagefind', () => {
  it('una página indexable marca SOLO <main> con data-pagefind-body', async () => {
    const doc = await page();
    expect(doc.querySelectorAll('[data-pagefind-body]')).toHaveLength(1);
    expect(doc.querySelector('main')!.hasAttribute('data-pagefind-body')).toBe(true);
    expect(doc.querySelector('main')!.hasAttribute('data-pagefind-ignore')).toBe(false);
  });

  it('el cromo dentro de <main> (paginación, edición) queda fuera del índice', async () => {
    const doc = await page();
    for (const el of doc.querySelectorAll('main nav[aria-label="Navegación entre páginas"]')) {
      expect(el.closest('[data-pagefind-ignore]')).not.toBeNull();
    }
    expect(
      doc
        .querySelector('a[href^="https://github.com/o/r/edit"]')!
        .closest('[data-pagefind-ignore]'),
    ).not.toBeNull();
  });

  it('noindex: <main> lleva data-pagefind-ignore y ningún data-pagefind-body', async () => {
    const doc = await page({ indexable: false });
    expect(doc.querySelectorAll('[data-pagefind-body]')).toHaveLength(0);
    expect(doc.querySelector('main')!.hasAttribute('data-pagefind-ignore')).toBe(true);
  });
});

describe('DocsLayout: ruta de reserva', () => {
  const fallback = { originalLocale: 'en', href: '/repo/guide/' };

  it('aviso arriba y contenido original en <div lang> del idioma original', async () => {
    const doc = await page({ fallback, indexable: false });
    expect(doc.documentElement.getAttribute('lang')).toBe('es');
    const notice = doc.querySelector('main [role="note"] a[hreflang="en"]')!;
    expect(notice.getAttribute('href')).toBe('/repo/guide/');
    const content = doc.querySelector('main div[lang="en"]')!;
    expect(content.querySelector('h1')!.textContent).toBe('Guía');
    expect(content.contains(doc.querySelector('[role="note"]'))).toBe(false);
  });

  it('sin reserva no hay aviso ni <div lang>', async () => {
    const doc = await page();
    expect(doc.querySelector('[role="note"]')).toBeNull();
    expect(doc.querySelector('main div[lang]')).toBeNull();
  });
});

describe('DocsLayout: consentimiento (12.5)', () => {
  it('sin gtmId no hay banner ni control de cookies', async () => {
    const doc = await page({ privacyUrl: 'https://x.dev/privacy' });
    expect(doc.querySelector('[data-consent-banner]')).toBeNull();
    expect(doc.querySelector('[data-consent-open]')).toBeNull();
  });

  it('con gtmId y privacyUrl: banner con el contenedor y enlace a privacidad', async () => {
    const doc = await page({ gtmId: 'GTM-ABC', privacyUrl: 'https://x.dev/privacy' });
    const banner = doc.querySelector('[data-consent-banner]')!;
    expect(banner.getAttribute('data-gtm-id')).toBe('GTM-ABC');
    expect(banner.querySelector('a[href="https://x.dev/privacy"]')).not.toBeNull();
    expect(doc.querySelector('[data-consent-open]')).not.toBeNull();
  });

  it('con gtmId y sin privacyUrl falla con un error claro', async () => {
    await expect(page({ gtmId: 'GTM-ABC' })).rejects.toThrow(/privacyUrl/);
  });
});

describe('DocsLayout: textos de cliente', () => {
  it('<main> lleva las etiquetas de copiar y del ancla en el idioma de la página', async () => {
    const doc = await page();
    const main = doc.querySelector('main')!;
    expect(main.getAttribute('data-copy-label')).toBe('Copiar');
    expect(main.getAttribute('data-copied-label')).toBe('Copiado');
    expect(main.getAttribute('data-copy-failed-label')).toBe('No se pudo copiar');
    expect(main.getAttribute('data-anchor-label')).toContain('{title}');
  });

  it('cada init del cliente se carga como script de módulo', async () => {
    const doc = await page();
    expect(doc.querySelectorAll('script[type="module"]').length).toBeGreaterThan(0);
  });
});

describe('DocsLayout: columnas plegables y ancho', () => {
  function layout(extra: Record<string, unknown> = {}) {
    return {
      sidebar: 'open',
      toc: 'open',
      width: 'reading',
      toggles: true,
      ...extra,
    };
  }

  it('por defecto: abierto, en lectura, y con los controles', async () => {
    const doc = await page();
    const root = doc.documentElement;
    expect([root.dataset.left, root.dataset.right, root.dataset.width]).toEqual([
      'open',
      'open',
      'reading',
    ]);
    expect(doc.querySelector('[data-layout-toggle="left"]')).not.toBeNull();
    expect(doc.querySelector('[data-layout-toggle="right"]')).not.toBeNull();
    expect(doc.querySelectorAll('header [data-layout-width]')).toHaveLength(2);
  });

  it('la config manda sobre el estado inicial de <html>', async () => {
    const root = (
      await page({ layout: layout({ sidebar: 'collapsed', toc: 'collapsed', width: 'full' }) })
    ).documentElement;
    expect([root.dataset.left, root.dataset.right, root.dataset.width]).toEqual([
      'collapsed',
      'collapsed',
      'full',
    ]);
  });

  it('el botón nace con el estado de la config', async () => {
    const doc = await page({ layout: layout({ sidebar: 'collapsed' }) });
    const left = doc.querySelector('[data-layout-toggle="left"]')!;
    expect(left.getAttribute('aria-expanded')).toBe('false');
    expect(left.getAttribute('aria-label')).toBe('Desplegar la navegación');
    expect(doc.querySelector('[data-layout-toggle="right"]')!.getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('cada botón controla un panel que existe', async () => {
    const doc = await page();
    for (const side of ['left', 'right']) {
      const id = doc
        .querySelector(`[data-layout-toggle="${side}"]`)!
        .getAttribute('aria-controls')!;
      expect(doc.getElementById(id)).not.toBeNull();
    }
  });

  it('el script previo al pintado restaura el estado guardado', async () => {
    const inline = [...(await page()).querySelectorAll('head script')].find((script) =>
      script.textContent?.includes('docs:layout'),
    );
    expect(inline).toBeDefined();
  });

  describe('con toggles: false', () => {
    it('no pinta ningún control, ni etiquetas de raíl', async () => {
      const doc = await page({ layout: layout({ toggles: false }) });
      expect(doc.querySelector('[data-layout-toggle]')).toBeNull();
      expect(doc.querySelector('[data-layout-width]')).toBeNull();
      expect(doc.querySelector('.docs-rail-label')).toBeNull();
    });

    it('no emite el script de restauración: el estado guardado se ignora', async () => {
      const doc = await page({ layout: layout({ toggles: false }) });
      const inline = [...doc.querySelectorAll('head script')].find((script) =>
        script.textContent?.includes('docs:layout'),
      );
      expect(inline).toBeUndefined();
    });

    it('la config sigue fijando el estado inicial', async () => {
      const doc = await page({ layout: layout({ toggles: false, width: 'full' }) });
      expect(doc.documentElement.dataset.width).toBe('full');
    });
  });
});

describe('DocsLayout: nav en el menú móvil', () => {
  const nav = [
    { label: 'Guía', href: '/repo/es/users/a/', kind: 'section', current: 'true' },
    {
      label: 'GitHub',
      href: 'https://github.com/x/y',
      kind: 'link',
      external: true,
      icon: 'github',
    },
  ];

  it('el menú muestra primero los items de nav y después el sidebar de la sección', async () => {
    const doc = await page({ nav });
    const menu = doc.querySelector('details.docs-nav')!;
    const items = menu.querySelector('nav[aria-label="Secciones"]')!;
    const tree = menu.querySelector('nav[aria-label="Documentación"]')!;
    expect(items.querySelector('a[href="/repo/es/users/a/"]')).not.toBeNull();
    expect(items.compareDocumentPosition(tree) & 4).toBeTruthy();
  });

  it('en el menú el enlace con icono enseña su etiqueta', async () => {
    const doc = await page({ nav });
    const github = doc.querySelector('details.docs-nav a[href="https://github.com/x/y"]')!;
    const label = [...github.querySelectorAll('span')].find(
      (span) => span.textContent === 'GitHub',
    )!;
    expect(label.getAttribute('class') ?? '').not.toContain('sr-only');
  });

  it('la navegación del menú solo se ve por debajo de lg', async () => {
    const doc = await page({ nav });
    expect(
      doc.querySelector('details.docs-nav nav[aria-label="Secciones"]')!.getAttribute('class'),
    ).toContain('lg:hidden');
  });

  it('sin nav el menú solo lleva el sidebar', async () => {
    const doc = await page();
    expect(doc.querySelector('details.docs-nav nav[aria-label="Secciones"]')).toBeNull();
  });
});

describe('DocsLayout: desplazamiento de la barra lateral', () => {
  it('la barra que se desplaza lleva su marca y, tras ella, el script previo al pintado', async () => {
    const doc = await page();
    const aside = doc.querySelector('aside.docs-sidebar')!;
    // El plano (`aside`) no se desplaza: lo hace el contenedor interior, que es el que lleva la marca.
    expect(aside.hasAttribute('data-docs-sidebar-scroll')).toBe(false);
    const scroller = aside.querySelector('[data-docs-sidebar-scroll]')!;
    expect(scroller.parentElement).toBe(aside);
    expect(scroller.querySelector('#docs-nav-panel')).not.toBeNull();
    const last = scroller.lastElementChild!;
    expect(last.tagName).toBe('SCRIPT');
    expect(last.textContent).toContain('docs:sidebar-scroll');
  });
});

describe('DocsLayout: contenido sin prosa', () => {
  it('por defecto el contenido va en .prose, que da estilo al Markdown', async () => {
    const doc = await page();
    expect(doc.querySelector('main .prose')).not.toBeNull();
  });

  /* Una página que trae su propio marcado (tablas, listas, formularios) no quiere que `.prose` le
     cambie los márgenes, las viñetas ni los enlaces. */
  it('sin índice no se reserva la columna derecha: el contenido usa ese ancho', async () => {
    const doc = await page({ headings: [] });
    expect(doc.querySelector('[data-toc-column]')).toBeNull();
    expect(doc.querySelector('.docs-page')!.className).not.toContain('--col-right');
  });

  it('con índice, la columna derecha sigue ahí', async () => {
    const doc = await page();
    expect(doc.querySelector('[data-toc-column]')).not.toBeNull();
  });

  it('con prose={false} el contenido va sin .prose, pero dentro de <main>', async () => {
    const doc = await page({ prose: false });
    expect(doc.querySelector('.prose')).toBeNull();
    expect(doc.querySelector('main h1')!.textContent).toBe('Guía');
  });
});
