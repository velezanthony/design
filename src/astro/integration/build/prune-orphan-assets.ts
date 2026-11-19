import { glob, readFile, rm, stat } from 'node:fs/promises';
import type { AstroIntegrationLogger } from 'astro';

/** Los recursos cuyo nombre no aparece en ningún texto del build. */
export function orphanAssets(files: string[], text: string): string[] {
  return files.filter((file) => {
    const name = file.split('/').pop();
    return name !== undefined && !text.includes(name);
  });
}

async function collect(pattern: string, directory: URL): Promise<string[]> {
  const files: string[] = [];
  for await (const file of glob(pattern, { cwd: directory })) files.push(file);
  return files;
}

/* Una imagen de una colección de contenido referenciada desde un `<Image>` y desde un cuerpo Markdown
   deja su ORIGINAL copiado en `_astro/` junto a las derivadas, aunque nada lo enlace. Se lee todo el
   texto del build antes de borrar nada, así que un recurso que solo alcanza el CSS o un script sobrevive. */
export async function pruneOrphanAssets(
  directory: URL,
  logger: AstroIntegrationLogger,
): Promise<void> {
  const texts = await Promise.all(
    (await collect('**/*.{html,css,js,xml,txt,json}', directory)).map((file) =>
      readFile(new URL(file, directory), 'utf8'),
    ),
  );
  const assets = await collect('_astro/*.{png,jpg,jpeg,webp,avif,gif,svg}', directory);

  let freed = 0;
  for (const file of orphanAssets(assets, texts.join('\n'))) {
    const path = new URL(file, directory);
    freed += (await stat(path)).size;
    await rm(path);
  }
  if (freed) logger.info(`${Math.round(freed / 1024)} KB de recursos sin referencias eliminados`);
}
