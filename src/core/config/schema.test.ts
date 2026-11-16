import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve';
import { DocsConfigSchema, PageSeoOverrideSchema } from './schema';
import { DocsErrors } from '../errors';
import { NavIcon } from './nav';

function messages(input: unknown): string[] {
  try {
    resolveConfig(input as never);
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((e) => e.describe());
    throw error;
  }
  return [];
}

describe('seo de la config', () => {
  it('plantilla por defecto `%s · <name>`', () => {
    expect(resolveConfig({ name: 'Design' }).seo.titleTemplate).toBe('%s · Design');
  });

  it('la plantilla debe contener %s: ruta `seo.titleTemplate`', () => {
    expect(messages({ name: 'X', seo: { titleTemplate: 'sin marcador' } })[0]).toContain(
      'seo.titleTemplate',
    );
  });

  it('la imagen base sin alt falla con `seo.image.alt`', () => {
    expect(messages({ name: 'X', seo: { image: { src: '/og.png' } } })[0]).toContain(
      'seo.image.alt',
    );
  });

  it('la imagen base acepta ruta de public/ o https, con alt por idioma', () => {
    for (const src of ['/og.png', 'https://cdn.dev/og.png']) {
      const cfg = resolveConfig({
        name: 'X',
        locales: ['en', 'es'],
        seo: { image: { src, alt: { en: 'Logo', es: 'Logotipo' } } },
      });
      expect(cfg.seo.image?.src).toBe(src);
    }
  });

  it('una imagen que no es de public/ ni https falla con `seo.image.src`', () => {
    expect(messages({ name: 'X', seo: { image: { src: 'og.png', alt: 'a' } } })[0]).toContain(
      'seo.image.src',
    );
  });

  it('la descripción es un Label: cadena o por idioma', () => {
    expect(resolveConfig({ name: 'X', seo: { description: 'Docs' } }).seo.description).toBe('Docs');
  });
});

