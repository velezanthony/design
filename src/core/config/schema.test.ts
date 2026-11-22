import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve';
import { DocsConfigSchema, PageSeoOverrideSchema } from './schema';
import { DocsErrors } from '../errors';
import { NavIcon } from './nav';
import { withConfig } from '../../testing/config';

function messages(input: unknown): string[] {
  try {
    resolveConfig(input as never);
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((problem) => problem.describe());
    throw error;
  }
  return [];
}

describe('ogLocales de la config', () => {
  it('da a cada idioma su og:locale con territorio', () => {
    const config = resolveConfig({
      site: { name: 'X', seo: { ogLocales: { es: 'es_ES', en: 'en_GB' } } },
      i18n: { locales: ['es', 'en'] },
    });
    expect(config.ogLocales).toEqual({ es: 'es_ES', en: 'en_GB' });
  });

  it('sin definir, no hay mapa', () => {
    expect(resolveConfig({ site: { name: 'X' } }).ogLocales).toBeUndefined();
  });

  it('un idioma que no está en `locales` falla con su ruta', () => {
    expect(
      messages({
        site: { name: 'X', seo: { ogLocales: { fr: 'fr_FR' } } },
        i18n: { locales: ['en'] },
      })[0],
    ).toContain('ogLocales.fr');
  });

  it('un valor que no es idioma_TERRITORIO falla con su ruta', () => {
    expect(
      messages({
        site: { name: 'X', seo: { ogLocales: { en: 'english' } } },
        i18n: { locales: ['en'] },
      })[0],
    ).toContain('ogLocales.en');
  });
});

describe('seo de la config', () => {
  it('sufijo por defecto: el `name` del sitio', () => {
    expect(resolveConfig({ site: { name: 'Design' } }).seo.titleSuffix).toBe('Design');
  });

  it('el sufijo acepta texto, un Label por idioma o `false`', () => {
    for (const titleSuffix of ['Docs', { en: 'Docs', es: 'Documentación' }, false as const]) {
      expect(resolveConfig({ site: { name: 'X', seo: { titleSuffix } } }).seo.titleSuffix).toEqual(
        titleSuffix,
      );
    }
  });

  it('`true` no es un sufijo válido: ruta `seo.titleSuffix`', () => {
    expect(messages({ site: { name: 'X', seo: { titleSuffix: true } } })[0]).toContain(
      'seo.titleSuffix',
    );
  });

  it('`titleTemplate` ya no existe y falla como opción desconocida', () => {
    expect(messages({ site: { name: 'X', seo: { titleTemplate: '%s | X' } } })[0]).toContain(
      'seo.titleTemplate',
    );
  });

  it('la imagen base sin alt falla con `seo.image.alt`', () => {
    expect(messages({ site: { name: 'X', seo: { image: { src: '/og.png' } } } })[0]).toContain(
      'seo.image.alt',
    );
  });

  it('la imagen base acepta ruta de public/ o https, con alt por idioma', () => {
    for (const src of ['/og.png', 'https://cdn.dev/og.png']) {
      const config = resolveConfig({
        site: { name: 'X', seo: { image: { src, alt: { en: 'Logo', es: 'Logotipo' } } } },
        i18n: { locales: ['en', 'es'] },
      });
      expect(config.seo.image?.src).toBe(src);
    }
  });

  it('una imagen que no es de public/ ni https falla con `seo.image.src`', () => {
    expect(
      messages({ site: { name: 'X', seo: { image: { src: 'og.png', alt: 'a' } } } })[0],
    ).toContain('seo.image.src');
  });

  it('la descripción es un Label: cadena o por idioma', () => {
    expect(
      resolveConfig({ site: { name: 'X', seo: { description: 'Docs' } } }).seo.description,
    ).toBe('Docs');
  });
});

