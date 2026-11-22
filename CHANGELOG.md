# Changelog

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Cada versión lleva
su sección; la de la versión publicada es la que se pega como notas de su Release.

## 0.2.0

### Cambios que rompen

- **La config se agrupa en `site`, `i18n` y `content`.** Las claves de primer nivel de la 0.1 pasan a
  uno de tres grupos: `site` (cómo se ve y se presenta el sitio), `i18n` (idiomas y textos) y
  `content` (qué páginas hay y cómo se navega). Solo `site.name` es obligatorio. Una clave antigua de
  primer nivel rompe el build como opción desconocida, y todos los mensajes de error nombran la ruta
  nueva (`content.nav[1].dir`, `site.analytics.privacyUrl.fr`, `i18n.locales`). La config resuelta
  (`resolveConfigOrThrow`, `docs(config).resolvedConfig`) tiene la misma forma.

  | Antes (0.1) | Ahora |
  | --- | --- |
  | `name`, `favicon`, `theme`, `social`, `components`, `footer` | `site.name`, `site.favicon`, `site.theme`, `site.social`, `site.components`, `site.footer` |
  | `layout` | `site.layout` (igual por dentro) |
  | `seo` (`titleSuffix`, `description`, `image`, `schema`) | `site.seo` |
  | `ogLocales` | `site.seo.ogLocales` |
  | `sitemap` | `site.seo.sitemap` |
  | `gtmId`, `privacyUrl` | `site.analytics.gtmId`, `site.analytics.privacyUrl` |
  | `locales`, `defaultLocale`, `ui` | `i18n.locales`, `i18n.defaultLocale`, `i18n.ui` |
  | `translations.missing` | `i18n.missing` |
  | `content` (la carpeta) | `content.dir` |
  | `exclude`, `external`, `static`, `editUrl`, `repoRoot`, `nav`, `sidebar` | `content.exclude`, `content.external`, `content.static`, `content.editUrl`, `content.repoRoot`, `content.nav`, `content.sidebar` |

- **El `site` de Astro se llama `siteUrl` en el módulo virtual.** `virtual:@velezanthony/design/config`
  lleva ahora la config resuelta agrupada (`site`, `i18n` sin `ui`, `content`) más lo que sabe Astro, y
  el origen del sitio pasa de `site` a `siteUrl` para no chocar con el grupo `site`. Un layout propio
  que leyera `config.site` como URL debe leer `config.siteUrl` (y `config.site.name` en vez de
  `config.name`). Los tipos inyectados (`virtual.d.ts`) ya tienen la forma nueva.

- **Las capturas las marca `Article`.** Al pintar el contenido, `Article` pone `docs-screenshot` en
  cada párrafo cuyo único contenido es una imagen (`core/content/screenshots.ts`, junto al
  `.table-scroll` de las tablas), en los docs y en cualquier página propia que lo use, y el CSS solo
  pinta como captura ese párrafo. Se quita la clase `docs-inline-images` (y su plugin de Markdown). El
  Markdown que se pinte sin `Article`, o con `prose={false}`, no tiene estilo de captura: sus imágenes
  quedan en línea y a su tamaño natural.
- **Las tablas las envuelve `Article`, no un plugin de Markdown.** Se quita el plugin
  `scrollableTables` (`astro/markdown/tables.ts`): el `.table-scroll` lo pone `Article`, en los docs y
  en cualquier página propia que lo use, sin repetir uno escrito a mano. Quien pinte el HTML de la
  colección sin `Article` pierde el envoltorio.

### Añadido

- **Ajustes por carpeta (`content.folders`).** Un mapa de carpetas del contenido, con la clave `'*'`
  (`ALL_FOLDERS`) para todo el sitio. Cada ajuste se hereda **por separado** de la carpeta declarada
  más cercana (la propia, luego su padre…), luego de `'*'` y, si nadie lo declara, del valor por
  defecto: declarar `pageSize` en una carpeta hija no anula la `view` de su padre. Una clave que no es
  `'*'` ni una carpeta con páginas rompe el build con su ruta (`content.folders['articulos/pyton']`).
  - **`listing`**: el índice generado de la carpeta y cómo se pinta (ver «Índices de carpeta
    generados» abajo).
  - **`tree.depth`** limita cuánto anida el árbol automático de la barra lateral, contando desde la
    carpeta que lo declara (`'*'`, desde la raíz del árbol que se pinta: el contenido o el `dir` de una
    sección). Lo que queda por debajo del límite va plano en el último grupo permitido, en el orden de
    siempre; nunca se oculta. Un ajuste no vuelve a mostrar su propia carpeta si un límite de arriba
    ya la aplana. Por defecto no hay límite, y los grupos escritos a mano en `sidebar` no cambian.
  - **`tree.show`** (`TreeShow.SECTION`, por defecto, o `TreeShow.ALL`): con `ALL`, la barra lateral de
    todas las páginas de la carpeta (la suya, las de cada sección y las de sus subcarpetas) es su árbol
    completo: la página de la carpeta arriba, cada sección de `nav` con páginas dentro como grupo de
    primer nivel (enlazado a la página de su carpeta) y las páginas sin sección con su árbol
    automático. La cabecera sigue marcando la sección, y anterior / siguiente recorren el árbol
    completo. Las páginas de fuera conservan su barra.
