import { z } from 'astro/zod';
import { contentDirProblem } from '../content/content-dir';
import { FoldersSchema } from './folders';
import { NavIcon, type NavItem } from './nav';
import {
  LabelSchema,
  MissingTranslationSchema,
  PageSeoOverrideSchema,
  type Label,
} from './shared-schemas';

/* `content`: qué páginas hay y cómo se navega (carpeta, exclusiones, externas, estáticas, edición,
   cabecera, barra lateral y ajustes por carpeta). */

/** Entrada del sidebar: slug o sección `{ label, slug?, items }`; la portada es `'index'` y un slug sin página falla. */
export type SidebarItem = string | { label: Label; slug?: string; items?: SidebarItem[] };

export const SidebarItemSchema: z.ZodType<SidebarItem, SidebarItem> = z.lazy(() =>
  z.union([
    z.string(),
    z.strictObject({
      label: LabelSchema,
      slug: z.string().optional(),
      items: z.array(SidebarItemSchema).optional(),
    }),
  ]),
);

/** Valores permitidos de los iconos de `nav`: zod los lista en el mensaje de error. */
export const NavIconSchema = z.enum(Object.values(NavIcon));

/* Un item de `nav` se lee con una forma plana y se valida en `superRefine`: con una unión de tres
   objetos zod solo diría «Invalid input» en `nav[1]`; así cada fallo lleva su ruta (`nav[1].href`). */
export const NavItemSchema = z.strictObject({
  label: LabelSchema,
  dir: z.string().optional(),
  sidebar: z.array(SidebarItemSchema).optional(),
  slug: z.string().min(1).optional(),
  href: z.string().optional(),
  icon: NavIconSchema.optional(),
}) as unknown as z.ZodType<NavItem, NavItem>;

export const ExternalDocSchema = z.strictObject({
  slug: z
    .string()
    .min(1)
    .refine(
      (slug) => !slug.startsWith('/') && !slug.endsWith('/'),
      'Sin barras al principio ni al final.',
    ),
  file: z
    .string()
    .refine(
      (file) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(file),
      'Debe ser una ruta local, no una URL.',
    )
    .refine((file) => file.endsWith('.md'), 'Debe ser un archivo Markdown (.md).'),
  locales: z.array(z.string()).optional(),
  seo: PageSeoOverrideSchema.optional(),
  translations: MissingTranslationSchema.optional(),
});
export type ExternalDoc = z.infer<typeof ExternalDocSchema>;

/** `content`: todo opcional. */
export const ContentSchema = z
  .strictObject({
    /** Carpeta del contenido desde la raíz del proyecto (por defecto `src/content/docs`). */
    dir: z
      .string()
      .superRefine((directory, context) => {
        const problem = contentDirProblem(directory);
        if (problem) context.addIssue({ code: 'custom', message: problem });
      })
      .optional(),
    /** Patrones (estilo `.gitignore`) de los `.md` de `dir` que no se publican; equivale a `exclude_docs` de MkDocs. */
    exclude: z.array(z.string().min(1)).optional(),
    /** Archivos Markdown de fuera de `dir` que se publican con un slug propio. */
    external: z.array(ExternalDocSchema).optional(),
    /** Carpetas que se publican tal cual (un informe de cobertura HTML): `from` desde la raíz del proyecto, `to` bajo el sitio, `exclude` lo que no. */
    static: z
      .array(
        z.strictObject({
          from: z.string().min(1),
          to: z.string().min(1),
          exclude: z.array(z.string().min(1)).optional(),
        }),
      )
      .optional(),
    /** URL base del enlace «Editar esta página». */
    editUrl: z.string().optional(),
    /** Raíz del repositorio relativa al proyecto (por defecto, el ancestro con `.git`): de ella cuelgan las rutas de `editUrl`. */
    repoRoot: z.string().optional(),
    /** Cabecera: secciones, páginas sueltas y enlaces externos (`NavIcon`). */
    nav: z.array(NavItemSchema).optional(),
    /** Barra lateral general escrita a mano; sin ella, el árbol automático de carpetas. */
    sidebar: z.array(SidebarItemSchema).optional(),
    /** Ajustes por carpeta (listado, árbol) heredados de padre a hijo; `'*'` lleva los de todo el sitio. */
    folders: FoldersSchema.optional(),
  })
  .superRefine((content, context) => {
    validateNavShape(content.nav ?? [], (path, message) =>
      context.addIssue({ code: 'custom', path, message }),
    );
  });

/** Lo que se puede juzgar de `nav` sin conocer las páginas: forma de cada item, https y solape de dirs. */
function validateNavShape(
  nav: readonly NavItem[],
  issue: (path: (string | number)[], message: string) => void,
): void {
  const directories: { directory: string; index: number }[] = [];
  nav.forEach((raw, index) => {
    // Forma plana (ver `NavItemSchema`): se mira por claves, no por el tipo discriminado.
    const item = raw as {
      dir?: string;
      slug?: string;
      href?: string;
      sidebar?: unknown;
      icon?: unknown;
    };
    const kinds = (['dir', 'slug', 'href'] as const).filter((key) => item[key] !== undefined);
    // Una sección puede ser solo `sidebar`: sus páginas no tienen por qué compartir carpeta.
    if (kinds.length === 0 && item.sidebar !== undefined) return;
    if (kinds.length !== 1) {
      issue(
        ['nav', index],
        'Debe ser una sección (`dir` o `sidebar`), una página (`slug`) o un enlace (`href`), solo una de las tres.',
      );
      return;
    }
    if (item.sidebar !== undefined && item.dir === undefined) {
      issue(['nav', index, 'sidebar'], 'Solo una sección tiene `sidebar`.');
    }
    if (item.icon !== undefined && item.href === undefined) {
      issue(['nav', index, 'icon'], 'Solo un enlace (`href`) tiene `icon`.');
    }
    if (item.href !== undefined && !item.href.startsWith('https://')) {
      issue(['nav', index, 'href'], 'Debe ser una URL https (https://…).');
    }
    if (item.dir !== undefined) {
      if (item.dir === '' || item.dir.startsWith('/') || item.dir.endsWith('/')) {
        issue(
          ['nav', index, 'dir'],
          'Carpeta sin barras al principio ni al final (users, no /users/).',
        );
        return;
      }
      const clash = directories.find((other) => overlaps(other.directory, item.dir!));
      if (clash) {
        issue(
          ['nav', index, 'dir'],
          `«${item.dir}» se solapa con «${clash.directory}» (content.nav[${clash.index}].dir): una página no puede ser de dos secciones.`,
        );
      }
      directories.push({ directory: item.dir, index });
    }
  });
}

/** Dos carpetas se solapan si son la misma o una cuelga de la otra (`users` y `users/guide`). */
function overlaps(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}
