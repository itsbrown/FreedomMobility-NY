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
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/tech/') && !page.includes('/admin') && !page.endsWith('/blog/'),
      serialize: (item) => {
        if (item.url.includes('/resources/')) {
          return { ...item, changefreq: 'monthly', priority: item.url.endsWith('/resources/') ? 0.8 : 0.75 };
        }
        return item;
      },
      customPages: [
        'https://freedommobilityny.com/',
        'https://freedommobilityny.com/locations/',
        'https://freedommobilityny.com/stairlifts/',
        'https://freedommobilityny.com/ramps/',
        'https://freedommobilityny.com/resources/',
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