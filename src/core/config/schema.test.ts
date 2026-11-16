import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve';
import { DocsConfigSchema, PageSeoOverrideSchema } from './schema';
import { DocsErrors } from '../errors';

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
