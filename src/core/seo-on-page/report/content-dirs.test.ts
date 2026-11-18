import { describe, expect, it } from 'vitest';
import { seoPage } from '../../../testing/seo-page';
import { contentDirs } from './content-dirs';

function at(locale: string, sourcePath: string, kind: 'native' | 'external' = 'native') {
  return seoPage({ slug: sourcePath, locale, sourcePath, kind });
}

describe('contentDirs', () => {
  it('es la carpeta común de los archivos de cada idioma, con barra final', () => {
    const directories = contentDirs({
      pages: [
        at('en', 'src/content/docs/index.md'),
        at('en', 'src/content/docs/users/guide.md'),
        at('es', 'src/content/docs/es/index.md'),
        at('es', 'src/content/docs/es/users/guide.md'),
      ],
    });
    expect(directories).toEqual({ en: 'src/content/docs/', es: 'src/content/docs/es/' });
  });

  it('con un solo archivo es la carpeta que lo contiene', () => {
    expect(contentDirs({ pages: [at('en', 'docs/a/b.md')] })).toEqual({ en: 'docs/a/' });
  });

  it('un archivo en la raíz da una carpeta vacía, no una barra suelta', () => {
    expect(contentDirs({ pages: [at('en', 'a.md')] })).toEqual({ en: '' });
  });

  it('las páginas externas no cuentan: su archivo no vive en la carpeta de contenido', () => {
    const directories = contentDirs({
      pages: [at('en', 'src/content/docs/a.md'), at('en', 'CHANGELOG.md', 'external')],
    });
    expect(directories.en).toBe('src/content/docs/');
  });

  it('un idioma sin páginas propias no aparece', () => {
    const directories = contentDirs({ pages: [at('es', 'CHANGELOG.es.md', 'external')] });
    expect(directories).toEqual({});
  });

  it('compara carpetas enteras, no letras: `guide` y `guides` no comparten `guide`', () => {
    const directories = contentDirs({
      pages: [at('en', 'd/guide/a.md'), at('en', 'd/guides/b.md')],
    });
    expect(directories.en).toBe('d/');
  });
});
