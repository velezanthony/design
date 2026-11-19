/** El bloque `seo` del frontmatter como fragmento zod: una colección de cualquier sitio lo incluye con `seo: seoSchema.optional()`. */
export {
  PageSeoOverrideSchema as seoSchema,
  type PageSeoOverride as PageSeo,
} from '../config/schema';
