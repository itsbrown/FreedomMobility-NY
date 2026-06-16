# Freedom Mobility NY — Website

Official website for Freedom Mobility NY, locally owned home accessibility experts serving Rochester, Buffalo, and Syracuse, NY.

**Live site:** https://freedommobilityny.com

> **Node requirement**: This project uses Astro 6 and requires **Node.js >= 22.12.0** (see `package.json` `"engines"`). Default Replit environments often give v20 or v22.2 — the instructions below solve it.

## Tech Stack

- [Astro](https://astro.build)  (static-first, excellent SEO & performance)
- Tailwind CSS v4 (via Vite plugin)
- Vanilla JS for mobile nav + contact form demo

## Getting Started (local / normal)

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

## Replit — Node v20 / v22.2 fix (read this if you are still seeing v20)

You previously reported still getting v20 even after nix-shell attempts and after briefly reaching a v22.

**Strongly recommended (fastest reliable fix):**

1. In Replit, **do not** keep fighting the current Repl.
2. Create a **brand new Repl**:
   - Click "Create Repl" → "Import from GitHub"
   - Paste: `https://github.com/itsbrown/FreedomMobility-NY.git`
   - Let it finish importing.
3. Once imported, immediately run this in the **Shell** tab (copy/paste the whole block):

```bash
# === DIAGNOSTIC + FORCE (paste this entire block) ===
echo "=== BEFORE ==="
node --version
npm --version
which node

echo "=== Attempting nix-shell nodejs_22 (unstable) ==="
nix-shell -p nodejs_22 --run 'echo "=== INSIDE NIX SHELL ===" && node --version && npm --version'

echo "=== Listing available nodejs packages in this nix env (for debugging) ==="
nix-env -qaP | grep -E 'nodejs|node_' | head -20 || echo "(no output or command not available)"

echo "=== If the above still shows old versions, try this specific one ==="
nix-shell -p nodejs --run 'node --version' || true
```

4. Then click the **Run** button (or use ⋯ top-right menu → Restart Repl, then Run).

**Why this happens**: Many older Repls were originally created for a different stack (React/Express). Replit caches "workflow" state and the AI assistant keeps trying to restore old config. A fresh "Import from GitHub" + the `.replit` file committed in this repo usually breaks the loop.

**If you must stay in the current Repl**:

- Make sure you have pulled the latest (the `.replit` file and netlify.toml fix are now in main):
  ```bash
  git fetch origin
  git checkout --theirs .replit || true
  git pull --ff-only || git pull --rebase origin main
  ```
- Use the ⋯ menu (no big stop button) → **Stop**, then **Run** (or "Restart Repl").
- In the Shell tab, manually start the server with the wrapper:
  ```bash
  nix-shell -p nodejs_22 --run 'npm install --prefer-offline && npm run dev'
  ```

The new `.replit` (added in this commit) contains an aggressive `run = "nix-shell -p nodejs_22 ..."` line that should be picked up by the Repl runtime on the next full restart.

After you have a working `npm run dev` in Replit, you can `npm run build` to produce `dist/`.

If even the fresh Repl + diagnostics above still show v20 inside the nix-shell, paste the full output of the diagnostic block here and we'll pick a different nix package name or pin a specific nixpkgs revision.

## Available Scripts

| Command             | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start local dev server (Astro)           |
| `npm run build`     | Production build → `dist/`               |
| `npm run preview`   | Preview the production build locally     |
| `npm run astro`     | Run Astro CLI commands                   |

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
