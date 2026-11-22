import { describe, expect, it } from 'vitest';
import { resolveFolders, type FoldersUserConfig } from '../config/folders';
import { defaultStrings, translate } from '../i18n/ui-strings';
import type { Page } from './discovery';
import {
  contentFolders,
  generatedListingPages,
  listingFolders,
  listingSourceErrors,
  listsFolder,
  replacedListings,
} from './generated-listings';

function page(slug: string, sourcePath: string, extra: Partial<Page> = {}): Page {
  return {
    slug,
    locale: 'es',
    title: slug || 'Inicio',
    kind: 'native',
    sourcePath,
    body: '',
    ...extra,
  };
}

/* Un árbol como el del autor: `articulos` con carpetas intermedias sin página propia. */
const tree = [
  page('articulos/desarrollo/python/x', 'articulos/desarrollo/python/x.md'),
  page('articulos/sistemas/cloud/aws/y', 'articulos/sistemas/cloud/aws/y.md'),
  page('guia/a', 'guia/a.md'),
];

function folders(user: FoldersUserConfig) {
  return resolveFolders(user);
}

describe('contentFolders', () => {
  it('cada carpeta de la que cuelga alguna página, también las intermedias', () => {
    expect(contentFolders(['', 'guia', 'tutoriales/instalacion', 'a/b/c'])).toEqual([
      'tutoriales',
      'a',
      'a/b',
    ]);
  });
});

describe('listingFolders', () => {
  it('sin `folders`, ninguna carpeta tiene índice generado', () => {
    expect(listingFolders(tree, folders({}))).toEqual([]);
  });

  it("con `generate` en `'*'`, toda carpeta sin `index.md` genera, también las intermedias", () => {
    expect(listingFolders(tree, folders({ '*': { listing: { generate: true } } }))).toEqual([
      'articulos',
      'articulos/desarrollo',
      'articulos/desarrollo/python',
      'articulos/sistemas',
      'articulos/sistemas/cloud',
      'articulos/sistemas/cloud/aws',
      'guia',
    ]);
  });

  it('`generate: false` en una rama la apaga para ella y sus hijas', () => {
    const user = {
      articulos: { listing: { generate: true } },
      'articulos/sistemas': { listing: { generate: false } },
    };
    expect(listingFolders(tree, folders(user))).toEqual([
      'articulos',
      'articulos/desarrollo',
      'articulos/desarrollo/python',
    ]);
  });

  it('una carpeta con `index.md` no tiene índice generado', () => {
    const pages = [...tree, page('guia', 'guia/index.md')];
    expect(listingFolders(pages, folders({ guia: { listing: { generate: true } } }))).toEqual([]);
  });

  it('una carpeta con `_index.md` y `generate` sí lo tiene, aunque sea la portada', () => {
    const pages = [page('', '_index.md'), page('guia', 'guia/_index.md'), ...tree];
    expect(listingFolders(pages, folders({ '*': { listing: { generate: true } } }))).toContain('');
    expect(listingFolders(pages, folders({ guia: { listing: { generate: true } } }))).toEqual([
      'guia',
    ]);
  });
});

describe('generatedListingPages', () => {
  function describeListing(title: string, locale: string) {
    return translate(defaultStrings[locale]!, 'listing.description', { title });
  }
  const labels: Record<string, string> = { 'articulos/sistemas': 'Sistemas' };
  const options = {
    locales: ['es', 'en'],
    labelOf: (folder: string, locale: string) => `${labels[folder] ?? folder}·${locale}`,
    describe: describeListing,
  };

  it('una página por idioma en cada carpeta que genera y no tiene `_index.md`', () => {
    const generated = generatedListingPages(tree, {
      ...options,
      folders: folders({ 'articulos/sistemas': { listing: { generate: true } } }),
    });
    expect(generated.map(({ slug, locale, kind }) => `${slug} ${locale} ${kind}`)).toEqual([
      'articulos/sistemas es generated',
      'articulos/sistemas en generated',
      'articulos/sistemas/cloud es generated',
      'articulos/sistemas/cloud en generated',
      'articulos/sistemas/cloud/aws es generated',
      'articulos/sistemas/cloud/aws en generated',
    ]);
  });

  it('sin `_index.md`, el título sale de `labelOf` y la descripción de `listing.description`', () => {
    const [es, en] = generatedListingPages(tree, {
      ...options,
      folders: folders({ 'articulos/sistemas': { listing: { generate: true } } }),
    });
    expect(es).toMatchObject({
      title: 'Sistemas·es',
      body: '# Sistemas·es\n',
      seo: { description: 'Todas las páginas de Sistemas·es.' },
      sourcePath: 'articulos/sistemas/_index.md',
    });
    expect(en).toMatchObject({
      title: 'Sistemas·en',
      seo: { description: 'All pages in Sistemas·en.' },
    });
  });

  it('el título va escapado en el Markdown: es texto, no formato', () => {
    const [generated] = generatedListingPages(tree, {
      ...options,
      labelOf: () => 'C# *y* [más]',
      folders: folders({ guia: { listing: { generate: true } } }),
    });
    expect(generated!.body).toBe('# C\\# \\*y\\* \\[más\\]\n');
    expect(generated!.title).toBe('C# *y* [más]');
  });

  it('con `_index.md` (en cualquier idioma) no genera nada: la página es el `_index.md`', () => {
    const pages = [
      ...tree,
      page('guia', 'guia/_index.md', { title: 'Mi guía', seo: { description: 'Todo.' } }),
      page('guia', 'guia/_index.en.md', { locale: 'en', title: 'My guide' }),
    ];
    const generated = generatedListingPages(pages, {
      ...options,
      folders: folders({ guia: { listing: { generate: true } } }),
    });
    expect(generated).toEqual([]);
    expect(pages.filter(listsFolder).map((found) => found.title)).toEqual(['Mi guía', 'My guide']);
  });
});

