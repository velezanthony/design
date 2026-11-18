import { describe, expect, it } from 'vitest';

import { render, text } from '../../testing/render';
import { stringsFor } from '../../testing/strings';
import DocsFooter from './DocsFooter.astro';
import DocsHeader from './DocsHeader.astro';

function header(props: Record<string, unknown> = {}) {
  return render(DocsHeader, {
    siteName: 'Design',
    homeHref: '/repo/es/',
    lang: 'es',
    hrefs: { es: '/repo/es/x/', en: '/repo/en/x/' },
    strings: stringsFor('es'),
    ...props,
  });
}

const navEntries = [
  { label: 'Guía', href: '/repo/es/users/a/', kind: 'section', current: 'true' },
  { label: 'Changelog', href: '/repo/es/changelog/', kind: 'page', current: 'page' },
  { label: 'Contribuir', href: '/repo/es/contributors/', kind: 'section' },
  {
    label: 'GitHub',
    href: 'https://github.com/x/y',
    kind: 'link',
    external: true,
    icon: 'github',
  },
  { label: 'Blog', href: 'https://blog.dev', kind: 'link', external: true },
];

describe('DocsHeader: nav', () => {
  it('sin items no pinta navegación de secciones', async () => {
    expect((await header()).querySelector('header nav[aria-label="Secciones"]')).toBeNull();
  });

  it('pinta los items en orden dentro de un nav etiquetado, tras el nombre del sitio', async () => {
    const doc = await header({ nav: navEntries });
    const nav = doc.querySelector('header nav[aria-label="Secciones"]')!;
    expect(
      [...nav.querySelectorAll('a')].map((a) => text(a).replace(/\s*Enlace externo$/, '')),
    ).toEqual(['Guía', 'Changelog', 'Contribuir', 'GitHub', 'Blog']);
    const home = doc.querySelector('header a[href="/repo/es/"]')!;
    expect(home.compareDocumentPosition(nav) & 4).toBeTruthy();
  });

  it('marca la sección actual con aria-current="true" y la página con "page"', async () => {
    const nav = (await header({ nav: navEntries })).querySelector(
      'header nav[aria-label="Secciones"]',
    )!;
    expect(nav.querySelector('a[href="/repo/es/users/a/"]')!.getAttribute('aria-current')).toBe(
      'true',
    );
    expect(nav.querySelector('a[href="/repo/es/changelog/"]')!.getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      nav.querySelector('a[href="/repo/es/contributors/"]')!.hasAttribute('aria-current'),
    ).toBe(false);
  });

  it('los externos llevan rel="noopener" y un marcador externo; los internos, ninguno', async () => {
    const nav = (await header({ nav: navEntries })).querySelector(
      'header nav[aria-label="Secciones"]',
    )!;
    const blog = nav.querySelector('a[href="https://blog.dev"]')!;
    expect(blog.getAttribute('rel')).toBe('noopener');
    expect(text(blog.querySelector('[data-external-marker]'))).toContain('Enlace externo');
    const guide = nav.querySelector('a[href="/repo/es/users/a/"]')!;
    expect(guide.hasAttribute('rel')).toBe(false);
    expect(guide.querySelector('[data-external-marker]')).toBeNull();
  });

  it('un enlace con icono es solo icono pero conserva su etiqueta para lectores de pantalla', async () => {
    const nav = (await header({ nav: navEntries })).querySelector(
      'header nav[aria-label="Secciones"]',
    )!;
    const github = nav.querySelector('a[href="https://github.com/x/y"]')!;
    expect(github.querySelector('svg')).not.toBeNull();
    const label = [...github.querySelectorAll('span')].find((span) => text(span) === 'GitHub')!;
    expect(label.getAttribute('class')).toContain('sr-only');
  });

  it('desde lg y no antes: la barra va oculta por debajo de lg', async () => {
    const nav = (await header({ nav: navEntries })).querySelector(
      'header nav[aria-label="Secciones"]',
    )!;
    expect(nav.getAttribute('class')).toMatch(/\bhidden\b/);
    expect(nav.getAttribute('class')).toMatch(/lg:flex|lg:block/);
  });
});

