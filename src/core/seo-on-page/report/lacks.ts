import type { HaveColumn } from '../queries/url-filters';

/** El recuento «sin …» sale de `LACKS_PHRASES`. */
export const LACKS: Record<HaveColumn, { key?: string; why: string; fix: string }> = {
  desc: {
    key: 'seo.description',
    why: 'Sin descripción propia el resultado enseña la del sitio (o un trozo del cuerpo).',
    fix: 'Escribe una descripción propia, un resumen de la página.',
  },
  schema: {
    key: 'seo.schema',
    why: 'Sin schema propio la página solo declara el del sitio, si lo hay.',
    fix: 'Añade un schema JSON-LD propio solo si dice algo que el del sitio no dice ya.',
  },
  og: {
    key: 'seo.image',
    why: 'Sin imagen propia, al compartir el enlace se enseña la del sitio.',
    fix: 'Añade `seo.image` con `src` (una imagen de `public/` o una URL https) y su `alt`.',
  },
  h1: {
    why: 'Sin un único H1 no queda claro de qué trata la página.',
    fix: 'Deja un solo encabezado `# Título` al principio del archivo.',
  },
  i18n: {
    why: 'Los lectores de los idiomas que faltan no tienen versión propia de la página.',
    fix: 'Crea la traducción que falta o declara `translations: omit` si es intencionado. No crees ninguna sin que te lo pidan.',
  },
  index: {
    key: 'seo.noindex',
    why: 'La página está excluida de los buscadores.',
    fix: 'Si no es intencionado, quita `seo.noindex`; si lo es, no hagas nada.',
  },
};
