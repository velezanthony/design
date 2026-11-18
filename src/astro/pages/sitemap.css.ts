// `?raw` trae el tema como texto al bundle: la ruta se prerenderiza y no puede leer del disco del paquete.
import theme from '../../components/styles/tokens.css?raw';
import { translate } from '../../core/i18n/ui-strings';
import { SITEMAP_TOKENS, sitemapCss, themePalette } from '../../components/styles/sitemap';
import { siteConfig } from '../data/site-config';

/** La hoja con la que el navegador pinta `sitemap.xml`: la paleta del tema y los textos del idioma por defecto. */
export function GET() {
  const strings = siteConfig.strings[siteConfig.defaultLocale]!;
  const css = sitemapCss(
    { title: translate(strings, 'sitemap.title'), note: translate(strings, 'sitemap.note') },
    themePalette(theme, SITEMAP_TOKENS),
  );
  return new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
}
