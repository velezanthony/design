import type { APIRoute } from 'astro';
// `?inline` deja el PNG como data URI en el bundle: la ruta se prerenderiza y no puede leer del disco del paquete.
import favicon from '../../ui/assets/favicon.png?inline';

const bytes = Buffer.from(favicon.slice(favicon.indexOf(',') + 1), 'base64');

/** El favicon propio del paquete, bajo `/_design/` para no chocar con el `public/favicon.*` del consumidor. */
export const GET: APIRoute = () =>
  new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
