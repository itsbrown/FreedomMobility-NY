# Architecture

Static Astro 6 site + Tailwind v4. Build output is `dist/`. Live host is **Hostinger**. Push to `main` runs `.github/workflows/deploy-to-hostinger.yml`, which publishes the `hostinger-deploy` branch. Node `>=22.12.0`.

## Surfaces

| Path | Audience | Notes |
| --- | --- | --- |
| Marketing pages (`/`, `/stairlifts`, `/contact`, …) | Public | Indexed, in nav |
| `/admin` | Shop staff | Internal hub; pay form + rates. Same PIN as `/tech/*` |
| `/admin/rates` | Shop staff | Edit piece rates; saved to Netlify Blobs (`/api/pay-rates`) |
| `/tech/pay`, `/tech/success` | Technicians | `noindex`, `robots.txt` Disallow, excluded from sitemap, not in public nav |

`Layout.astro` has `variant="internal"` for the technician chrome and a `noindex` flag.

## Forms

- **Contact** (`src/pages/contact.astro`): Formspree via `PUBLIC_FORMSPREE_ENDPOINT`, optional `PUBLIC_RECAPTCHA_SITE_KEY`, honeypot.
- **Tech pay** (`src/pages/tech/pay.astro`): same Formspree endpoint (AJAX JSON). Recipient intended: `brian.parmele@freedommobilityva.com`. Configure that address in the Formspree form notifications. Client PIN: `PUBLIC_TECH_PAY_PIN` (convenience gate only; visible in page source).

## Mileage

Browser calls Photon (geocode / autocomplete, biased to Rochester) and public OSRM (driving distance). No API key. Manual mile entry always works if lookup fails.