describe('indexes ya no existe', () => {
  it('`indexes` es una opción desconocida: los listados se configuran en `folders`', () => {
    expect(messages({ site: { name: 'X' }, indexes: { layout: 'cards' } })).toEqual([
      expect.stringContaining('indexes: opción desconocida'),
    ]);
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
      site: { name: 'X' },
      content: {
        external: [
          { slug: 'a', file: 'a.md' },
          { slug: 'b', file: 'b.md', seo: { image: { alt: 'x' } } },
        ],
      },
    });
    expect(message).toContain('external[1].seo.image.src');
  });

  it('llega tal cual a la config resuelta', () => {
    const config = resolveConfig({
      site: { name: 'X' },
      content: { external: [{ slug: 'a', file: 'a.md', seo: { noindex: true } }] },
    });
    expect(config.external[0]?.seo).toEqual({ noindex: true });
  });

  it('el título SEO de un externo puede ir por idioma', () => {
    const seo = { title: { en: 'Readme', es: 'Léeme' } };
    const config = resolveConfig({
      site: { name: 'X' },
      content: { external: [{ slug: 'a', file: 'a.md', seo }] },
    });
    expect(config.external[0]?.seo).toEqual(seo);
  });
});

describe('DocsConfigSchema', () => {
  it('es la fuente de DocsUserConfig: su entrada acepta la config mínima', () => {
    expect(DocsConfigSchema.safeParse({ site: { name: 'X' } }).success).toBe(true);
  });
});

describe('layout de la config', () => {
  it('sin `layout` todo queda abierto, en lectura y con conmutadores', () => {
    expect(resolveConfig({ site: { name: 'X' } }).layout).toEqual({
      sidebar: 'open',
      toc: 'open',
      width: 'reading',
      toggles: true,
      tocDepth: 3,
    });
  });

  it('acepta cada campo y completa el resto con los valores por defecto', () => {
    expect(
      resolveConfig({ site: { name: 'X', layout: { sidebar: 'collapsed', width: 'full' } } })
        .layout,
    ).toEqual({ sidebar: 'collapsed', toc: 'open', width: 'full', toggles: true, tocDepth: 3 });
    expect(
      resolveConfig({ site: { name: 'X', layout: { toc: 'collapsed', toggles: false } } }).layout,
    ).toEqual({ sidebar: 'open', toc: 'collapsed', width: 'reading', toggles: false, tocDepth: 3 });
  });

  it('`tocDepth` y `tocMaxHeight` ajustan el índice', () => {
    expect(
      resolveConfig({ site: { name: 'X', layout: { tocDepth: 4, tocMaxHeight: '60vh' } } }).layout,
    ).toMatchObject({ tocDepth: 4, tocMaxHeight: '60vh' });
  });

  it('`tocDepth` fuera de 2 a 6 y `tocMaxHeight` sin unidad fallan con su ruta', () => {
    expect(messages({ site: { name: 'X', layout: { tocDepth: 1 } } })[0]).toContain(
      'layout.tocDepth',
    );
    expect(messages({ site: { name: 'X', layout: { tocDepth: 7 } } })[0]).toContain(
      'layout.tocDepth',
    );
    expect(messages({ site: { name: 'X', layout: { tocMaxHeight: '60' } } })[0]).toContain(
      'layout.tocMaxHeight',
    );
  });

  it('un valor desconocido falla con la ruta del campo', () => {
    const [sidebar] = messages({ site: { name: 'X', layout: { sidebar: 'hidden' } } });
    expect(sidebar).toContain('layout.sidebar');
    expect(messages({ site: { name: 'X', layout: { width: 'wide' } } })[0]).toContain(
      'layout.width',
    );
    expect(messages({ site: { name: 'X', layout: { toggles: 'yes' } } })[0]).toContain(
      'layout.toggles',
    );
  });

  it('una opción desconocida de `layout` se nombra con su ruta', () => {
    expect(messages({ site: { name: 'X', layout: { rail: true } } })).toEqual([
      expect.stringContaining('layout.rail'),
    ]);
  });
});