- **Las etiquetas de grupo enlazan la página de su carpeta.** Las carpetas son categorías: un grupo de
  la barra lateral o de `::nav-tree` lleva a la página índice de su carpeta si existe (generada, de un
  `_index.md` o de un `index.md`), con el estilo de grupo y `aria-current` en esa página y en sus
  páginas 2+. Un grupo escrito en `sidebar` sin `slug` la enlaza cuando es el dueño de una carpeta (la
  carpeta común más profunda de sus páginas, sin otro grupo más interior que la reclame); uno que solo
  envuelve a otro («Cloud» › «AWS») enlaza la carpeta de encima. Si dos grupos que no se envuelven
  comparten carpeta, ninguno la enlaza. Un `slug` escrito a mano manda. La página destino no sale
  además como hoja suelta. Sin página índice, la etiqueta sigue siendo texto.
- **Constantes de todas las opciones cerradas.** `@velezanthony/design/integration` exporta
  `ListingView`, `TreeShow` y `ALL_FOLDERS`, además de `MissingTranslation`, `PanelState`,
  `LayoutWidth` y `NavIcon`; de cada una salen su tipo y su esquema, y las cadenas literales siguen
  valiendo. `defineDocsConfig` tiene un test de tipos que comprueba su autocompletado.

- **Pie propio en las páginas de docs (`site.components.Footer`).** Como los `components` de Starlight,
  `site: { components: { Footer: './src/components/DocsFooter.astro' } }` sustituye el pie de la librería por un
  `.astro` del sitio, que recibe las props de `DocsFooter` más el idioma de la página (el tipo
  `FooterProps`, exportado por `@velezanthony/design/integration`). Llega por el módulo virtual
  `virtual:@velezanthony/design/components/Footer`, y `DocsLayout` acepta el componente en su prop
  `Footer`. Una ruta inexistente, un archivo que no es `.astro` o una clave desconocida en `site.components`
  rompen el build con la ruta del campo. Sin `site.components`, el pie es el de siempre. Las pantallas del
  panel SEO (`/seo-on-page/`, solo en `astro dev`) llevan el mismo pie: sus rutas lo pasan a cada
  pantalla, que lo reenvía a `DocsLayout`.
- **`CookieSettingsButton`**, el botón «Preferencias de cookies» que reabre el aviso de consentimiento
  (`data-consent-open`), como átomo propio en `atoms/actions/`. Lo usa `DocsFooter` y puede usarlo un pie
  propio, con `strings` y una `class` opcional.
- **Índice generado con `::nav-tree`.** La directiva, sola en su línea, pinta por cada sección de
  `content.nav` un `##` con su etiqueta (con ancla y en «En esta página») y debajo su árbol, el de la barra
  lateral: grupos anidados en negrita y cada página enlazada con su título y su `seo.description`. Una
  página índice ya no copia a mano el árbol de la config ni hay que traducirlo.
  `{section="Avanzado"}` deja una sola sección y `{descriptions="false"}` solo los títulos. En una
  ruta de reserva el texto es el del original y las URLs, las de la barra lateral de esa ruta. Una
  sección que no existe, un atributo desconocido o la directiva sin secciones en `nav` rompen el build
  con el archivo y la línea.
