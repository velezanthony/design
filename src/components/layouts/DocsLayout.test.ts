import { describe, expect, it } from 'vitest';

import type { SidebarNode } from '../../core/navigation/sidebar';
import type { HeadConfig } from '../../core/seo/head';
import FooterProbe from '../../testing/fixtures/FooterProbe.astro';
import { renderDocument, text } from '../../testing/render';
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
    const htmlDocument = await page();
    expect(htmlDocument.documentElement.getAttribute('lang')).toBe('es');
    expect(htmlDocument.querySelector('head title')!.textContent).toBe('Guide · Docs');
    expect(htmlDocument.querySelector('head link[rel="canonical"]')).not.toBeNull();
  });

  it('script previo al pintado con el tema guardado y theme-color por esquema', async () => {
    const htmlDocument = await page();
    const inline = [...htmlDocument.querySelectorAll('head script')].find((script) =>
      script.textContent?.includes('localStorage'),
    );
    expect(inline).toBeDefined();
    expect(inline!.getAttribute('type')).not.toBe('module');
    const metas = [...htmlDocument.querySelectorAll('head meta[name="theme-color"]')];
    expect(metas.map((meta) => meta.getAttribute('media'))).toEqual([
      '(prefers-color-scheme: light)',
      '(prefers-color-scheme: dark)',
    ]);
  });

  it('el enlace de salto es lo primero y apunta al <main>', async () => {
    const htmlDocument = await page();
    const first = htmlDocument.body.querySelector('a, button')!;
    expect(first.getAttribute('href')).toBe('#main-content');
    expect(htmlDocument.querySelector('main#main-content')).not.toBeNull();
  });

  it('landmarks: un header, un main, un footer, barra lateral y paginación con nombre', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelectorAll('header')).toHaveLength(1);
    expect(htmlDocument.querySelectorAll('main')).toHaveLength(1);
    expect(htmlDocument.querySelectorAll('footer')).toHaveLength(1);
    expect(
      htmlDocument.querySelector('nav[aria-label="Documentación"] a[aria-current="page"]'),
    ).not.toBeNull();
    expect(htmlDocument.querySelector('nav[aria-label="Navegación entre páginas"]')).not.toBeNull();
  });

  it('contenido en la ranura, índice, edición y selector de idioma', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('main h1')!.textContent).toBe('Guía');
    expect(htmlDocument.querySelector('nav.toc')).not.toBeNull();
    expect(
      htmlDocument.querySelector('a[href="https://github.com/o/r/edit/main/docs/guide.es.md"]'),
    ).not.toBeNull();
    expect(htmlDocument.querySelector('header nav[aria-label="Idioma"]')).not.toBeNull();
  });

  it('sin editUrl no hay enlace de edición', async () => {
    const htmlDocument = await page({ editUrl: undefined });
    expect(htmlDocument.body.textContent).not.toContain('Editar esta página');
  });
});

describe('DocsLayout: Pagefind', () => {
  it('una página indexable marca SOLO <main> con data-pagefind-body', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelectorAll('[data-pagefind-body]')).toHaveLength(1);
    expect(htmlDocument.querySelector('main')!.hasAttribute('data-pagefind-body')).toBe(true);
    expect(htmlDocument.querySelector('main')!.hasAttribute('data-pagefind-ignore')).toBe(false);
  });

  it('el cromo dentro de <main> (paginación, edición) queda fuera del índice', async () => {
    const htmlDocument = await page();
    for (const element of htmlDocument.querySelectorAll(
      'main nav[aria-label="Navegación entre páginas"]',
    )) {
      expect(element.closest('[data-pagefind-ignore]')).not.toBeNull();
    }
    expect(
      htmlDocument
        .querySelector('a[href^="https://github.com/o/r/edit"]')!
        .closest('[data-pagefind-ignore]'),
    ).not.toBeNull();
  });

  it('noindex: <main> lleva data-pagefind-ignore y ningún data-pagefind-body', async () => {
    const htmlDocument = await page({ indexable: false });
    expect(htmlDocument.querySelectorAll('[data-pagefind-body]')).toHaveLength(0);
    expect(htmlDocument.querySelector('main')!.hasAttribute('data-pagefind-ignore')).toBe(true);
  });
});

describe('DocsLayout: ruta de reserva', () => {
  const fallback = { originalLocale: 'en', href: '/repo/guide/' };

  it('aviso arriba y contenido original en <div lang> del idioma original', async () => {
    const htmlDocument = await page({ fallback, indexable: false });
    expect(htmlDocument.documentElement.getAttribute('lang')).toBe('es');
    const notice = htmlDocument.querySelector('main [role="note"] a[hreflang="en"]')!;
    expect(notice.getAttribute('href')).toBe('/repo/guide/');
    const content = htmlDocument.querySelector('main div[lang="en"]')!;
    expect(content.querySelector('h1')!.textContent).toBe('Guía');
    expect(content.contains(htmlDocument.querySelector('[role="note"]'))).toBe(false);
  });

  it('sin reserva no hay aviso ni <div lang>', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('[role="note"]')).toBeNull();
    expect(htmlDocument.querySelector('main div[lang]')).toBeNull();
  });
});

