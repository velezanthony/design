import { describe, expect, it } from 'vitest';
import type { Page } from '../content/discovery';
import type { UrlPolicy } from '../i18n/availability';
import { rewriteLinks, type PageIndex } from './rewrite';

const url: UrlPolicy = { base: '/repo', trailingSlash: 'always', defaultLocale: 'en' };

function page(
  slug: string,
  locale: string,
  sourcePath: string,
  kind: Page['kind'] = 'native',
): Page {
  return { slug, locale, title: slug, kind, sourcePath, body: '' };
}

const pages = [
  page('install', 'en', 'install.md'),
  page('install', 'es', 'install.es.md'),
  page('guide', 'en', 'guide.md'),
  page('index', 'es', 'index.es.md'),
  page('changelog', 'en', '../CHANGELOG.md', 'external'),
  page('changelog', 'es', '../CHANGELOG.es.md', 'external'),
  page('nested', 'es', 'guide/nested.es.md'),
  page('readme', 'en', '../README.md', 'external'),
];
const index: PageIndex = { pages, url };
function from(sourcePath: string) {
  return pages.find((candidate) => candidate.sourcePath === sourcePath)!;
}

describe('rewriteLinks: archivos excluidos', () => {
  const withExcluded: PageIndex = { ...index, excluded: new Set(['borrador.md']) };

  it('un enlace a un archivo excluido falla diciendo que `exclude` lo deja fuera', () => {
    const result = rewriteLinks('Ver [x](./borrador.md).', from('guide.md'), withExcluded);
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors;
    expect(error?.describe()).toContain('borrador.md');
    expect(error?.describe()).toContain('exclude');
    expect(error?.describe()).not.toContain('no es una página publicada');
  });

  it('también desde un archivo externo que apunta a la carpeta de contenido', () => {
    const readme = page('leeme', 'en', 'LEEME.md', 'external');
    const result = rewriteLinks('[x](./src/content/docs/borrador.md)', readme, withExcluded);
    expect(result.errors[0]?.describe()).toContain('exclude');
  });

  it('un archivo que no existe sigue siendo un enlace roto normal', () => {
    const result = rewriteLinks('[x](./nada.md)', from('guide.md'), withExcluded);
    expect(result.errors[0]?.describe()).toContain('no es una página publicada');
  });
});

describe('rewriteLinks: carpetas de `static`', () => {
  // Como en SnakeORM: la carpeta estática vive dentro del contenido, junto a la página que la enlaza.
  const viewer = page(
    'contributors/coverage-history',
    'en',
    'contributors/coverage-history/index.md',
  );
  const withStatic: PageIndex = {
    pages: [...pages, viewer],
    url,
    contentDir: '../docs',
    staticFolders: [
      { from: '../docs/contributors/coverage-history', to: 'coverage-history' },
      { from: '../htmlcov', to: 'reports/cov', exclude: ['*.py'] },
    ],
  };

  it('un enlace relativo dentro de su `from` pasa a la URL publicada: base + `to` + el resto', () => {
    const result = rewriteLinks('[Viewer](coverage/index.html#top)', viewer, withStatic);
    expect(result.body).toBe('[Viewer](/repo/coverage-history/coverage/index.html#top)');
    expect(result.errors).toEqual([]);
    expect(result.refs).toEqual([]);
  });

  it('vale desde fuera de la carpeta y conserva la barra final de una carpeta', () => {
    const result = rewriteLinks('[c](../htmlcov/)', from('guide.md'), withStatic);
    expect(result.body).toBe('[c](/repo/reports/cov/)');
    expect(result.errors).toEqual([]);
  });

  it('un `.md` publicado como página sigue siendo la página, aunque viva en la carpeta', () => {
    const result = rewriteLinks('[g](../../guide.md)', viewer, withStatic);
    expect(result.body).toBe('[g](/repo/guide/)');
  });

  it('un archivo que su `exclude` deja fuera falla nombrando esa entrada de `static`', () => {
    const result = rewriteLinks('[s](../htmlcov/run.py)', from('guide.md'), withStatic);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.describe()).toContain('static[1].exclude');
  });

  it('un recurso suelto que no es de ninguna carpeta dice qué funciona de verdad', () => {
    const result = rewriteLinks('[p](./manual.pdf)', from('guide.md'), withStatic);
    const message = result.errors[0]?.describe() ?? '';
    expect(message).toContain('static');
    expect(message).toContain('/repo/');
    expect(message).not.toContain('declara el recurso');
  });
});

