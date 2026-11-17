import { defineDocsConfig } from '../../../../index.ts';

/* Sitio monolingüe: un solo idioma, sin `locales`. No debe haber rutas `/<locale>/404`. */
export default defineDocsConfig({ name: 'Mono' });