- **Índices de carpeta generados (`content.folders` y `_index.md`).** Si una carpeta tiene una página
  que lista lo que cuelga de ella lo decide la config: `listing.generate` en `content.folders`
  (heredable, apagado por defecto). Con `articulos: { listing: { generate: true } }`, también las
  carpetas intermedias sin archivo propio (`articulos/sistemas`, `articulos/sistemas/cloud`…) reciben
  su página, indexable y en el sitemap. Como en Hugo, el `_index.md` de la carpeta pone los textos de
  esa página: `/tutoriales/` pinta su cuerpo (título y entradilla) y su `seo`, y debajo el listado,
  con la resolución de la barra lateral. El `_index.md` no es una página propia y se traduce con
  `_index.en.md`.
  - **Sin `_index.md`**, la página lleva solo el título (la etiqueta de la sección de `nav` con ese
    `dir`, la de la sección o el grupo declarado cuyas páginas comparten esa carpeta, o el nombre de la
    carpeta) y el listado, con la descripción «Todas las páginas de {title}.» (clave nueva
    `listing.description`, sobrescribible en `i18n.ui`).
  - **Un `index.md`** en la carpeta gana a la generación: se pinta como página normal y el build lo
    informa (una línea `info` por carpeta). Un `_index.md` al lado se ignora con un aviso.
  - **Un `_index.md` sin `generate`** rompe el build con el archivo y la clave que lo enciende
    (`content.folders['<carpeta>'].listing.generate: true`): casi seguro es un olvido.
  - **`seo.noindex`** en el `_index.md` saca la carpeta del índice, con todas sus rutas de paginación.
  - **Las páginas de carpeta no son entradas de la navegación:** el grupo de su carpeta las enlaza,
    pero no salen como hoja suelta en la barra lateral ni como entrada del listado de la carpeta padre.
  - **`index: { summary, image, imageAlt }`** en el frontmatter de cualquier página (también de un
    `_index.md`, su ficha en el listado padre) dice cómo sale en el listado de su carpeta. `image` es una
    ruta relativa al `.md` (pasa por `astro:assets`), de `public/` (con la base) o `false`; una que no
    existe avisa y deja la portada de la librería, un dibujo hecho con los tokens del tema
    (`CoverPlaceholder`). La política de portadas por carpeta es `listing.covers`.
  - **Tres vistas** (`listing.view`, `ListingView`): `LIST` (el árbol por secciones de `nav`), `TABLE`
    (título, resumen, sección y fecha; tarjetas apiladas en móvil) y `CARDS` (tarjetas de blog con portada 16:9). La tabla y las
    tarjetas van de la más reciente a la más antigua por fecha de commit (lo no publicado, primero y
    sin fecha), de 10 en 10 y de 12 en 12 por defecto.
  - **Rutas estáticas.** El tamaño por defecto vive en la carpeta y en `/tutoriales/page/2/`…; cada
    otro tamaño de `perPageOptions` (por defecto 12/24/48 y 10/25/50), en `/tutoriales/per-page/24/` y
    sus páginas debajo (`/tutoriales/per-page/24/page/2/`). Los segmentos son iguales en todos los
    idiomas y van detrás de la URL del listado en su idioma. Solo la página 1 del tamaño por defecto es
    indexable; las demás son `noindex`, canónicas de sí mismas, con `rel=prev/next` dentro de su tamaño,
    fuera del sitemap y de la búsqueda. Dentro de una carpeta con listado, `page` y `per-page` quedan
    reservados: una página con esa URL rompe el build nombrando su archivo.
  - **Selector «Por página».** En la fila de pie, junto al rango y el paginador (la molécula
    `PaginationBar`, que también usa ahora el pie de la tabla del panel SEO): un `<select>` que lleva a
    la ruta del tamaño elegido (`data-auto-navigate`) y, sin JavaScript, los tamaños como enlaces.
  - **Componentes nuevos:** los organismos `Listing`, `ListingList`, `ListingTable` y `ListingCards`;
    las moléculas `ListingCard`, `ListingTree`, `PageLink` (enlace con la insignia de idioma, también en
    la barra lateral y en `::nav-tree`), `SectionPath` y `PerPageSelector`; el átomo `DateLabel`.
    Textos nuevos `listing.*`. `docsSchema(image)` acepta el `image()` de Astro para las portadas en la
    forma explícita del loader. Sin `content.folders`, nada cambia.
- **`content.static` puede dejar archivos fuera.** Cada entrada acepta `exclude`, con las reglas de
  `content.exclude` pero relativas a `from`:
  `static: [{ from: '../htmlcov', to: 'coverage', exclude: ['assets/script/'] }]`. Lo excluido no se
  copia a `dist/` y `astro dev` responde 404.
- **El migrador de MkDocs sugiere `site` y `base` desde `site_url`.** Como van en `astro.config.mjs`,
  otro archivo, salen en una línea de comentario sobre la config sugerida:
  `https://o.github.io/repo/` → `defineDocsSite(docsConfig, { site: 'https://o.github.io', base: '/repo' })`.
- **Indicador de carga en los diagramas de Mermaid.** Hasta que llega el SVG, cada bloque muestra
  una caja «Cargando diagrama…» (clave nueva `diagram.loading`, en `data-loading-label` del `pre`) en
  vez del código fuente, desde el primer pintado y solo con JavaScript activo
  (`@media (scripting: enabled)`). El bloque lleva `aria-busy="true"` mientras carga y el brillo se
  apaga con `prefers-reduced-motion`. Nunca se queda atascado: si el trozo de los diagramas o Mermaid
  no se descargan, el bloque pasa a `data-state="error"` y se ve el código; si el JavaScript no
  llega a ejecutarse, el CSS retira la caja a los 10 s. Mermaid empieza a descargarse a la par que el
  código que lo dibuja, no después.

