import config from 'virtual:@velezanthony/design/config';
import type { VirtualConfig } from '../virtual/data';

/**
 * La config del módulo virtual con su tipo completo. `virtual.d.ts` es autocontenido (se copia al
 * `.astro/` del consumidor y ahí no puede importar nada del paquete), así que sus tipos son más
 * laxos que los de `VirtualConfig`. Este es el único punto donde se asume que son lo mismo.
 */
export const siteConfig = config as unknown as VirtualConfig;
