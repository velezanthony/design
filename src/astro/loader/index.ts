import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import type { ResolvedConfig } from '../../core/config/resolve';
import {
  discoverPages,
  externalCandidates,
  ignoredListings,
  urlCollisions,
  type Page,
  type SourceFile,
} from '../../core/content/discovery';
import { validateIndexFolders } from '../../core/config/indexes';
import { contentFolders, generatedListingPages } from '../../core/content/generated-listings';
import { reservedSegmentErrors } from '../../core/listing/urls';
import { collectErrors, DocsError, DocsErrors } from '../../core/errors';
import { DEFAULT_CONTENT_DIR } from '../../core/content/content-dir';
import { excluder } from '../../core/content/exclude';
import { validateFooter } from '../../core/navigation/footer';
import { validateNav } from '../../core/navigation/nav-sections';
import { validateSidebarSlugs } from '../../core/navigation/sidebar-slugs';
import { resolvePolicies, undeclaredMissing } from '../../core/i18n/translation-policy';
import { buildHeadingIndex, validateAnchors } from '../../core/links/anchors';
import { rewriteLinks, type LinkRef } from '../../core/links/rewrite';
import { collectImageRefs } from '../../core/seo/image-refs';
import type { StoredCover } from '../../core/listing/covers';
import { CONTENT_METADATA_KEY, contentFacts } from '../../core/seo-on-page/nodes/content';
import type { DocsUserConfig } from '../../core/config/schema';
import { resolveConfigOrThrow } from '../config';
import { urlPolicyOf } from '../config';
import { toAstroError } from '../errors';
import { readFrontmatter } from './frontmatter';
import { checkFavicon } from './favicon';
import { resolveCover } from './covers';
import { checkSeoImages } from './images';
import { resolveRepoRoot } from './repo-root';
import { docsSchema } from './schema';
import { createReloader, watchSources } from './watch';
import { slugRouteCollisions } from './slug-routes';

const LOAD_ERROR = 'No se puede cargar el contenido de docs.';

/** Carpeta de las páginas nativas, absoluta: `content` está resuelta contra la raíz del proyecto. */
function contentDir(root: string, config: Pick<LoaderConfig, 'content'>) {
  return path.resolve(root, config.content);
}

/** Si la carpeta de contenido existe y es carpeta; la de por defecto puede faltar (el sitio solo con `external` o con su propia portada), la que se eligió no. */
async function hasContentDir(directory: string, config: Pick<LoaderConfig, 'content'>) {
  const info = await stat(directory).catch(() => undefined);
  if (info?.isDirectory()) return true;
  if (config.content === DEFAULT_CONTENT_DIR && info === undefined) return false;
  throw new DocsError(`La carpeta de contenido no existe o no es una carpeta: ${directory}.`, {
    hint: `Se resolvió desde \`content: '${config.content}'\`, relativa a la raíz del proyecto de Astro. Corrige la ruta o crea la carpeta.`,
  });
}

/** Rutas de los `.md` bajo `dir`, relativas a él y con `/` aunque el sistema use otro separador. */
async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) =>
      path.relative(directory, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'),
    );
}