- **URLs traducidas con `slug` en el frontmatter.** `slug: tutorials/installation` en
  `tutoriales/instalacion.en.md` publica la traducción en `/en/tutorials/installation/`, mientras la
  española sigue en su URL. Las traducciones se siguen emparejando por nombre de archivo: el selector
  de idioma, `hreflang`, el sitemap, el canonical, anterior/siguiente, la barra lateral, la cabecera,
  `::nav-tree`, los índices generados, el panel SEO, Pagefind y los enlaces relativos entre `.md` usan
  la URL de cada idioma, y `content.sidebar`, `content.nav` y `site.footer` siguen nombrando la página por su archivo. Un `_index.en.md` con `slug: tutorials`
  mueve el listado de su carpeta (y su paginación, `/en/tutorials/page/2/`) a `/en/tutorials/`. También vale en el idioma por
  defecto. Las rutas de reserva no cambian. Rompen el build un `slug` mal formado (vacío, absoluto,
  con `..`, prefijo de idioma, `/index` final o caracteres no válidos), dos archivos con la misma URL
  en un idioma, un `slug` en una ruta de la librería o de `src/pages/` y una reserva que cae en una
  URL ocupada. Sin `slug`, la salida es idéntica.

### Cambiado

- **El migrador de MkDocs sugiere la config en sus grupos.** La config sugerida (y la de
  `--config-out`) va en `i18n` (`locales`, `defaultLocale`, `missing`) y `content` (`exclude`,
  `external`, `nav`), con un aviso de que falta `site.name`.
- **El migrador de MkDocs sugiere el `README.md` de la raíz de `docs_dir` como portada.** Con
  `docs_dir: .` o `Home: README.md` en el `nav`, el externo sale con `slug: 'index'` y no
  `'readme'`, así que el sitio tiene portada. Si el `nav` trae un `docs/index.md`, la portada es esa.
- **Arquitectura interna por capas.** `core/` (reglas puras) → `astro/` (carga, datos, vistas y
  rutas) → `components/` (solo pintan, en átomos, moléculas y organismos) → `client/`. Cada regla
  (URLs, etiquetas de carpeta, paginación, recorrido de `nav`) tiene un único dueño, y ESLint y los
  tests vigilan las fronteras. El listado se compone de piezas (`ListingCard`, `PageLink`,
  `SectionPath`, `DateLabel`) y el panel SEO comparte `PaginationBar` con los índices. Las subrutas
  públicas del paquete no cambian.
- **Documentado que `accTitle` y `accDescr` rompen los diagramas `block` de Mermaid.** Con Mermaid
  11.17.2 el diagrama da un error de sintaxis y se ve el código; la guía de Markdown lo avisa y
  propone usar otro tipo de diagrama, como `flowchart`, o quitar esas líneas.

### Arreglado

- **La página de una carpeta declarada en `sidebar` sale una vez.** `sidebar: ['articulos']` con
  páginas en `articulos/…` pintaba la hoja «Artículos» y, al final, un grupo automático «Articulos» sin
  enlace. Ahora el grupo de la carpeta ocupa la posición declarada, con el título y el enlace de la
  página, a cualquier profundidad del `sidebar`.
- **El árbol automático de la barra lateral anida todas las carpetas.** Pasaba de dos carpetas por
  debajo de la raíz del árbol y aplanaba el resto: con `articulos/desarrollo/python/django/x.md` y sin
  `nav`, `x` salía suelta en «Desarrollo» y los grupos «Python» y «Django» desaparecían. En una sección
  con `dir` el límite contaba desde `dir`, así que se notaba menos. Ahora hay un grupo por carpeta a
  cualquier profundidad, en la barra general y en las de sección; con una o dos carpetas no cambia
  nada. Lo que recorre el árbol lo sigue: `::nav-tree`, el camino de las entradas de un índice
  generado (un grupo más por carpeta) y anterior / siguiente, donde el `order` de una página profunda
  ya solo compite con las hermanas de su carpeta.
- **Los diagramas mermaid se pintan en `astro dev` con la librería instalada.** Desde `node_modules`
  (instalada desde GitHub o npm), Astro saca la librería del pre-empaquetado de Vite porque trae
  `.astro`, y Vite no descubría `mermaid`: lo servía sin convertir y su dependencia dayjs, CommonJS,
  fallaba en el navegador, así que el diagrama se quedaba como código. La integración pide ahora
  `optimizeDeps.include: ['@velezanthony/design > mermaid']`. En el build no pasaba.
- **Las tablas hacen scroll en horizontal en cualquier página con `Article`.** Una página propia que
  pinta su Markdown con `Article` sacaba la tabla del ancho en móvil. `Article` envuelve cada `<table>`
  de su contenido y no repite el envoltorio de las que ya lo traen (ver «Cambios que rompen»: es ahora
  el único que lo hace). Con `prose={false}` el contenido queda tal cual.
