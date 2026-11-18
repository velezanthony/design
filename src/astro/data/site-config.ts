import config from 'virtual:@velezanthony/design/config';
import type { VirtualConfig } from '../virtual/data';

/** `virtual.d.ts` es autocontenido y más laxo que `VirtualConfig`; este es el único punto donde se asume que son lo mismo. */
export const siteConfig = config as unknown as VirtualConfig;