/** Lee del disco los archivos nativos (con frontmatter validado) y los externos; los fallos de frontmatter vuelven aparte. */
async function readSources(
  root: string,
  config: LoaderConfig,
): Promise<{ files: SourceFile[]; errors: DocsError[]; excluded: Set<string> }> {
  const nativeDir = contentDir(root, config);
  const errors: DocsError[] = [];
  const found = (await hasContentDir(nativeDir, config)) ? await walk(nativeDir) : [];
  // Lo excluido ni se lee: ni se publica ni se valida su frontmatter.
  const isExcluded = excluder(config.exclude);
  const nativeFiles = found.filter((file) => !isExcluded(file));
  const excluded = new Set(found.filter((file) => isExcluded(file)));
  const native = await Promise.all(
    nativeFiles.map(async (file): Promise<SourceFile> => {
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
  return {
    files: [...native, ...external.filter((file) => file !== undefined)],
    errors,
    excluded,
  };
}

/** Archivo absoluto de una página: las nativas (y las generadas, con el `_index.md` que tendría su carpeta) cuelgan del directorio de contenido. */
function absolutePath(root: string, config: LoaderConfig, page: Page) {
  return page.kind !== 'external'
    ? path.join(contentDir(root, config), page.sourcePath)
    : path.resolve(root, page.sourcePath);
}

/** Errores de `discoverPages` como lista, para sumarlos a los demás en vez de cortar la carga. */
function discoverOrErrors(
  files: SourceFile[],
  config: LoaderConfig,
): { pages: Page[]; errors: DocsError[] } {
  try {
    const pages = discoverPages(files, config);
    const all = [...pages, ...generatedListingPages(pages, config)];
    // Las descubiertas ya no chocan entre sí: lo que choque ahora es con un índice generado, o con
    // los segmentos que reserva la paginación de un listado.
    const clashes = [...urlCollisions(all), ...reservedSegmentErrors(all)];
    return clashes.length > 0 ? { pages: [], errors: clashes } : { pages: all, errors: [] };
  } catch (error) {
    if (error instanceof DocsErrors) return { pages: [], errors: error.errors };
    throw error;
  }
}

/** El bloque `index` que se guarda: el resumen, el texto alternativo y la portada ya comprobada. */
function indexDataOf(page: Page, cover: StoredCover | undefined) {
  const { summary, imageAlt } = page.index ?? {};
  const data = {
    ...(summary !== undefined && { summary }),
    ...(imageAlt !== undefined && { imageAlt }),
    ...(cover !== undefined && { cover }),
  };
  return Object.keys(data).length > 0 ? data : undefined;
}

/** Carga en tres pasadas (descubrir, reescribir y renderizar, validar anclas e imágenes); los fallos se acumulan en un solo error. */
async function sync(context: LoaderContext, config: LoaderConfig): Promise<void> {
  const root = fileURLToPath(context.config.root);
  const read = await readSources(root, config);
  const errors: DocsError[] = [...read.errors];
  const discovered = discoverOrErrors(read.files, config);
  errors.push(...discovered.errors);
  const { pages } = discovered;
  errors.push(
    ...slugRouteCollisions(pages, {
      defaultLocale: config.defaultLocale,
      srcDir: context.config.srcDir,
    }),
  );
  for (const file of ignoredListings(read.files, config)) {
    context.logger.warn(
      `${file}: se ignora porque su carpeta tiene un index.md, que es una página normal y gana al índice generado.`,
    );
  }

  const policy = resolvePolicies(pages, config.translations.missing);
  errors.push(...policy.errors);
  // Si el descubrimiento falló no hay páginas fiables: el sidebar se juzgaría contra una lista vacía.
  if (discovered.errors.length === 0) {
    const pageSlugs = new Set(pages.map((page) => page.slug));
    errors.push(
      ...validateSidebarSlugs(config.sidebar ?? [], pageSlugs),
      ...validateNav(config.nav ?? [], pageSlugs),
      ...validateFooter(config.footer?.links ?? [], pageSlugs),
      ...(config.indexes
        ? validateIndexFolders(config.indexes, new Set(contentFolders(pageSlugs)))
        : []),
    );
  }
  for (const { slug, missing } of undeclaredMissing(
    pages,
    config.locales,
    config.translations.declared,
  )) {
    context.logger.warn(
      `${slug || '(portada)'}: falta ${missing.join(', ')}. Declara \`translations\` para elegir qué ve quien no tiene traducción.`,
    );
  }
  const repoRoot = await resolveRepoRoot(config, root).catch((error: unknown) => {
    if (error instanceof DocsError) errors.push(error);
    else throw error;
  });
  // Sin páginas no hay nada más que validar: se cuentan los fallos y se corta.
  if (pages.length === 0) collectErrors(errors);

  context.store.clear();
  const index = {
    pages,
    url: urlPolicyOf(context.config, config.defaultLocale),
    contentDir: config.content,
    excluded: read.excluded,
    staticFolders: config.static,
  };
  const refs: LinkRef[] = [];
  const headings: { slug: string; locale: string; headings: { slug: string }[] }[] = [];
  for (const page of pages) {
    const id = `${page.locale}/${page.slug || 'index'}`;
    const file = absolutePath(root, config, page);
    const rewritten = rewriteLinks(page.body, page, index);
    errors.push(...rewritten.errors);
    refs.push(...rewritten.refs);
    const resolved = await resolveCover(
      page.index?.image,
      file,
      context.config.publicDir,
      page.sourcePath,
    );
    if (resolved.warning) context.logger.warn(resolved.warning);
    const indexData = indexDataOf(page, resolved.cover);

    const data = await context.parseData({
      id,
      data: {
        slug: page.slug,
        ...(page.urlSlug !== undefined && { urlSlug: page.urlSlug }),
        locale: page.locale,
        title: page.title,
        kind: page.kind,
        sourcePath: path.relative(root, file),
        ...(page.order !== undefined && { order: page.order }),
        ...(page.seo && { seo: page.seo }),
        ...(page.translations && { translations: page.translations }),
        ...(repoRoot !== undefined &&
          page.kind !== 'generated' && { editPath: path.relative(repoRoot, file) }),
        ...(page.listing && { listing: page.listing }),
        ...(indexData && { index: indexData }),
      },
      filePath: path.relative(root, file),
    });
    const markdown = await context.renderMarkdown(rewritten.body, { fileURL: pathToFileURL(file) });
    // Los enlaces y las imágenes ya los detectó `rewriteLinks`: se guardan junto a los encabezados
    // para el panel SEO (huérfanas, enlaces a noindex, texto alternativo) sin releer el Markdown.
    const rendered = {
      ...markdown,
      metadata: {
        ...markdown.metadata,
        [CONTENT_METADATA_KEY]: contentFacts(rewritten.refs, rewritten.images, page),
      },
    };
    headings.push({
      slug: page.slug,
      locale: page.locale,
      headings: rendered.metadata?.headings ?? [],
    });
    context.store.set({
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
    context.config.publicDir,
  );
  errors.push(...images.errors, ...(await checkFavicon(config.favicon, context.config.publicDir)));
  for (const warning of images.warnings) context.logger.warn(warning);
  collectErrors(errors);
}

export { docsSchema } from './schema';

/** Lo que el loader necesita de la config resuelta, sin los overrides de `ui` (ya viajan fusionados en `strings`). */
export type LoaderConfig = Omit<ResolvedConfig, 'ui'>;

/** Loader a partir de una config YA resuelta (la del módulo virtual): una sola carga, sin segunda lectura. */
export function docsLoaderFromResolved(docsConfig: LoaderConfig): Loader {
  return createLoader(() => docsConfig);
}

/** Forma explícita: `config` es la de `docs.config.mjs`, la misma que se pasa a `docs(config)`. */
export function docsLoader(config: DocsUserConfig): Loader {
  return createLoader(() => resolveConfigOrThrow(config));
}

function createLoader(getConfig: () => LoaderConfig): Loader {
  return {
    name: '@velezanthony/design/loader',
    schema: docsSchema(),
    async load(context) {
      const docsConfig = getConfig();
      async function run() {
        return sync(context, docsConfig).catch((error: unknown) => {
          throw toAstroError(error, LOAD_ERROR);
        });
      }
      await run();

      if (context.watcher) {
        const root = fileURLToPath(context.config.root);
        watchSources(context.watcher, {
          nativeDir: contentDir(root, docsConfig),
          files: externalCandidates(docsConfig).map((file) => path.resolve(root, file)),
          reload: createReloader(run, (error) => {
            const text = error instanceof Error ? error.message : String(error);
            const hint = (error as { hint?: string }).hint;
            context.logger.error(hint ? `${text}\n${hint}` : text);
          }),
        });
      }
    },
  };
}