describe('rewriteLinks', () => {
  it('reescribe un enlace a un hermano publicado por la URL de su página', () => {
    const result = rewriteLinks('Ver [cambios](./CHANGELOG.md).', from('../README.md'), index);
    expect(result.body).toBe('Ver [cambios](/repo/changelog/).');
    expect(result.errors).toEqual([]);
  });

  it('conserva el ancla y resuelve primero la gemela del mismo idioma', () => {
    const result = rewriteLinks('[r](./install.md#requisitos)', from('install.es.md'), index);
    expect(result.body).toBe('[r](/repo/es/install/#requisitos)');
    expect(result.refs).toEqual([
      { file: 'install.es.md', line: 1, slug: 'install', locale: 'es', anchor: 'requisitos' },
    ]);
  });

  it('reescribe un enlace cuyo texto se parte en dos líneas', () => {
    const body = 'Antes\nver [los cambios\nmás largos](./CHANGELOG.md) y listo.';
    const result = rewriteLinks(body, from('../README.md'), index);
    expect(result.body).toBe('Antes\nver [los cambios\nmás largos](/repo/changelog/) y listo.');
    expect(result.refs).toEqual([
      { file: '../README.md', line: 2, slug: 'changelog', locale: 'en' },
    ]);
  });

  it('un enlace partido y roto se avisa con la línea donde empieza', () => {
    const result = rewriteLinks('x\n[texto\npartido](./nada.md)', from('../README.md'), index);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.line).toBe(2);
  });

  it('un texto partido no cruza un fence ni un párrafo', () => {
    const body = '[abierto\n\nsegundo](./nada.md)\n```\n[a\nb](./nada.md)\n```';
    expect(rewriteLinks(body, from('../README.md'), index).errors).toEqual([]);
  });

  it('si no hay gemela en el idioma, enlaza a la página que existe', () => {
    const result = rewriteLinks('[g](./guide.md)', from('index.es.md'), index);
    expect(result.body).toBe('[g](/repo/guide/)');
  });

  it('conserva el título del enlace', () => {
    const result = rewriteLinks('[i](./install.md "Instalar")', from('guide.md'), index);
    expect(result.body).toBe('[i](/repo/install/ "Instalar")');
  });

  it('un enlace a un archivo que no es página publicada es un error con archivo, línea y destino', () => {
    const body = 'uno\n\n[x](./missing.md)';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.file).toBe('guide.md');
    expect(result.errors[0]?.line).toBe(3);
    expect(result.errors[0]?.message).toContain('./missing.md');
  });

  it('agrega todos los enlaces rotos, no solo el primero', () => {
    const result = rewriteLinks('[a](./a.md)\n[b](./b.md)', from('guide.md'), index);
    expect(result.errors.map((problem) => problem.line)).toEqual([1, 2]);
  });

  it('ignora un enlace roto dentro de un bloque de código', () => {
    const body = ['```md', '[x](./missing.md)', '```'].join('\n');
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
    expect(result.refs).toEqual([]);
  });

  it('ignora un enlace dentro de código en línea', () => {
    const body = 'usa `[x](./missing.md)` así';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
  });

  it('no toca URLs externas, absolutas del sitio ni mailto', () => {
    const body = '[a](https://x.dev/a.md) [b](/otra/b.md) [c](mailto:a@b.c) [d](//cdn.x/y.md)';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
  });

  it('un ancla de la misma página apunta a la propia página y no se reescribe', () => {
    const result = rewriteLinks('[arriba](#top)', from('install.es.md'), index);
    expect(result.body).toBe('[arriba](#top)');
    expect(result.refs).toEqual([
      { file: 'install.es.md', line: 1, slug: 'install', locale: 'es', anchor: 'top' },
    ]);
  });

  it('las imágenes no se tocan (las resuelve Astro)', () => {
    const body = '![logo](./missing.png)';
    const result = rewriteLinks(body, from('guide.md'), index);
    expect(result.body).toBe(body);
    expect(result.errors).toEqual([]);
  });

  it('reescribe también las definiciones de referencia', () => {
    const result = rewriteLinks('[i]: ./install.md#uso', from('guide.md'), index);
    expect(result.body).toBe('[i]: /repo/install/#uso');
  });

  it('un recurso que no es página solo vale si está publicado', () => {
    const withAssets: PageIndex = { ...index, assets: new Set(['docs/manual.pdf']) };
    const src = { ...page('doc', 'en', 'doc.md'), sourcePath: 'doc.md' };
    const ok = rewriteLinks('[m](./docs/manual.pdf)', src, withAssets);
    expect(ok.errors).toEqual([]);
    expect(ok.body).toBe('[m](./docs/manual.pdf)');
    const bad = rewriteLinks('[m](./docs/otro.pdf)', src, withAssets);
    expect(bad.errors).toHaveLength(1);
  });

  it('respeta trailingSlash never', () => {
    const never: PageIndex = { pages, url: { ...url, trailingSlash: 'never' } };
    const result = rewriteLinks('[i](./install.md)', from('guide.md'), never);
    expect(result.body).toBe('[i](/repo/install)');
  });

  describe('de una página nativa a un archivo external', () => {
    it('resuelve la ruta real del external a su URL en el idioma de la página que enlaza', () => {
      const es = rewriteLinks(
        '[c](../../../../CHANGELOG.md#cambios)',
        from('install.es.md'),
        index,
      );
      expect(es.errors).toEqual([]);
      expect(es.body).toBe('[c](/repo/es/changelog/#cambios)');
      expect(es.refs).toEqual([
        { file: 'install.es.md', line: 1, slug: 'changelog', locale: 'es', anchor: 'cambios' },
      ]);
      const en = rewriteLinks('[c](../../../../CHANGELOG.md)', from('install.md'), index);
      expect(en.body).toBe('[c](/repo/changelog/)');
    });

    it('funciona desde una carpeta anidada', () => {
      const result = rewriteLinks(
        '[c](../../../../../CHANGELOG.md)',
        from('guide/nested.es.md'),
        index,
      );
      expect(result.errors).toEqual([]);
      expect(result.body).toBe('[c](/repo/es/changelog/)');
    });

    it('sin gemela en el idioma, enlaza al external que sí existe', () => {
      const result = rewriteLinks('[r](../../../../README.md)', from('install.es.md'), index);
      expect(result.errors).toEqual([]);
      expect(result.body).toBe('[r](/repo/readme/)');
    });

    it('respeta trailingSlash never', () => {
      const never: PageIndex = { pages, url: { ...url, trailingSlash: 'never' } };
      const result = rewriteLinks('[c](../../../../CHANGELOG.md)', from('install.es.md'), never);
      expect(result.body).toBe('[c](/repo/es/changelog)');
    });

    it('un archivo que no es página ni recurso sigue siendo un error', () => {
      const result = rewriteLinks('[x](../../../../NOPE.md)', from('install.es.md'), index);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('../../../../NOPE.md');
    });

    it('un enlace https, incluso al propio sitio, ni se reescribe ni se valida', () => {
      const body = '[a](https://example.dev/repo/changelog/) [b](https://example.dev/nada.md)';
      const result = rewriteLinks(body, from('install.es.md'), index);
      expect(result.body).toBe(body);
      expect(result.errors).toEqual([]);
      expect(result.refs).toEqual([]);
    });
  });
});

