---
order: 1
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
| `npm run check` | `astro check`: los tipos de `.ts` y `.astro`. |
| `npm run dev` | La página mínima de la raíz (sin la integración). |
| `npm run playground:dev` | El playground con contenido de snake-orm, con recarga al editar `src/`. |
| `npm run playground:build` | Build completo del playground. |
| `npm run docs:dev` | Este sitio en desarrollo. |
| `npm run docs:build` | Build completo de este sitio (con índice de búsqueda). |
| `npm run docs:check` | `astro check` de este sitio. |

La CI (`.github/workflows/ci.yml`) ejecuta `lint`, `format:check`, `check` y `test` en cada push y
pull request a `main`. Este sitio se despliega aparte con `.github/workflows/docs.yml`.

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
- **Sin `enum`.** Objetos `as const` con su tipo derivado (ver [Capas](../arquitectura/index.md#el-resto-de-reglas-de-eslint)).
- **Valores cerrados exportados** desde `@velezanthony/design/integration` (`MissingTranslation`,
  `PanelState`, `LayoutWidth`, `NavIcon`), para que la config se lea `MissingTranslation.LINK` en vez
  de cadenas sueltas.
- **Errores que ayudan.** Un fallo de config o de contenido es un `DocsError` con archivo, línea y una
  pista de cómo arreglarlo, y se acumulan para mostrarlos todos de una vez. Nunca se imprimen datos
  del consumidor que no hagan falta (por ejemplo, el valor de `PUBLIC_GTM_ID`).
- **Estricto por defecto.** Si algo puede estar mal y no hay forma de que funcione bien, rompe el
  build (enlaces, títulos, claves desconocidas). Si funciona pero es mejorable, avisa (lenguajes de
  código, traducciones ausentes).
- **Tailwind vía `@apply`** en `theme.css`; CSS plano solo donde Tailwind no llega.
- `_local/` es para ficheros de trabajo que no se suben (está en `.gitignore`).

## Las demás páginas de esta sección

- [Paleta y tokens](./paleta.md): superficies, acento, ratios WCAG y el pie invertido.
- [Tests](./tests.md): qué se prueba, cómo y qué no.
- [Recetas](./recetas.md): añadir un componente, una opción de config o un texto de interfaz.
- [Publicar una versión](./versiones.md): etiquetas, consumidores y el despliegue de este sitio.
