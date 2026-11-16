import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';
import type { ResolvedConfig } from '../../core/config/resolve';
import {
  discoverPages,
  externalCandidates,
  type Page,
  type SourceFile,
} from '../../core/content/discovery';
import { toAstroError } from '../integration/errors';
import { resolveConfigOrThrow, type DocsUserConfig } from '../integration';
import { readIntegrationConfig } from './config';
import { docsSchema } from './schema';

const NATIVE_DIR = 'src/content/docs';

/** Rutas de los `.md` bajo `dir`, relativas a él y con `/` aunque el sistema use otro separador. */
async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
    );
}

/** Lee del disco los archivos que el núcleo necesita: los nativos y los externos que existan. */
async function readSources(root: string, config: ResolvedConfig): Promise<SourceFile[]> {
  const nativeDir = path.join(root, NATIVE_DIR);
  const native = await Promise.all(
    (await walk(nativeDir)).map(async (file): Promise<SourceFile> => ({
      kind: 'native',
      path: file,
      body: await readFile(path.join(nativeDir, file), 'utf8'),
    })),
  );
  const external = await Promise.all(
    externalCandidates(config).map(async (file): Promise<SourceFile | undefined> => {
      const body = await readFile(path.resolve(root, file), 'utf8').catch(() => undefined);
      return body === undefined ? undefined : { kind: 'external', path: file, body };
    }),
  );
  return [...native, ...external.filter((file) => file !== undefined)];
}

/** Archivo absoluto de una página: las nativas cuelgan del directorio de contenido. */
const absolutePath = (root: string, page: Page) =>
  page.kind === 'native'
    ? path.join(root, NATIVE_DIR, page.sourcePath)
    : path.resolve(root, page.sourcePath);

export { docsSchema } from './schema';

/** `config`: la de `docs.config.mjs` (plan B). Sin ella intenta leerla de la integración (plan A). */
export function docsLoader(config?: DocsUserConfig): Loader {
  return {
    name: '@velezanthony/design/loader',
    schema: docsSchema(),
    async load(ctx) {
      const docsConfig = config
        ? resolveConfigOrThrow(config)
        : readIntegrationConfig(ctx.config.integrations);
      const root = fileURLToPath(ctx.config.root);
      ctx.store.clear();

      let pages: Page[];
      try {
        pages = discoverPages(await readSources(root, docsConfig), docsConfig);
      } catch (error) {
        throw toAstroError(error, 'No se pueden descubrir las páginas de docs.');
      }

      for (const page of pages) {
        const id = `${page.locale}/${page.slug || 'index'}`;
        const file = absolutePath(root, page);
        const data = await ctx.parseData({
          id,
          data: {
            slug: page.slug,
            locale: page.locale,
            title: page.title,
            sourcePath: path.relative(root, file),
            ...(page.order !== undefined && { order: page.order }),
          },
        });
        const rendered = await ctx.renderMarkdown(page.body, { fileURL: pathToFileURL(file) });
        ctx.store.set({
          id,
          data,
          body: page.body,
          filePath: path.relative(root, file),
          rendered,
          assetImports: rendered.metadata?.imagePaths,
        });
      }
    },
  };
}