describe('DocsHeader', () => {
  it('el enlace de salto es lo primero y apunta al contenido principal', async () => {
    const doc = await header();
    const first = doc.querySelector('a, button')!;
    expect(first.getAttribute('href')).toBe('#main-content');
    expect(text(first)).toBe('Saltar al contenido');
  });

  it('el destino del salto es configurable', async () => {
    const first = (await header({ mainId: 'contenido' })).querySelector('a')!;
    expect(first.getAttribute('href')).toBe('#contenido');
  });

  it('tiene un único landmark header con el nombre del sitio enlazando a la portada', async () => {
    const doc = await header();
    expect(doc.querySelectorAll('header')).toHaveLength(1);
    const home = doc.querySelector('header a[href="/repo/es/"]')!;
    expect(text(home)).toBe('Design');
  });

  it('incluye selector de idioma y de tema, y una ranura para lo demás', async () => {
    const doc = await render(
      DocsHeader,
      {
        siteName: 'D',
        homeHref: '/',
        lang: 'es',
        hrefs: { es: '/es/', en: '/en/' },
        strings: stringsFor('es'),
      },
      { default: '<div id="extra">buscador</div>' },
    );
    expect(doc.querySelector('header nav[aria-label="Idioma"]')).not.toBeNull();
    expect(doc.querySelector('header [data-theme-toggle]')).not.toBeNull();
    expect(doc.querySelector('header #extra')).not.toBeNull();
  });

  it('sin rutas ni textos del portfolio', async () => {
    const html = (await header()).body.innerHTML;
    expect(html).not.toMatch(/Proyectos|Experiencia|\/cv|portfolio/i);
  });
});

function footer(props: Record<string, unknown> = {}) {
  return render(DocsFooter, {
    siteName: 'Design',
    year: 2026,
    strings: stringsFor('es'),
    ...props,
  });
}

describe('DocsFooter', () => {
  it('es el landmark footer con el copyright que se le pasa', async () => {
    const doc = await footer();
    expect(doc.querySelectorAll('footer')).toHaveLength(1);
    expect(text(doc.querySelector('footer'))).toContain('© 2026 Design');
  });

  it('el año va por props: la misma salida siempre', async () => {
    expect(text(await footer({ year: 2030 }))).toContain('© 2030');
  });

  it('el año va marcado para que el cliente lo sustituya, con el del build como respaldo', async () => {
    const mark = (await footer({ year: 2030 })).querySelector('[data-current-year]')!;
    expect(text(mark)).toBe('2030');
  });

  it('fila 1: los enlaces propios en el nav; privacidad y cookies ya no están ahí', async () => {
    const bare = await footer({ footer: { links: [] } });
    expect(bare.querySelector('a')).toBeNull();
    const doc = await footer({
      privacyUrl: '/privacidad/',
      cookieControl: true,
      footer: { links: [{ label: 'Código', href: 'https://github.com/x/y', external: true }] },
    });
    const link = doc.querySelector('a[href="https://github.com/x/y"]')!;
    expect(text(link)).toBe('Código');
    expect(link.getAttribute('rel')).toContain('noopener');
    const order = [...doc.querySelectorAll('footer nav a, footer nav button')].map((n) => text(n));
    expect(order).toEqual(['Código']);
  });

  it('fila 2: licencia, privacidad y cookies en ese orden, separadas por puntos que no se leen', async () => {
    const doc = await footer({
      privacyUrl: '/privacidad/',
      cookieControl: true,
      footer: { license: { label: 'MIT', href: 'https://x.dev/LICENSE' }, links: [] },
    });
    const legal = doc.querySelector('[data-footer-legal]')!;
    expect([...legal.querySelectorAll('li')].map((n) => text(n).replace(/^·/, ''))).toEqual([
      'Licencia MIT',
      'Política de privacidad',
      'Preferencias de cookies',
    ]);
    expect(legal.querySelector('a[href="https://x.dev/LICENSE"]')).not.toBeNull();
    expect(text(legal.querySelector('a[href="/privacidad/"]'))).toBe('Política de privacidad');
    const dots = [...legal.querySelectorAll('span[aria-hidden="true"]')];
    expect(dots.map((n) => text(n))).toEqual(['·', '·']);
    expect(legal.querySelector('nav')).toBeNull();
    expect(doc.querySelectorAll('footer nav')).toHaveLength(0);
  });

  it('fila 2 solo muestra lo que existe y desaparece si no hay nada', async () => {
    const onlyLicense = await footer({ footer: { license: { label: 'MIT' }, links: [] } });
    const legal = onlyLicense.querySelector('[data-footer-legal]')!;
    expect(text(legal)).toBe('Licencia MIT');
    expect(legal.querySelector('[aria-hidden]')).toBeNull();
    expect(legal.querySelector('a')).toBeNull();

    const onlyPrivacy = await footer({ privacyUrl: '/privacidad/' });
    expect(text(onlyPrivacy.querySelector('[data-footer-legal]'))).toBe('Política de privacidad');

    const none = await footer({
      footer: { links: [{ label: 'A', href: 'https://a.dev', external: true }] },
    });
    expect(none.querySelector('[data-footer-legal]')).toBeNull();
    expect((await footer()).querySelector('[data-footer-legal]')).toBeNull();
  });

  it('izquierda: «© año nombre por autor» en una frase, sin la licencia', async () => {
    const doc = await footer({
      footer: {
        license: { label: 'MIT', href: 'https://x.dev/LICENSE' },
        author: { name: 'Anthony Velez', href: 'https://velezanthony.github.io/' },
        links: [],
      },
    });
    expect(text(doc.querySelector('[data-footer-meta]'))).toBe('© 2026 Design por Anthony Velez');
    expect(doc.querySelector('a[href="https://velezanthony.github.io/"]')).not.toBeNull();
    const plain = await footer({ footer: { license: { label: 'MIT' }, links: [] } });
    expect(text(plain.querySelector('[data-footer-meta]'))).toBe('© 2026 Design');
    expect(plain.querySelector('[data-footer-meta] a')).toBeNull();
  });

  it('en inglés dice «by»', async () => {
    const doc = await footer({
      strings: stringsFor('en'),
      footer: { author: { name: 'Ana', href: 'https://ana.dev' }, links: [] },
    });
    expect(text(doc.querySelector('[data-footer-meta]'))).toBe('© 2026 Design by Ana');
  });

  it('los enlaces del proyecto van en un nav etiquetado; sin enlaces no hay nav', async () => {
    const doc = await footer({
      footer: { links: [{ label: 'A', href: 'https://a.dev', external: true }] },
    });
    expect(doc.querySelector('footer nav')!.getAttribute('aria-label')).toBe('Enlaces del sitio');
    expect((await footer()).querySelector('footer nav')).toBeNull();
  });

  it('un enlace interno no se abre en otra pestaña', async () => {
    const doc = await footer({
      footer: { links: [{ label: 'Cambios', href: '/repo/changelog/', external: false }] },
    });
    const link = doc.querySelector('footer nav a')!;
    expect(link.getAttribute('target')).toBeNull();
    expect(link.getAttribute('rel')).toBeNull();
  });

  it('el control de cookies es un botón solo con cookieControl', async () => {
    expect((await footer()).querySelector('[data-consent-open]')).toBeNull();
    const button = (await footer({ cookieControl: true })).querySelector('[data-consent-open]')!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(text(button)).toBe('Preferencias de cookies');
  });

  it('otro idioma', async () => {
    const doc = await footer({ strings: stringsFor('en'), cookieControl: true });
    expect(text(doc.querySelector('[data-consent-open]'))).toBe('Cookie preferences');
  });

  it('el control de cookies vive en la fila legal, no en el nav', async () => {
    const doc = await footer({ cookieControl: true });
    expect(doc.querySelector('[data-footer-legal] [data-consent-open]')).not.toBeNull();
    expect(doc.querySelector('footer nav')).toBeNull();
  });
});

