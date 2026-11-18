import type { APIRoute } from 'astro';
// `?raw` trae el tema como texto al bundle: la ruta se prerenderiza y no puede leer del disco del paquete.
import theme from '../../ui/styles/theme.css?raw';
import { t } from '../../core/i18n/ui-strings';
import { SITEMAP_TOKENS, sitemapCss, themePalette } from '../../ui/styles/sitemap';
import { siteConfig } from '../data/site-config';

/** La hoja con la que el navegador pinta `sitemap.xml`: la paleta del tema y los textos del idioma por defecto. */
export const GET: APIRoute = () => {
  const strings = siteConfig.strings[siteConfig.defaultLocale]!;
  const css = sitemapCss(
    { title: t(strings, 'sitemap.title'), note: t(strings, 'sitemap.note') },
    themePalette(theme, SITEMAP_TOKENS),
  );
  return new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
};
