import { describe, expect, it } from 'vitest';
import { DocsErrors } from '../errors';
import { MissingTranslation } from '../i18n/translation-policy';
import { resolveConfig } from './resolve';

/** Mensajes de error de una config inválida. */
function messages(input: unknown): string[] {
  try {
    resolveConfig(input as never);
  } catch (error) {
    if (error instanceof DocsErrors) return error.errors.map((e) => e.describe());
    throw error;
  }
  return [];
}

describe('resolveConfig: valores por defecto', () => {
  it('config mínima: solo nombre', () => {
    const cfg = resolveConfig({ name: 'Design' });
    expect(cfg.name).toBe('Design');
    expect(cfg.locales).toEqual(['en']);
    expect(cfg.defaultLocale).toBe('en');
    expect(cfg.translations.missing).toBe(MissingTranslation.LINK);
    expect(cfg.external).toEqual([]);
    expect(cfg.seo.titleTemplate).toBe('%s · Design');
  });

  it('el idioma por defecto es el primero de `locales`', () => {
    expect(resolveConfig({ name: 'X', locales: ['es', 'en'] }).defaultLocale).toBe('es');
  });

  it('respeta lo declarado', () => {
    const cfg = resolveConfig({
      name: 'X',
      locales: ['en', 'es'],
      defaultLocale: 'es',
      translations: { missing: 'omit' },
      seo: { titleTemplate: '%s | X', description: { en: 'Docs', es: 'Documentación' } },
    });
    expect(cfg.defaultLocale).toBe('es');
    expect(cfg.translations.missing).toBe('omit');
    expect(cfg.seo.titleTemplate).toBe('%s | X');
    expect(cfg.seo.description).toEqual({ en: 'Docs', es: 'Documentación' });
  });

  it('no muta la entrada', () => {
    const input = { name: 'X', locales: ['en', 'es'] };
    const before = structuredClone(input);
    resolveConfig(input);
    expect(input).toEqual(before);
  });
});

describe('resolveConfig: validación', () => {
  it('el idioma por defecto debe estar en los idiomas: nombra `defaultLocale`', () => {
    const [message] = messages({ name: 'X', locales: ['en'], defaultLocale: 'es' });
    expect(message).toContain('defaultLocale');
  });

  it('un idioma sin textos de UI en el paquete falla nombrando `locales[i]`', () => {
    expect(messages({ name: 'X', locales: ['en', 'fr'] })[0]).toContain('locales[1]');
  });

  it('valor cerrado inválido: ruta `translations.missing` y valores permitidos', () => {
    const [message] = messages({ name: 'X', translations: { missing: 'hide' } });
    expect(message).toContain('translations.missing');
    for (const allowed of ['link', 'omit', 'fallback']) expect(message).toContain(allowed);
  });

  it('el nombre es obligatorio', () => {
    expect(messages({})[0]).toContain('name');
  });

  it('una opción desconocida se rechaza nombrándola (p. ej. el `description` antiguo)', () => {
    expect(messages({ name: 'X', description: 'viejo' })[0]).toContain('description');
  });

  it('agrega todos los errores', () => {
    expect(
      messages({ description: 'x', translations: { missing: 'hide' } }).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('`gtmId` exige `privacyUrl`', () => {
    expect(messages({ name: 'X', gtmId: 'GTM-1' })[0]).toContain('privacyUrl');
    expect(messages({ name: 'X', gtmId: 'GTM-1', privacyUrl: 'https://x.dev/privacy' })).toEqual(
      [],
    );
  });

  it('`external[].file` no puede ser una URL remota', () => {
    const [message] = messages({
      name: 'X',
      external: [{ slug: 'a', file: 'https://x.dev/a.md' }],
    });
    expect(message).toContain('external[0].file');
  });

  it('`external[].locales` solo admite idiomas del sitio', () => {
    const [message] = messages({
      name: 'X',
      locales: ['en'],
      external: [{ slug: 'a', file: 'a.md', locales: ['es'] }],
    });
    expect(message).toContain('external[0].locales[0]');
  });

  it('`external[].translations` inválido nombra `external[i].translations`', () => {
    expect(
      messages({ name: 'X', external: [{ slug: 'a', file: 'a.md', translations: 'x' }] })[0],
    ).toContain('external[0].translations');
  });
});

describe('resolveConfig: `ui`', () => {
  it('acepta overrides de claves conocidas en idiomas del sitio', () => {
    const cfg = resolveConfig({
      name: 'X',
      locales: ['en', 'es'],
      ui: { es: { 'search.placeholder': 'Buscar en Design' } },
    });
    expect(cfg.ui).toEqual({ es: { 'search.placeholder': 'Buscar en Design' } });
  });

  it('clave desconocida: ruta completa `ui.es.<clave>`', () => {
    const [message] = messages({
      name: 'X',
      locales: ['en', 'es'],
      ui: { es: { 'search.placeholdr': 'x' } },
    });
    expect(message).toContain('ui.es.search.placeholdr');
  });

  it('idioma fuera de `locales`: ruta `ui.fr`', () => {
    const [message] = messages({
      name: 'X',
      locales: ['en', 'es'],
      ui: { fr: { 'search.placeholder': 'x' } },
    });
    expect(message).toContain('ui.fr');
  });
});