- **Una palabra larga ya no se sale de la página en móvil.** `prose` lleva
  `overflow-wrap: break-word`: un código de error, un identificador o una URL sin espacios en un
  título o un párrafo se parte cuando no cabe en la línea. Antes solo se partía el código en línea, y
  un `# ERR_CONNECTION_TIMED_OUT` a tamaño display empujaba la página en horizontal.
- **Una política de traducción declarada en la config del sitio cuenta como declarada.** Con
  `i18n.missing` en `docs.config.mjs`, una página sin traducción ya no avisa «Declara `i18n.missing`»
  al arrancar ni resta salud en el panel SEO: el aviso solo miraba el frontmatter de
  cada página. Es el caso de quien viene de MkDocs con `fallback`.
- **El panel SEO nombra la portada externa como «index».** Las ayudas para arreglar una página
  externa usada como portada decían «la entrada «»», porque su slug interno es vacío.
- **Solo una imagen sola en su párrafo se pinta como captura.** Antes toda imagen del contenido iba
  en bloque, a todo el ancho y con borde: tres insignias de shields.io salían apiladas y de ~800 px y
  un `<img width="300">` se ignoraba. Ahora las insignias, varias imágenes en un párrafo, una imagen
  en el texto o en un enlace y un `<img>` en HTML conservan su tamaño natural, en línea y sin borde;
  `<img align="right">` flota como en GitHub. Las capturas no cambian (ver «Cambios que rompen»: se
  marcan en el Markdown).
- **Un enlace relativo a un archivo de `static` lleva a su URL publicada.** `[x](coverage/index.html)`
  dentro de la carpeta `from` de una entrada de `static` fallaba con «no es una página ni un recurso
  publicado… declara el recurso», y no había nada que declarar. Ahora se reescribe a `base` + `to` + el
  resto. Un enlace a algo que su `exclude` deja fuera falla nombrando `content.static[n].exclude`, y la pista
  de un enlace roto dice qué funciona de verdad.

## 0.1.0

### Cambios que rompen

- **La clase `.docs-footer` pasa a llamarse `.surface-inverse`.** Es la superficie invertida (tinta
  clara sobre antracita, redefine los tokens en su ámbito) y ya no es cosa del pie de los docs: la
  puede usar cualquier pie o banda. `DocsFooter` la lleva con el nombre nuevo; si un sitio apuntaba a
  `.docs-footer` desde su CSS o sus pruebas, que apunte a `.surface-inverse`. `.docs-header` no se
  renombra: es interno (transición de vista y ancho completo) y no está pensado para reutilizarse.
- **La librería ya no genera la 404 ni la página de privacidad.** Las pone el sitio de la raíz del
  dominio, una vez para todos. Se quitan las rutas `/404`, `/[locale]/404`, `/[privacy]` y `/[locale]/[privacy]`,
  `NotFoundLayout`, `PrivacyLayout`, `organisms/not-found` y `organisms/privacy` (`ConsentBanner` se
  queda, ahora en `organisms/chrome`) y `core/privacy`. Un `src/pages/404.astro` o
  `src/pages/privacidad.astro` del sitio ya no «sustituye» nada: es simplemente una página del sitio.
- **Se quitan `privacy.page` y `privacy.controller` de la config.** La config es estricta: dejarlas
  falla con «opción desconocida».
- **La analítica exige `privacyUrl`.** La librería ya no enlaza por defecto a ninguna política.

  | Config | Resultado |
  | --- | --- |
  | `gtmId` (o `PUBLIC_GTM_ID`) + `privacyUrl` | Analítica, banner de cookies y enlace en el pie |
  | Solo `privacyUrl` | Solo el enlace en el pie |
  | Solo `gtmId` | `astro build` falla nombrando `privacyUrl`; `astro dev` avisa y arranca sin analítica |
  | Ninguno | Nada |

  Si hoy usas `PUBLIC_GTM_ID` sin `privacyUrl`, añade esta última: `privacyUrl: 'https://…'` o una por
  idioma.
- **Se quitan los textos `notFound.*` y `privacy.eyebrow`, `privacy.updated` y `privacy.description`
  del catálogo de interfaz** (`consent.privacy` se queda). Una sobrescritura de esas claves en `ui`
  falla como clave desconocida.
- **El panel SEO on page deja de listar la 404 y la privacidad como archivos que genera la librería,**
  y `sitemap.xml` ya no suma las URLs de privacidad.
