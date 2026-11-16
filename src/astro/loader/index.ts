import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import type { ResolvedConfig } from '../../core/config/resolve';
import {
  discoverPages,
  externalCandidates,
  type Page,
  type SourceFile,
} from '../../core/content/discovery';
import { collectErrors, DocsError, DocsErrors } from '../../core/errors';
import { validateSidebarSlugs } from '../../core/navigation/sidebar-slugs';
import { resolvePolicies, undeclaredMissing } from '../../core/i18n/translation-policy';
import { buildHeadingIndex, validateAnchors } from '../../core/links/anchors';
import { rewriteLinks, type LinkRef } from '../../core/links/rewrite';
import { collectImageRefs } from '../../core/seo/image-refs';
import { resolveConfigOrThrow, type DocsUserConfig } from '../integration';
import { toAstroError } from '../integration/errors';
import { readIntegrationConfig } from './config';
import { readFrontmatter } from './frontmatter';
import { checkSeoImages } from './images';
import { resolveRepoRoot } from './repo-root';
import { docsSchema } from './schema';
import { createReloader, watchSources } from './watch';

const NATIVE_DIR = 'src/content/docs';
const LOAD_ERROR = 'No se puede cargar el contenido de docs.';

/** Rutas de los `.md` bajo `dir`, relativas a él y con `/` aunque el sistema use otro separador. */
async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
    );
}

/**
 * Lee del disco los archivos que el núcleo necesita: los nativos (con su frontmatter ya separado
 * y validado) y los externos que existan. Los fallos de frontmatter se devuelven aparte para
 * sumarlos al resto de errores de carga.
 */
async function readSources(
  root: string,
  config: ResolvedConfig,
): Promise<{ files: SourceFile[]; errors: DocsError[] }> {
  const nativeDir = path.join(root, NATIVE_DIR);
  const errors: DocsError[] = [];
  const native = await Promise.all(
    (await walk(nativeDir)).map(async (file): Promise<SourceFile> => {
      const raw = await readFile(path.join(nativeDir, file), 'utf8');
      const parsed = readFrontmatter(raw, file);
      errors.push(...parsed.errors);
      return { kind: 'native', path: file, body: parsed.body, frontmatter: parsed.frontmatter };
    }),
  );
  const external = await Promise.all(
    externalCandidates(config).map(async (file): Promise<SourceFile | undefined> => {
      const body = await readFile(path.resolve(root, file), 'utf8').catch(() => undefined);
      return body === undefined ? undefined : { kind: 'external', path: file, body };
    }),
  );
  return { files: [...native, ...external.filter((file) => file !== undefined)], errors };
}

/** Archivo absoluto de una página: las nativas cuelgan del directorio de contenido. */
const absolutePath = (root: string, page: Page) =>
  page.kind === 'native'
    ? path.join(root, NATIVE_DIR, page.sourcePath)
    : path.resolve(root, page.sourcePath);

/** Errores de `discoverPages` como lista, para sumarlos a los demás en vez de cortar la carga. */
function discoverOrErrors(
  files: SourceFile[],
  config: ResolvedConfig,
): { pages: Page[]; errors: DocsError[] } {
  try {
    return { pages: discoverPages(files, config), errors: [] };
  } catch (error) {
    if (error instanceof DocsErrors) return { pages: [], errors: error.errors };
    throw error;
  }
}

/**
 * Una carga completa en tres pasadas: descubrir (nativos + externos, políticas), reescribir
 * enlaces y renderizar cada página, y validar anclas e imágenes con los encabezados de TODAS.
 * Los fallos se acumulan y salen en un único error con archivo y línea.
 */
async function sync(ctx: LoaderContext, config: ResolvedConfig): Promise<void> {
  const root = fileURLToPath(ctx.config.root);
  const read = await readSources(root, config);
  const errors: DocsError[] = [...read.errors];
  const discovered = discoverOrErrors(read.files, config);
  errors.push(...discovered.errors);
  const { pages } = discovered;

  const policy = resolvePolicies(pages, config.translations.missing);
  errors.push(...policy.errors);
  // Si el descubrimiento falló no hay páginas fiables: el sidebar se juzgaría contra una lista vacía.
  if (discovered.errors.length === 0) {
    errors.push(
      ...validateSidebarSlugs(config.sidebar ?? [], new Set(pages.map((page) => page.slug))),
    );
  }
  for (const { slug, missing } of undeclaredMissing(pages, config.locales)) {
    ctx.logger.warn(
      `${slug || '(portada)'}: falta ${missing.join(', ')}. Declara \`translations\` para elegir qué ve quien no tiene traducción.`,
    );
  }
  const repoRoot = await resolveRepoRoot(config, root).catch((error: unknown) => {
    if (error instanceof DocsError) errors.push(error);
    else throw error;
  });
  // Sin páginas no hay nada más que validar: se cuentan los fallos y se corta.
  if (pages.length === 0) collectErrors(errors);

  ctx.store.clear();
  const index = {
    pages,
    url: {
      base: ctx.config.base,
      trailingSlash: ctx.config.trailingSlash,
      defaultLocale: config.defaultLocale,
    },
  };
  const refs: LinkRef[] = [];
  const headings: { slug: string; locale: string; headings: { slug: string }[] }[] = [];
  for (const page of pages) {
    const id = `${page.locale}/${page.slug || 'index'}`;
    const file = absolutePath(root, page);
    const rewritten = rewriteLinks(page.body, page, index);
    errors.push(...rewritten.errors);
    refs.push(...rewritten.refs);

    const data = await ctx.parseData({
      id,
      data: {
        slug: page.slug,
        locale: page.locale,
        title: page.title,
        sourcePath: path.relative(root, file),
        ...(page.order !== undefined && { order: page.order }),
        ...(page.seo && { seo: page.seo }),
        ...(page.translations && { translations: page.translations }),
        ...(repoRoot !== undefined && { editPath: path.relative(repoRoot, file) }),
      },
    });
    const rendered = await ctx.renderMarkdown(rewritten.body, { fileURL: pathToFileURL(file) });
    headings.push({
      slug: page.slug,
      locale: page.locale,
      headings: rendered.metadata?.headings ?? [],
    });
    ctx.store.set({
      id,
      data,
      body: rewritten.body,
      filePath: path.relative(root, file),
      rendered,
      assetImports: rendered.metadata?.imagePaths,
    });
  }

  errors.push(...validateAnchors(refs, buildHeadingIndex(headings)));
  const images = await checkSeoImages(
    collectImageRefs(config.seo.image, pages),
    ctx.config.publicDir,
  );
  errors.push(...images.errors);
  for (const warning of images.warnings) ctx.logger.warn(warning);
  collectErrors(errors);
}

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
      const run = () =>
        sync(ctx, docsConfig).catch((error: unknown) => {
          throw toAstroError(error, LOAD_ERROR);
        });
      await run();

      if (ctx.watcher) {
        const root = fileURLToPath(ctx.config.root);
        watchSources(ctx.watcher, {
          nativeDir: path.join(root, NATIVE_DIR),
          files: externalCandidates(docsConfig).map((file) => path.resolve(root, file)),
          reload: createReloader(run, (error) => {
            const text = error instanceof Error ? error.message : String(error);
            const hint = (error as { hint?: string }).hint;
            ctx.logger.error(hint ? `${text}\n${hint}` : text);
          }),
        });
      }
    },
  };
}
