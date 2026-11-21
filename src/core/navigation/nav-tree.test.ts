import { describe, expect, it } from 'vitest';
import type { NavItem } from '../config/nav';
import type { Page } from '../content/discovery';
import { buildAvailability, type UrlPolicy } from '../i18n/availability';
import { MissingTranslation, resolvePolicies } from '../i18n/translation-policy';
import type { NavContext } from './nav-entries';
import {
  buildNavTree,
  buildNavTrees,
  findNavSection,
  hasNavTreeSlots,
  isNavTreeGroup,
  navSectionNames,
  splitNavTrees,
  type NavTreeNode,
} from './nav-tree';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'es' };

function page(slug: string, locale = 'es', extra: Partial<Page> = {}): Page {
  return {
    slug,
    locale,
    title: `${slug.split('/').pop()} (${locale})`,
    kind: 'native',
    body: '',
    sourcePath: `${slug}.md`,
    ...extra,
  };
}

/* Como un sitio de tutoriales: las páginas viven planas y el árbol lo forma solo el `sidebar` de cada sección. */
const pages = [
  page('tutoriales'),
  page('tutoriales/configuracion', 'es', {
    seo: { description: 'Las opciones del archivo de configuración.' },
  }),
  page('tutoriales/configuracion', 'en', {
    seo: { description: 'The options in the config file.' },
  }),
  page('tutoriales/angular', 'es', {
    seo: { description: { es: 'El elemento host.', en: 'The host element.' } },
  }),
  page('tutoriales/instalacion'),
  page('tutoriales/despliegue', 'es', { seo: { description: 'Sin caída.' } }),
  page('tutoriales/scripts'),
];

const nav: NavItem[] = [
  {
    label: { es: 'Esenciales', en: 'Essentials' },
    sidebar: [
      { label: { es: 'Primeros pasos', en: 'Getting started' }, items: ['tutoriales/instalacion'] },
      {
        label: 'Astro',
        items: [{ label: 'Vite', items: ['tutoriales/configuracion'] }],
      },
      { label: 'Angular', slug: 'tutoriales/angular', items: [] },
    ],
  },
  { label: 'GitHub', href: 'https://github.com/x/y' },
  {
    label: { es: 'Avanzado', en: 'Advanced' },
    sidebar: [
      { label: { es: 'Despliegue', en: 'Deployment' }, items: ['tutoriales/despliegue'] },
      { label: 'CLI', items: [{ label: 'Scripts', items: ['tutoriales/scripts'] }] },
    ],
  },
];

function context(
  locale = 'es',
  missing: MissingTranslation = MissingTranslation.FALLBACK,
): NavContext {
  return {
    pages,
    availability: buildAvailability(pages, url),
    locale,
    config: { locales: ['es', 'en'], defaultLocale: 'es', nav, sidebar: ['tutoriales'] },
    policies: resolvePolicies(pages, missing).policies,
    url,
    slug: 'tutoriales',
  };
}

/** El árbol como etiquetas anidadas, para comparar su forma de un vistazo. */
function shape(nodes: NavTreeNode[]): unknown[] {
  return nodes.map((node) =>
    isNavTreeGroup(node) ? { [node.label]: shape(node.items) } : node.label,
  );
}

function leaves(nodes: NavTreeNode[]): NavTreeNode[] {
  return nodes.flatMap((node) => (isNavTreeGroup(node) ? [node, ...leaves(node.items)] : [node]));
}

function find(nodes: NavTreeNode[], label: string) {
  const found = leaves(nodes).find((node) => node.label === label);
  if (!found) throw new Error(`no hay «${label}» en el árbol`);
  return found;
}

describe('findNavSection', () => {
  it('encuentra la sección por su etiqueta en cualquier idioma', () => {
    expect(findNavSection(nav, 'Esenciales')).toBe(0);
    expect(findNavSection(nav, 'Advanced')).toBe(2);
  });

  it('un enlace de `nav` o un nombre que no existe no son una sección', () => {
    expect(findNavSection(nav, 'GitHub')).toBe(-1);
    expect(findNavSection(nav, 'Blog')).toBe(-1);
    expect(findNavSection(undefined, 'Esenciales')).toBe(-1);
  });

  it('también por su carpeta `dir`', () => {
    expect(findNavSection([{ label: 'Guía', dir: 'users' }], 'users')).toBe(0);
  });
});

describe('navSectionNames', () => {
  it('lista los nombres de las secciones en el idioma pedido, para el mensaje de error', () => {
    expect(navSectionNames(nav, 'es', 'es')).toEqual(['Esenciales', 'Avanzado']);
  });
});

