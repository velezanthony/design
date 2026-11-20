# Changelog

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Cada versión lleva
su sección; la de la versión publicada es la que se pega como notas de su Release.

## 0.1.1

### Arreglado

- **Una política de traducción declarada en la config del sitio cuenta como declarada.** Con
  `translations: { missing: … }` en `docs.config.mjs`, una página sin traducción ya no avisa «Declara
  `translations`» al arrancar ni resta salud en el panel SEO: el aviso solo miraba el frontmatter de
  cada página. Es el caso de quien viene de MkDocs con `fallback`.
- **El panel SEO nombra la portada externa como «index».** Las ayudas para arreglar una página
  externa usada como portada decían «la entrada «»», porque su slug interno es vacío.

## 0.1.0

### Cambios que rompen

- **La clase `.docs-footer` pasa a llamarse `.surface-inverse`.** Es la superficie invertida (tinta
  clara sobre antracita, redefine los tokens en su ámbito) y ya no es cosa del pie de los docs: la
  puede usar cualquier pie o banda. `DocsFooter` la lleva con el nombre nuevo; si un sitio apuntaba a
  `.docs-footer` desde su CSS o sus pruebas, que apunte a `.surface-inverse`. `.docs-header` no se
  renombra: es interno (transición de vista y ancho completo) y no está pensado para reutilizarse.
- **La librería ya no genera la 404 ni la página de privacidad.** Las pone el portfolio, una vez para
  todo el dominio. Se quitan las rutas `/404`, `/[locale]/404`, `/[privacy]` y `/[locale]/[privacy]`,
  `NotFoundLayout`, `PrivacyLayout`, `organisms/not-found` y `organisms/privacy` (`ConsentBanner` se
  queda, ahora en `organisms/chrome`) y `core/privacy`. Un `src/pages/404.astro` o
  `src/pages/privacidad.astro` del sitio ya no «sustituye» nada: es simplemente una página del sitio.
- **Se quitan `privacy.page` y `privacy.controller` de la config.** La config es estricta: dejarlas
  falla con «opción desconocida».
- **La analítica exige `privacyUrl`.** La librería ya no enlaza por defecto a la política del
  portfolio.

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
  no hay páginas nativas; el portfolio ya no necesita un `.gitkeep`. Una carpeta elegida con `content` que
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
- **`InlineList`, `Text` y `SectionHead`**, subidos desde el portfolio: `components/atoms/display/InlineList.astro`,
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
