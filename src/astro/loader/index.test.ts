import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AstroError } from 'astro/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveConfigOrThrow, type DocsUserConfig } from '../integration';
import { docsLoader, docsLoaderFromResolved } from './index';
import { CONTENT_METADATA_KEY } from '../../core/seo-on-page/nodes/content';
import { docsSchema } from './schema';

let root: string;

async function write(file: string, content: string) {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

/** PNG con cabecera válida (anchura × altura) para las imágenes SEO. */
function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

class FakeWatcher extends EventEmitter {
  added: string[] = [];
  add(paths: string | string[]) {
    this.added.push(...[paths].flat());
    return this;
  }
}

/** `ctx` mínimo del content layer: store en memoria, `parseData` con el schema real y Markdown simulado. */
function makeCtx(options: { base?: string; watcher?: FakeWatcher; project?: string } = {}) {
  /* Raíz del proyecto de Astro: `root`, o una subcarpeta (`site`) si el contenido vive fuera de ella. */
  const projectRoot = options.project ? path.join(root, options.project) : root;
  const entries = new Map<
    string,
    { id: string; data: Record<string, unknown>; filePath?: string }
  >();
  const warnings: string[] = [];
  const errors: string[] = [];
  const rendered: string[] = [];
  const ctx = {
    config: {
      root: pathToFileURL(`${projectRoot}/`),
      base: options.base ?? '/',
      trailingSlash: 'ignore',
      publicDir: pathToFileURL(`${projectRoot}/public/`),
      integrations: [],
    },
    store: {
      clear: () => entries.clear(),
      set: (entry: { id: string; data: Record<string, unknown>; filePath?: string }) => {
        entries.set(entry.id, entry);
        return true;
      },
    },
    logger: {
      warn: (message: string) => warnings.push(message),
      error: (message: string) => errors.push(message),
      info: () => {},
    },
    parseData: async ({ data }: { data: unknown }) => docsSchema().parse(data),
    renderMarkdown: async (body: string) => {
      rendered.push(body);
      const headings = [...body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((match) => ({
        depth: 1,
        text: match[1],
        slug: match[1].toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-'),
      }));
      return { html: '', metadata: { headings, imagePaths: [] } };
    },
    watcher: options.watcher,
  };
  return { ctx: ctx as never, entries, warnings, errors, rendered };
}

async function load(config: DocsUserConfig, made = makeCtx()) {
  return docsLoader(config)
    .load(made.ctx)
    .then(() => made);
}

/** Captura el `AstroError` de una carga fallida con todos los mensajes (título + pista). */
async function failure(config: DocsUserConfig, made = makeCtx()) {
  const error = await load(config, made).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AstroError);
  return `${(error as AstroError).message}\n${(error as AstroError).hint ?? ''}`;
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'docs-loader-'));
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('docsSchema', () => {
  it('acepta seo y translations opcionales', () => {
    const data = docsSchema().parse({
      slug: 'a',
      locale: 'en',
      title: 'A',
      sourcePath: 'a.md',
      seo: { noindex: true },
      translations: 'omit',
    });
    expect(data.seo).toEqual({ noindex: true });
    expect(data.translations).toBe('omit');
  });

  it('kind es native salvo que se diga lo contrario', () => {
    const base = { slug: 'a', locale: 'en', title: 'A', sourcePath: 'a.md' };
    expect(docsSchema().parse(base).kind).toBe('native');
    expect(docsSchema().parse({ ...base, kind: 'external' }).kind).toBe('external');
    expect(() => docsSchema().parse({ ...base, kind: 'remote' })).toThrow();
  });

  it('rechaza un seo o un translations inválido', () => {
    const base = { slug: 'a', locale: 'en', title: 'A', sourcePath: 'a.md' };
    expect(() => docsSchema().parse({ ...base, seo: { titel: 'x' } })).toThrow();
    expect(() => docsSchema().parse({ ...base, translations: 'ocultar' })).toThrow();
  });
});

