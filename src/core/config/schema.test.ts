import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve';
import { DocsConfigSchema, PageSeoOverrideSchema } from './schema';
import { DocsErrors } from '../errors';
import { NavIcon } from './nav';
import { DEFAULT_TITLE_SUFFIX } from '../seo/title';

function messages(input: unknown): string[] {
  try {
    resolveConfig(input as never);
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
    throw error;
  }
  return [];
}

describe('seo de la config', () => {
  it('sufijo por defecto: el de la librería', () => {
    expect(resolveConfig({ name: 'Design' }).seo.titleSuffix).toBe(DEFAULT_TITLE_SUFFIX);
  });

  it('el sufijo acepta texto, un Label por idioma o `false`', () => {
    for (const titleSuffix of ['Docs', { en: 'Docs', es: 'Documentación' }, false as const]) {
      expect(resolveConfig({ name: 'X', seo: { titleSuffix } }).seo.titleSuffix).toEqual(
        titleSuffix,
      );
    }
  });

  it('`true` no es un sufijo válido: ruta `seo.titleSuffix`', () => {
    expect(messages({ name: 'X', seo: { titleSuffix: true } })[0]).toContain('seo.titleSuffix');
  });

  it('`titleTemplate` ya no existe y falla como opción desconocida', () => {
    expect(messages({ name: 'X', seo: { titleTemplate: '%s | X' } })[0]).toContain(
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
      const config = resolveConfig({
        name: 'X',
        locales: ['en', 'es'],
        seo: { image: { src, alt: { en: 'Logo', es: 'Logotipo' } } },
      });
      expect(config.seo.image?.src).toBe(src);
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
    expect(result.error?.issues[0]?.path).toEqual(['image', 'src']);
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
    const config = resolveConfig({
      name: 'X',
      external: [{ slug: 'a', file: 'a.md', seo: { noindex: true } }],
    });
    expect(config.external[0]?.seo).toEqual({ noindex: true });
  });

  it('el título SEO de un externo puede ir por idioma', () => {
    const seo = { title: { en: 'Readme', es: 'Léeme' } };
    const config = resolveConfig({ name: 'X', external: [{ slug: 'a', file: 'a.md', seo }] });
    expect(config.external[0]?.seo).toEqual(seo);
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
      tocDepth: 3,
    });
  });

  it('acepta cada campo y completa el resto con los valores por defecto', () => {
    expect(
      resolveConfig({ name: 'X', layout: { sidebar: 'collapsed', width: 'full' } }).layout,
    ).toEqual({ sidebar: 'collapsed', toc: 'open', width: 'full', toggles: true, tocDepth: 3 });
    expect(
      resolveConfig({ name: 'X', layout: { toc: 'collapsed', toggles: false } }).layout,
    ).toEqual({ sidebar: 'open', toc: 'collapsed', width: 'reading', toggles: false, tocDepth: 3 });
  });

  it('`tocDepth` y `tocMaxHeight` ajustan el índice', () => {
    expect(
      resolveConfig({ name: 'X', layout: { tocDepth: 4, tocMaxHeight: '60vh' } }).layout,
    ).toMatchObject({ tocDepth: 4, tocMaxHeight: '60vh' });
  });

  it('`tocDepth` fuera de 2 a 6 y `tocMaxHeight` sin unidad fallan con su ruta', () => {
    expect(messages({ name: 'X', layout: { tocDepth: 1 } })[0]).toContain('layout.tocDepth');
    expect(messages({ name: 'X', layout: { tocDepth: 7 } })[0]).toContain('layout.tocDepth');
    expect(messages({ name: 'X', layout: { tocMaxHeight: '60' } })[0]).toContain(
      'layout.tocMaxHeight',
    );
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

  it('una sección puede ser solo `sidebar`, sin `dir`', () => {
    expect(messages({ ...base, nav: [{ label: 'G', sidebar: ['a', 'b'] }] })).toEqual([]);
  });

  it('`sidebar` solo va con una sección e `icon` solo con `href`', () => {
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

describe('footer', () => {
  const base = { name: 'X', locales: ['en', 'es'] };

  it('sin `footer` queda sin definir', () => {
    expect(resolveConfig(base).footer).toBeUndefined();
  });

  it('acepta licencia en texto o con enlace, autor y enlaces de página o externos', () => {
    const footer = {
      license: { label: { en: 'MIT', es: 'MIT' }, href: 'https://x.dev/LICENSE' },
      author: { name: 'Ana', href: 'https://ana.dev' },
      links: [
        { label: 'Changelog', slug: 'changelog' },
        { label: { en: 'Blog', es: 'Bitácora' }, href: 'https://blog.dev' },
      ],
    };
    expect(resolveConfig({ ...base, footer }).footer).toEqual(footer);
    expect(resolveConfig({ ...base, footer: { license: 'MIT' } }).footer).toEqual({
      license: 'MIT',
    });
  });

  it('`author: false` es válido y oculta el autor', () => {
    expect(resolveConfig({ ...base, footer: { author: false } }).footer).toEqual({ author: false });
  });

  it('solo https: licencia, autor y enlaces, cada uno con su ruta', () => {
    expect(
      messages({ ...base, footer: { license: { label: 'MIT', href: 'http://x.dev' } } })[0],
    ).toContain('footer.license.href');
    expect(messages({ ...base, footer: { author: { name: 'Ana', href: '/ana' } } })[0]).toContain(
      'footer.author.href',
    );
    expect(
      messages({
        ...base,
        footer: {
          links: [
            { label: 'A', slug: 'a' },
            { label: 'B', href: 'http://b.dev' },
          ],
        },
      })[0],
    ).toContain('footer.links[1].href');
  });

  it('un enlace es una página (`slug`) o un enlace (`href`), solo uno', () => {
    expect(messages({ ...base, footer: { links: [{ label: 'A' }] } })[0]).toContain(
      'footer.links[0]',
    );
    expect(
      messages({
        ...base,
        footer: { links: [{ label: 'A', slug: 'a', href: 'https://a.dev' }] },
      })[0],
    ).toContain('footer.links[0]');
  });

  it('una opción desconocida se nombra con su ruta', () => {
    expect(messages({ ...base, footer: { color: 'red' } })).toEqual([
      expect.stringContaining('footer.color'),
    ]);
    expect(
      messages({ ...base, footer: { links: [{ label: 'A', slug: 'a', icon: 'github' }] } }),
    ).toEqual([expect.stringContaining('footer.links[0].icon')]);
  });
});

describe('seo de una página', () => {
  it('`titleSuffix` acepta texto, Label por idioma o `false`', () => {
    for (const titleSuffix of ['Docs', { es: 'Docs' }, false]) {
      expect(PageSeoOverrideSchema.safeParse({ titleSuffix }).success).toBe(true);
    }
    expect(PageSeoOverrideSchema.safeParse({ titleSuffix: true }).success).toBe(false);
  });
});

describe('seo.schema (JSON-LD)', () => {
  const org = { '@type': 'Organization', name: 'Acme', sameAs: ['https://acme.dev'] };

  it('la config acepta una lista de objetos con @type y claves libres, tal cual', () => {
    const config = resolveConfig({
      name: 'X',
      seo: { schema: [org, { '@type': ['Person', 'Thing'] }] },
    });
    expect(config.seo.schema?.[0]).toEqual(org);
  });

  it('sin schema declarado no hay nada: la librería no inventa ninguno', () => {
    expect(resolveConfig({ name: 'X' }).seo).not.toHaveProperty('schema');
  });

  it('la página acepta una lista o `false`', () => {
    expect(PageSeoOverrideSchema.safeParse({ schema: [org] }).success).toBe(true);
    expect(PageSeoOverrideSchema.safeParse({ schema: false }).success).toBe(true);
    expect(PageSeoOverrideSchema.safeParse({ schema: true }).success).toBe(false);
  });

  it("un schema sin @type falla en `seo.schema[1]['@type']`", () => {
    const [message] = messages({ name: 'X', seo: { schema: [org, { name: 'Sin tipo' }] } });
    expect(message).toContain("seo.schema[1]['@type']");
  });

  it('@type vacío, lista vacía o con no-strings fallan en su ruta', () => {
    for (const type of ['', [], ['Person', 3], 7]) {
      const [message] = messages({ name: 'X', seo: { schema: [{ '@type': type }] } });
      expect(message, JSON.stringify(type)).toContain("seo.schema[0]['@type']");
    }
  });

  it('una entrada que no es un objeto falla en `seo.schema[i]`', () => {
    const [message] = messages({ name: 'X', seo: { schema: ['Person'] } });
    expect(message).toMatch(/^seo\.schema\[0\]:/);
  });

  it('un valor que no es JSON (función) falla con la ruta del valor', () => {
    const [message] = messages({
      name: 'X',
      seo: { schema: [{ '@type': 'Thing', author: { name: () => 'x' } }] },
    });
    expect(message).toContain('seo.schema[0].author.name');
    expect(message).toContain('JSON');
  });

  it('en `external[].seo` el error lleva la ruta de la entrada', () => {
    const [message] = messages({
      name: 'X',
      external: [{ slug: 'a', file: 'a.md', seo: { schema: [{ name: 'x' }] } }],
    });
    expect(message).toContain("external[0].seo.schema[0]['@type']");
  });
});

describe('theme de la config', () => {
  it('es opcional', () => {
    expect(messages({ name: 'X' })).toEqual([]);
    expect(resolveConfig({ name: 'X' }).theme).toBeUndefined();
  });

  it('acepta la ruta de un .css del proyecto', () => {
    expect(resolveConfig({ name: 'X', theme: 'src/styles/site.css' }).theme).toBe(
      'src/styles/site.css',
    );
  });

  it.each([
    ['vacío', ''],
    ['sin extensión .css', 'src/styles/site'],
    ['una URL', 'https://x.dev/site.css'],
  ])('rechaza un valor %s con la ruta `theme`', (_name, theme) => {
    expect(messages({ name: 'X', theme })[0]).toContain('theme');
  });
});
