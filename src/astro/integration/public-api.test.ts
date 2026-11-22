import { describe, expect, it } from 'vitest';
import {
  ALL_FOLDERS,
  defineDocsConfig,
  defineDocsSite,
  docs,
  LayoutWidth,
  ListingView,
  MissingTranslation,
  NavIcon,
  PanelState,
  TreeShow,
} from './index';
import { ListingViewSchema, TreeShowSchema } from '../../core/config/folders';
import {
  LayoutWidthSchema,
  MissingTranslationSchema,
  NavIconSchema,
  PanelStateSchema,
} from '../../core/config/schema';

/* Cada opción cerrada es una constante exportada de la que sale su esquema: sus valores y las opciones
   que zod acepta son los mismos (una sola definición). */
describe('API pública de ./integration: constantes de las opciones cerradas', () => {
  it.each([
    ['ListingView', ListingView, ListingViewSchema.options],
    ['TreeShow', TreeShow, TreeShowSchema.options],
    ['PanelState', PanelState, PanelStateSchema.options],
    ['LayoutWidth', LayoutWidth, LayoutWidthSchema.options],
    ['MissingTranslation', MissingTranslation, MissingTranslationSchema.options],
    ['NavIcon', NavIcon, NavIconSchema.options],
  ] as const)(
    '%s se exporta y sus valores son las opciones de su esquema',
    (name, constant, options) => {
      expect(Object.values(constant), name).toEqual([...options]);
    },
  );

  it('exporta ListingView como objeto de valores', () => {
    expect(ListingView).toEqual({ LIST: 'list', TABLE: 'table', CARDS: 'cards' });
  });

  it('exporta TreeShow como objeto de valores', () => {
    expect(TreeShow).toEqual({ SECTION: 'section', ALL: 'all' });
  });

  it("exporta ALL_FOLDERS, la clave de `folders` para todo el sitio: '*'", () => {
    expect(ALL_FOLDERS).toBe('*');
  });

  it('una config con folders escrita con las constantes llega resuelta', () => {
    const folders = {
      [ALL_FOLDERS]: { listing: { view: ListingView.CARDS }, tree: { show: TreeShow.SECTION } },
    };
    const config = defineDocsConfig({ site: { name: 'T' }, content: { folders } });
    expect(docs(config).resolvedConfig.folders.declared).toEqual(folders);
  });
});

describe('API pública de ./integration', () => {
  it('exporta MissingTranslation como objeto de valores', () => {
    expect(MissingTranslation).toEqual({ LINK: 'link', OMIT: 'omit', FALLBACK: 'fallback' });
  });

  it('una config con MissingTranslation.LINK valida', () => {
    const config = defineDocsConfig({
      site: { name: 'T' },
      i18n: { missing: MissingTranslation.LINK },
    });
    expect(docs(config).resolvedConfig.translations.missing).toBe('link');
  });

  it('el tipo derivado acepta los valores', () => {
    const value: MissingTranslation = MissingTranslation.OMIT;
    expect(value).toBe('omit');
  });
});

describe('API pública de ./integration: layout', () => {
  it('exporta PanelState y LayoutWidth como objetos de valores', () => {
    expect(PanelState).toEqual({ OPEN: 'open', COLLAPSED: 'collapsed' });
    expect(LayoutWidth).toEqual({ READING: 'reading', FULL: 'full' });
  });

  it('una config con los valores exportados valida y llega resuelta', () => {
    const config = defineDocsConfig({
      site: {
        name: 'T',
        layout: { sidebar: PanelState.COLLAPSED, toc: PanelState.OPEN, width: LayoutWidth.FULL },
      },
    });
    expect(docs(config).resolvedConfig.layout).toEqual({
      sidebar: 'collapsed',
      toc: 'open',
      width: 'full',
      toggles: true,
      tocDepth: 3,
    });
  });
});

describe('API pública de ./integration: defineDocsSite', () => {
  it('se exporta y devuelve la config de Astro con la integración', () => {
    const config = defineDocsSite(defineDocsConfig({ site: { name: 'T' } }), { base: '/t' });
    expect(config.base).toBe('/t');
    expect(config.integrations).toHaveLength(1);
  });
});

describe('API pública de ./integration: nav', () => {
  it('exporta NavIcon como objeto de valores', () => {
    expect(NavIcon).toEqual({ GITHUB: 'github' });
  });

  it('una config con nav llega resuelta', () => {
    const config = defineDocsConfig({
      site: { name: 'T' },
      content: {
        nav: [
          { label: 'Guide', dir: 'users' },
          { label: 'Code', href: 'https://github.com/x/y', icon: NavIcon.GITHUB },
        ],
      },
    });
    expect(docs(config).resolvedConfig.nav).toHaveLength(2);
  });
});

describe('API pública: package.json "exports"', () => {
  it('./content apunta a un archivo que existe y exporta la colección docs', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      exports: Record<string, string>;
    };
    expect(packageJson.exports['./content']).toBe('./src/astro/content/index.ts');
    expect(existsSync(packageJson.exports['./content'] ?? '')).toBe(true);
  });
});