describe('docsLoader: frontmatter, seo y translations', () => {
  it('las páginas nativas reciben title, order, seo y translations de su frontmatter', async () => {
    await write(
      'src/content/docs/guide.md',
      '---\ntitle: Guía\norder: 2\nseo:\n  noindex: true\ntranslations: omit\n---\n# Otro\n',
    );
    const { entries } = await load({ name: 'T' });
    const entry = entries.get('en/guide')!;
    expect(entry.data).toMatchObject({
      slug: 'guide',
      locale: 'en',
      title: 'Guía',
      order: 2,
      seo: { noindex: true },
      translations: 'omit',
      sourcePath: path.join('src/content/docs', 'guide.md'),
    });
    expect(entry.filePath).toBe(path.join('src/content/docs', 'guide.md'));
  });

  it('el frontmatter no llega al renderizado y las líneas se conservan', async () => {
    await write('src/content/docs/guide.md', '---\ntitle: G\n---\n# G\n');
    const { rendered } = await load({ name: 'T' });
    expect(rendered[0]).not.toContain('title: G');
    expect(rendered[0].split('\n')[3]).toBe('# G');
  });

  it('external[].seo y external[].translations llegan a todos los idiomas', async () => {
    await write('src/content/docs/index.md', '# Home\n');
    await write('src/content/docs/index.es.md', '# Inicio\n');
    await write('CHANGELOG.md', '# Changelog\n');
    await write('CHANGELOG.es.md', '# Cambios\n');
    const { entries } = await load({
      name: 'T',
      locales: ['en', 'es'],
      external: [
        {
          slug: 'changelog',
          file: './CHANGELOG.md',
          seo: { title: 'Cambios', noindex: true },
          translations: 'fallback',
        },
      ],
    });
    for (const id of ['en/changelog', 'es/changelog']) {
      expect(entries.get(id)!.data).toMatchObject({
        seo: { title: 'Cambios', noindex: true },
        translations: 'fallback',
      });
    }
  });

  it('cada entrada guarda de dónde viene: nativa o external[]', async () => {
    await write('src/content/docs/index.md', '# Home\n');
    await write('CHANGELOG.md', '# Changelog\n');
    const { entries } = await load({
      name: 'T',
      external: [{ slug: 'changelog', file: './CHANGELOG.md' }],
    });
    expect(entries.get('en/index')!.data.kind).toBe('native');
    expect(entries.get('en/changelog')!.data.kind).toBe('external');
  });

  it('seo inválido en una externa rompe con la ruta external[i].seo.<campo>', async () => {
    await write('src/content/docs/index.md', '# Home\n');
    await write('CHANGELOG.md', '# Changelog\n');
    const message = await failure({
      name: 'T',
      external: [{ slug: 'changelog', file: './CHANGELOG.md', seo: { image: { src: 'og.png' } } }],
    });
    expect(message).toContain('external[0].seo.image.src');
  });

  it('seo inválido en el frontmatter rompe con archivo y campo', async () => {
    await write('src/content/docs/guide.md', '---\nseo:\n  image:\n    src: og.png\n---\n# G\n');
    const message = await failure({ name: 'T' });
    expect(message).toContain('guide.md');
    expect(message).toContain('seo.image.src');
  });

  it('translations inválido en el frontmatter rompe con archivo y campo', async () => {
    await write('src/content/docs/guide.md', '---\ntranslations: ocultar\n---\n# G\n');
    const message = await failure({ name: 'T' });
    expect(message).toContain('guide.md');
    expect(message).toContain('translations');
  });
});

