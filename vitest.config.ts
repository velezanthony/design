/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/* Through Astro's own Vite config, so aliases and `.astro` compilation resolve in tests
   exactly as they do in the build. */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    /* No tests yet; an empty suite is not a failure. Drop this once the first one lands. */
    passWithNoTests: true,
  },
});