/* La carpeta de contenido vive FUERA del proyecto de Astro (`site/` + `docs/` hermanas): los
   `sourcePath` nativos siguen siendo relativos a ella y los external, a la raíz del proyecto. */
describe('rewriteLinks con `contentDir` fuera del proyecto', () => {
  const contentDir = '../docs';
  const outside = [
    page('', 'en', 'index.md'),
    page('', 'es', 'index.es.md'),
    page('users/guia', 'en', 'users/guia.md'),
    page('users/guia', 'es', 'users/guia.es.md'),
    page('changelog', 'en', '../CHANGELOG.md', 'external'),
    page('changelog', 'es', '../CHANGELOG.es.md', 'external'),
  ];
  const outsideIndex: PageIndex = { pages: outside, url, contentDir };
  function at(sourcePath: string) {
    return outside.find((candidate) => candidate.sourcePath === sourcePath)!;
  }

  it('un enlace relativo entre nativas sigue resolviendo contra la carpeta de contenido', () => {
    const result = rewriteLinks(
      '[g](./guia.md) y [h](../index.md)',
      at('users/guia.md'),
      outsideIndex,
    );
    expect(result.body).toBe('[g](/repo/users/guia/) y [h](/repo/)');
  });

  it('respeta el idioma de la página que enlaza', () => {
    const result = rewriteLinks('[g](./guia.md)', at('users/guia.es.md'), outsideIndex);
    expect(result.body).toBe('[g](/repo/es/users/guia/)');
  });

  it('una nativa enlaza a un external con su ruta real desde la carpeta de contenido', () => {
    const result = rewriteLinks('[c](../../CHANGELOG.md#v1)', at('users/guia.md'), outsideIndex);
    expect(result.body).toBe('[c](/repo/changelog/#v1)');
    expect(result.errors).toEqual([]);
  });

  it('un external enlaza de vuelta a una nativa por su ruta real (`../docs/...`)', () => {
    const result = rewriteLinks(
      '[g](./docs/users/guia.md#uso)',
      at('../CHANGELOG.md'),
      outsideIndex,
    );
    expect(result.body).toBe('[g](/repo/users/guia/#uso)');
    expect(result.refs).toEqual([
      { file: '../CHANGELOG.md', line: 1, slug: 'users/guia', locale: 'en', anchor: 'uso' },
    ]);
  });

  it('el enlace de vuelta usa la gemela del idioma del external', () => {
    const result = rewriteLinks(
      '[g](./docs/users/guia.md)',
      at('../CHANGELOG.es.md'),
      outsideIndex,
    );
    expect(result.body).toBe('[g](/repo/es/users/guia/)');
  });

  it('un external sigue enlazando a otro external', () => {
    const result = rewriteLinks('[c](./CHANGELOG.md)', at('../CHANGELOG.es.md'), outsideIndex);
    expect(result.body).toBe('[c](/repo/es/changelog/)');
  });

  it('un external que no apunta dentro de la carpeta de contenido no encuentra nativas', () => {
    const result = rewriteLinks('[g](./users/guia.md)', at('../CHANGELOG.md'), outsideIndex);
    expect(result.errors).toHaveLength(1);
  });

  it('sin `contentDir` se asume `src/content/docs` (los external no ven nativas bajo `../docs`)', () => {
    const result = rewriteLinks('[g](./docs/users/guia.md)', at('../CHANGELOG.md'), {
      pages: outside,
      url,
    });
    expect(result.errors).toHaveLength(1);
  });
});

