import { describe, expect, it } from 'vitest';
import { addCompanions, COMPANIONS } from './companions';

const make = (name: string) => ({ name, hooks: {} });

describe('addCompanions', () => {
  it('hoy no hay integraciones compañeras: la lista del paquete está vacía', () => {
    expect(COMPANIONS).toEqual([]);
  });

  it('con una lista vacía no toca las integraciones', () => {
    const integrations = [make('a'), make('docs')];
    addCompanions(integrations, 'docs', []);
    expect(integrations.map((i) => i.name)).toEqual(['a', 'docs']);
  });

  it('añade la compañera justo detrás de la nuestra', () => {
    const integrations = [make('a'), make('docs'), make('z')];
    addCompanions(integrations, 'docs', [make('sitemap')]);
    expect(integrations.map((i) => i.name)).toEqual(['a', 'docs', 'sitemap', 'z']);
  });

  it('no la añade si ya existe una con ese name, estuviera donde estuviera', () => {
    const integrations = [make('sitemap'), make('docs')];
    addCompanions(integrations, 'docs', [make('sitemap')]);
    expect(integrations.map((i) => i.name)).toEqual(['sitemap', 'docs']);
  });

  it('varias compañeras conservan su orden', () => {
    const integrations = [make('docs')];
    addCompanions(integrations, 'docs', [make('one'), make('two')]);
    expect(integrations.map((i) => i.name)).toEqual(['docs', 'one', 'two']);
  });

  it('si no encuentra la nuestra, las añade al final', () => {
    const integrations = [make('a')];
    addCompanions(integrations, 'docs', [make('one')]);
    expect(integrations.map((i) => i.name)).toEqual(['a', 'one']);
  });
});