- **`BaseLayout` sustituye a `Shell`.** `components/layouts/Shell.astro` ya no existe; su sitio lo
  ocupa `components/layouts/BaseLayout.astro`, que pinta `<html>`, `<head>` (con `theme.css`, el tema y
  el consentimiento) y deja el `<body>` a quien lo usa: `bodyClass` por props (antes el `<body>` llevaba
  siempre `flex min-h-dvh flex-col`) y las ranuras `head`, la de por defecto y `scripts`. Ya no recibe
  `layout`, `pending` ni `htmlAttrs` de la 404 (sí un `htmlAttrs` genérico). El tema y el consentimiento
  los arranca ahora `bootBase`; `bootDocs` ya no los cablea.

### Cambiado

- **El sufijo del `<title>` por defecto es el `name` de la config, no el nombre del autor.** Un sitio
  sin `seo.titleSuffix` ya no acaba en `| Anthony Velez Tapia`, sino en su propio nombre
  (`Install | SnakeORM`). La cascada es `seo.titleSuffix` de la página > del sitio > `name`, y `false`
  en cualquier nivel sigue quitándolo. `DEFAULT_TITLE_SUFFIX` desaparece: `resolveConfig` rellena el
  sufijo del sitio con `name`, así que `core` no depende de `AUTHOR` para esto.
- **`og:title` y `twitter:title` llevan el título completo, sufijo incluido.** Antes salían sin él
  (`Install`) y ahora igualan al `<title>` (`Install | SnakeORM`): es lo que se ve al compartir el
  enlace. El panel de SEO enseña también el título completo en `og:title`.
- **`bootArticle` sale de `components/layouts/boot.ts`.** Pasa a `components/boot/article.ts`, y
  `BootEnv` y `browserEnv` a `components/boot/env.ts`: `Article` (un organismo) importaba de `layouts/`,
  una dependencia hacia arriba en Atomic Design. `bootBase` y `bootDocs` se quedan donde estaban. Quien
  importaba `bootArticle` desde `@velezanthony/design/components/layouts/boot.ts` lo hace ahora desde
  `@velezanthony/design/components/boot/article.ts`. ESLint (y `boundaries.test.ts`) prohíbe que
  átomos, moléculas y organismos importen de `layouts/` o de `pages/`.
- **Los bloques ```` ```django ```` y ```` ```htmldjango ```` ahora se resaltan.** Shiki no trae esos
  lenguajes, así que antes salían sin resaltado y con un aviso de «lenguaje desconocido»; la librería
  los trata como alias de `jinja` (como `pycon` → `python`, `env` → `dotenv` o `terminal` →
  `shellsession`). Los bloques ya escritos cambian de aspecto sin tocar el Markdown. Un alias propio
  en `markdown.shikiConfig.langAlias` manda sobre estos.

### Añadido

- **`privacyUrl(locale)` en `@velezanthony/design/site`.** La URL de privacidad ya resuelta para un
  idioma (cae al idioma por defecto), junto a `designStrings` y `gtmId`: un layout propio ya no
  necesita repetirla a mano. Devuelve `undefined` si el sitio no declara `privacyUrl`.
- **El `<head>` de una página propia: subrutas `@velezanthony/design/seo` y `@velezanthony/design/seo-schema`.**
  `seoSchema` es el bloque `seo` del frontmatter como fragmento zod (`seo: seoSchema.optional()` en
  cualquier colección). `pageHead({ title, seo, locale, url, alternates, ogType, schema })` devuelve las
  entradas de `head` de `BaseLayout` con la config del sitio (sufijo, imagen social, JSON-LD del sitio,
  favicon): `canonical`, `hreflang`, Open Graph, Twitter y el JSON-LD propio de la página. Una página
  `noindex` no lleva `canonical` ni `hreflang`.
- **`ogLocales` en la config y `ogType` en el `<head>`.** `ogLocales: { es: 'es_ES', en: 'en_GB' }` da a
  `og:locale` el territorio que Open Graph espera (sin él, el idioma tal cual, como hasta ahora); las
  páginas de docs siguen con `og:type: article`.
- **Subruta `@velezanthony/design/fonts`: el componente `Fonts`.** Pinta las fuentes que registra `docs()` (Plex Sans con `preload` y Plex Mono). Un layout propio ya no repite los dos `<Font cssVariable=… />` de `astro:assets`: pone `<Fonts slot="head" />` dentro de `BaseLayout`. Vive en `astro/routes/` porque `components/` no puede importar `astro:*`.
- **Organismo `Article` (`components/organisms/content/Article.astro`) y `bootArticle`.** Es el
  contenido de una página de docs sacado de `DocsLayout`: el contenedor con los textos del cliente
  (copiar, anclas, zoom, visor de diagramas), el `.prose` con su `lang` y la columna del índice
  (`headings`, `toc`, `depth`, `maxHeight`, `toggles`, `open`). Una ranura `aside` mete contenido
  propio en esa columna, encima del índice; `before` y `after` van dentro del contenedor. Sirve fuera
  de docs (`as="div"` si la página ya tiene su `<main>`) y arranca su propio cliente. `bootDocs` ya
  no cablea el contenido: lo hace `bootArticle`, que `Article` carga por sí mismo. `DocsLayout` lo
  usa y su HTML no cambia.