describe('buildNavTree', () => {
  it('sigue los grupos anidados del `sidebar` de la sección, en el idioma del contenido', () => {
    expect(shape(buildNavTree(context(), 'es', 0))).toEqual([
      { 'Primeros pasos': ['instalacion (es)'] },
      { Astro: [{ Vite: ['configuracion (es)'] }] },
      'Angular',
    ]);
    expect(shape(buildNavTree(context(), 'es', 2))).toEqual([
      { Despliegue: ['despliegue (es)'] },
      { CLI: [{ Scripts: ['scripts (es)'] }] },
    ]);
  });

  it('cada página lleva su título, su URL y la descripción de su `seo`', () => {
    const tree = buildNavTree(context(), 'es', 2);
    expect(find(tree, 'despliegue (es)')).toEqual({
      label: 'despliegue (es)',
      href: '/repo/tutoriales/despliegue/',
      description: 'Sin caída.',
    });
    expect(find(tree, 'scripts (es)')).not.toHaveProperty('description');
  });

  it('un grupo con página propia la enlaza y lleva su descripción, en el idioma del contenido', () => {
    const angular = find(buildNavTree(context(), 'es', 0), 'Angular');
    expect(angular).toMatchObject({
      href: '/repo/tutoriales/angular/',
      description: 'El elemento host.',
    });
  });

  it('en el idioma de la página que lo pinta, la traducción que existe da título y descripción', () => {
    const tree = buildNavTree(context('en'), 'en', 0);
    expect(shape(tree)).toEqual([
      { 'Getting started': ['instalacion (es)'] },
      { Astro: [{ Vite: ['configuracion (en)'] }] },
      'Angular',
    ]);
    expect(find(tree, 'configuracion (en)')).toMatchObject({
      href: '/repo/en/tutoriales/configuracion/',
      description: 'The options in the config file.',
    });
  });

  it('en una ruta de reserva el texto es el del contenido y las URLs, las de la barra lateral', () => {
    // `/en/tutoriales/` sin traducción: el contenido es el español, pero se navega dentro de `/en/`.
    const tree = buildNavTree(context('en'), 'es', 0);
    expect(shape(tree)).toEqual([
      { 'Primeros pasos': ['instalacion (es)'] },
      { Astro: [{ Vite: ['configuracion (es)'] }] },
      'Angular',
    ]);
    expect(find(tree, 'instalacion (es)')).toMatchObject({
      href: '/repo/en/tutoriales/instalacion/',
    });
    expect(find(tree, 'configuracion (es)')).toMatchObject({
      href: '/repo/en/tutoriales/configuracion/',
      description: 'Las opciones del archivo de configuración.',
    });
    expect(find(tree, 'Angular')).toMatchObject({ href: '/repo/en/tutoriales/angular/' });
  });

  it('con la política `link`, la página sin traducción enlaza al original con su insignia', () => {
    const tree = buildNavTree(context('en', MissingTranslation.LINK), 'en', 0);
    expect(find(tree, 'instalacion (es)')).toMatchObject({
      href: '/repo/tutoriales/instalacion/',
      badge: 'es',
    });
  });

  it('con la política `omit`, la página sin traducción no sale, ni su grupo si queda vacío', () => {
    const tree = buildNavTree(context('en', MissingTranslation.OMIT), 'en', 0);
    expect(shape(tree)).toEqual([{ Astro: [{ Vite: ['configuracion (en)'] }] }]);
  });

  it('una posición que no es una sección da un árbol vacío', () => {
    expect(buildNavTree(context(), 'es', 1)).toEqual([]);
    expect(buildNavTree(context(), 'es', 9)).toEqual([]);
  });
});

describe('buildNavTrees', () => {
  it('un árbol por posición de `nav`, vacío en lo que no es sección', () => {
    const trees = buildNavTrees(context(), 'es');
    expect(trees).toHaveLength(3);
    expect(trees[1]).toEqual([]);
    expect(shape(trees[2]!)[0]).toEqual({ Despliegue: ['despliegue (es)'] });
  });
});

describe('splitNavTrees', () => {
  it('parte el HTML en los huecos que deja la directiva, con la sección y si lleva descripciones', () => {
    const html =
      '<h1>A</h1><h2 id="d">D</h2><div data-docs-nav-tree="0" data-docs-nav-tree-descriptions="true"></div>' +
      '<h2 id="s">S</h2><div data-docs-nav-tree="2" data-docs-nav-tree-descriptions="false"></div><p>fin</p>';
    expect(splitNavTrees(html)).toEqual([
      { kind: 'html', html: '<h1>A</h1><h2 id="d">D</h2>' },
      { kind: 'tree', section: 0, descriptions: true },
      { kind: 'html', html: '<h2 id="s">S</h2>' },
      { kind: 'tree', section: 2, descriptions: false },
      { kind: 'html', html: '<p>fin</p>' },
    ]);
  });

  it('sin huecos devuelve el HTML entero en un solo trozo', () => {
    expect(splitNavTrees('<p>x</p>')).toEqual([{ kind: 'html', html: '<p>x</p>' }]);
  });
});

describe('hasNavTreeSlots', () => {
  it('verdadero si el HTML renderizado tiene un hueco de la directiva', () => {
    expect(
      hasNavTreeSlots(
        '<p>x</p><div data-docs-nav-tree="1" data-docs-nav-tree-descriptions="true"></div>',
      ),
    ).toBe(true);
  });

  it('falso con `::nav-tree` dentro de un bloque de código: ahí no hay hueco', () => {
    expect(hasNavTreeSlots('<pre><code>::nav-tree{section="Guía"}\n</code></pre>')).toBe(false);
  });

  it('falso sin ningún hueco', () => {
    expect(hasNavTreeSlots('<p>x</p>')).toBe(false);
  });
});