describe('DocsLayout: consentimiento (12.5)', () => {
  it('sin gtmId no hay banner ni control de cookies', async () => {
    const htmlDocument = await page({ privacyUrl: 'https://x.dev/privacy' });
    expect(htmlDocument.querySelector('[data-consent-banner]')).toBeNull();
    expect(htmlDocument.querySelector('[data-consent-open]')).toBeNull();
  });

  it('con gtmId y privacyUrl: banner con el contenedor y enlace a privacidad', async () => {
    const htmlDocument = await page({ gtmId: 'GTM-ABC', privacyUrl: 'https://x.dev/privacy' });
    const banner = htmlDocument.querySelector('[data-consent-banner]')!;
    expect(banner.getAttribute('data-gtm-id')).toBe('GTM-ABC');
    expect(banner.querySelector('a[href="https://x.dev/privacy"]')).not.toBeNull();
    expect(htmlDocument.querySelector('[data-consent-open]')).not.toBeNull();
  });

  it('con gtmId y sin privacyUrl falla con un error claro', async () => {
    await expect(page({ gtmId: 'GTM-ABC' })).rejects.toThrow(/privacyUrl/);
  });
});

describe('DocsLayout: pie (`Footer`)', () => {
  it('sin `Footer` pinta el pie de la librería', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('footer [data-footer-meta]')).not.toBeNull();
    expect(text(htmlDocument.querySelector('[data-footer-meta]'))).toContain('© 2026 Docs');
  });

  it('con `Footer` pinta ese componente en lugar del de la librería, uno solo', async () => {
    const htmlDocument = await page({ Footer: FooterProbe });
    expect(htmlDocument.querySelectorAll('footer')).toHaveLength(1);
    expect(htmlDocument.querySelector('footer[data-footer-probe]')).not.toBeNull();
    expect(htmlDocument.querySelector('[data-footer-meta]')).toBeNull();
  });

  it('el pie propio recibe las mismas props que el de la librería, más el idioma', async () => {
    const htmlDocument = await page({
      Footer: FooterProbe,
      gtmId: 'GTM-ABC',
      privacyUrl: 'https://x.dev/privacy',
      footer: { links: [{ label: 'Blog', href: 'https://blog.dev', external: true }] },
    });
    const probe = htmlDocument.querySelector('[data-footer-probe]')!;
    expect(probe.getAttribute('data-lang')).toBe('es');
    expect(probe.getAttribute('data-site-name')).toBe('Docs');
    expect(probe.getAttribute('data-year')).toBe('2026');
    expect(probe.getAttribute('data-privacy-url')).toBe('https://x.dev/privacy');
    expect(probe.getAttribute('data-cookie-control')).toBe('true');
    expect(probe.getAttribute('data-strings-locale-switch')).toBe('Idioma');
    expect(probe.getAttribute('data-links')).toBe('1');
  });

  it('sin analítica, el pie propio recibe `cookieControl` a false', async () => {
    const htmlDocument = await page({ Footer: FooterProbe });
    expect(
      htmlDocument.querySelector('[data-footer-probe]')!.getAttribute('data-cookie-control'),
    ).toBe('false');
  });
});

