---
order: 2
seo:
  title: "Mapa de src: qué hace cada archivo"
  description: "Recorrido por las carpetas de src/ con el propósito de cada archivo importante, dónde viven sus tests y las rutas públicas que exporta el paquete."
---

# Mapa de `src/`

Los tests viven **junto a su archivo** (`slug.ts` y `slug.test.ts`), así que aquí solo aparece el
código. Las rutas son relativas a `src/`.

## `core/`: la lógica pura

```text
core/
├── errors.ts              DocsError (archivo, línea, pista) y DocsErrors (varios a la vez)
├── config/
│   ├── schema.ts          Esquema zod de la config pública; de aquí sale DocsUserConfig
│   ├── resolve.ts         Valida y rellena valores por defecto → ResolvedConfig
│   ├── layout.ts          PanelState, LayoutWidth y la disposición por defecto
│   ├── nav.ts             NavIcon y los tipos de los elementos de nav
│   └── footer.ts          Tipos del pie
├── content/
│   ├── discovery.ts       Archivos → páginas (slug, idioma, título, orden); externos
│   ├── frontmatter.ts     Separa y valida el frontmatter (conserva las líneas del cuerpo)
│   ├── slug.ts            guia/index → guia, index → '' (portada)
│   └── title.ts           Primer h1 o title del frontmatter; sin ninguno, error
├── i18n/
│   ├── locale.ts          Idiomas, sufijos de archivo, idioma de una URL
│   ├── availability.ts    pageUrl (LA función de URLs) y qué idiomas tiene cada página
│   ├── translation-policy.ts  MissingTranslation, políticas por grupo, rutas de reserva
│   └── ui-strings.ts      Catálogo de textos de interfaz en/es, t() e interpolación
├── links/
│   ├── rewrite.ts         Enlaces .md relativos → URLs del sitio, con referencias para validar
│   ├── anchors.ts         Índice de encabezados y validación de #anclas
│   └── fences.ts          No tocar enlaces dentro de bloques de código
├── navigation/
│   ├── sidebar.ts         Árbol de la barra lateral desde la config y las páginas
│   ├── sidebar-slugs.ts   Valida los slugs de sidebar
│   ├── nav-sections.ts    Secciones por dir, validación de nav
│   ├── nav-sidebar.ts     La barra lateral de la sección actual
│   ├── nav-entries.ts     Elementos de la cabecera ya resueltos para una página
│   ├── prev-next.ts       Anterior / siguiente en el orden aplanado
│   ├── page-window.ts     Qué números de página enseñar en una paginación y dónde van los huecos
│   ├── footer.ts          Vista del pie y validación de sus enlaces
│   └── label.ts           Etiqueta por idioma con recurso al idioma por defecto
├── seo/
│   ├── meta.ts            Cascada página > base > derivado; plantilla de título
│   ├── head.ts            Etiquetas del head: title, canonical, hreflang, OG, twitter
│   ├── sitemap.ts         XML con alternates; límite de 50 000 URLs
│   ├── indexable.ts       Qué URLs son noindex
│   ├── image-refs.ts      Qué imágenes SEO hay que comprobar
│   ├── image-checks.ts    Peso y proporción de la imagen OG (avisos)
│   └── favicon.ts         Favicon por defecto (/_design/favicon.png) o el del consumidor
├── analytics/resolve.ts   PUBLIC_GTM_ID / gtmId → id validado y URLs de privacidad
└── privacy/
    ├── copy.ts            Texto de la página de privacidad en es/en
    └── pages.ts           URLs de la página de privacidad propia
```

## `client/`: el navegador

Cada archivo exporta funciones `init*` que reciben lo que necesitan (documento, `Storage`,
`matchMedia`…) en vez de leer globales, para poder probarlas con dobles.

