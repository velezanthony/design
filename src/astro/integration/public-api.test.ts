import { describe, expect, it } from 'vitest';
import {
  defineDocsConfig,
  defineDocsSite,
  docs,
  LayoutWidth,
  MissingTranslation,
  NavIcon,
  PanelState,
} from './index';

describe('API pública de ./integration', () => {
  it('exporta MissingTranslation como objeto de valores', () => {
    expect(MissingTranslation).toEqual({ LINK: 'link', OMIT: 'omit', FALLBACK: 'fallback' });
  });

  it('una config con MissingTranslation.LINK valida', () => {
    const config = defineDocsConfig({
      name: 'T',
      translations: { missing: MissingTranslation.LINK },
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
      name: 'T',
      layout: { sidebar: PanelState.COLLAPSED, toc: PanelState.OPEN, width: LayoutWidth.FULL },
    });
    expect(docs(config).resolvedConfig.layout).toEqual({
      sidebar: 'collapsed',
      toc: 'open',
      width: 'full',
      toggles: true,
    });
  });
});

describe('API pública de ./integration: defineDocsSite', () => {
  it('se exporta y devuelve la config de Astro con la integración', () => {
    const config = defineDocsSite(defineDocsConfig({ name: 'T' }), { base: '/t' });
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
      name: 'T',
      nav: [
        { label: 'Guide', dir: 'users' },
        { label: 'Code', href: 'https://github.com/x/y', icon: NavIcon.GITHUB },
      ],
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
