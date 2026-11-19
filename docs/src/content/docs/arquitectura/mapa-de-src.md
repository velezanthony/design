---
order: 2
seo:
  title: "Mapa de src: qué hace cada archivo"
  description: "Recorrido por las carpetas de src/ con el propósito de cada archivo importante, dónde viven sus tests y las rutas públicas que exporta el paquete."
---

# Mapa de `src/`

Los tests viven **junto a su archivo** (`slug.ts` y `slug.test.ts`), así que aquí solo aparece el
código (tampoco las fixtures de los tests). Las rutas son relativas a `src/`. Un test, `src-map.test.ts`,
comprueba que este mapa nombra cada archivo y cada carpeta.

## `core/`: la lógica pura

```text
core/
├── author.ts              Quien mantiene la librería: firma por defecto de sus docs
├── errors.ts              DocsError (archivo, línea, pista) y DocsErrors (varios a la vez)
├── config/
│   ├── schema.ts          Esquema zod de la config pública; de aquí sale DocsUserConfig
│   ├── resolve.ts         Valida y rellena valores por defecto → ResolvedConfig
│   ├── layout.ts          PanelState, LayoutWidth y la disposición por defecto
│   ├── nav.ts             NavIcon y los tipos de los elementos de nav
│   └── footer.ts          Tipos del pie
├── content/
│   ├── content-dir.ts     Carpeta de las páginas nativas por defecto y su validación
│   ├── discovery.ts       Archivos → páginas (slug, idioma, título, orden); externos
│   ├── frontmatter.ts     Separa y valida el frontmatter (conserva las líneas del cuerpo)
│   ├── slug.ts            guia/index → guia, index → '' (portada)
│   └── title.ts           Primer h1 o title del frontmatter; sin ninguno, error
├── i18n/
│   ├── locale.ts          Idiomas, sufijos de archivo, idioma de una URL
│   ├── availability.ts    pageUrl (LA función de URLs) y qué idiomas tiene cada página
│   ├── translation-policy.ts  MissingTranslation, políticas por grupo, rutas de reserva
│   └── ui-strings.ts      Catálogo de textos de interfaz en/es, translate() e interpolación
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
│   ├── toc-entries.ts     Encabezados de Astro → entradas del índice «En esta página»
│   ├── edit-href.ts       Enlace para editar el archivo en el repositorio
│   ├── footer.ts          Vista del pie y validación de sus enlaces
│   └── label.ts           Etiqueta por idioma con recurso al idioma por defecto
├── seo/
│   ├── meta.ts            Cascada página > base > derivado; plantilla de título
│   ├── title.ts           Sufijo del título (el autor, o ninguno)
│   ├── head.ts            Etiquetas del head: title, canonical, hreflang, OG, twitter
│   ├── json-ld.ts         Schemas JSON-LD del sitio y de cada página
│   ├── sitemap.ts         XML con alternates; límite de 50 000 URLs
│   ├── indexable.ts       Qué URLs son noindex
│   ├── client-pages.ts    Las páginas que el consumidor tiene en src/pages/ y sus rutas dinámicas
│   ├── html-head.ts       Lee del HTML construido lo que una página dice de sí misma
│   ├── image-refs.ts      Qué imágenes SEO hay que comprobar
│   ├── image-checks.ts    Peso y proporción de la imagen OG (avisos)
│   └── favicon.ts         Favicon por defecto (/_design/favicon.png) o el del consumidor
├── analytics/resolve.ts   PUBLIC_GTM_ID / gtmId → id validado y URLs de privacidad
├── privacy/
│   ├── copy.ts            Texto de la página de privacidad en es/en
│   └── pages.ts           URLs de la página de privacidad propia
├── shared/
│   ├── text.ts            Plurales y listas legibles
│   ├── urls.ts            Quita las barras finales de la base
│   └── tones.ts           TagTone: los tonos de Tag y de las marcas del panel
└── seo-on-page/           La lógica del panel SOLO de dev (ver Integración → SEO on page)
```

El panel guarda su lógica en `core/seo-on-page/`, también pura: parte de un árbol de páginas, lo analiza
y prepara el modelo de cada pantalla.

