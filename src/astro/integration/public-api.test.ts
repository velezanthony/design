import { describe, expect, it } from 'vitest';
import { defineDocsConfig, docs, MissingTranslation } from './index';

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
