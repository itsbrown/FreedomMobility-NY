# Freedom Mobility NY — Website

Official website for Freedom Mobility NY, locally owned home accessibility experts serving Rochester, Buffalo, and Syracuse, NY.

**Live site:** https://freedommobilityny.com

## Tech Stack

- [Astro](https://astro.build)  (static-first, excellent SEO & performance)
- Tailwind CSS v4 (via Vite plugin)
- Vanilla JS for mobile nav + contact form demo

## Getting Started

```bash
# Clone
git clone https://github.com/itsbrown/FreedomMobility-NY.git
cd FreedomMobility-NY

# Install
npm install

# Run dev server
npm run dev
```

Visit http://localhost:4321

### Available Scripts

| Command             | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start local dev server (Astro)           |
| `npm run build`     | Production build → `dist/`               |
| `npm run preview`   | Preview the production build locally     |
| `npm run astro`     | Run Astro CLI commands                   |

## Project Highlights

- Multi-page marketing site: Home, About, Stairlifts, Ramps, Vertical Platform Lifts, Service, Contact
- Prominent phone CTA: **(585) 488-0771**
- Free consultation lead form (demo — ready to wire to Netlify Forms, Formspree, or custom backend)
- Responsive header + mobile menu
- Reuses local brand assets (logos, product photos, map)
- `ads.txt` included for advertising partners

## Content & Branding

Content is based on the existing Freedom Mobility NY site + site assessment documentation. All copy emphasizes local service, free consultations, and the Gold Star 18-month warranty.

## Deployment

The project builds to static files in `dist/`. Recommended hosts:
- Netlify / Vercel (zero-config Astro support)
- Cloudflare Pages
- GitHub Pages + Actions
- Any static host + your own domain (update `astro.config.mjs` `site` if using)

## Assets

Product photos and logos are stored in `public/images/`. Original source assets live in the parent `FM/` project folder.

## Contact / Next Steps

- Phone: (585) 488-0771
- Email: info@freedommobilityny.com
- Free consultations: /contact

---

Built for Freedom Mobility NY. Questions? Open an issue or contact the team.