```text
core/seo-on-page/
├── tree/                  El árbol de páginas sobre el que trabaja todo el panel
│   ├── types.ts           SeoPage, SeoTree, Issue y los tipos que comparten todos
│   ├── input.ts           Lo que el análisis recibe de cada página
│   ├── build-tree.ts      Entradas → árbol, con sus problemas y su orden estable
│   ├── keys.ts            Clave de una página en un idioma y su etiqueta
│   └── locale-cells.ts    Estado de cada idioma de una página (falta, reserva, omitida)
├── nodes/                 Cada porción del árbol, calculada desde su fuente
│   ├── meta.ts            Título, descripción y de dónde vienen
│   ├── headings.ts        Encabezados en el orden del documento
│   ├── locales.ts         Idiomas disponibles y su estado
│   ├── navigation.ts      La parte de la config que la navegación necesita
│   ├── content.ts         Enlaces e imágenes del cuerpo, tal como los deja el loader
│   └── client-page.ts     Las páginas del consumidor entran al árbol
├── analyzers/             Un análisis por tipo de problema; cada uno devuelve Issue
│   ├── issue.ts           Construye un Issue con su gravedad por defecto
│   ├── metadata.ts        Título y descripción frente a los límites del buscador
│   ├── headings.ts        Un solo H1 y sin saltos de nivel
│   ├── canonical.ts       Cada idioma es canónico de sí mismo
│   ├── multilingual.ts    Traducciones ausentes y políticas en conflicto
│   ├── links.ts           Enlaces a noindex y páginas huérfanas
│   ├── images.ts          Imágenes sin texto alternativo y OG fuera de medida
│   └── fixes.ts           Dónde se arregla cada problema (frontmatter o .astro)
├── pages/                 El modelo de cada pantalla, ya digerido
│   ├── links.ts           Puerto de enlaces: lo implementa astro/ para respetar base y barra final
│   ├── overview/          Resumen: model.ts, coverage.ts, indexing.ts
│   ├── listing/           Tabla de páginas: model.ts, rows.ts, entries.ts, group.ts, have.ts,
│   │                      matrix.ts, kinds.ts, severities.ts, selection.ts, common.ts
│   └── inspector/         Una página: model.ts, compare.ts
├── queries/               Consultas puras sobre el árbol
│   ├── url-filters.ts     Filtros de la tabla ↔ query de la URL
│   ├── filter.ts          Qué problemas cumplen los filtros
│   ├── paginate.ts        Paginación de las filas
│   ├── priorities.ts      Qué arreglar primero
│   ├── summary.ts         Resumen de schemas
│   ├── outline.ts         Esquema de encabezados con sus saltos
│   ├── heading-counts.ts  Qué falla en la estructura de encabezados
│   ├── code-spans.ts      Trocea un mensaje en texto y nombres de código
│   └── clip.ts            Recorta con «…» como el buscador
├── report/                El informe «copiar para la IA»
│   ├── scope.ts           De qué trata un informe: sitio, página o filtro
│   ├── report.ts          Informe de un alcance
│   ├── texts.ts           Los textos que el diálogo necesita, ya generados
│   ├── prompt.ts          El prompt de cada problema
│   ├── issue-section.ts   Sección de problemas del informe
│   ├── issues-report.ts   Tabla de una página para el informe
│   ├── lacks-report.ts    Lo que le falta a cada entrada
│   ├── lacks.ts           Recuentos «sin …»
│   ├── kinds.ts           Nombres de los tipos de problema en el informe
│   ├── content-dirs.ts    Carpetas de las páginas nativas
│   ├── format.ts          Valor con su longitud y su ancho
│   └── size.ts            Cuánto ocupa un texto
├── catalog.ts             Catálogo de problemas: gravedad, certeza y por qué importa
├── severity.ts            Las gravedades y su orden
├── thresholds.ts          Límites de título y descripción
├── pixels.ts              Estimación del ancho en píxeles
├── have.ts                Qué tiene cada entrada (columnas de «Qué tiene»)
├── key-place.ts           Dónde vive cada clave: frontmatter de un .md o head de un .astro
├── site-files.ts          Los archivos del sitio que el panel enseña (robots, sitemap…)
└── labels.ts              Textos del panel: los comparten sus vistas y sus componentes
```

## `client/`: el navegador

Cada archivo exporta funciones `init*` que reciben lo que necesitan (documento, `Storage`,
`matchMedia`…) en vez de leer globales, para poder probarlas con dobles.