describe('docsLoader: enlaces y anclas', () => {
  it('reescribe los enlaces relativos a la URL de la página, también bajo base', async () => {
    await write('src/content/docs/a.md', '# A\n\nVer [b](./b.md#seccion).\n');
    await write('src/content/docs/b.md', '# B\n\n## Seccion\n');
    const { rendered } = await load({ name: 'T' }, makeCtx({ base: '/repo' }));
    expect(rendered.join('\n')).toContain('[b](/repo/b/#seccion)');
  });

  it('un enlace roto rompe la carga con archivo y línea', async () => {
    await write('src/content/docs/a.md', '# A\n\nTexto\n\n[x](./no-existe.md)\n');
    const message = await failure({ name: 'T' });
    expect(message).toContain('a.md:5');
    expect(message).toContain('no-existe.md');
  });

  it('un enlace en un archivo con frontmatter señala la línea real', async () => {
    await write('src/content/docs/a.md', '---\ntitle: A\n---\n# A\n\n[x](./nada.md)\n');
    expect(await failure({ name: 'T' })).toContain('a.md:6');
  });

  it('un ancla rota rompe la carga con archivo y línea', async () => {
    await write('src/content/docs/a.md', '# A\n\n[b](./b.md#no-hay)\n');
    await write('src/content/docs/b.md', '# B\n');
    const message = await failure({ name: 'T' });
    expect(message).toContain('a.md:3');
    expect(message).toContain('no-hay');
  });

  it('un archivo externo ausente rompe la carga', async () => {
    await write('src/content/docs/index.md', '# Home\n');
    const message = await failure({
      name: 'T',
      external: [{ slug: 'changelog', file: './CHANGELOG.md' }],
    });
    expect(message).toContain('CHANGELOG.md');
  });

  it('todos los fallos de carga llegan juntos en un solo error', async () => {
    await write('src/content/docs/a.md', '# A\n\n[x](./no.md)\n\n[y](./b.md#nada)\n');
    await write('src/content/docs/b.md', '---\nseo:\n  image:\n    src: /falta.png\n---\n# B\n');
    const message = await failure({ name: 'T' });
    expect(message).toContain('a.md:3');
    expect(message).toContain('a.md:5');
    expect(message).toContain('/falta.png');
  });

  it('un conflicto de política en el grupo se agrega con el resto de errores', async () => {
    await write('src/content/docs/a.md', '---\ntranslations: omit\n---\n# A\n\n[x](./no.md)\n');
    await write('src/content/docs/a.es.md', '---\ntranslations: link\n---\n# A\n');
    const message = await failure({ name: 'T', locales: ['en', 'es'] });
    expect(message).toContain('políticas de traducción distintas');
    expect(message).toContain('no.md');
  });
});

describe('docsLoader: lo que el cuerpo enlaza y muestra (para el panel SEO)', () => {
  function metadataOf(entry: unknown) {
    return (entry as { rendered: { metadata: Record<string, unknown> } }).rendered.metadata;
  }
  function contentOf(entry: unknown) {
    return metadataOf(entry)[CONTENT_METADATA_KEY];
  }

  it('guarda con la entrada las páginas que enlaza y sus imágenes, junto a los encabezados', async () => {
    await write(
      'src/content/docs/a.md',
      '# A\n\nVer [b](./b.md) y ![](img/x.png), ![logo](https://x.dev/l.png).\n',
    );
    await write('src/content/docs/b.md', '# B\n');
    const { entries } = await load({ name: 'T' });
    const entry = entries.get('en/a');
    expect(contentOf(entry)).toEqual({
      links: [{ slug: 'b', locale: 'en' }],
      images: [
        { src: 'img/x.png', alt: '' },
        { src: 'https://x.dev/l.png', alt: 'logo' },
      ],
    });
    expect(metadataOf(entry)['headings']).toHaveLength(1);
  });

  it('una página sin enlaces ni imágenes guarda listas vacías, no «sin dato»', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const { entries } = await load({ name: 'T' });
    expect(contentOf(entries.get('en/a'))).toEqual({ links: [], images: [] });
  });
});

