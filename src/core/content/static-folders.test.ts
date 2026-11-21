import { describe, expect, it } from 'vitest';
import { matchStaticRequest, staticExcluder, staticFolderProblem } from './static-folders';

const locales = ['en', 'es'];

describe('staticFolderProblem', () => {
  it('una carpeta local y un destino limpio valen', () => {
    expect(staticFolderProblem({ from: '../htmlcov', to: 'coverage' }, locales)).toBeUndefined();
    expect(staticFolderProblem({ from: 'out', to: 'reports/cov' }, locales)).toBeUndefined();
  });

  it('el origen debe ser relativo y local', () => {
    expect(staticFolderProblem({ from: '/abs/htmlcov', to: 'c' }, locales)).toContain('relativa');
    expect(staticFolderProblem({ from: 'C:\\htmlcov', to: 'c' }, locales)).toContain('relativa');
    expect(staticFolderProblem({ from: 'https://x.dev/c', to: 'c' }, locales)).toContain('URL');
  });

  it('el destino no lleva barras de los extremos ni `.` ni `..`', () => {
    for (const to of ['/coverage', 'coverage/', 'a/../b', './coverage', 'a//b', '..']) {
      expect(staticFolderProblem({ from: 'out', to }, locales)).toContain('destino');
    }
  });

  it('el destino no pisa lo que la librería ya publica: `_astro`, `pagefind` ni un idioma', () => {
    for (const to of ['_astro', 'pagefind/x', 'es', 'en/cov']) {
      expect(staticFolderProblem({ from: 'out', to }, locales)).toContain(to.split('/')[0]!);
    }
  });
});

describe('matchStaticRequest', () => {
  const folders = [
    { from: '../htmlcov', to: 'coverage' },
    { from: 'out', to: 'reports/api' },
  ];

  it('la raíz del destino y lo que cuelga de ella devuelven la carpeta y la ruta interna', () => {
    expect(matchStaticRequest('/repo/coverage/', '/repo/', folders)).toEqual({
      folder: folders[0],
      inside: '',
    });
    expect(matchStaticRequest('/repo/coverage/a/b.html', '/repo/', folders)).toEqual({
      folder: folders[0],
      inside: 'a/b.html',
    });
    expect(matchStaticRequest('/repo/reports/api/x.css', '/repo/', folders)?.folder).toBe(
      folders[1],
    );
  });

  it('con base `/` o sin barra final también casa', () => {
    expect(matchStaticRequest('/coverage', '/', folders)?.inside).toBe('');
    expect(matchStaticRequest('/repo/coverage', '/repo', folders)?.inside).toBe('');
  });

  it('un prefijo de texto no es una carpeta: `coverage-old` no es `coverage`', () => {
    expect(matchStaticRequest('/coverage-old/a.html', '/', folders)).toBeUndefined();
    expect(matchStaticRequest('/reports/', '/', folders)).toBeUndefined();
  });

  it('decodifica la ruta y rechaza salirse de la carpeta', () => {
    expect(matchStaticRequest('/coverage/a%20b.html', '/', folders)?.inside).toBe('a b.html');
    expect(matchStaticRequest('/coverage/../secret', '/', folders)).toBeUndefined();
    expect(matchStaticRequest('/coverage/%2e%2e/secret', '/', folders)).toBeUndefined();
    expect(matchStaticRequest('/coverage/%zz', '/', folders)).toBeUndefined();
  });
});

describe('staticExcluder', () => {
  it('juzga rutas relativas a `from` con las reglas de `exclude`', () => {
    const excluded = staticExcluder({
      from: 'cov',
      to: 'coverage',
      exclude: ['assets/script/', '*.py', '!keep.py'],
    });
    expect(excluded('assets/script/history.js')).toBe(true);
    expect(excluded('deep/tool.py')).toBe(true);
    expect(excluded('keep.py')).toBe(false);
    expect(excluded('index.html')).toBe(false);
  });

  it('sin `exclude` se publica todo', () => {
    expect(staticExcluder({ from: 'cov', to: 'coverage' })('history.py')).toBe(false);
  });
});
