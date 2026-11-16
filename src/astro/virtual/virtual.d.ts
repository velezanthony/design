/* Tipos del módulo virtual que sirve la integración. Mínimo por ahora: la forma real (config
   validada más `base`, `site`, `trailingSlash` y `build.format`) llega con el plugin Vite. */
declare module 'virtual:@velezanthony/design/config' {
  const config: Record<string, unknown>;
  export default config;
}