describe('nav', () => {
  const base = { site: { name: 'X' }, i18n: { locales: ['en', 'es'] } };

  it('sin `nav` no cambia nada: queda sin definir', () => {
    expect(resolveConfig({ site: { name: 'X' } }).nav).toBeUndefined();
  });

  it('acepta una sección, una página y un enlace con icono', () => {
    const nav = [
      { label: { en: 'Guide', es: 'Guía' }, dir: 'users', sidebar: ['users/a'] },
      { label: 'Changelog', slug: 'changelog' },
      { label: 'GitHub', href: 'https://github.com/x/y', icon: NavIcon.GITHUB },
    ];
    expect(resolveConfig(withConfig(base, { content: { nav } })).nav).toEqual(nav);
  });

  it('NavIcon es un objeto `as const` con el icono de GitHub', () => {
    expect(NavIcon).toEqual({ GITHUB: 'github' });
  });

  it('un icono desconocido falla con la ruta del campo', () => {
    const out = messages(
      withConfig(base, {
        content: { nav: [{ label: 'G', href: 'https://x.dev', icon: 'twitter' }] },
      }),
    );
    expect(out[0]).toContain('nav[0].icon');
  });

  it('solo https: un href http o relativo falla con su ruta', () => {
    expect(
      messages(withConfig(base, { content: { nav: [{ label: 'G', href: 'http://x.dev' }] } }))[0],
    ).toContain('nav[0].href');
    expect(
      messages(withConfig(base, { content: { nav: [{ label: 'G', href: '/x' }] } }))[0],
    ).toContain('nav[0].href');
  });

  it('cada item es exactamente uno de sección, página o enlace', () => {
    expect(messages(withConfig(base, { content: { nav: [{ label: 'G' }] } }))[0]).toContain(
      'nav[0]',
    );
    expect(
      messages(withConfig(base, { content: { nav: [{ label: 'G', dir: 'a', slug: 'b' }] } }))[0],
    ).toContain('nav[0]');
  });

  it('una sección puede ser solo `sidebar`, sin `dir`', () => {
    expect(
      messages(withConfig(base, { content: { nav: [{ label: 'G', sidebar: ['a', 'b'] }] } })),
    ).toEqual([]);
  });

  it('`sidebar` solo va con una sección e `icon` solo con `href`', () => {
    expect(
      messages(
        withConfig(base, { content: { nav: [{ label: 'G', slug: 'a', sidebar: ['a'] }] } }),
      )[0],
    ).toContain('nav[0].sidebar');
    expect(
      messages(
        withConfig(base, { content: { nav: [{ label: 'G', dir: 'a', icon: 'github' }] } }),
      )[0],
    ).toContain('nav[0].icon');
  });

  it('una opción desconocida de un item se nombra con su ruta', () => {
    expect(
      messages(withConfig(base, { content: { nav: [{ label: 'G', dir: 'a', color: 'red' }] } })),
    ).toEqual([expect.stringContaining('nav[0].color')]);
  });

  it('el dir va sin barras al principio ni al final', () => {
    expect(
      messages(withConfig(base, { content: { nav: [{ label: 'G', dir: '/users/' }] } }))[0],
    ).toContain('nav[0].dir');
  });

  it('dirs que se solapan fallan: iguales o uno prefijo del otro', () => {
    const same = messages(
      withConfig(base, {
        content: {
          nav: [
            { label: 'A', dir: 'users' },
            { label: 'B', dir: 'users' },
          ],
        },
      }),
    );
    expect(same[0]).toContain('nav[1].dir');
    const nested = messages(
      withConfig(base, {
        content: {
          nav: [
            { label: 'A', dir: 'users' },
            { label: 'B', dir: 'users/guide' },
          ],
        },
      }),
    );
    expect(nested[0]).toContain('nav[1].dir');
    expect(nested[0]).toContain('nav[0]');
  });

  it('dirs hermanos con prefijo de texto común no se solapan', () => {
    expect(
      messages(
        withConfig(base, {
          content: {
            nav: [
              { label: 'A', dir: 'users' },
              { label: 'B', dir: 'users-extra' },
            ],
          },
        }),
      ),
    ).toEqual([]);
  });
});