describe('docsLoader: imágenes SEO', () => {
  it('una imagen de la base o de una página que no existe rompe con página y campo', async () => {
    await write('src/content/docs/a.md', '---\nseo:\n  image:\n    src: /a.png\n---\n# A\n');
    const message = await failure({
      name: 'T',
      seo: { image: { src: '/base.png', alt: 'base' } },
    });
    expect(message).toContain('/base.png');
    expect(message).toContain('a.md');
    expect(message).toContain('/a.png');
  });

  it('las existentes pasan; las https no se tocan', async () => {
    await write('public/og.png', '');
    await writeFile(path.join(root, 'public/og.png'), png(1200, 630));
    await write(
      'src/content/docs/a.md',
      '---\nseo:\n  image:\n    src: https://cdn.dev/x.png\n---\n# A\n',
    );
    const { warnings } = await load({
      name: 'T',
      seo: { image: { src: '/og.png', alt: 'base' } },
    });
    expect(warnings).toEqual([]);
  });

  it('proporción o peso fuera de lo recomendado avisan por logger.warn y no rompen', async () => {
    await write('public/sq.png', '');
    await writeFile(path.join(root, 'public/sq.png'), png(800, 800));
    await write('src/content/docs/a.md', '# A\n');
    const { warnings } = await load({ name: 'T', seo: { image: { src: '/sq.png', alt: 'b' } } });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('800×800');
  });
});

describe('docsLoader: traducciones no declaradas', () => {
  async function pages(frontmatter = '') {
    await write('src/content/docs/install.md', `${frontmatter}# Install\n`);
    await write('src/content/docs/index.md', '# Home\n');
    await write('src/content/docs/index.es.md', '# Inicio\n');
  }

  it('avisa una vez por página con idioma que falta, sin romper la carga', async () => {
    await pages();
    const { warnings, entries } = await load({ name: 'T', locales: ['en', 'es'] });
    expect(entries.has('en/install')).toBe(true);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('install: falta es');
  });

  it('con `translations` declarada no avisa', async () => {
    await pages('---\ntranslations: link\n---\n');
    const { warnings } = await load({ name: 'T', locales: ['en', 'es'] });
    expect(warnings).toEqual([]);
  });

  it('un sitio de un solo idioma no avisa', async () => {
    await write('src/content/docs/install.md', '# Install\n');
    const { warnings } = await load({ name: 'T' });
    expect(warnings).toEqual([]);
  });
});

describe('docsLoader: slugs del sidebar', () => {
  it('falla con todos los slugs desconocidos y su ruta en la config', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const message = await failure({
      name: 'T',
      sidebar: ['a', 'nope', { label: 'G', items: ['ghost'] }],
    });
    expect(message).toContain('sidebar[1]');
    expect(message).toContain('nope');
    expect(message).toContain('sidebar[2].items[0]');
    expect(message).toContain('ghost');
  });

  it("acepta 'index' para la portada", async () => {
    await write('src/content/docs/index.md', '# Home\n');
    await write('src/content/docs/a.md', '# A\n');
    const { entries } = await load({ name: 'T', sidebar: ['a', 'index'] });
    expect(entries.has('en/index')).toBe(true);
  });
});

describe('docsLoader: raíz del repositorio', () => {
  it('editUrl sin raíz del repo rompe con una pista accionable', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const made = makeCtx();
    // Raíz de proyecto fuera de cualquier repo: el directorio temporal no tiene .git arriba.
    const message = await failure({ name: 'T', editUrl: 'https://x/edit/main' }, made);
    expect(message).toContain('repoRoot');
  });

  it('con repoRoot, cada entrada lleva su ruta relativa al repositorio para «Editar»', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const { entries } = await load({ name: 'T', editUrl: 'https://x/edit/main', repoRoot: '.' });
    expect(entries.get('en/a')!.data.editPath).toBe(path.join('src/content/docs', 'a.md'));
  });

  it('sin editUrl no hay editPath', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const { entries } = await load({ name: 'T' });
    expect(entries.get('en/a')!.data.editPath).toBeUndefined();
  });
});

