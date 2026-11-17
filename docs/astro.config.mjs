import { defineDocsSite } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

/* La documentación de la propia librería, montada con la propia librería: es su primer consumidor.
   Se publica como página de proyecto de GitHub Pages, bajo `/design`. */
export default defineDocsSite(docsConfig, { base: '/design' });
