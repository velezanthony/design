import { describe, expect, it } from 'vitest';
import { mockedAstroContent } from './astro-content';

const docs = [
  ['en/index', { slug: '', locale: 'en', title: 'Home', sourcePath: 'src/content/docs/index.md' }],
  [
    'es/guide',
    { slug: 'guide', locale: 'es', title: 'Guía', sourcePath: 'src/content/docs/guide.es.md' },
    '# Guía',
  ],
] as const;

describe('mockedAstroContent', () => {
  it('getCollection devuelve las entradas con su id y datos', async () => {
    const { getCollection } = mockedAstroContent({ docs: [...docs] });
    const entries = await getCollection('docs');
    expect(entries.map((e) => e.id)).toEqual(['en/index', 'es/guide']);
    expect(entries[1]?.data.title).toBe('Guía');
    expect(entries[1]?.body).toBe('# Guía');
  });

  it('getCollection acepta un filtro', async () => {
    const { getCollection } = mockedAstroContent({ docs: [...docs] });
    const entries = await getCollection('docs', (e) => e.data.locale === 'en');
    expect(entries.map((e) => e.id)).toEqual(['en/index']);
  });

  it('getEntry encuentra por id y devuelve undefined si no existe', async () => {
    const { getEntry } = mockedAstroContent({ docs: [...docs] });
    expect((await getEntry('docs', 'es/guide'))?.data.slug).toBe('guide');
    expect(await getEntry('docs', 'xx/nada')).toBeUndefined();
  });

  it('valida los datos con docsSchema(): un campo obligatorio ausente falla', () => {
    expect(() => mockedAstroContent({ docs: [['en/x', { slug: 'x', locale: 'en' }]] })).toThrow(
      /title/,
    );
  });
});