describe('docsLoader: dev (watcher)', () => {
  it('un cambio recarga todo: la entrada refleja el archivo nuevo', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const watcher = new FakeWatcher();
    const made = makeCtx({ watcher });
    await load({ name: 'T' }, made);
    expect(made.entries.size).toBe(1);

    await write('src/content/docs/b.md', '# B\n');
    watcher.emit('add', path.join(root, 'src/content/docs/b.md'));
    await vi.waitFor(() => expect(made.entries.size).toBe(2));

    await rm(path.join(root, 'src/content/docs/a.md'));
    watcher.emit('unlink', path.join(root, 'src/content/docs/a.md'));
    await vi.waitFor(() => expect([...made.entries.keys()]).toEqual(['en/b']));
  });

  it('vigila el directorio de contenido y los externos', async () => {
    await write('src/content/docs/index.md', '# Home\n');
    await write('CHANGELOG.md', '# Changelog\n');
    const watcher = new FakeWatcher();
    await load(
      { name: 'T', external: [{ slug: 'changelog', file: './CHANGELOG.md' }] },
      makeCtx({ watcher }),
    );
    expect(watcher.added).toEqual([
      path.join(root, 'src/content/docs'),
      path.join(root, 'CHANGELOG.md'),
    ]);
  });

  it('un error al recargar se informa por logger.error y el watcher sigue vivo', async () => {
    await write('src/content/docs/a.md', '# A\n');
    const watcher = new FakeWatcher();
    const made = makeCtx({ watcher });
    await load({ name: 'T' }, made);

    await write('src/content/docs/a.md', '# A\n\n[x](./no.md)\n');
    watcher.emit('change', path.join(root, 'src/content/docs/a.md'));
    await vi.waitFor(() => expect(made.errors).toHaveLength(1));
    expect(made.errors[0]).toContain('no.md');

    await write('src/content/docs/a.md', '# A fijo\n');
    watcher.emit('change', path.join(root, 'src/content/docs/a.md'));
    await vi.waitFor(() => expect(made.entries.get('en/a')!.data.title).toBe('A fijo'));
  });
});

