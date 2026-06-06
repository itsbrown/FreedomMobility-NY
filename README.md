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

### Netlify (Recommended)

This site is pre-configured for Netlify:

1. Connect the repo to Netlify (or use Netlify CLI).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. The `netlify.toml` handles the rest.

**Netlify Forms** (contact form):
- The form in `src/pages/contact.astro` uses `data-netlify="true"`.
- Submissions will appear in the Netlify dashboard under "Forms".
- Honeypot spam protection is included.
- On successful submit it redirects to `/success`.

After deploy:
- Set up custom domain in Netlify (free HTTPS included).
- Update `site` in `astro.config.mjs` if your domain differs.
- (Optional) Enable form notifications in Netlify settings.

### Other Platforms

- **Vercel**: `vercel --prod` works out of the box.
- **Cloudflare Pages**: Set build command and publish dir in dashboard.

See `netlify.toml` for headers, redirects, and build settings.

## Analytics (Optional)

Plausible Analytics is recommended for privacy (no cookies, GDPR-friendly).

Add this to `src/layouts/Layout.astro` in the `<head>` (replace `yourdomain.com`):

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

Then sign up at plausible.io and add the site. It's lightweight and doesn't impact performance much.

## Assets

Product photos and logos are stored in `public/images/`. Original source assets live in the parent `FM/` project folder.

## Contact / Next Steps

- Phone: (585) 488-0771
- Email: info@freedommobilityny.com
- Free consultations: /contact

## Lighthouse / Testing (P10)

After changes, run Lighthouse (via Chrome DevTools > Lighthouse tab, or CLI):

```bash
npm run build
npx serve dist   # or use your deploy preview
# Then run Lighthouse on http://localhost:3000
```

Target scores: Performance 90+ (after image opt), Accessibility 95+, SEO 95+.

## Existing WordPress Site (if running in parallel)

There appears to be an existing WordPress site at freedommobilityny.com (or similar).

- This Astro site is the new modern replacement.
- Once deployed, set up 301 redirects from old URLs to new ones (e.g. /stairlift/ → /stairlifts).
- Update canonical URLs and submit new sitemap to Google Search Console.
- Consider keeping the old site as a backup during transition or using a reverse proxy.

See the audit recommendations (P8) in `AUDIT.md` for more details.

---

Built for Freedom Mobility NY. Questions? Open an issue or contact the team.