describe('DocsHeader: ancho de lectura', () => {
  it('sin `layoutToggles` no hay conmutador', async () => {
    expect((await header()).querySelector('[data-layout-width]')).toBeNull();
  });

  it('con `layoutToggles` hay un grupo con dos botones y su nombre accesible', async () => {
    const doc = await header({ layoutToggles: true, layoutWidth: 'full' });
    const group = doc.querySelector('header [role="group"][aria-label="Ancho de la página"]')!;
    const buttons = [...group.querySelectorAll('button[data-layout-width]')];
    expect(buttons.map((b) => b.getAttribute('data-layout-width'))).toEqual(['reading', 'full']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    // Solo icono: el nombre va en `aria-label` y el mismo texto en `title`, como pista al pasar.
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Lectura', 'Ancho']);
    expect(buttons.map((b) => b.getAttribute('title'))).toEqual(['Lectura', 'Ancho']);
    expect(buttons.map((b) => text(b))).toEqual(['', '']);
    for (const button of buttons) expect(button.getAttribute('type')).toBe('button');
  });

  it('el conmutador no se muestra por debajo de md', async () => {
    const group = (await header({ layoutToggles: true })).querySelector('[role="group"]')!;
    expect([...group.classList]).toEqual(expect.arrayContaining(['hidden', 'md:inline-flex']));
  });

  it('los textos salen del catálogo del idioma', async () => {
    const doc = await header({ layoutToggles: true, strings: stringsFor('en') });
    expect(doc.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Page width');
    expect(doc.querySelector('[data-layout-width="full"]')!.getAttribute('aria-label')).toBe(
      'Full',
    );
  });
});
