import { describe, expect, it } from 'vitest';
import {
  ALL_FOLDERS,
  FoldersSchema,
  folderSettings,
  ListingView,
  resolveFolders,
  TreeShow,
  validateFolderKeys,
  type FoldersUserConfig,
} from './folders';

function settings(user: FoldersUserConfig | undefined, folder: string) {
  return folderSettings(resolveFolders(user), folder);
}

describe('folderSettings: valores por defecto', () => {
  it('sin `folders`, cada ajuste lleva su valor por defecto y `declaredAt: default`', () => {
    expect(settings(undefined, 'articulos/python')).toEqual({
      listing: {
        generate: { value: false, declaredAt: 'default' },
        view: { value: ListingView.LIST, declaredAt: 'default' },
        pageSize: { value: undefined, declaredAt: 'default' },
        perPageOptions: { value: undefined, declaredAt: 'default' },
        covers: { value: true, declaredAt: 'default' },
      },
      tree: {
        show: { value: TreeShow.SECTION, declaredAt: 'default' },
        depth: { value: undefined, declaredAt: 'default' },
      },
    });
  });

  it("la carpeta raíz del contenido (`''`) también recibe los valores por defecto", () => {
    expect(settings({}, '').listing.generate).toEqual({ value: false, declaredAt: 'default' });
  });
});

describe('folderSettings: precedencia', () => {
  it("`'*'` fija un valor para todas las carpetas", () => {
    const user = { [ALL_FOLDERS]: { listing: { view: ListingView.CARDS } } };
    expect(settings(user, 'guia').listing.view).toEqual({ value: 'cards', declaredAt: '*' });
    expect(settings(user, '').listing.view).toEqual({ value: 'cards', declaredAt: '*' });
  });

  it("el antepasado declarado más cercano gana a `'*'`", () => {
    const user = {
      [ALL_FOLDERS]: { tree: { depth: 4 } },
      articulos: { tree: { depth: 2 } },
      'articulos/python': { tree: { depth: 1 } },
    };
    expect(settings(user, 'articulos/python/django').tree.depth).toEqual({
      value: 1,
      declaredAt: 'articulos/python',
    });
    expect(settings(user, 'articulos/sistemas').tree.depth).toEqual({
      value: 2,
      declaredAt: 'articulos',
    });
    expect(settings(user, 'guia').tree.depth).toEqual({ value: 4, declaredAt: '*' });
  });

  it('la carpeta propia gana a su antepasado', () => {
    const user = {
      articulos: { listing: { generate: true } },
      'articulos/borradores': { listing: { generate: false } },
    };
    expect(settings(user, 'articulos/borradores').listing.generate).toEqual({
      value: false,
      declaredAt: 'articulos/borradores',
    });
    expect(settings(user, 'articulos/borradores/viejos').listing.generate.value).toBe(false);
    expect(settings(user, 'articulos/otros').listing.generate.value).toBe(true);
  });

  it('un prefijo de texto no es un antepasado (`articulos-viejos` no hereda de `articulos`)', () => {
    const user = { articulos: { listing: { generate: true } } };
    expect(settings(user, 'articulos-viejos').listing.generate.declaredAt).toBe('default');
  });
});

describe('folderSettings: herencia por hoja', () => {
  it('`pageSize` en el hijo no anula la `view` del padre', () => {
    const user = {
      articulos: { listing: { view: ListingView.TABLE, covers: false } },
      'articulos/python': { listing: { pageSize: 5 } },
    };
    const { listing } = settings(user, 'articulos/python');
    expect(listing.view).toEqual({ value: 'table', declaredAt: 'articulos' });
    expect(listing.covers).toEqual({ value: false, declaredAt: 'articulos' });
    expect(listing.pageSize).toEqual({ value: 5, declaredAt: 'articulos/python' });
  });

  it('`listing` y `tree` se heredan por separado', () => {
    const user = {
      [ALL_FOLDERS]: { tree: { show: TreeShow.ALL } },
      articulos: { listing: { generate: true } },
    };
    const result = settings(user, 'articulos/python');
    expect(result.tree.show).toEqual({ value: 'all', declaredAt: '*' });
    expect(result.listing.generate).toEqual({ value: true, declaredAt: 'articulos' });
  });

  it('`declaredAt` es la carpeta que declaró, no la consultada', () => {
    const user = { articulos: { tree: { show: TreeShow.ALL, depth: 2 } } };
    const { tree } = settings(user, 'articulos/sistemas/cloud/aws');
    expect(tree.show.declaredAt).toBe('articulos');
    expect(tree.depth.declaredAt).toBe('articulos');
  });

  it('las opciones del selector se heredan como lista entera', () => {
    const user = { [ALL_FOLDERS]: { listing: { perPageOptions: [6, 12] } } };
    expect(settings(user, 'guia').listing.perPageOptions).toEqual({
      value: [6, 12],
      declaredAt: '*',
    });
  });
});

describe('validateFolderKeys', () => {
  const existing = new Set(['guia', 'articulos', 'articulos/python']);

  function problems(user: FoldersUserConfig) {
    return validateFolderKeys(resolveFolders(user), existing).map((error) => error.describe());
  }

  it("`'*'` y las carpetas con páginas valen", () => {
    expect(problems({ [ALL_FOLDERS]: {}, guia: {}, 'articulos/python': {} })).toEqual([]);
  });

  it('una carpeta sin páginas da un error con su ruta y una pista', () => {
    const [problem, ...rest] = problems({ 'articulos/pyton': { tree: { depth: 1 } } });
    expect(rest).toEqual([]);
    expect(problem).toContain("folders['articulos/pyton']");
    expect(problem).toContain('no hay ninguna carpeta «articulos/pyton» con páginas');
    expect(problem).toContain('articulos/python');
  });

  it('una clave con barras al principio o al final da un error propio', () => {
    const found = problems({ '/guia/': {}, 'articulos/': {} });
    expect(found).toHaveLength(2);
    expect(found[0]).toContain("folders['/guia/']");
    expect(found[0]).toContain('sin barras al principio ni al final');
    expect(found[1]).toContain("folders['articulos/']");
  });

  it('acumula un error por clave', () => {
    expect(problems({ uno: {}, dos: {} })).toHaveLength(2);
  });
});

describe('FoldersSchema', () => {
  it('acepta `listing` y `tree` con todas sus claves', () => {
    const parsed = FoldersSchema.safeParse({
      [ALL_FOLDERS]: {
        listing: { generate: true, view: 'cards', pageSize: 6, perPageOptions: [6], covers: false },
        tree: { show: 'all', depth: 2 },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('`tree.depth` es un entero positivo', () => {
    expect(FoldersSchema.safeParse({ guia: { tree: { depth: 0 } } }).success).toBe(false);
    expect(FoldersSchema.safeParse({ guia: { tree: { depth: 1.5 } } }).success).toBe(false);
  });

  it('`perPageOptions` necesita al menos una opción', () => {
    expect(FoldersSchema.safeParse({ guia: { listing: { perPageOptions: [] } } }).success).toBe(
      false,
    );
  });
});
