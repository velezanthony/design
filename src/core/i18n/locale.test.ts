import { describe, expect, it } from 'vitest';
import { DocsError } from '../errors';
import { localizedPath, splitLocale, stripLocale } from './locale';

const locales = ['en', 'es'];

describe('splitLocale', () => {
  it('sin sufijo es el idioma por defecto', () => {
    expect(splitLocale('guide/install.md', locales, 'en')).toEqual({
      stem: 'guide/install',
      locale: 'en',
    });
  });

  it('el sufijo de un idioma configurado se quita del tronco', () => {
    expect(splitLocale('guide/install.es.md', locales, 'en')).toEqual({
      stem: 'guide/install',
      locale: 'es',
    });
  });

  it('sin sufijo, el idioma por defecto es el que se pase (español por defecto)', () => {
    expect(splitLocale('install.md', locales, 'es').locale).toBe('es');
  });

  it('un sufijo de idioma no configurado falla nombrando el archivo', () => {
    expect(() => splitLocale('install.fr.md', locales, 'en')).toThrow(DocsError);
    expect(() => splitLocale('install.fr.md', locales, 'en')).toThrow(/install\.fr\.md/);
  });

  it('un punto que no es un código de idioma no es sufijo', () => {
    expect(splitLocale('v1.2.md', locales, 'en')).toEqual({ stem: 'v1.2', locale: 'en' });
    expect(splitLocale('guide/api.config.md', locales, 'en').stem).toBe('guide/api.config');
  });

  it('acepta códigos con región cuando están configurados', () => {
    expect(splitLocale('x.pt-BR.md', ['en', 'pt-BR'], 'en')).toEqual({
      stem: 'x',
      locale: 'pt-BR',
    });
  });
});

describe('localizedPath', () => {
  it('el idioma por defecto es el archivo tal cual', () => {
    expect(localizedPath('guide/install.md', 'en', 'en')).toBe('guide/install.md');
  });

  it('los demás llevan el sufijo antes de .md', () => {
    expect(localizedPath('guide/install.md', 'es', 'en')).toBe('guide/install.es.md');
    expect(localizedPath('guide/install.md', 'pt-BR', 'en')).toBe('guide/install.pt-BR.md');
  });
});

describe('stripLocale', () => {
  it('quita el sufijo del idioma del archivo', () => {
    expect(stripLocale('guide/install.es.md', 'es', 'en')).toBe('guide/install.md');
  });

  it('el idioma por defecto no tiene sufijo que quitar', () => {
    expect(stripLocale('guide/install.md', 'en', 'en')).toBe('guide/install.md');
  });

  it('el código se toma literal, no como expresión regular', () => {
    expect(stripLocale('guide/install.pt-BR.md', 'pt-BR', 'en')).toBe('guide/install.md');
    expect(stripLocale('guide/installXesXmd', 'es', 'en')).toBe('guide/installXesXmd');
  });

  it('una ruta sin el sufijo del idioma se devuelve intacta', () => {
    expect(stripLocale('guide/install.md', 'es', 'en')).toBe('guide/install.md');
  });

  it('el idioma por defecto no pierde un `.en.md` que sea parte del nombre', () => {
    expect(stripLocale('guide/api.en.md', 'en', 'en')).toBe('guide/api.en.md');
  });

  it('ida y vuelta con localizedPath', () => {
    const file = localizedPath('a/b.md', 'es', 'en');
    expect(stripLocale(file, 'es', 'en')).toBe('a/b.md');
  });
});

describe('rutas con `.md` en una carpeta', () => {
  it('solo se toca el `.md` final, no uno que esté en medio de la ruta', () => {
    expect(splitLocale('docs.md/page.md', locales, 'en').stem).toBe('docs.md/page');
    expect(localizedPath('docs.md/page.md', 'es', 'en')).toBe('docs.md/page.es.md');
  });
});