```text
client/
├── diagrams/           Diagramas de Mermaid
│   ├── mermaid.ts        Convierte los bloques .docs-mermaid en SVG con los colores del tema
│   ├── diagram-viewer.ts Visor a pantalla completa: zoom, arrastre y teclado
│   └── diagram-view.ts   La matemática del visor, sin DOM
├── layout/             La disposición de la página
│   ├── layout.ts         Columnas plegables y ancho; script previo al pintado
│   ├── sidebar-scroll.ts Recuerda el desplazamiento de la barra lateral
│   ├── toc.ts            Resalta la sección visible en el índice
│   └── anchors.ts        Enlace a cada encabezado
├── content/            Lo que enriquece el contenido
│   ├── zoom.ts           Ampliación de imágenes en un <dialog>
│   ├── copy-code.ts      Botón de copiar en los bloques de código
│   ├── tabs.ts           Pestañas accesibles con teclado
│   └── year.ts           Año del pie con el reloj del visitante
├── preferences/        Lo que elige el visitante y se guarda
│   ├── theme.ts          Tema claro/oscuro, script previo al pintado, revelado circular
│   ├── consent.ts        Banner de consentimiento, carga de GTM, borrado de cookies
│   └── storage.ts        Acceso seguro a localStorage/sessionStorage y sus claves
├── search.ts           Pagefind: carga bajo la base, resultados, atajo «/»
├── transition.ts       Envoltorio de la View Transitions API con movimiento reducido
└── not-found.ts        Cambia la 404 al idioma de la URL
```

## `ui/`: lo que se ve

Diseño atómico. Ningún componente lee datos por su cuenta: todo llega por props, incluidos los
textos (`strings: UiStrings`).

```text
ui/
├── atoms/       Button, Checkbox, Heading, Icon, Input, Link, Rule, Tag
├── molecules/   Admonition, EditLink, FallbackNotice, LocaleSwitch, NavList, PanelToggle,
│                Pagination, PrevNext, TableOfContents, Tabs, ThemeToggle
├── organisms/   DocsHeader, DocsFooter, Sidebar, SidebarList, SearchBox, ConsentBanner,
│                BackToTop, NotFound, PrivacyPolicy
├── seo-on-page/ Lo propio del panel SOLO de dev, por nivel atómico (lo genérico va arriba)
│   ├── atoms/       IssueBadge (sobre Tag)
│   ├── molecules/   SerpPreview, OgPreview, ResultsCount, InfoHiddenNote, FiltersForm, PanelIntro
│   ├── organisms/   Una sección por componente, con su porción del modelo: OverviewStats,
│   │                SchemasSummary, IssuesBySeverity, IssuesByKind, PagesTable, PublishedFacts,
│   │                Previews, IssuesList, SchemasList, HeadingsOutline, Translations
│   └── labels.ts    Textos y tonos del panel: datos de presentación, no un componente
├── layouts/
│   ├── Shell.astro          <html>, <head>, CSS, scripts previos al pintado
│   ├── Head.astro           Pinta las etiquetas que calculó core/seo/head.ts
│   ├── DocsLayout.astro     Página de docs: cabecera, barra, contenido, índice, pie
│   ├── NotFoundLayout.astro / NotFoundBody.astro   La 404 con plantillas por idioma
│   ├── PrivacyLayout.astro  La página de privacidad propia
│   └── boot.ts              Arranque del JavaScript de cliente (bootDocs, bootNotFound)
├── styles/
│   ├── theme.css            Tailwind, tokens, paletas, prosa, disposición, transiciones
│   ├── theme-colors.ts      --color-canvas de cada tema para <meta name="theme-color">
│   └── code-themes.ts       Temas de Shiki emparejados con los tokens
└── assets/favicon.png       Favicon por defecto
```

## `astro/`: el adaptador