describe('PageSeoOverrideSchema', () => {
  it('acepta todos los campos de override', () => {
    const parsed = PageSeoOverrideSchema.parse({
      title: 'T',
      description: { en: 'd' },
      image: { src: '/a.png' },
      noindex: true,
    });
    expect(parsed.image).toEqual({ src: '/a.png' });
  });

  it('una imagen sin src falla en `image.src`', () => {
    const result = PageSeoOverrideSchema.safeParse({ image: { alt: 'x' } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['image', 'src']);
  });
});

describe('external[].seo', () => {
  it('un campo inválido se nombra con `external[i].seo.<campo>`', () => {
    const [message] = messages({
      name: 'X',
      external: [
        { slug: 'a', file: 'a.md' },
        { slug: 'b', file: 'b.md', seo: { image: { alt: 'x' } } },
      ],
    });
    expect(message).toContain('external[1].seo.image.src');
  });

  it('llega tal cual a la config resuelta', () => {
    const cfg = resolveConfig({
      name: 'X',
      external: [{ slug: 'a', file: 'a.md', seo: { noindex: true } }],
    });
    expect(cfg.external[0].seo).toEqual({ noindex: true });
  });
});

describe('DocsConfigSchema', () => {
  it('es la fuente de DocsUserConfig: su entrada acepta la config mínima', () => {
    expect(DocsConfigSchema.safeParse({ name: 'X' }).success).toBe(true);
  });
});

describe('layout de la config', () => {
  it('sin `layout` todo queda abierto, en lectura y con conmutadores', () => {
    expect(resolveConfig({ name: 'X' }).layout).toEqual({
      sidebar: 'open',
      toc: 'open',
      width: 'reading',
      toggles: true,
    });
  });

  it('acepta cada campo y completa el resto con los valores por defecto', () => {
    expect(
      resolveConfig({ name: 'X', layout: { sidebar: 'collapsed', width: 'full' } }).layout,
    ).toEqual({ sidebar: 'collapsed', toc: 'open', width: 'full', toggles: true });
    expect(
      resolveConfig({ name: 'X', layout: { toc: 'collapsed', toggles: false } }).layout,
    ).toEqual({ sidebar: 'open', toc: 'collapsed', width: 'reading', toggles: false });
  });

  it('un valor desconocido falla con la ruta del campo', () => {
    const [sidebar] = messages({ name: 'X', layout: { sidebar: 'hidden' } });
    expect(sidebar).toContain('layout.sidebar');
    expect(messages({ name: 'X', layout: { width: 'wide' } })[0]).toContain('layout.width');
    expect(messages({ name: 'X', layout: { toggles: 'yes' } })[0]).toContain('layout.toggles');
  });

  it('una opción desconocida de `layout` se nombra con su ruta', () => {
    expect(messages({ name: 'X', layout: { rail: true } })).toEqual([
      expect.stringContaining('layout.rail'),
    ]);
  });
});

describe('nav', () => {
  const base = { name: 'X', locales: ['en', 'es'] };

  it('sin `nav` no cambia nada: queda sin definir', () => {
    expect(resolveConfig({ name: 'X' }).nav).toBeUndefined();
  });

  it('acepta una sección, una página y un enlace con icono', () => {
    const nav = [
      { label: { en: 'Guide', es: 'Guía' }, dir: 'users', sidebar: ['users/a'] },
      { label: 'Changelog', slug: 'changelog' },
      { label: 'GitHub', href: 'https://github.com/x/y', icon: NavIcon.GITHUB },
    ];
    expect(resolveConfig({ ...base, nav }).nav).toEqual(nav);
  });

  it('NavIcon es un objeto `as const` con el icono de GitHub', () => {
    expect(NavIcon).toEqual({ GITHUB: 'github' });
  });

  it('un icono desconocido falla con la ruta del campo', () => {
    const out = messages({
      ...base,
      nav: [{ label: 'G', href: 'https://x.dev', icon: 'twitter' }],
    });
    expect(out[0]).toContain('nav[0].icon');
  });

  it('solo https: un href http o relativo falla con su ruta', () => {
    expect(messages({ ...base, nav: [{ label: 'G', href: 'http://x.dev' }] })[0]).toContain(
      'nav[0].href',
    );
    expect(messages({ ...base, nav: [{ label: 'G', href: '/x' }] })[0]).toContain('nav[0].href');
  });

  it('cada item es exactamente uno de sección, página o enlace', () => {
    expect(messages({ ...base, nav: [{ label: 'G' }] })[0]).toContain('nav[0]');
    expect(messages({ ...base, nav: [{ label: 'G', dir: 'a', slug: 'b' }] })[0]).toContain(
      'nav[0]',
    );
  });

  it('`sidebar` solo va con `dir` e `icon` solo con `href`', () => {
    expect(messages({ ...base, nav: [{ label: 'G', slug: 'a', sidebar: ['a'] }] })[0]).toContain(
      'nav[0].sidebar',
    );
    expect(messages({ ...base, nav: [{ label: 'G', dir: 'a', icon: 'github' }] })[0]).toContain(
      'nav[0].icon',
    );
  });

  it('una opción desconocida de un item se nombra con su ruta', () => {
    expect(messages({ ...base, nav: [{ label: 'G', dir: 'a', color: 'red' }] })).toEqual([
      expect.stringContaining('nav[0].color'),
    ]);
  });

  it('el dir va sin barras al principio ni al final', () => {
    expect(messages({ ...base, nav: [{ label: 'G', dir: '/users/' }] })[0]).toContain('nav[0].dir');
  });

  it('dirs que se solapan fallan: iguales o uno prefijo del otro', () => {
    const same = messages({
      ...base,
      nav: [
        { label: 'A', dir: 'users' },
        { label: 'B', dir: 'users' },
      ],
    });
    expect(same[0]).toContain('nav[1].dir');
    const nested = messages({
      ...base,
      nav: [
        { label: 'A', dir: 'users' },
        { label: 'B', dir: 'users/guide' },
      ],
    });
    expect(nested[0]).toContain('nav[1].dir');
    expect(nested[0]).toContain('nav[0]');
  });

  it('dirs hermanos con prefijo de texto común no se solapan', () => {
    expect(
      messages({
        ...base,
        nav: [
          { label: 'A', dir: 'users' },
          { label: 'B', dir: 'users-extra' },
        ],
      }),
    ).toEqual([]);
  });
});
