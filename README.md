# @velezanthony/design

Un sistema de diseño y un motor de documentación para Astro. Convierte una carpeta de Markdown y un
único archivo de configuración en un sitio de documentación completo: rutas, barra lateral,
búsqueda, idiomas, SEO, `sitemap.xml` y aviso de cookies. Es una librería, no un sitio.

Documentación completa: **<https://velezanthony.github.io/design/>**

## Requisitos

- Node `>=22.23.4`
- Astro `^7.4.12`
- `@astrojs/markdown-satteri` `>=0.4.10 <0.5` (el procesador de Markdown de Astro 7)

Astro y Sätteri son _peer dependencies_: instálalos en tu proyecto. Tailwind CSS viene con la
librería.

## Instalación

No está publicada en npm. Instálala desde GitHub, fijada a una etiqueta de release:

```sh
npm install github:velezanthony/design#v0.2.0
npm install astro @astrojs/markdown-satteri
```

El paquete distribuye fuentes TypeScript y `.astro` sin paso de build: las compila tu Astro. Para
actualizar, cambia la etiqueta e instala de nuevo.

## Ejemplo mínimo

Tres archivos en el proyecto de Astro (aquí, una carpeta `docs/` dentro del repo):

```js
// docs/docs.config.mjs
import { defineDocsConfig } from '@velezanthony/design/integration';

export default defineDocsConfig({
  site: { name: 'Mi proyecto' },
  i18n: { locales: ['es', 'en'] },
  content: { external: [{ slug: 'changelog', file: '../CHANGELOG.md' }] },
});
```

```js
// docs/astro.config.mjs
import { defineDocsSite } from '@velezanthony/design/integration';
import docsConfig from './docs.config.mjs';

export default defineDocsSite(docsConfig, { base: '/mi-proyecto', site: 'https://usuario.github.io' });
```

```ts
// docs/src/content.config.ts
export { collections } from '@velezanthony/design/content';
```

Después, escribe tus páginas en `docs/src/content/docs/` (`index.md` es la portada) y borra la
`src/pages/index.astro` del scaffold. Las opciones de `defineDocsConfig` están tipadas: el editor las
autocompleta y una clave mal escrita rompe el build con su ruta.

## Qué te da

- Páginas localizadas por idioma, con URL traducida opcional por página.
- Cabecera con secciones, barra lateral, índice «En esta página» y anterior / siguiente.
- Búsqueda con Pagefind, por idioma (la tecla `/` enfoca el buscador).
- Tema claro y oscuro, disposición de lectura o ancho completo y columnas plegables.
- Cajas de aviso (nota, consejo, advertencia), alertas de GitHub, pestañas, diagramas Mermaid y bloques de código con Shiki.
- Índices de carpeta generados (lista, tabla o tarjetas) con paginación estática.
- SEO en el `<head>`, JSON-LD declarado, `sitemap.xml` y un panel «SEO on page» en desarrollo.
- Aviso de consentimiento de cookies y Google Tag Manager, sin cargar nada antes de aceptar.
- Publicación de archivos de la raíz (`README.md`, `CHANGELOG.md`) como páginas: GitHub y el sitio
  leen la misma fuente.
- Reglas estrictas: un enlace o un ancla rotos rompen el build, con archivo y línea.

## Documentación

| Quieres… | Lee |
| --- | --- |
| Montar tu primer sitio paso a paso | [Tu primer sitio](https://velezanthony.github.io/design/guia/primer-sitio/) |
| Resolver una tarea (navegación, idiomas, SEO, analítica…) | [Guía](https://velezanthony.github.io/design/guia/navegacion/) |
| Consultar todas las opciones | [Todas las opciones](https://velezanthony.github.io/design/guia/opciones/) |
| Entender cómo está hecha y mantener un fork | [Por dentro](https://velezanthony.github.io/design/por-dentro/) |

Por qué la hice, qué estudié de MkDocs Material y Starlight, y sus pros y contras están en la
[ficha del proyecto](https://velezanthony.github.io/proyectos/design/).

Las fuentes de esa documentación están en [`docs/src/content/docs/`](./docs/src/content/docs/index.md).

> [!IMPORTANT]
> Esta librería no acepta contribuciones. Si quieres adaptarla, haz un fork: la sección
> [Por dentro](https://velezanthony.github.io/design/por-dentro/) explica cómo está pensada y cómo mantenerla.

## Licencia

El repositorio todavía no incluye un archivo de licencia.