```text
astro/
├── integration/
│   ├── index.ts             docs(), defineDocsConfig, hooks, exports públicos
│   ├── analytics-env.ts     Lee PUBLIC_GTM_ID con loadEnv
│   ├── route-collisions.ts  Falla si src/pages/ pisa una ruta de la librería
│   ├── fonts.ts             IBM Plex y el choque de variables de fuente
│   ├── companions.ts        Integraciones auxiliares (hoy ninguna)
│   ├── pagefind.ts          Índice de búsqueda tras el build
│   └── errors.ts            DocsError → AstroError
├── loader/
│   ├── index.ts             docsLoader / docsLoaderFromResolved: descubrir, renderizar, validar
│   ├── schema.ts            docsSchema: los datos de cada entrada
│   ├── frontmatter.ts       Lee y valida YAML con archivo y línea
│   ├── repo-root.ts         repoRoot o el .git más cercano, para editPath
│   ├── images.ts / favicon.ts   Comprueban archivos de public/
│   └── watch.ts             Recarga en astro dev
├── content/
│   └── index.ts             `collections`: la colección docs con la config del módulo virtual
├── markdown/                Plugins mdast y su registro (ver Integración → Markdown)
├── pages/                   SOLO lo que Astro sirve: rutas y endpoints (las inyecta la integración)
│   ├── doc.astro            /[...slug]
│   ├── not-found.astro      /404 (y /<idioma>/404)
│   ├── privacy.astro, privacy-locale.astro   Página de privacidad propia
│   ├── sitemap.xml.ts, favicon.png.ts        Endpoints
│   └── seo-on-page/         Panel SOLO de dev (ver Integración → SEO on page)
│       └── overview.astro, pages.astro, page.astro
├── views/                   Lógica pura que prepara los datos de cada página (con sus tests)
│   ├── doc.ts               docRoutes y docView: todo lo que necesita una página
│   ├── not-found.ts, privacy.ts
│   ├── pages.ts             DocData → Page y sitemap
│   └── seo-on-page/
│       ├── hrefs.ts         Rutas del panel y enlaces entre pantallas
│       └── panel.ts         Lo que DocsLayout recibe en cada pantalla (como docView)
├── data/                    El ÚNICO sitio que lee Astro: la colección y el módulo virtual
│   ├── docs-collection.ts   getDocs / renderDoc tipados para la colección docs
│   ├── site-config.ts       La config del módulo virtual con su tipo completo
│   ├── privacy.ts           Lee lo necesario y llama a views/privacy (lo usan las dos páginas)
│   └── seo-on-page/
│       └── adapter.ts       Colección + config → SeoInput → árbol (el único que lee astro:content)
└── virtual/
    ├── plugin.ts            Plugin de Vite de virtual:@velezanthony/design/config
    ├── data.ts              Qué viaja en el módulo virtual
    └── virtual.d.ts         Sus tipos, copiados al .astro/ del consumidor
```

## `testing/` y `pages/` (no se distribuyen)

- `testing/render.ts`: renderiza un componente con el contenedor de Astro y lo devuelve como DOM
  (linkedom).
- `testing/strings.ts`: `stringsFor('es', overrides)` para pasar textos a los componentes.
- `testing/astro-content.ts` y `testing/virtual.ts`: dobles de `astro:content` y del módulo virtual,
  validados con el esquema real para que no diverjan.
- `testing/build.ts` y `testing/case.ts`: construyen proyectos consumidores mínimos descritos como
  datos, para los tests de integración (con un entorno limpio de variables de Vitest).
- `testing/contrast.ts`: luminancia y contraste WCAG para los tests de la paleta.
- `testing/boundaries.test.ts`: la regla de capas (ver [Capas](./index.md#cómo-lo-hace-cumplir-eslint)).
- `pages/index.astro`: la página mínima que sirve `npm run dev` en la raíz.

## El contrato público

Lo que un consumidor puede importar está fijado en `"exports"` del `package.json`:

| Subruta | Apunta a |
| --- | --- |
| `@velezanthony/design/integration` | `src/astro/integration/index.ts` |
| `@velezanthony/design/loader` | `src/astro/loader/index.ts` |
| `@velezanthony/design/content` | `src/astro/content/index.ts` |
| `@velezanthony/design/client/*` | `src/client/*.ts` (con su carpeta: `client/preferences/theme`) |
| `@velezanthony/design/components/*` | `src/ui/*` |
| `@velezanthony/design/layouts/*` | `src/ui/layouts/*` |
| `@velezanthony/design/pages/*` | `src/astro/pages/*` |
| `@velezanthony/design/theme.css` | `src/ui/styles/theme.css` |
| `@velezanthony/design/theme-colors` | `src/ui/styles/theme-colors.ts` |

Mover un archivo a los que apunta una de estas subrutas es un cambio incompatible para los
consumidores. `src/astro/integration/public-api.test.ts` sujeta lo que exporta la integración.
