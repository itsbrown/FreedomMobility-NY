// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://freedommobilityny.com',
  integrations: [sitemap()],
  image: {
    // Astro will use Sharp automatically for local images to generate optimized webp/avif + responsive variants
    // Default quality is good; we can tune per-component
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});