/* Astro resuelve las imágenes de una página como importaciones: `img/x.png` sin `./` sería un
   módulo «bare» (falla con ImageNotFound), aunque en Markdown sea una ruta relativa válida. */
describe('rewriteLinks: imágenes relativas sin `./`', () => {
  function rewrite(body: string) {
    return rewriteLinks(body, from('guide.md'), index).body;
  }

  it('añade `./` a una ruta relativa que no lo lleva', () => {
    expect(rewrite('![captura](img/captura.png)')).toBe('![captura](./img/captura.png)');
  });

  it('conserva el título y la forma con `<...>`', () => {
    expect(rewrite('![c](img/a.png "Título")')).toBe('![c](./img/a.png "Título")');
    expect(rewrite('![c](<img/mi foto.png>)')).toBe('![c](<./img/mi foto.png>)');
  });

  it.each([
    './img/a.png',
    '../assets/a.png',
    '/og.png',
    'https://example.dev/a.png',
    'data:image/png;base64,AAAA',
  ])('«%s» se deja como está', (target) => {
    expect(rewrite(`![c](${target})`)).toBe(`![c](${target})`);
  });

  it('ignora imágenes en bloques de código y en código en línea', () => {
    const body = ['```md', '![c](img/a.png)', '```', '`![c](img/a.png)`'].join('\n');
    expect(rewrite(body)).toBe(body);
  });

  it('no inventa errores de enlace roto con las imágenes', () => {
    expect(rewriteLinks('![c](img/a.png)', from('guide.md'), index).errors).toEqual([]);
  });
});

/* Las imágenes se detectan aquí, en la misma pasada que los enlaces: una sola regla para «qué es
   una imagen del cuerpo» (la usa el panel SEO para el texto alternativo). */
describe('rewriteLinks: imágenes del cuerpo', () => {
  function images(body: string) {
    return rewriteLinks(body, from('guide.md'), index).images;
  }

  it('devuelve cada imagen con su ruta original, su alt y su línea', () => {
    expect(images('uno\n\n![captura](img/a.png)\n![](https://x.dev/b.png "T")')).toEqual([
      { file: 'guide.md', line: 3, src: 'img/a.png', alt: 'captura' },
      { file: 'guide.md', line: 4, src: 'https://x.dev/b.png', alt: '' },
    ]);
  });

  it('la forma con `<...>` devuelve la ruta sin los ángulos', () => {
    expect(images('![c](<img/mi foto.png>)')[0]?.src).toBe('img/mi foto.png');
  });

  it('ignora las de bloques de código y las de código en línea', () => {
    const body = ['```md', '![c](a.png)', '```', '`![c](b.png)`'].join('\n');
    expect(images(body)).toEqual([]);
  });

  it('un enlace normal no es una imagen', () => {
    expect(images('[x](./install.md)')).toEqual([]);
  });
});

