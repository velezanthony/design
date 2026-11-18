import { markdownToHtml, type Features, type MdastPluginList } from 'satteri';

/* Raíz ficticia de un proyecto consumidor: solo importa la forma de las rutas, nunca se lee. */
export const project = new URL('file:///site/');

/** URL de un archivo dentro de `src/content/docs/`, como los que ve el loader. */
export function docFileURL(relativePath: string): URL {
  return new URL(`src/content/docs/${relativePath}`, project);
}

/** URL de un archivo `external` (fuera de `src/content/docs/`, p. ej. el CHANGELOG del repo). */
export function externalFileURL(relativePath: string): URL {
  return new URL(relativePath, project);
}

/** URL de un archivo dentro del proyecto que no es documentación ni `external`. */
export function nonDocFileURL(relativePath: string): URL {
  return new URL(`src/pages/${relativePath}`, project);
}

interface RenderOptions {
  fileURL: URL;
  plugins?: MdastPluginList;
  features?: Features;
}

/** Ejecuta Sätteri sobre una cadena, sin Astro ni Vite (modelo de `createPluginTestOptions` de Starlight). */
export async function renderMarkdown(
  source: string,
  { fileURL, plugins = [], features }: RenderOptions,
): Promise<string> {
  const { html } = await markdownToHtml(source, { fileURL, mdastPlugins: plugins, features });
  return html;
}