```text
client/
├── diagrams/           Diagramas de Mermaid
│   ├── mermaid.ts        Convierte los bloques .docs-mermaid en SVG con los colores del tema
│   ├── diagram-viewer.ts Visor a pantalla completa: zoom, arrastre y teclado
│   ├── diagram-view.ts   La matemática del visor, sin DOM
│   ├── selector.ts       El selector de los bloques, aparte para buscarlos sin cargar Mermaid
│   └── token.ts          Lee un token de color del <html> ya resuelto al tema activo
├── layout/             La disposición de la página
│   ├── layout.ts         Columnas plegables y ancho; script previo al pintado
│   ├── rail.ts           A partir de qué ancho existe el raíl de los laterales
│   ├── nav-open.ts       Pliega o abre el menú antes del primer pintado
│   ├── sidebar-scroll.ts Recuerda el desplazamiento de la barra lateral
│   ├── toc.ts            Resalta la sección visible en el índice
│   └── year.ts           Año del pie con el reloj del visitante
├── content/            Lo que enriquece el contenido
│   ├── anchors.ts        Enlace a cada encabezado
│   ├── zoom.ts           Ampliación de imágenes en un <dialog>
│   ├── copy-code.ts      Botón de copiar en los bloques de código
│   └── tabs.ts           Pestañas accesibles con teclado
├── preferences/        Lo que elige el visitante y se guarda
│   ├── theme.ts          Tema claro/oscuro, script previo al pintado, revelado circular
│   ├── consent.ts        Banner de consentimiento, carga de GTM, borrado de cookies
│   └── storage.ts        Acceso seguro a localStorage/sessionStorage y sus claves
├── seo-on-page/        El JavaScript del panel SOLO de dev
│   ├── boot.ts           Arranque del panel
│   ├── auto-submit.ts    Los filtros envían su formulario al cambiar
│   ├── kinds-all.ts      La casilla «Todos» de los tipos de problema
│   ├── popover.ts        Los <details> emergentes se cierran al pulsar fuera
│   └── report.ts         El diálogo «Copiar para la IA»
├── clipboard.ts        Copiar con confirmación o fallo
├── text.ts             Rellena las {variables} de una plantilla (el cliente no importa translate())
├── search.ts           Pagefind: carga bajo la base, resultados, atajo «/»
├── transition.ts       Envoltorio de la View Transitions API con movimiento reducido
└── not-found.ts        Cambia la 404 al idioma de la URL
```

## `components/`: lo que se ve

Diseño atómico. Ningún componente lee datos por su cuenta: todo llega por props, incluidos los
textos (`strings: UiStrings`).

