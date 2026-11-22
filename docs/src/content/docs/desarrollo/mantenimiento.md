---
seo:
  title: "Comandos y convenciones del repo"
  description: "Los comandos de desarrollo, tests, lint, comprobación de tipos y build, y las convenciones: código en inglés, comentarios en español y commits convencionales."
---

# Comandos y convenciones

## Requisitos

- Node `>=22.23.4` (la CI usa Node 24).
- Un `npm install` en la raíz instala la librería y los dos workspaces (`playground/` y `docs/`).

## Comandos

Todos se ejecutan desde la **raíz** del repo:

| Comando | Qué hace |
| --- | --- |
| `npm test` | Vitest una vez: tests de `src/**` y de `scripts/**`. |
| `npm run test:watch` | Vitest en modo vigilancia, para el ciclo de TDD. |
| `npm run lint` | ESLint, con la regla de capas incluida. |
| `npm run format` | Prettier escribe el formato. |
| `npm run format:check` | Prettier solo comprueba (lo que hace la CI). |
| `npm run test:coverage` | Vitest con cobertura de V8 (lo que ejecuta la CI en lugar de `npm test`). |
| `npm run test:mutation` | Stryker: mide si los tests notan un cambio en el código (ver [Tests](./tests.md#cobertura-y-mutación)). |
| `npm run check` | `astro check`: los tipos de `.ts` y `.astro`. |
| `npm run dev` | La página mínima de la raíz (sin la integración). |
| `npm run playground:dev` | El playground con contenido de snake-orm, con recarga al editar `src/`. |
| `npm run playground:build` | Build completo del playground. |
| `npm run playground:check` | `astro check` del playground. |
| `npm run docs:dev` | Este sitio en desarrollo. |
| `npm run docs:build` | Build completo de este sitio (con índice de búsqueda). |
| `npm run docs:check` | `astro check` de este sitio. |

La CI (`.github/workflows/ci.yml`) ejecuta `lint`, `format:check`, `check`, `docs:check` y `test:coverage`
en cada push y pull request a `main`: los tipos de este sitio también se comprueban, pero no se construye.
Eso lo hace `docs.yml`, solo en push a `main`, y es lo que lo despliega.

> [!NOTE]
> Prettier no toca los `.md` (`.prettierignore`): la prosa se ajusta a mano y Prettier la
> reformatearía. Tampoco toca `playground/` ni `public/`.

## Convenciones

- **Código en inglés; comentarios, mensajes de error, tests y documentación en español.** Los
  nombres de funciones, variables y archivos van en inglés (`resolveConfig`, `nav-sidebar.ts`); los
  comentarios explican el **porqué** en español, y los `describe`/`it` de los tests se leen como
  frases en español.
- **Commits convencionales**: `feat(nav): …`, `fix(theme): …`, `docs(readme): …`,
  `chore(playground): …`. El ámbito es la zona tocada. El asunto describe el comportamiento que
  cambia, no el archivo.
- **Sin `enum`.** Objetos `as const` con su tipo derivado (ver [Capas](./index.md#el-resto-de-reglas-de-eslint)).
- **Valores cerrados exportados** desde `@velezanthony/design/integration` (`ListingView`,
  `TreeShow`, `ALL_FOLDERS`, `MissingTranslation`, `PanelState`, `LayoutWidth`, `NavIcon`), para que la
  config se lea `ListingView.CARDS` en vez de cadenas sueltas (N12). De cada constante salen su tipo y
  su esquema (`z.enum(Object.values(X))`); `public-api.test.ts` comprueba que se exporta y que sus
  valores son las opciones del esquema.
- **Errores que ayudan.** Un fallo de config o de contenido es un `DocsError` con archivo, línea y una
  pista de cómo arreglarlo, y se acumulan para mostrarlos todos de una vez. Nunca se imprimen datos
  del consumidor que no hagan falta (por ejemplo, el valor de `PUBLIC_GTM_ID`).
- **Estricto por defecto.** Si algo puede estar mal y no hay forma de que funcione bien, rompe el
  build (enlaces, títulos, claves desconocidas). Si funciona pero es mejorable, avisa (lenguajes de
  código, traducciones ausentes).
- **Parámetros por objeto** (N9). Dos o más opcionales, o un opcional que no es el último, van en un
  objeto con nombre: `fallbackRoutes({ availability, policies, config, url, pages })`,
  `navContextOf(site, { locale, slug, urlSlug })`, `buildListing({ context, contentLocale, folder,
  details })`. Así cada valor dice qué es en la llamada y añadir uno no mueve los demás.
- **Lo que el CSS no distingue se marca en el HTML, en positivo** (N8): una captura es
  `p.docs-screenshot`, no «un párrafo que no lleva la marca contraria». Un plazo que se repite es una
  propiedad personalizada (`--docs-mermaid-timeout`).
- **Tailwind vía `@apply`** en `theme.css`; CSS plano solo donde Tailwind no llega.
- `_local/` es para ficheros de trabajo que no se suben (está en `.gitignore`).

## Las demás páginas de esta sección

- [Paleta y tokens](./paleta.md): superficies, acento, ratios WCAG y el pie invertido.
- [Tests](./tests.md): qué se prueba, cómo y qué no.
- [Recetas](./recetas.md): añadir un componente, una opción de config o un texto de interfaz.
- [Publicar una versión](./versiones.md): etiquetas, consumidores y el despliegue de este sitio.
