import { describe, expect, it } from 'vitest';
import { DocsErrors } from '../errors';
import { MissingTranslation } from '../i18n/translation-policy';
import { DEFAULT_TITLE_SUFFIX } from '../seo/title';
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

describe('resolveConfig: content', () => {
  it('por defecto la carpeta de contenido es `src/content/docs`', () => {
    expect(resolveConfig({ name: 'X' }).content).toBe('src/content/docs');
  });

  it('se normaliza lo declarado: `../docs/` -> `../docs`', () => {
    expect(resolveConfig({ name: 'X', content: '../docs/' }).content).toBe('../docs');
    expect(resolveConfig({ name: 'X', content: './docs//' }).content).toBe('docs');
  });

  it.each(['https://x.dev/docs', '/abs/docs', '', '.'])(
    '«%s» falla nombrando `content`',
    (value) => {
      expect(messages({ name: 'X', content: value }).join('\n')).toContain('content');
    },
  );
});

describe('resolveConfig: valores por defecto', () => {
  it('config mínima: solo nombre', () => {
    const cfg = resolveConfig({ name: 'Design' });
    expect(cfg.name).toBe('Design');
    expect(cfg.locales).toEqual(['en']);
    expect(cfg.defaultLocale).toBe('en');
    expect(cfg.translations.missing).toBe(MissingTranslation.LINK);
    expect(cfg.external).toEqual([]);
    expect(cfg.seo.titleSuffix).toBe(DEFAULT_TITLE_SUFFIX);
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
      seo: { titleSuffix: 'X', description: { en: 'Docs', es: 'Documentación' } },
    });
    expect(cfg.defaultLocale).toBe('es');
    expect(cfg.translations.missing).toBe('omit');
    expect(cfg.seo.titleSuffix).toBe('X');
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

  it('`gtmId` ya no exige `privacyUrl`: la integración la completa o falla según el entorno', () => {
    expect(messages({ name: 'X', gtmId: 'GTM-1' })).toEqual([]);
  });

  it('`privacyUrl` acepta una cadena o una etiqueta por idioma', () => {
    expect(messages({ name: 'X', privacyUrl: 'https://x.dev/privacy' })).toEqual([]);
    expect(
      messages({
        name: 'X',
        locales: ['en', 'es'],
        privacyUrl: { en: '/privacy/', es: '/privacidad/' },
      }),
    ).toEqual([]);
  });

  it('`privacyUrl` por idioma valida cada URL y los idiomas', () => {
    expect(messages({ name: 'X', privacyUrl: { en: 'privacy' } })[0]).toContain('privacyUrl.en');
    expect(
      messages({ name: 'X', locales: ['en'], privacyUrl: { es: '/privacidad/' } })[0],
    ).toContain('privacyUrl.es');
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

describe('resolveConfig: privacy', () => {
  it('por defecto no hay página y el responsable es el del portfolio', () => {
    const { privacy } = resolveConfig({ name: 'X' });
    expect(privacy.page).toBe(false);
    expect(privacy.controller).toEqual({
      name: 'Anthony Velez Tapia',
      email: 'velezanthony2000@gmail.com',
    });
  });

  it('acepta `page` y un responsable propio', () => {
    const { privacy } = resolveConfig({
      name: 'X',
      privacy: { page: true, controller: { name: 'Ada', email: 'ada@x.dev' } },
    });
    expect(privacy).toEqual({ page: true, controller: { name: 'Ada', email: 'ada@x.dev' } });
  });

  it('es estricta: una opción desconocida se nombra con su ruta', () => {
    expect(messages({ name: 'X', privacy: { pagee: true } })[0]).toContain('privacy.pagee');
    expect(
      messages({
        name: 'X',
        privacy: { controller: { name: 'A', email: 'a@b.c', phone: '1' } },
      })[0],
    ).toContain('privacy.controller.phone');
  });

  it('el responsable pide nombre y un correo con arroba', () => {
    expect(
      messages({ name: 'X', privacy: { controller: { name: '', email: 'a@b.c' } } })[0],
    ).toContain('privacy.controller.name');
    expect(
      messages({ name: 'X', privacy: { controller: { name: 'A', email: 'nope' } } })[0],
    ).toContain('privacy.controller.email');
  });
});