```text
components/
├── atoms/
│   ├── form/        Checkbox, FieldError, HelpText, Input, Label, Radio, Select, Switch, Textarea
│   ├── actions/     Button, Link
│   └── display/     Heading, Icon, Tag
├── molecules/
│   ├── form/        FormField, RadioGroup y describedby.ts (el aria-describedby de un campo)
│   ├── navigation/  EditLink, LocaleSwitch, NavList, Pagination, PrevNext, TableOfContents
│   ├── content/     Admonition, FallbackNotice, Tabs
│   └── controls/    PanelToggle, ThemeToggle
├── organisms/
│   ├── chrome/      DocsHeader, DocsFooter, Sidebar, SidebarList, SearchBox, BackToTop, Head
│   ├── privacy/     ConsentBanner, PrivacyPolicy
│   └── not-found/   NotFound, NotFoundBody
├── seo-on-page/ Lo propio del panel SOLO de dev, por nivel atómico (lo genérico va arriba)
│   ├── atoms/       IssueBadge (sobre Tag), SeverityTag, CertaintyTag, LengthMeter, LocaleBadge,
│   │                Note, StateMark
│   ├── molecules/   SerpPreview, OgPreview, ResultsCount, InfoHiddenNote, FiltersForm,
│   │                OverviewCard, StatRow, CodeSpans, InspectorSection, CopyPromptButton, DataTable,
│   │                EmptyNotice, Kpi, LocaleDetailCard, PanelNotice, ReportButton, RowHeader,
│   │                TableHead, ViewSwitch
│   ├── organisms/   Una sección por componente, agrupadas por pantalla; PanelIntro va suelta
│   │   ├── overview/    OverviewKpis y las tarjetas del Resumen (FixFirstCard, CoverageCard,
│   │   │                IndexingCard, SchemasCard, KindsCard, SiteFilesCard, RouteOverridesNotice)
│   │   ├── listing/     PagesListing, PagesTable, EntriesTable, HaveTable, LanguageMatrix,
│   │   │                CommonIssueNotice, TableFooter
│   │   ├── inspector/   InspectorHeader, FixList, PublishedFacts, Translations, SchemasList,
│   │   │                HeadingsOutline
│   │   └── shared/      ClientPageFailures, ReportDialog (las usan varias pantallas)
│   ├── pages/       OverviewPage, PagesPage, InspectorPage: las pantallas del panel, presentacionales
│   └── tables.ts    Clases de la celda y del filete de las tablas del listado
├── pages/       Páginas presentacionales: reciben el modelo por props y solo pintan (DocPage, NotFoundPage, PrivacyPage)
├── layouts/
│   ├── Shell.astro          <html>, <head>, CSS, scripts previos al pintado
│   ├── DocsLayout.astro     Página de docs: cabecera, barra, contenido, índice, pie
│   ├── NotFoundLayout.astro La 404 con plantillas por idioma
│   ├── PrivacyLayout.astro  La página de privacidad propia
│   └── boot.ts              Arranque del JavaScript de cliente (bootDocs, bootNotFound)
├── styles/
│   ├── theme.css            El punto de entrada: Tailwind y el resto de hojas, en orden
│   ├── tokens.css           Tokens y paletas de color (claro y oscuro con light-dark())
│   ├── base.css             Reglas base, como las barras de desplazamiento con los colores del tema
│   ├── chrome.css           Disposición de las páginas de docs (columnas, raíl, ancho)
│   ├── components.css       Avisos y anclas de títulos, también fuera de `.prose`
│   ├── prose.css            La prosa del contenido
│   ├── code.css             Bloques de código y su paleta oscura
│   ├── motion.css           Transiciones, solo con movimiento permitido
│   ├── theme-colors.ts      --color-canvas de cada tema para <meta name="theme-color">
│   ├── code-themes.ts       Temas de Shiki emparejados con los tokens
│   └── sitemap.ts           Lee la paleta de tokens.css para la hoja del sitemap
└── assets/favicon.png       Favicon por defecto
```

## `astro/`: el adaptador

