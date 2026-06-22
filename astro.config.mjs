// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://freedommobilityny.com',
  server: {
    host: true,   // needed for Replit port forwarding / preview
  },
  integrations: [
    sitemap({
      // Best-in-class sitemap settings
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      // Give higher priority to key pages
      customPages: [
        'https://freedommobilityny.com/',
        'https://freedommobilityny.com/locations/',
        'https://freedommobilityny.com/stairlifts/',
        'https://freedommobilityny.com/ramps/',
      ],
    }),
  ],
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