import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { SidebarItem } from '../config/schema';
import { folderLabels, folderOfGroup, folderTitles } from './folder-labels';

/* Como el sitio del autor: la sección «Sistemas» no tiene `dir`, pero todas sus páginas cuelgan de
   `articulos/sistemas`; dentro, «CI/CD» envuelve una carpeta, «Cloud» solo envuelve al grupo «AWS». */
const sistemas: SidebarItem[] = [
  { label: 'CI/CD', items: ['articulos/sistemas/ci-cd/github-actions'] },
  { label: 'Cloud', items: [{ label: 'AWS', items: ['articulos/sistemas/cloud/aws/basica'] }] },
  {
    label: { es: 'Contenedores', en: 'Containers' },
    items: ['articulos/sistemas/contenedores/docker', 'articulos/sistemas/contenedores/nginx'],
  },
];
const nav: NavItem[] = [
  { label: { es: 'Sistemas', en: 'Systems' }, sidebar: sistemas },
  { label: { es: 'Guía', en: 'Guide' }, dir: 'guia' },
  { label: 'GitHub', href: 'https://github.com/x/y' },
];
const config = { nav, defaultLocale: 'es' };

describe('folderOfGroup', () => {
  it('la carpeta común más profunda de las hojas del grupo, a cualquier profundidad', () => {
    expect(folderOfGroup(sistemas)).toBe('articulos/sistemas');
    expect(folderOfGroup(['articulos/sistemas/ci-cd/github-actions'])).toBe(
      'articulos/sistemas/ci-cd',
    );
  });

  it('sin carpeta común (o solo la raíz), nada', () => {
    expect(folderOfGroup(['guia/a', 'tutoriales/b'])).toBeUndefined();
    expect(folderOfGroup(['readme'])).toBeUndefined();
    expect(folderOfGroup(['index'])).toBeUndefined();
    expect(folderOfGroup([])).toBeUndefined();
  });

  it('un prefijo de texto no es una carpeta común (`guia` y `guia-vieja`)', () => {
    expect(folderOfGroup(['docs/guia/a', 'docs/guia-vieja/b'])).toBe('docs');
  });
});

describe('folderLabels', () => {
  it('una sección de `nav` con `dir` titula su carpeta, en el idioma pedido', () => {
    expect(folderLabels(config, 'en').get('guia')).toBe('Guide');
    expect(folderLabels(config, 'es').get('guia')).toBe('Guía');
  });

  it('una sección sin `dir` cuyas páginas comparten carpeta la titula («Sistemas»)', () => {
    expect(folderLabels(config, 'es').get('articulos/sistemas')).toBe('Sistemas');
    expect(folderLabels(config, 'en').get('articulos/sistemas')).toBe('Systems');
  });

  it('un grupo declarado con carpeta común la titula («CI/CD», «Contenedores»)', () => {
    const labels = folderLabels(config, 'en');
    expect(labels.get('articulos/sistemas/ci-cd')).toBe('CI/CD');
    expect(labels.get('articulos/sistemas/contenedores')).toBe('Containers');
  });

  it('un grupo que solo envuelve a otro no titula ninguna carpeta («Cloud»)', () => {
    expect(folderLabels(config, 'es').has('articulos/sistemas/cloud')).toBe(false);
  });

  it('si varios grupos casan con la misma carpeta, gana el más interior («AWS»)', () => {
    expect(folderLabels(config, 'es').get('articulos/sistemas/cloud/aws')).toBe('AWS');
  });

  it('la sección con `dir` gana a un grupo de su `sidebar` con la misma carpeta', () => {
    const labels = folderLabels(
      {
        nav: [{ label: 'Guía', dir: 'guia', sidebar: [{ label: 'Todo', items: ['guia/a'] }] }],
        defaultLocale: 'es',
      },
      'es',
    );
    expect(labels.get('guia')).toBe('Guía');
  });

  it('los grupos del `sidebar` de primer nivel también cuentan', () => {
    const labels = folderLabels(
      { sidebar: [{ label: 'Recetas', items: ['cocina/recetas/pan'] }], defaultLocale: 'es' },
      'es',
    );
    expect(labels.get('cocina/recetas')).toBe('Recetas');
  });
});

describe('folderTitles', () => {
  it('sin etiqueta declarada, el nombre de la carpeta humanizado', () => {
    const titleOf = folderTitles(config);
    expect(titleOf('articulos/sistemas/cloud', 'es')).toBe('Cloud');
    expect(titleOf('articulos/sistemas', 'en')).toBe('Systems');
    expect(titleOf('notas-de-version', 'es')).toBe('Notas de version');
  });
});