describe('rewriteLinks: casos límite de lo que cuenta como enlace', () => {
  const missing = '[x](./missing.md)';
  function errorCount(body: string, source = 'guide.md') {
    return rewriteLinks(body, from(source), index).errors.length;
  }

  describe('código en línea', () => {
    it('un código con dos backticks protege el enlace de dentro', () => {
      expect(errorCount(`\`\`${missing}\`\``)).toBe(0);
    });

    it('un enlace pegado al cierre del código ya no está dentro', () => {
      expect(errorCount(`\`a\`${missing}`)).toBe(1);
    });

    it('el enlace antes o entre dos códigos sí se valida', () => {
      expect(errorCount(`${missing} \`a\``)).toBe(1);
      expect(errorCount(`\`a\` ${missing} \`b\``)).toBe(1);
    });
  });

  it('el destino entre `<...>` se reescribe sin los ángulos', () => {
    const result = rewriteLinks('[i](<./install.md#uso>)', from('guide.md'), index);
    expect(result.body).toBe('[i](/repo/install/#uso)');
  });

  it('un destino con `%20` se busca decodificado', () => {
    const spaced = [...pages, page('my-page', 'en', 'my page.md')];
    const result = rewriteLinks('[m](./my%20page.md)', from('guide.md'), { pages: spaced, url });
    expect(result.body).toBe('[m](/repo/my-page/)');
  });

  it('un recurso cuyo nombre contiene `.md` pero no termina en `.md` no es una página', () => {
    const withAssets: PageIndex = { ...index, assets: new Set(['notes.md.txt']) };
    expect(rewriteLinks('[n](./notes.md.txt)', from('guide.md'), withAssets).errors).toEqual([]);
  });

  it('una nativa no resuelve a un external por la ruta relativa a su propio archivo', () => {
    expect(errorCount('[r](../README.md)')).toBe(1);
  });

  it('la línea de una definición de referencia es la suya, contando desde 1', () => {
    const result = rewriteLinks(
      'uno\n\n[ref]: ./install.md\n[roto]: ./missing.md',
      from('guide.md'),
      index,
    );
    expect(result.refs[0]?.line).toBe(3);
    expect(result.errors[0]?.line).toBe(4);
  });

  it('una imagen que ya tiene `./` se devuelve idéntica, espacios incluidos', () => {
    const body = '![c](  ./img/a.png  )';
    expect(rewriteLinks(body, from('guide.md'), index).body).toBe(body);
  });
});

describe('rewriteLinks: `slug` propio', () => {
  const translated = [
    { ...page('articulos/a', 'en', 'articulos/a.md'), urlSlug: 'articles/a' },
    { ...page('articulos/a', 'es', 'articulos/a.es.md'), urlSlug: 'articulos/a-es' },
    page('articulos/b', 'en', 'articulos/b.md'),
    { ...page('articulos/b', 'es', 'articulos/b.es.md'), urlSlug: 'blog/b' },
  ];
  const site: PageIndex = { pages: translated, url };
  function at(sourcePath: string) {
    return translated.find((item) => item.sourcePath === sourcePath)!;
  }

  it('`[x](b.md)` desde la traducción lleva a la URL traducida de la gemela, y el ancla se valida en ella', () => {
    const result = rewriteLinks('[b](./b.md#uso)', at('articulos/a.es.md'), site);
    expect(result.body).toBe('[b](/repo/es/blog/b/#uso)');
    expect(result.refs).toEqual([
      { file: 'articulos/a.es.md', line: 1, slug: 'articulos/b', locale: 'es', anchor: 'uso' },
    ]);
  });

  it('`[x](b.es.md)` también: el archivo del otro idioma resuelve a la misma gemela', () => {
    const result = rewriteLinks('[b](./b.es.md)', at('articulos/a.es.md'), site);
    expect(result.body).toBe('[b](/repo/es/blog/b/)');
  });

  it('desde el idioma por defecto, la página con `slug` propio enlaza su URL', () => {
    const result = rewriteLinks('[a](./a.md)', at('articulos/b.md'), site);
    expect(result.body).toBe('[a](/repo/articles/a/)');
  });
});