describe('listsFolder', () => {
  it('una página generada y la de un `_index.md` listan su carpeta; un `index.md`, no', () => {
    expect(listsFolder(page('guia', 'guia/_index.md', { kind: 'generated' }))).toBe(true);
    expect(listsFolder(page('guia', 'guia/_index.en.md'))).toBe(true);
    expect(listsFolder(page('guia', 'guia/index.md'))).toBe(false);
    expect(listsFolder(page('guia/a', 'guia/a.md'))).toBe(false);
  });

  it('también con la ruta desde la raíz del proyecto (la que guarda la colección)', () => {
    expect(listsFolder(page('guia', 'src/content/docs/guia/_index.md'))).toBe(true);
  });
});

describe('listingSourceErrors', () => {
  it('un `_index.md` con `generate` efectivo `false` da un error con su archivo y la pista', () => {
    const pages = [...tree, page('guia', 'guia/_index.md')];
    const [error, ...rest] = listingSourceErrors(pages, folders({}));
    expect(rest).toEqual([]);
    expect(error!.file).toBe('guia/_index.md');
    expect(error!.describe()).toContain('folders.guia.listing.generate: true');
  });

  it('uno por archivo, también sus traducciones', () => {
    const pages = [
      page('articulos/sistemas', 'articulos/sistemas/_index.md'),
      page('articulos/sistemas', 'articulos/sistemas/_index.en.md', { locale: 'en' }),
    ];
    const errors = listingSourceErrors(
      pages,
      folders({ articulos: { listing: { generate: false } } }),
    );
    expect(errors.map((error) => error.file)).toEqual([
      'articulos/sistemas/_index.md',
      'articulos/sistemas/_index.en.md',
    ]);
    expect(errors[0]!.describe()).toContain("folders['articulos/sistemas'].listing.generate: true");
  });

  it('con `generate` encendido (propio o heredado), nada', () => {
    const pages = [page('guia', 'guia/_index.md')];
    expect(listingSourceErrors(pages, folders({ '*': { listing: { generate: true } } }))).toEqual(
      [],
    );
  });
});

describe('replacedListings', () => {
  it('da la carpeta de un `index.md` con `generate` encendido, una vez aunque exista `index.en.md`', () => {
    const pages = [
      ...tree,
      page('guia', 'guia/index.en.md', { locale: 'en' }),
      page('guia', 'guia/index.md'),
    ];
    expect(replacedListings(pages, folders({ '*': { listing: { generate: true } } }))).toEqual([
      { folder: 'guia', file: 'guia/index.md' },
    ]);
  });

  it('un README que hace de índice también sustituye al generado', () => {
    const pages = [...tree, page('guia', 'guia/README.md')];
    expect(replacedListings(pages, folders({ guia: { listing: { generate: true } } }))).toEqual([
      { folder: 'guia', file: 'guia/README.md' },
    ]);
  });

  it('sin `generate`, nada', () => {
    const pages = [...tree, page('guia', 'guia/index.md')];
    expect(replacedListings(pages, folders({}))).toEqual([]);
  });

  it('la portada (`index.md` de la raíz) no sustituye a nada: la raíz no genera por sí sola', () => {
    const pages = [...tree, page('', 'index.md')];
    expect(replacedListings(pages, folders({ '*': { listing: { generate: true } } }))).toEqual([]);
  });
});
