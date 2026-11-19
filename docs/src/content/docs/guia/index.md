---
order: 1
seo:
  title: "Dónde se monta la librería en un repo"
  description: "Vive en un subproyecto docs/ de cada repo: se instala desde GitHub, se integra en Astro y se publica en GitHub Pages. Qué pone ella y qué pone el repo."
---

# Dónde se monta

La librería no es una aplicación que se despliega sola: siempre vive **dentro de otro repo**, en un
subproyecto de Astro que normalmente se llama `docs/`. Ese subproyecto es lo único que el repo
consumidor añade para tener documentación.

## El recorrido completo

```mermaid
flowchart TD
  repo["Repo consumidor<br/>(p. ej. snake-orm)"] --> sub["docs/<br/>subproyecto de Astro"]
  sub -->|"npm install github:velezanthony/design#v0.1.0"| nm["node_modules/@velezanthony/design<br/>(solo src/ + README)"]
  sub --> cfg["docs.config.mjs<br/>defineDocsConfig({...})"]
  cfg --> astrocfg["astro.config.mjs<br/>integrations: [docs(docsConfig)]"]
  astrocfg -. "módulo virtual" .-> cc["src/content.config.ts<br/>export { collections } from<br/>@velezanthony/design/content"]
  md["src/content/docs/**/*.md<br/>+ archivos externos (CHANGELOG.md)"] --> cc
  nm --> astrocfg
  nm --> cc
  astrocfg --> build["astro build"]
  cc --> build
  build --> dist["docs/dist/<br/>HTML estático + pagefind/ + sitemap.xml"]
  dist -->|"workflow de GitHub Actions"| pages["GitHub Pages<br/>https://velezanthony.github.io/&lt;repo&gt;/"]
```

1. El repo consumidor crea `docs/` con el scaffold de Astro.
2. Instala la librería desde GitHub, **fijada a una etiqueta**: `github:velezanthony/design#v0.1.0`.
   No está en el registro de npm.
3. Escribe `docs.config.mjs` con `defineDocsConfig` y lo importa solo en `astro.config.mjs`, para
   `docs(docsConfig)`. `src/content.config.ts` es una línea que no lo importa.
4. Escribe sus páginas en `docs/src/content/docs/`.
5. `astro build` genera `docs/dist/`, totalmente estático.
6. Un workflow publica `docs/dist/` en GitHub Pages, bajo `https://velezanthony.github.io/<repo>/`.

El paso a paso con el código exacto está en [Primeros pasos](./primeros-pasos.md).

> [!NOTE]
> ¿Por qué la configuración va en un archivo aparte y no directamente en `astro.config.mjs`? Porque
> Astro valida la lista de integraciones y **descarta las propiedades que no conoce**: el loader de
> contenido no puede leer la config del objeto de la integración. Se resuelve con un solo import en
> `astro.config.mjs` y el módulo virtual de la integración, del que la colección toma esa misma config:
> hay una única fuente por construcción.

## Qué pone la librería y qué pone el consumidor

La frontera es deliberadamente gruesa: el consumidor decide **qué** se publica; la librería decide
**cómo** se ve y se comporta.

| La librería (`@velezanthony/design`) | El consumidor (`docs/` de su repo) |
| --- | --- |
| Tailwind (con su plugin de Vite, que registra `docs()`), estilos, tokens y paleta (`src/components/styles/theme.css`) | El contenido Markdown |
| Tema claro/oscuro y su selector | `docs.config.mjs`: nombre, idiomas, `nav`, `sidebar`, SEO base |
| Fuentes (IBM Plex vía la API de fuentes de Astro) | CSS propio y opcional (`theme`): tokens `@theme` y estilos que se compilan junto al de la librería |
| Layouts: `BaseLayout` (documento y tema) y `DocsLayout` (páginas de docs) | `site` y `base` en `astro.config.mjs` |
| Componentes genéricos: cabecera, barra lateral, índice, pie, pestañas, admoniciones | Imágenes de `public/` (imagen OG, favicon propio si quiere) |
| Todas las rutas: páginas, `sitemap.xml`, favicon por defecto | La 404 y la política de privacidad, una vez para todo el dominio |
| SEO: título con sufijo, descripción, Open Graph, canonical, `hreflang` | Componentes propios, solo si algo es específico de su proyecto |
| Búsqueda (índice de Pagefind generado al terminar el build) | |
| Idiomas: URLs por idioma, textos de interfaz, política de traducciones ausentes | |
| Validación estricta: enlaces, anclas, títulos, lenguajes de código | |
| Banner de consentimiento y carga diferida de Google Tag Manager | El workflow de despliegue y, si quiere analítica, `PUBLIC_GTM_ID` y `privacyUrl` |

Lo que el consumidor **no** escribe nunca: un layout, un `import` de CSS, un `@source` de Tailwind o
una página en `src/pages/`. Puede hacerlo: una página propia en `/` o `/sitemap.xml`
sustituye a la de la librería, y al arrancar se avisa de cuáles
(`src/astro/integration/route-overrides.ts`) para que nunca pase sin saberlo. Si esa página
necesita cabecera y pie propios, se monta sobre `BaseLayout` (ver
[Cabecera y pie propios](../guia/layout-propio.md)).

## Por qué se distribuye como fuente

El paquete publica `.ts` y `.astro` **sin paso de build**: no hay `dist/` de la librería. Quien
compila es el Astro del consumidor. Ventajas:

- No hay un compilado que se desincronice del código fuente.
- En el `playground/` y en este sitio, editar `src/` recarga en caliente, porque el workspace enlaza
  el paquete por symlink.

El precio es doble: el consumidor necesita las _peer dependencies_ (`astro`,
`@astrojs/markdown-satteri`), y el código no puede usar sintaxis de TypeScript
que no sea borrable. Por eso ESLint prohíbe los `enum` (ver
[Arquitectura](../desarrollo/index.md#el-resto-de-reglas-de-eslint)).

## Siguiente lectura

Cómo conviven en este repo la librería, el `playground/` y esta documentación sin que nada de lo
segundo llegue a los consumidores: [Por qué no entra en el paquete](./fuera-del-paquete.md).
