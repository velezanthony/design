import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import { collectImageRefs, imageErrors, isRemoteImage, publicImagePath } from './image-refs';

const page = (sourcePath: string, seo?: Page['seo']): Page => ({
  slug: 'x',
  locale: 'en',
  title: 'X',
  kind: 'native',
  sourcePath,
  body: '',
  ...(seo && { seo }),
});

describe('collectImageRefs', () => {
  it('reúne la imagen de la base y las de cada página con su procedencia', () => {
    const refs = collectImageRefs({ src: '/base.png', alt: 'b' }, [
      page('a.md', { image: { src: '/a.png' } }),
      page('b.md'),
      page('../CHANGELOG.md', { image: { src: 'https://x.dev/c.png' } }),
    ]);
    expect(refs).toEqual([
      { src: '/base.png', field: 'seo.image.src' },
      { src: '/a.png', field: 'seo.image.src', file: 'a.md' },
      { src: 'https://x.dev/c.png', field: 'seo.image.src', file: '../CHANGELOG.md' },
    ]);
  });

  it('sin imágenes no hay referencias', () => {
    expect(collectImageRefs(undefined, [page('a.md', { title: 'x' })])).toEqual([]);
  });
});

describe('isRemoteImage / publicImagePath', () => {
  it('https es remota y /ruta es de public/', () => {
    expect(isRemoteImage('https://x.dev/a.png')).toBe(true);
    expect(isRemoteImage('/a.png')).toBe(false);
    expect(publicImagePath('/img/og.png')).toBe('img/og.png');
  });
});

describe('imageErrors', () => {
  const refs = [
    { src: '/base.png', field: 'seo.image.src' },
    { src: '/a.png', field: 'seo.image.src', file: 'a.md' },
    { src: '/a.png', field: 'seo.image.src', file: 'b.md' },
  ];

  it('un error por referencia ausente, con archivo y campo, todos juntos', () => {
    const errors = imageErrors(refs, new Set(['/base.png']));
    expect(errors).toHaveLength(2);
    expect(errors.map((error) => error.file)).toEqual(['a.md', 'b.md']);
    expect(errors[0].message).toContain('seo.image.src');
    expect(errors[0].message).toContain('/a.png');
    expect(errors[0].hint).toContain('public/');
  });

  it('la imagen de la base sin archivo se nombra con su campo de config', () => {
    const [error] = imageErrors([refs[0]], new Set());
    expect(error.file).toBeUndefined();
    expect(error.message).toContain('seo.image.src');
  });

  it('las remotas no se comprueban', () => {
    expect(
      imageErrors([{ src: 'https://x.dev/a.png', field: 'seo.image.src' }], new Set()),
    ).toEqual([]);
  });

  it('todas presentes: sin errores', () => {
    expect(imageErrors(refs, new Set(['/base.png', '/a.png']))).toEqual([]);
  });
});
