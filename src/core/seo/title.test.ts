import { describe, expect, it } from 'vitest';
import { composeTitle, DEFAULT_TITLE_SUFFIX, resolveTitleSuffix, TITLE_SEPARATOR } from './title';

describe('composeTitle', () => {
  it('une título y sufijo con el separador de la librería', () => {
    expect(TITLE_SEPARATOR).toBe(' | ');
    expect(composeTitle('Install', 'Design')).toBe('Install | Design');
  });

  it('sin sufijo, solo el título', () => {
    expect(composeTitle('Install', undefined)).toBe('Install');
  });

  it('si el título ya es el sufijo (sin espacios sobrantes), no lo repite', () => {
    expect(composeTitle('SnakeORM', 'SnakeORM')).toBe('SnakeORM');
    expect(composeTitle(' SnakeORM ', 'SnakeORM')).toBe(' SnakeORM ');
  });

  it('la comparación distingue mayúsculas', () => {
    expect(composeTitle('snakeorm', 'SnakeORM')).toBe('snakeorm | SnakeORM');
  });
});

describe('resolveTitleSuffix: cascada página > sitio > librería', () => {
  it('sin nada en la página ni en el sitio, el de la librería', () => {
    expect(resolveTitleSuffix(undefined, undefined, 'en')).toBe(DEFAULT_TITLE_SUFFIX);
    expect(DEFAULT_TITLE_SUFFIX).toBe('Anthony Vélez Tapia');
  });

  it('el del sitio gana al de la librería', () => {
    expect(resolveTitleSuffix(undefined, 'Docs', 'en')).toBe('Docs');
  });

  it('el de la página gana al del sitio', () => {
    expect(resolveTitleSuffix('Página', 'Docs', 'en')).toBe('Página');
  });

  it('`false` en el sitio quita el sufijo de la librería', () => {
    expect(resolveTitleSuffix(undefined, false, 'en')).toBeUndefined();
  });

  it('`false` en la página gana a un sufijo del sitio', () => {
    expect(resolveTitleSuffix(false, 'Docs', 'en')).toBeUndefined();
  });

  it('un sufijo de la página gana a un `false` del sitio', () => {
    expect(resolveTitleSuffix('Página', false, 'en')).toBe('Página');
  });

  it('acepta un Label por idioma, en la página o en el sitio', () => {
    expect(resolveTitleSuffix(undefined, { en: 'Docs', es: 'Documentación' }, 'es')).toBe(
      'Documentación',
    );
    expect(resolveTitleSuffix({ es: 'Mi página' }, 'Docs', 'es')).toBe('Mi página');
  });

  it('un Label sin el idioma pedido deja el título sin sufijo', () => {
    expect(resolveTitleSuffix(undefined, { en: 'Docs' }, 'es')).toBeUndefined();
  });
});
