import { describe, expect, it } from 'vitest';
import { resolveMeta, withImageSize, type ResolvedMeta, type SeoBase } from './meta';

const base: SeoBase = { titleSuffix: 'Design' };
const page = { title: 'Install guide' };

describe('resolveMeta: título', () => {
  it('sin override se deriva del título de la página (su H1)', () => {
    expect(resolveMeta(base, undefined, page, 'en').title).toBe('Install guide');
  });

  it('`seo.title` de la página gana, solo para el head', () => {
    const meta = resolveMeta(base, { title: 'Install Design on any OS' }, page, 'en');
    expect(meta.title).toBe('Install Design on any OS');
    expect(page.title).toBe('Install guide');
  });

  it('`seo.title` por idioma: el del idioma de la página, y sin él el título de la página', () => {
    const override = { title: { en: 'Install on any OS', es: 'Instalar en cualquier SO' } };
    expect(resolveMeta(base, override, page, 'es').title).toBe('Instalar en cualquier SO');
    expect(resolveMeta(base, override, page, 'fr').title).toBe('Install guide');
  });

  it('lleva el sufijo ya resuelto para el idioma, para que el head forme el <title>', () => {
    expect(resolveMeta(base, undefined, page, 'en').titleSuffix).toBe('Design');
    expect(resolveMeta({ titleSuffix: { es: 'Diseño' } }, undefined, page, 'es').titleSuffix).toBe(
      'Diseño',
    );
  });

  it('el sufijo de la página gana al del sitio; `false` lo quita', () => {
    expect(resolveMeta(base, { titleSuffix: 'Otro' }, page, 'en').titleSuffix).toBe('Otro');
    const meta = resolveMeta(base, { titleSuffix: false }, page, 'en');
    expect(meta.titleSuffix).toBeUndefined();
    expect('titleSuffix' in meta).toBe(false);
  });
});

describe('resolveMeta: descripción', () => {
  it('sin override ni base no hay descripción', () => {
    const meta = resolveMeta(base, undefined, page, 'en');
    expect(meta.description).toBeUndefined();
    expect('description' in meta).toBe(false);
  });

  it('la base se usa si la página no define la suya', () => {
    expect(resolveMeta({ ...base, description: 'Docs' }, undefined, page, 'en').description).toBe(
      'Docs',
    );
  });

  it('el override de la página gana a la base', () => {
    const meta = resolveMeta(
      { ...base, description: 'Docs' },
      { description: 'Propia' },
      page,
      'en',
    );
    expect(meta.description).toBe('Propia');
  });

  it('se resuelve por el idioma de la página', () => {
    const withLabel = { ...base, description: { en: 'Docs', es: 'Documentación' } };
    expect(resolveMeta(withLabel, undefined, page, 'es').description).toBe('Documentación');
    expect(resolveMeta(withLabel, undefined, page, 'en').description).toBe('Docs');
  });

  it('un Label del override sin ese idioma cae a la base (campo a campo)', () => {
    const meta = resolveMeta(
      { ...base, description: 'Docs' },
      { description: { es: 'x' } },
      page,
      'en',
    );
    expect(meta.description).toBe('Docs');
  });
});

describe('resolveMeta: imagen (unidad atómica)', () => {
  const withImage: SeoBase = {
    ...base,
    image: { src: '/og.png', alt: { en: 'Logo', es: 'Logotipo' } },
  };

  it('la base aporta la imagen y su alt por idioma', () => {
    expect(resolveMeta(withImage, undefined, page, 'es').image).toEqual({
      src: '/og.png',
      alt: 'Logotipo',
    });
  });

  it('override parcial: descripción propia e imagen de la base', () => {
    const meta = resolveMeta(
      { ...withImage, description: 'Base' },
      { description: 'Mía' },
      page,
      'en',
    );
    expect(meta.description).toBe('Mía');
    expect(meta.image).toEqual({ src: '/og.png', alt: 'Logo' });
  });

  it('imagen propia sin alt: el alt es el título de la PÁGINA, no el de la base', () => {
    const meta = resolveMeta(withImage, { image: { src: '/a.png' } }, page, 'en');
    expect(meta.image).toEqual({ src: '/a.png', alt: 'Install guide' });
  });

  it('imagen propia con alt por idioma', () => {
    const meta = resolveMeta(
      withImage,
      { image: { src: '/a.png', alt: { en: 'Own', es: 'Propia' } } },
      page,
      'es',
    );
    expect(meta.image).toEqual({ src: '/a.png', alt: 'Propia' });
  });

  it('sin imagen en ningún sitio no hay imagen', () => {
    expect(resolveMeta(base, undefined, page, 'en').image).toBeUndefined();
  });

  it('un alt de la base sin ese idioma usa el título de la página', () => {
    const only: SeoBase = { ...base, image: { src: '/og.png', alt: { es: 'Logotipo' } } };
    expect(resolveMeta(only, undefined, page, 'en').image?.alt).toBe('Install guide');
  });
});

describe('resolveMeta: noindex', () => {
  it('por defecto se indexa', () => {
    expect(resolveMeta(base, undefined, page, 'en').noindex).toBe(false);
  });

  it('`seo.noindex` lo desactiva', () => {
    expect(resolveMeta(base, { noindex: true }, page, 'en').noindex).toBe(true);
  });
});

describe('withImageSize', () => {
  const meta: ResolvedMeta = {
    title: 'T',
    image: { src: '/og.png', alt: 'A' },
    noindex: false,
    schemas: [],
  };

  it('añade width y height cuando se conoce el tamaño de la imagen', () => {
    const sized = withImageSize(meta, new Map([['/og.png', { width: 1200, height: 630 }]]));
    expect(sized.image).toEqual({ src: '/og.png', alt: 'A', width: 1200, height: 630 });
  });

  it('no inventa dimensiones si no se leyeron (https, ilegible)', () => {
    expect(withImageSize(meta, new Map()).image).toEqual({ src: '/og.png', alt: 'A' });
  });

  it('sin imagen devuelve la misma meta', () => {
    const bare = { ...meta, image: undefined };
    expect(withImageSize(bare, new Map([['/og.png', { width: 1, height: 1 }]]))).toBe(bare);
  });
});

describe('resolveMeta: schemas', () => {
  const org = { '@type': 'Organization', name: 'Acme' };
  const person = { '@type': 'Person', name: 'Ada' };

  it('sin schemas en la base ni en la página no hay ninguno', () => {
    expect(resolveMeta(base, undefined, page, 'en').schemas).toEqual([]);
  });

  it('los del sitio y los de la página, en ese orden, con @context', () => {
    const meta = resolveMeta({ ...base, schema: [org] }, { schema: [person] }, page, 'en');
    expect(meta.schemas.map((schema) => schema['@type'])).toEqual(['Organization', 'Person']);
    expect(meta.schemas.every((schema) => schema['@context'] === 'https://schema.org')).toBe(true);
  });

  it('`schema: false` en la página quita también los del sitio', () => {
    expect(resolveMeta({ ...base, schema: [org] }, { schema: false }, page, 'en').schemas).toEqual(
      [],
    );
  });
});