- **Subruta `@velezanthony/design/site`.** Da `designStrings(locale)` (los textos de interfaz ya
  fusionados con los del sitio) y `gtmId` (resuelto desde `PUBLIC_GTM_ID` o la config), para que un
  sitio con su propio layout no importe `virtual:` por su cuenta.
- **Guía de migración desde MkDocs más completa.** El proyecto de Astro ya no se llama `site/` en los
  ejemplos (es la carpeta de salida de MkDocs: choca con su `.gitignore` y con `mkdocs build`), se
  explica que una sección sin `sidebar` se ordena alfabéticamente por slug y cómo fijar el orden, y
  qué slug tiene `carpeta/index.md`.
- **Migrador de MkDocs (`scripts/migrate-mkdocs`).**
  - `--in-place` lee también `mkdocs.yml`: imprime una config sugerida (idiomas, `fallback`,
    `exclude` y `nav` con una sección por grupo y los ficheros de fuera de `docs/` como `external`) y
    `--config-out <fichero>` la escribe.
  - `--api <api.json>` ya funciona con `--in-place`.
  - Las anclas se reescriben a los ids que genera la librería: MkDocs junta los separadores, numera
    los repetidos con `_1` y respeta `{ #id }`, y github-slugger no. Antes solo se reponían los
    acentos.
  - Al final lista lo que `mkdocs.yml` declara y no se traduce (tema, plugins, extensiones,
    `docs_dir`…).
  - `--dry-run`, en los dos modos, no escribe nada e imprime el plan.
  - Los comentarios de `exclude_docs` ya no cuentan como patrones.
- **Documentado `translations.missing: 'fallback'` para quien viene de MkDocs.** Equivale a su
  `fallback_to_default: true`; el valor por defecto no cambia (`link`).
- **`static`: publicar una carpeta tal cual.** `static: [{ from: '../htmlcov', to: 'coverage' }]`
  copia la carpeta a `dist/coverage/` sin procesarla (ni Markdown, ni optimización, ni búsqueda, ni
  sitemap) y `astro dev` la sirve en esa ruta. Un `from` que no existe, un `to` que pisa `_astro`,
  `pagefind` o un idioma, o dos destinos solapados fallan con su ruta.
- **`seo.title` por idioma.** En `external[].seo` (y en el frontmatter) el título SEO acepta, además de
  un texto, uno por idioma (`{ en: 'Readme', es: 'Léeme' }`); un externo ya no sale con el mismo
  título en todos los idiomas. Si falta el del idioma de la página, vale el título de la página.
- **Secciones de `nav` con páginas sueltas y ficheros de fuera de `docs/`.** Una sección es de `dir`
  y de todo lo que nombra su `sidebar`, aunque viva en otra carpeta o sea un `external`; y `dir` es
  opcional si hay `sidebar`. Antes cada página de la sección tenía que colgar de su carpeta y el
  `sidebar` fuera de ella fallaba. Sigue habiendo un solo dueño por página: nombrarla en dos secciones,
  o en una sección y como `slug` suelto del `nav`, falla en el build con la ruta.
- **Impresión: «volver arriba» y el banner de cookies se ocultan.** Con `@media print` ya no se
  repiten encima del texto en cada hoja, y el hueco que el banner reserva al pie también desaparece.
- **Índice «En esta página»: profundidad y altura máxima.** `layout.tocDepth` (2 a 6, por defecto 3,
  como hasta ahora) elige el último nivel de encabezado que se lista y `layout.tocMaxHeight` (una
  longitud CSS como `60vh`) limita la lista, que entonces hace scroll por dentro. `TableOfContents`
  los recibe como `depth` y `maxHeight`.
- **Panel SEO on page: filtro para ocultar las páginas `noindex`.** La casilla «Ocultar noindex»
  (`?noindex=hide`) las quita de la tabla, del aviso de problemas comunes, de los recuentos y del informe
  «Copiar para la IA». Por defecto se ven. Solo filtra la vista: una página noindex sin traducción no pasa
  a ser un problema ni deja de serlo.
- **`exclude` en la config.** Patrones (estilo `.gitignore`, relativos a la carpeta de contenido) de los
  `.md` que no se publican, como `exclude_docs` de MkDocs. Lo excluido no se lee, no se publica y no cuenta
  para los enlaces; un enlace a un archivo excluido falla nombrando `exclude`. Los `external` no se ven
  afectados.