describe('DocsLayout: textos de cliente', () => {
  it('<main> lleva las etiquetas de copiar y del ancla en el idioma de la página', async () => {
    const htmlDocument = await page();
    const main = htmlDocument.querySelector('main')!;
    expect(main.getAttribute('data-copy-label')).toBe('Copiar');
    expect(main.getAttribute('data-copied-label')).toBe('Copiado');
    expect(main.getAttribute('data-copy-failed-label')).toBe('No se pudo copiar');
    expect(main.getAttribute('data-anchor-label')).toContain('{title}');
  });

  it('cada init del cliente se carga como script de módulo', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelectorAll('script[type="module"]').length).toBeGreaterThan(0);
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
    const htmlDocument = await page();
    const root = htmlDocument.documentElement;
    expect([root.dataset.left, root.dataset.right, root.dataset.width]).toEqual([
      'open',
      'open',
      'reading',
    ]);
    expect(htmlDocument.querySelector('[data-layout-toggle="left"]')).not.toBeNull();
    expect(htmlDocument.querySelector('[data-layout-toggle="right"]')).not.toBeNull();
    expect(htmlDocument.querySelectorAll('header [data-layout-width]')).toHaveLength(2);
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
    const htmlDocument = await page({ layout: layout({ sidebar: 'collapsed' }) });
    const left = htmlDocument.querySelector('[data-layout-toggle="left"]')!;
    expect(left.getAttribute('aria-expanded')).toBe('false');
    expect(left.getAttribute('aria-label')).toBe('Desplegar la navegación');
    expect(
      htmlDocument.querySelector('[data-layout-toggle="right"]')!.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('cada botón controla un panel que existe', async () => {
    const htmlDocument = await page();
    for (const side of ['left', 'right']) {
      const id = htmlDocument
        .querySelector(`[data-layout-toggle="${side}"]`)!
        .getAttribute('aria-controls')!;
      expect(htmlDocument.getElementById(id)).not.toBeNull();
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
      const htmlDocument = await page({ layout: layout({ toggles: false }) });
      expect(htmlDocument.querySelector('[data-layout-toggle]')).toBeNull();
      expect(htmlDocument.querySelector('[data-layout-width]')).toBeNull();
      expect(htmlDocument.querySelector('.docs-rail-label')).toBeNull();
    });

    it('no emite el script de restauración: el estado guardado se ignora', async () => {
      const htmlDocument = await page({ layout: layout({ toggles: false }) });
      const inline = [...htmlDocument.querySelectorAll('head script')].find((script) =>
        script.textContent?.includes('docs:layout'),
      );
      expect(inline).toBeUndefined();
    });

    it('la config sigue fijando el estado inicial', async () => {
      const htmlDocument = await page({ layout: layout({ toggles: false, width: 'full' }) });
      expect(htmlDocument.documentElement.dataset.width).toBe('full');
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
    const htmlDocument = await page({ nav });
    const menu = htmlDocument.querySelector('details.docs-nav')!;
    const items = menu.querySelector('nav[aria-label="Secciones"]')!;
    const tree = menu.querySelector('nav[aria-label="Documentación"]')!;
    expect(items.querySelector('a[href="/repo/es/users/a/"]')).not.toBeNull();
    expect(items.compareDocumentPosition(tree) & 4).toBeTruthy();
  });

  it('en el menú el enlace con icono enseña su etiqueta', async () => {
    const htmlDocument = await page({ nav });
    const github = htmlDocument.querySelector('details.docs-nav a[href="https://github.com/x/y"]')!;
    const label = [...github.querySelectorAll('span')].find(
      (span) => span.textContent === 'GitHub',
    )!;
    expect(label.getAttribute('class') ?? '').not.toContain('sr-only');
  });

  it('la navegación del menú solo se ve por debajo de lg', async () => {
    const htmlDocument = await page({ nav });
    expect(
      htmlDocument
        .querySelector('details.docs-nav nav[aria-label="Secciones"]')!
        .getAttribute('class'),
    ).toContain('lg:hidden');
  });

  it('sin nav el menú solo lleva el sidebar', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('details.docs-nav nav[aria-label="Secciones"]')).toBeNull();
  });
});

describe('DocsLayout: desplazamiento de la barra lateral', () => {
  it('la barra que se desplaza lleva su marca y, tras ella, el script previo al pintado', async () => {
    const htmlDocument = await page();
    const aside = htmlDocument.querySelector('aside.docs-sidebar')!;
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
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('main .prose')).not.toBeNull();
  });

  /* Una página que trae su propio marcado (tablas, listas, formularios) no quiere que `.prose` le
     cambie los márgenes, las viñetas ni los enlaces. */
  it('sin índice no se reserva la columna derecha: el contenido usa ese ancho', async () => {
    const htmlDocument = await page({ headings: [] });
    expect(htmlDocument.querySelector('[data-toc-column]')).toBeNull();
    expect(htmlDocument.querySelector('.docs-page')!.className).not.toContain('--col-right');
  });

  it('con índice, la columna derecha sigue ahí', async () => {
    const htmlDocument = await page();
    expect(htmlDocument.querySelector('[data-toc-column]')).not.toBeNull();
  });

  it('con prose={false} el contenido va sin .prose, pero dentro de <main>', async () => {
    const htmlDocument = await page({ prose: false });
    expect(htmlDocument.querySelector('.prose')).toBeNull();
    expect(htmlDocument.querySelector('main h1')!.textContent).toBe('Guía');
  });
});

describe('DocsLayout: ranuras de BaseLayout', () => {
  async function withSlots() {
    return renderDocument(DocsLayout, props(), {
      default: '<h1>Guía</h1>',
      head: '<meta name="extra" content="1">',
      scripts: '<script id="mine"></script>',
    });
  }

  it('`head` llega al final del <head>, tras el script de disposición', async () => {
    const htmlDocument = await withSlots();
    expect(htmlDocument.head.querySelector('meta[name="extra"]')).not.toBeNull();
    const last = [...htmlDocument.head.children].at(-1)!;
    expect(last.getAttribute('name')).toBe('extra');
  });

  it('`scripts` llega al final del <body>, tras el arranque de la página', async () => {
    const htmlDocument = await withSlots();
    const last = htmlDocument.body.lastElementChild!;
    expect(last.getAttribute('id')).toBe('mine');
    expect(htmlDocument.body.querySelector('footer')).not.toBeNull();
  });

  it('el contenido por defecto sigue dentro de <main>', async () => {
    const htmlDocument = await withSlots();
    expect(htmlDocument.querySelector('main h1')!.textContent).toBe('Guía');
  });
});