describe('docsLoader: `content` fuera del proyecto (site/ + docs/)', () => {
  function site() {
    return makeCtx({ project: 'site', base: '/repo' });
  }
  function config(extra: Partial<DocsUserConfig> = {}): DocsUserConfig {
    return {
      name: 'T',
      locales: ['en', 'es'],
      content: '../docs',
      ...extra,
    };
  }

  it('lee las páginas de ../docs sin mirar src/content/docs, y solo los .md', async () => {
    await write('docs/index.md', '# Home\n');
    await write('docs/index.es.md', '# Inicio\n');
    await write('docs/users/guia.md', '# Guía\n');
    await write('docs/requirements.txt', 'mkdocs\n');
    await write('docs/img/captura.png', 'png');
    await write('site/src/content/docs/otra.md', '# Otra\n');
    const { entries } = await load(config(), site());
    expect([...entries.keys()].sort()).toEqual(['en/index', 'en/users/guia', 'es/index']);
  });

  it('sourcePath y filePath son la ruta real respecto al proyecto (`../docs/...`)', async () => {
    await write('docs/users/guia.md', '# Guía\n');
    const { entries } = await load(config(), site());
    const entry = entries.get('en/users/guia')!;
    expect(entry.data.sourcePath).toBe(path.join('../docs', 'users/guia.md'));
    expect(entry.filePath).toBe(path.join('../docs', 'users/guia.md'));
  });

  it('el fileURL que recibe renderMarkdown es el del archivo real (imágenes relativas)', async () => {
    await write('docs/users/guia.md', '# Guía\n\n![c](img/captura.png)\n');
    const made = site();
    const urls: string[] = [];
    const render = made.ctx as unknown as {
      renderMarkdown: (body: string, options: { fileURL: URL }) => Promise<unknown>;
    };
    const original = render.renderMarkdown;
    render.renderMarkdown = (body, options) => {
      urls.push(options.fileURL.href);
      return original(body, options);
    };
    await load(config(), made);
    expect(urls).toEqual([pathToFileURL(path.join(root, 'docs/users/guia.md')).href]);
  });

  it('enlaces relativos entre páginas y anclas, en el idioma de la página que enlaza', async () => {
    await write('docs/index.md', '# Home\n');
    await write(
      'docs/users/guia.md',
      '# Guía\n\n## Uso\n\n[home](../index.md) [otra](./otra.md#paso)\n',
    );
    await write('docs/users/guia.es.md', '# Guía es\n\n[otra](./otra.md#paso)\n');
    await write('docs/users/otra.md', '# Otra\n\n## Paso\n');
    await write('docs/users/otra.es.md', '# Otra es\n\n## Paso\n');
    const { rendered } = await load(config(), site());
    const all = rendered.join('\n');
    expect(all).toContain('[home](/repo/) [otra](/repo/users/otra/#paso)');
    expect(all).toContain('[otra](/repo/es/users/otra/#paso)');
  });

  it('un ancla rota se nombra con el archivo (relativo a la carpeta de contenido) y la línea', async () => {
    await write('docs/a.md', '# A\n\n[b](./b.md#no-hay)\n');
    await write('docs/b.md', '# B\n');
    const message = await failure(config(), site());
    expect(message).toContain('a.md:3');
    expect(message).toContain('no-hay');
  });

  it('una nativa y un external (CHANGELOG en la raíz del repo) se enlazan en ambos sentidos', async () => {
    await write('docs/users/guia.md', '# Guía\n\n[c](../../CHANGELOG.md#v1)\n');
    await write('CHANGELOG.md', '# Changelog\n\n## v1\n\n[g](./docs/users/guia.md)\n');
    const { rendered } = await load(
      config({ locales: ['en'], external: [{ slug: 'changelog', file: '../CHANGELOG.md' }] }),
      site(),
    );
    const all = rendered.join('\n');
    expect(all).toContain('[c](/repo/changelog/#v1)');
    expect(all).toContain('[g](/repo/users/guia/)');
  });

  it('«Editar esta página» apunta a la ruta real del repositorio (docs/users/guia.md)', async () => {
    await write('docs/users/guia.md', '# Guía\n');
    const { entries } = await load(
      config({ editUrl: 'https://x/edit/main', repoRoot: '..' }),
      site(),
    );
    expect(entries.get('en/users/guia')!.data.editPath).toBe(path.join('docs', 'users/guia.md'));
  });

  it('una carpeta de contenido inexistente rompe nombrando la ruta resuelta', async () => {
    await write('site/astro.config.mjs', '');
    const message = await failure(config(), site());
    expect(message).toContain(path.join(root, 'docs'));
    expect(message).toContain('content');
  });

  it('una carpeta de contenido que es un archivo también rompe', async () => {
    await write('docs', 'no soy una carpeta');
    expect(await failure(config(), site())).toContain(path.join(root, 'docs'));
  });

  it('vigila la carpeta externa y una edición en ella recarga', async () => {
    await write('docs/a.md', '# A\n');
    const watcher = new FakeWatcher();
    const made = makeCtx({ project: 'site', watcher });
    await load(config(), made);
    expect(watcher.added).toEqual([path.join(root, 'docs')]);

    await write('docs/a.md', '# A editada\n');
    watcher.emit('change', path.join(root, 'docs/a.md'));
    await vi.waitFor(() => expect(made.entries.get('en/a')!.data.title).toBe('A editada'));
  });
});

describe('docsLoaderFromResolved', () => {
  it('carga con una config ya resuelta, igual que docsLoader(config)', async () => {
    await write('src/content/docs/index.md', '# Home\n');
    const made = makeCtx();
    await docsLoaderFromResolved(resolveConfigOrThrow({ name: 'Resuelta' })).load(made.ctx);
    expect([...made.entries.keys()]).toEqual(['en/index']);
  });
});