- **La portada y la carpeta de contenido son opcionales.** Sin `index.md` no se genera portada y el sitio
  pone la suya en `src/pages/`. Si falta `src/content/docs/` (la carpeta por defecto), la carga no falla y
  no hay páginas nativas; un sitio sin docs propios ya no necesita un `.gitkeep`. Una carpeta elegida con `content` que
  no existe sigue fallando.
- **Un `README.md` puede hacer de portada.** Dentro del contenido hace de `index.md` de su carpeta si esta no
  tiene el suyo en ese idioma (como MkDocs), y un `external` con `slug: 'index'` (`slug: 'guia/index'` es
  `guia`) publica como portada un archivo de fuera, como el `README.md` de la raíz.
- **`docs()` limita a una pasada los WebP animados infinitos y borra los recursos sin enlaces.** En
  `astro:build:done`, antes de indexar: Sharp recodifica todo WebP animado como infinito (WCAG 2.2.2) y
  una imagen referenciada desde un `<Image>` y desde un cuerpo Markdown deja su original suelto en
  `_astro/`. Sin opciones: un sitio que los hacía con integraciones propias puede quitarlas. Se queda en
  `docs()` y no como integraciones sueltas porque ya posee el hook y no hay motivo para configurarlas.
- **Subruta `last-modified`: `fileLastModified(file, root?)`.** La fecha de última modificación de un
  archivo, la misma que el `<lastmod>` del sitemap (su último commit; sin él, la fecha del archivo;
  nada en un clon superficial). Comparte el único `git log` del proceso, así que pedir la fecha de
  muchos archivos no lanza git por cada uno. Sirve, por ejemplo, para el `dateModified` de un JSON-LD.
- **`tailwindcss` y `@tailwindcss/vite` pasan de peer dependencies a `dependencies`.** `docs()` ya
  registra el plugin y `theme.css` importa `tailwindcss`, así que el consumidor deja de instalarlos
  (`npm install astro @astrojs/markdown-satteri` basta). Si el sitio ya los tiene, no pasa nada: el
  plugin no se repite. `astro` y `@astrojs/markdown-satteri` siguen como peers.
- **`docs()` registra el plugin de Tailwind (`@tailwindcss/vite`)**: la librería es la dueña de la
  compilación del CSS, así que el sitio no lo declara en su `vite.plugins`. Si ya lo declara, la
  integración no lo repite (dos pasadas duplicarían el CSS). `defineDocsSite` deja de añadirlo por su
  cuenta, porque ya lo hace `docs()`; el resultado es el mismo.
- **Opción `theme` en `docs.config.mjs`**: ruta (desde la raíz del proyecto) a un CSS con los tokens
  `@theme` y los estilos propios del sitio. Entra en la MISMA compilación de Tailwind que `theme.css`
  (que lo importa el último, vía el alias `@velezanthony/design/site-theme`), así que los tokens generan
  utilidades y el sitio no necesita su propio `@import 'tailwindcss'` ni importar el tema de la librería.
  Falla con la ruta si el archivo no existe, no es `.css` o es una URL. Nueva subruta `site-theme` en
  `exports` (CSS vacío por defecto).
- **`Icon` admite `mail` y `linkedin`** (la segunda rellena, como `github`).
- **`InlineList`, `Text` y `SectionHead`**, subidos desde un sitio que los usaba: `components/atoms/display/InlineList.astro`,
  `components/atoms/display/Text.astro` y `components/molecules/content/SectionHead.astro` (esta última sobre
  `Heading` y `Link`). Genéricas: sin datos ni textos propios. Ver «Piezas sueltas» en la documentación.
- **Subrutas nuevas en `exports`** para no duplicar piezas: `client/theme`, `client/consent`,
  `client/storage`, `client/toc`, `head` (`buildHead` y `HeadConfig`), `ui-strings` (`UiStrings`) y
  `code-themes`. Ninguna importa `seo-on-page`.
- **`ThemeToggle` y `ConsentBanner` aceptan sus textos por props** (`label`; `label`, `message`,
  `acceptLabel`, `rejectLabel` y `privacyLabel`), y `strings` pasa a ser opcional (por defecto, el
  catálogo en inglés).
- **`BaseLayout` reenvía los textos del aviso** (`label`, `message`, `acceptLabel`, `rejectLabel` y
  `privacyLabel`) y `strings` pasa a ser opcional aunque haya `gtmId`: quien tiene su propio i18n ya no
  necesita un `UiStrings` completo.
- **`<lastmod>` en el sitemap**: la fecha del último commit del archivo de cada página (los `.md` y los
  `.astro` de `src/pages/`), con la fecha del archivo como reserva y sin `<lastmod>` si no hay ninguna.
  Un solo `git log` para todo el repositorio. En un clon superficial no se emite ninguna fecha. El
  módulo virtual gana `root`.