describe('footer', () => {
  const base = { site: { name: 'X' }, i18n: { locales: ['en', 'es'] } };

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
    expect(resolveConfig(withConfig(base, { site: { footer } })).footer).toEqual(footer);
    expect(
      resolveConfig(withConfig(base, { site: { footer: { license: 'MIT' } } })).footer,
    ).toEqual({
      license: 'MIT',
    });
  });

  it('`author: false` es válido y oculta el autor', () => {
    expect(resolveConfig(withConfig(base, { site: { footer: { author: false } } })).footer).toEqual(
      {
        author: false,
      },
    );
  });

  it('solo https: licencia, autor y enlaces, cada uno con su ruta', () => {
    expect(
      messages(
        withConfig(base, { site: { footer: { license: { label: 'MIT', href: 'http://x.dev' } } } }),
      )[0],
    ).toContain('footer.license.href');
    expect(
      messages(
        withConfig(base, { site: { footer: { author: { name: 'Ana', href: '/ana' } } } }),
      )[0],
    ).toContain('footer.author.href');
    expect(
      messages(
        withConfig(base, {
          site: {
            footer: {
              links: [
                { label: 'A', slug: 'a' },
                { label: 'B', href: 'http://b.dev' },
              ],
            },
          },
        }),
      )[0],
    ).toContain('footer.links[1].href');
  });

  it('un enlace es una página (`slug`) o un enlace (`href`), solo uno', () => {
    expect(
      messages(withConfig(base, { site: { footer: { links: [{ label: 'A' }] } } }))[0],
    ).toContain('footer.links[0]');
    expect(
      messages(
        withConfig(base, {
          site: { footer: { links: [{ label: 'A', slug: 'a', href: 'https://a.dev' }] } },
        }),
      )[0],
    ).toContain('footer.links[0]');
  });

  it('una opción desconocida se nombra con su ruta', () => {
    expect(messages(withConfig(base, { site: { footer: { color: 'red' } } }))).toEqual([
      expect.stringContaining('footer.color'),
    ]);
    expect(
      messages(
        withConfig(base, {
          site: { footer: { links: [{ label: 'A', slug: 'a', icon: 'github' }] } },
        }),
      ),
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
      site: { name: 'X', seo: { schema: [org, { '@type': ['Person', 'Thing'] }] } },
    });
    expect(config.seo.schema?.[0]).toEqual(org);
  });

  it('sin schema declarado no hay nada: la librería no inventa ninguno', () => {
    expect(resolveConfig({ site: { name: 'X' } }).seo).not.toHaveProperty('schema');
  });

  it('la página acepta una lista o `false`', () => {
    expect(PageSeoOverrideSchema.safeParse({ schema: [org] }).success).toBe(true);
    expect(PageSeoOverrideSchema.safeParse({ schema: false }).success).toBe(true);
    expect(PageSeoOverrideSchema.safeParse({ schema: true }).success).toBe(false);
  });

  it("un schema sin @type falla en `seo.schema[1]['@type']`", () => {
    const [message] = messages({
      site: { name: 'X', seo: { schema: [org, { name: 'Sin tipo' }] } },
    });
    expect(message).toContain("seo.schema[1]['@type']");
  });

  it('@type vacío, lista vacía o con no-strings fallan en su ruta', () => {
    for (const type of ['', [], ['Person', 3], 7]) {
      const [message] = messages({ site: { name: 'X', seo: { schema: [{ '@type': type }] } } });
      expect(message, JSON.stringify(type)).toContain("seo.schema[0]['@type']");
    }
  });

  it('una entrada que no es un objeto falla en `seo.schema[i]`', () => {
    const [message] = messages({ site: { name: 'X', seo: { schema: ['Person'] } } });
    expect(message).toMatch(/^site\.seo\.schema\[0\]:/);
  });

  it('un valor que no es JSON (función) falla con la ruta del valor', () => {
    const [message] = messages({
      site: { name: 'X', seo: { schema: [{ '@type': 'Thing', author: { name: () => 'x' } }] } },
    });
    expect(message).toContain('seo.schema[0].author.name');
    expect(message).toContain('JSON');
  });

  it('en `external[].seo` el error lleva la ruta de la entrada', () => {
    const [message] = messages({
      site: { name: 'X' },
      content: { external: [{ slug: 'a', file: 'a.md', seo: { schema: [{ name: 'x' }] } }] },
    });
    expect(message).toContain("external[0].seo.schema[0]['@type']");
  });
});

describe('theme de la config', () => {
  it('es opcional', () => {
    expect(messages({ site: { name: 'X' } })).toEqual([]);
    expect(resolveConfig({ site: { name: 'X' } }).theme).toBeUndefined();
  });

  it('acepta la ruta de un .css del proyecto', () => {
    expect(resolveConfig({ site: { name: 'X', theme: 'src/styles/site.css' } }).theme).toBe(
      'src/styles/site.css',
    );
  });

  it.each([
    ['vacío', ''],
    ['sin extensión .css', 'src/styles/site'],
    ['una URL', 'https://x.dev/site.css'],
  ])('rechaza un valor %s con la ruta `theme`', (_name, theme) => {
    expect(messages({ site: { name: 'X', theme } })[0]).toContain('theme');
  });
});

