import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader } from 'astro/loaders';
import type { DocsConfig } from '../integration';
import { readIntegrationConfig } from './config';
import { docsSchema } from './schema';

/* Archivo fuente de una página. Forma provisional: el descubrimiento real lo hará `core/content`. */
interface Source {
  id: string;
  slug: string;
  locale: string;
  file: string;
}

async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (entry.name.endsWith('.md')) found.push(full);
  }
  return found;
}

/** `x.es.md` → `{ base: 'x', locale: 'es' }`; `x.md` → idioma por defecto. */
function splitLocale(file: string): { base: string; locale: string } {
  const match = /^(.*?)(?:\.(es))?\.md$/.exec(file);
  return { base: match?.[1] ?? file, locale: match?.[2] ?? 'en' };
}

export { docsSchema } from './schema';

/** `config`: la de `docs.config.mjs` (plan B). Sin ella intenta leerla de la integración (plan A). */
export function docsLoader(config?: DocsConfig): Loader {
  return {
    name: '@velezanthony/design/loader',
    schema: docsSchema(),
    async load(ctx) {
      const docsConfig = config ?? readIntegrationConfig(ctx.config.integrations);
      const root = fileURLToPath(ctx.config.root);
      const nativeDir = path.join(root, 'src/content/docs');
      ctx.store.clear();

      const sources: Source[] = [];
      for (const file of await walk(nativeDir)) {
        const { base, locale } = splitLocale(path.relative(nativeDir, file));
        sources.push({ id: `${locale}/${base}`, slug: base === 'index' ? '' : base, locale, file });
      }
      for (const external of docsConfig.external ?? []) {
        const { dir, name } = path.parse(path.resolve(root, external.file));
        for (const locale of ['en', 'es']) {
          const file = path.join(dir, locale === 'en' ? `${name}.md` : `${name}.${locale}.md`);
          sources.push({ id: `${locale}/${external.slug}`, slug: external.slug, locale, file });
        }
      }

      for (const source of sources) {
        const body = await readFile(source.file, 'utf8');
        const title = /^#\s+(.+)$/m.exec(body)?.[1] ?? source.slug;
        const data = await ctx.parseData({
          id: source.id,
          data: {
            slug: source.slug,
            locale: source.locale,
            title,
            sourcePath: path.relative(root, source.file),
          },
        });
        const rendered = await ctx.renderMarkdown(body, { fileURL: pathToFileURL(source.file) });
        ctx.store.set({
          id: source.id,
          data,
          body,
          filePath: path.relative(root, source.file),
          rendered,
          assetImports: rendered.metadata?.imagePaths,
        });
      }
    },
  };
}