Dentro de `astro/` los datos (`data/`) y la presentación (`views/`, `routes/`) no se importan entre sí:
solo `routes/` conoce a los dos (ver [Capas](./index.md#subcapas-de-astro)).

```text
astro/
├── config.ts                La política de URLs y la config validada o un error de Astro
├── errors.ts                DocsError → AstroError (toAstroError, orAstroError)
├── registry.ts              Rutas del cliente y contador de cambios que la integración comparte con el panel
├── integration/
│   ├── index.ts             Exports públicos: docs, defineDocsConfig, defineDocsSite…
│   ├── docs.ts              docs(): la integración y sus hooks
│   ├── config.ts            defineDocsConfig y los nombres de los archivos de config
│   ├── define-docs-site.ts  defineDocsSite: la config de Astro de un sitio de docs
│   ├── analytics-env.ts     Lee PUBLIC_GTM_ID con loadEnv
│   ├── route-overrides.ts   Avisa de las rutas de la librería que src/pages/ sustituye
│   ├── client-pages.ts      Guarda las páginas del consumidor al resolver las rutas
│   ├── fs-allow.ts          Carpetas que Vite debe servir si el contenido está fuera del proyecto
│   ├── fonts.ts             IBM Plex y el choque de variables de fuente
│   └── build/
│       ├── build-done.ts    Lo que corre en astro:build:done
│       ├── client-sitemap.ts  Suma las páginas del consumidor al sitemap
│       └── pagefind.ts      Índice de búsqueda tras el build
├── loader/
│   ├── index.ts             docsLoader / docsLoaderFromResolved: descubrir, renderizar, validar
│   ├── schema.ts            docsSchema: los datos de cada entrada
│   ├── frontmatter.ts       Lee y valida YAML con archivo y línea
│   ├── repo-root.ts         repoRoot o el .git más cercano, para editPath
│   ├── images.ts            Comprueba las imágenes de public/
│   ├── favicon.ts           Comprueba el favicon local
│   └── watch.ts             Recarga en astro dev
├── content/
│   ├── index.ts             `collections`: la colección docs con la config del módulo virtual
│   └── missing-integration.ts  El aviso «falta docs(config)» si el módulo virtual no existe
├── markdown/                Plugins mdast y su registro (ver Integración → Markdown)
│   ├── register.ts          Los plugins en su orden
│   ├── processor.ts         Engancha los plugins al procesador de Markdown
│   ├── env.ts               Lo que los plugins saben del sitio
│   ├── path-filter.ts       Qué Markdown transforman nuestros plugins
│   ├── admonitions.ts       Directivas :::tipo
│   ├── github-alerts.ts     Citas > [!NOTE] como admoniciones
│   ├── tabs.ts              ::::tabs con :::tab[Etiqueta]
│   ├── tables.ts            Envuelve cada tabla en un contenedor con scroll
│   ├── mermaid.ts           Bloques mermaid → .docs-mermaid
│   ├── code-languages.ts    Alias de lenguajes que Shiki no trae
│   └── restore-directives.ts  Devuelve a texto las directivas que nadie reclamó
├── routes/                  SOLO lo que Astro sirve: rutas y endpoints (las inyecta la integración)
│   ├── routes.ts            La tabla de rutas: patrón, fichero y cuándo se inyecta
│   ├── doc.astro            /[...slug]
│   ├── Fonts.astro          Las fuentes de designFonts() (components/ no importa astro:*)
│   ├── sitemap.xml.ts       Endpoint del sitemap (o el índice, con sitemap.include)
│   ├── sitemap-pages.xml.ts Endpoint con las páginas propias cuando sitemap.xml es un índice
│   ├── sitemap.css.ts       Endpoint de la hoja de estilo del sitemap
│   ├── pages-sitemap.ts     Las entradas del sitemap de las páginas propias
│   ├── favicon.png.ts       Endpoint del favicon por defecto
│   └── seo-on-page/         Panel SOLO de dev (ver Integración → SEO on page)
│       └── overview.astro, pages.astro, page.astro
├── views/                   Lógica pura que prepara los datos de cada página (con sus tests)
│   ├── doc.ts               docRoutes y docView: todo lo que necesita una página
│   ├── chrome.ts            Lo que cabecera y pie necesitan del sitio
│   ├── not-found.ts, privacy.ts
│   ├── pages.ts             DocData → Page y sitemap
│   └── seo-on-page/
│       ├── hrefs.ts         Rutas del panel y enlaces entre pantallas
│       ├── panel.ts         Lo que DocsLayout recibe en cada pantalla (como docView)
│       └── report.ts        El modelo del diálogo «Copiar para la IA» de cada pantalla
├── data/                    El ÚNICO sitio que lee Astro: la colección y el módulo virtual
│   ├── docs-collection.ts   getDocs / renderDoc tipados para la colección docs
│   ├── site-config.ts       La config del módulo virtual con su tipo completo
│   ├── image-sizes.ts       Lee los tamaños de las imágenes sociales
│   ├── client-pages.ts      Lee las páginas del consumidor y las que no se pudieron leer
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
- `testing/markdown.ts`: renderiza Markdown con los plugins de la librería.
- `testing/search.ts`: busca en el índice de Pagefind de un `dist/`.
- `testing/seo-page.ts`: una página del árbol del panel con valores razonables.
- `testing/build.ts` y `testing/case.ts`: construyen proyectos consumidores mínimos descritos como
  datos, para los tests de integración (con un entorno limpio de variables de Vitest).
- `testing/contrast.ts`: luminancia y contraste WCAG para los tests de la paleta.
- `testing/boundaries.test.ts`: la regla de capas (ver [Capas](./index.md#cómo-lo-hace-cumplir-eslint)).
- `testing/src-map.test.ts`: comprueba que este mapa nombra cada archivo y cada carpeta de `src/`.
- `pages/index.astro`: la página mínima que sirve `npm run dev` en la raíz.

## El contrato público

Lo que un consumidor puede importar está fijado en `"exports"` del `package.json`:

| Subruta | Apunta a |
| --- | --- |
| `@velezanthony/design/integration` | `src/astro/integration/index.ts` |
| `@velezanthony/design/loader` | `src/astro/loader/index.ts` |
| `@velezanthony/design/content` | `src/astro/content/index.ts` |
| `@velezanthony/design/components/*` | `src/components/*` |
| `@velezanthony/design/theme.css` | `src/components/styles/theme.css` |
| `@velezanthony/design/theme-colors` | `src/components/styles/theme-colors.ts` |

Mover un archivo a los que apunta una de estas subrutas es un cambio incompatible para los
consumidores. `src/astro/integration/public-api.test.ts` sujeta lo que exporta la integración.