describe('components de la config', () => {
  it('es opcional: sin él no hay componentes propios', () => {
    expect(messages({ site: { name: 'X' } })).toEqual([]);
    expect(resolveConfig({ site: { name: 'X' } }).components).toBeUndefined();
  });

  it('acepta la ruta de un .astro del proyecto como `Footer`', () => {
    const config = resolveConfig({
      site: { name: 'X', components: { Footer: './src/components/Footer.astro' } },
    });
    expect(config.components).toEqual({ Footer: './src/components/Footer.astro' });
  });

  it.each([
    ['vacío', ''],
    ['que no es .astro', 'src/components/Footer.tsx'],
    ['una URL', 'https://x.dev/Footer.astro'],
  ])('rechaza un `Footer` %s con su ruta', (_name, Footer) => {
    const [message] = messages({ site: { name: 'X', components: { Footer } } });
    expect(message).toContain('components.Footer');
    expect(message).toContain('.astro');
  });

  it('un componente desconocido falla con su ruta completa', () => {
    expect(
      messages({ site: { name: 'X', components: { Header: './src/components/Header.astro' } } }),
    ).toEqual(['site.components.Header: opción desconocida.']);
  });
});

describe('static de la config', () => {
  const base = { site: { name: 'X' }, i18n: { locales: ['en', 'es'] } };

  it('acepta carpetas con su destino y sin `static` no hay ninguna', () => {
    const folders = [{ from: '../htmlcov', to: 'coverage' }];
    expect(resolveConfig(withConfig(base, { content: { static: folders } })).static).toEqual(
      folders,
    );
    expect(resolveConfig(base).static).toBeUndefined();
  });

  it('una carpeta inválida falla con su ruta', () => {
    expect(
      messages(withConfig(base, { content: { static: [{ from: '/abs', to: 'c' }] } }))[0],
    ).toContain('static[0]');
    expect(
      messages(withConfig(base, { content: { static: [{ from: 'out', to: 'es' }] } }))[0],
    ).toContain('static[0]');
  });

  it('destinos que se solapan fallan en el segundo', () => {
    const out = messages(
      withConfig(base, {
        content: {
          static: [
            { from: 'a', to: 'reports' },
            { from: 'b', to: 'reports/api' },
          ],
        },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('static[1].to');
    expect(out[0]).toContain('static[0]');
  });

  it('cada carpeta acepta `exclude`: patrones relativos a `from`', () => {
    const folders = [{ from: 'cov', to: 'coverage', exclude: ['assets/script/', '*.py'] }];
    expect(resolveConfig(withConfig(base, { content: { static: folders } })).static).toEqual(
      folders,
    );
  });

  it('un patrón vacío o que no es una lista falla con su ruta', () => {
    expect(
      messages(
        withConfig(base, { content: { static: [{ from: 'a', to: 'b', exclude: [''] }] } }),
      )[0],
    ).toContain('static[0].exclude[0]');
    expect(
      messages(
        withConfig(base, {
          content: { static: [{ from: 'a', to: 'b', exclude: '*.py' as never }] },
        }),
      )[0],
    ).toContain('static[0].exclude');
  });

  it('una opción desconocida se nombra con su ruta', () => {
    expect(
      messages(withConfig(base, { content: { static: [{ from: 'a', to: 'b', copy: true }] } }))[0],
    ).toContain('static[0].copy');
  });
});

describe('config: lo que el esquema promete rechazar', () => {
  const base = { site: { name: 'X' }, i18n: { locales: ['en', 'es'] } };

  describe('JSON-LD', () => {
    function schemaMessages(extra: Record<string, unknown>): string[] {
      return messages(
        withConfig(base, { site: { seo: { schema: [{ '@type': 'Thing', ...extra }] } } }),
      );
    }

    it.each([
      ['un símbolo', Symbol('x')],
      ['un bigint', 10n],
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
    ])('%s no es JSON: falla con la ruta del valor', (_name, value) => {
      const [message] = schemaMessages({ value });
      expect(message).toContain('seo.schema[0].value');
      expect(message).toContain('JSON');
    });

    it('el valor malo dentro de una lista se señala con su índice', () => {
      const [message] = schemaMessages({ items: [1, 2, () => 3] });
      expect(message).toContain('seo.schema[0].items[2]');
    });

    it('números finitos, null, listas y objetos anidados sí pasan', () => {
      expect(
        schemaMessages({ zero: 0, negative: -1.5, nothing: null, list: [1, { a: [true] }] }),
      ).toEqual([]);
    });
  });

  describe('external[]', () => {
    it.each(['/a', 'a/'])('el slug «%s» con barra a un lado falla', (slug) => {
      expect(
        messages(withConfig(base, { content: { external: [{ slug, file: 'a.md' }] } }))[0],
      ).toContain('external[0].slug');
    });

    it('un slug con barras en medio es válido', () => {
      expect(
        messages(withConfig(base, { content: { external: [{ slug: 'guides/a', file: 'a.md' }] } })),
      ).toEqual([]);
    });

    it('el archivo no puede ser una URL', () => {
      expect(
        messages(
          withConfig(base, { content: { external: [{ slug: 'a', file: 'https://x.dev/a.md' }] } }),
        )[0],
      ).toContain('external[0].file');
    });
  });

  describe('favicon', () => {
    it('una ruta con dos puntos fuera del inicio no se confunde con un esquema', () => {
      expect(messages(withConfig(base, { site: { favicon: 'img/a:b.svg' } }))).toEqual([]);
    });

    it.each(['http://x.dev/f.svg', '//x.dev/f.svg', 'data:image/svg+xml,x'])(
      '«%s» no es https ni ruta de public/',
      (favicon) => {
        expect(messages(withConfig(base, { site: { favicon } }))[0]).toContain('favicon');
      },
    );
  });

  describe('idiomas por defecto', () => {
    it('sin `locales` el idioma es `en`: `defaultLocale` y `ui` en `en` valen', () => {
      expect(
        messages({ site: { name: 'X' }, i18n: { defaultLocale: 'en', ui: { en: {} } } }),
      ).toEqual([]);
    });
  });

  describe('nav[].dir', () => {
    it.each(['', '/users', 'users/'])('la carpeta «%s» falla', (dir) => {
      expect(messages(withConfig(base, { content: { nav: [{ label: 'G', dir }] } }))[0]).toContain(
        'nav[0].dir',
      );
    });

    it('una carpeta anidada sin barras en los extremos es válida', () => {
      expect(
        messages(withConfig(base, { content: { nav: [{ label: 'G', dir: 'users/guide' }] } })),
      ).toEqual([]);
    });

    it('el solape se detecta también cuando la carpeta hija va primero', () => {
      const [message] = messages(
        withConfig(base, {
          content: {
            nav: [
              { label: 'A', dir: 'users/guide' },
              { label: 'B', dir: 'users' },
            ],
          },
        }),
      );
      expect(message).toContain('nav[1].dir');
    });
  });
});

describe('sidebarDepth ya no existe', () => {
  it('`sidebarDepth` es una opción desconocida: la profundidad es `content.folders[…].tree.depth`', () => {
    expect(messages({ site: { name: 'X' }, sidebarDepth: 3 })).toEqual([
      expect.stringContaining('sidebarDepth: opción desconocida'),
    ]);
  });

  it('`nav[n].sidebarDepth` es una opción desconocida', () => {
    expect(
      messages({
        site: { name: 'X' },
        content: { nav: [{ label: 'G', dir: 'guia', sidebarDepth: 2 }] },
      }),
    ).toEqual([expect.stringContaining('nav[0].sidebarDepth: opción desconocida')]);
  });
});

describe('folders de la config', () => {
  it('una vista fuera de las opciones falla con su ruta y lista las válidas', () => {
    const [problem] = messages({
      site: { name: 'X' },
      content: { folders: { '*': { listing: { view: 'grid' } } } },
    });
    expect(problem).toContain("folders['*'].listing.view");
    for (const view of ['list', 'table', 'cards']) expect(problem).toContain(view);
  });

  it('una clave desconocida en `tree` falla con su ruta', () => {
    expect(
      messages({ site: { name: 'X' }, content: { folders: { guia: { tree: { levels: 2 } } } } }),
    ).toEqual([expect.stringContaining('folders.guia.tree.levels: opción desconocida')]);
  });

  it('una clave desconocida en una carpeta falla con su ruta', () => {
    expect(
      messages({ site: { name: 'X' }, content: { folders: { guia: { title: 'Guía' } } } }),
    ).toEqual([expect.stringContaining('folders.guia.title: opción desconocida')]);
  });

  it('sin `folders`, la config resuelta lleva un mapa vacío', () => {
    expect(resolveConfig({ site: { name: 'X' } }).folders).toEqual({ declared: {} });
  });

  it('la config resuelta conserva lo declarado', () => {
    const folders = { '*': { listing: { view: 'cards' as const } }, guia: { tree: { depth: 1 } } };
    expect(resolveConfig({ site: { name: 'X' }, content: { folders } }).folders).toEqual({
      declared: folders,
    });
  });
});

/* La config pública va en tres grupos: `site` (cómo se ve), `i18n` (idiomas y textos) y `content`
   (qué páginas hay y cómo se navega). */
describe('config agrupada: site, i18n y content', () => {
  it.each([
    'name',
    'seo',
    'favicon',
    'ogLocales',
    'theme',
    'static',
    'exclude',
    'locales',
    'defaultLocale',
    'translations',
    'ui',
    'external',
    'sidebar',
    'nav',
    'footer',
    'folders',
    'components',
    'editUrl',
    'repoRoot',
    'privacyUrl',
    'gtmId',
    'social',
    'sitemap',
    'layout',
  ])('la clave antigua de primer nivel `%s` es desconocida', (key) => {
    expect(messages({ site: { name: 'X' }, [key]: {} })).toContainEqual(
      expect.stringContaining(`${key}: opción desconocida`),
    );
  });

  it('`site` es obligatorio: lleva el nombre', () => {
    expect(messages({})).toContainEqual(expect.stringContaining('site'));
    expect(messages({ site: {} })).toContainEqual(expect.stringContaining('site.name'));
  });

  it.each([
    [{ site: { name: 'X', seo: { image: { src: 'http://x', alt: 'A' } } } }, 'site.seo.image.src'],
    [
      {
        site: { name: 'X' },
        content: {
          nav: [
            { label: 'A', dir: 'a' },
            { label: 'B', dir: '/b/' },
          ],
        },
      },
      'content.nav[1].dir',
    ],
    [{ site: { name: 'X' }, i18n: { locales: ['es'], ui: { fr: {} } } }, 'i18n.ui.fr'],
    [{ site: { name: 'X' }, i18n: { locales: ['es'], defaultLocale: 'en' } }, 'i18n.defaultLocale'],
    [{ site: { name: 'X' }, i18n: { missing: 'never' } }, 'i18n.missing'],
    [{ site: { name: 'X' }, content: { dir: '/abs' } }, 'content.dir'],
    [
      { site: { name: 'X', footer: { links: [{ label: 'L', href: 'http://x' }] } } },
      'site.footer.links[0].href',
    ],
  ])('cada clave valida con su ruta nueva (%#: %s)', (input, path) => {
    expect(messages(input).join('\n')).toContain(path);
  });

  it.each([
    [
      { site: { name: 'X', analytics: { privacyUrl: { fr: '/p' } } }, i18n: { locales: ['es'] } },
      'site.analytics.privacyUrl.fr',
    ],
    [
      {
        site: { name: 'X', seo: { ogLocales: { fr: 'fr_FR' } } },
        i18n: { locales: ['es'] },
      },
      'site.seo.ogLocales.fr',
    ],
    [
      {
        site: { name: 'X' },
        i18n: { locales: ['es'] },
        content: { external: [{ slug: 'a', file: 'a.md', locales: ['fr'] }] },
      },
      'content.external[0].locales[0]',
    ],
    [
      {
        site: { name: 'X' },
        content: {
          static: [
            { from: 'a', to: 'b' },
            { from: 'c', to: 'b' },
          ],
        },
      },
      'content.static[1].to',
    ],
  ])('las validaciones que cruzan grupos nombran la ruta nueva (%#: %s)', (input, path) => {
    const found = messages(input).join('\n');
    expect(found).toContain(path);
  });

  it('un idioma que falta en `i18n.locales` lo dice con la clave nueva', () => {
    expect(
      messages({ site: { name: 'X' }, i18n: { locales: ['es'], ui: { fr: {} } } })[0],
    ).toContain('`i18n.locales`');
  });
});
