import { describe, expect, it } from 'vitest';
import { applyTitleTemplate, resolveMeta, type SeoBase } from './meta';

const base: SeoBase = { titleTemplate: '%s · Design' };
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

  it('lleva la plantilla para que el head forme el <title>', () => {
    expect(resolveMeta(base, undefined, page, 'en').titleTemplate).toBe('%s · Design');
  });
});

describe('applyTitleTemplate', () => {
  it('sustituye %s por el título', () => {
    expect(applyTitleTemplate('%s · Design', 'Install guide')).toBe('Install guide · Design');
  });

  it('no interpreta los patrones especiales de replace ($&)', () => {
    expect(applyTitleTemplate('%s · X', 'Cost $& more')).toBe('Cost $& more · X');
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
