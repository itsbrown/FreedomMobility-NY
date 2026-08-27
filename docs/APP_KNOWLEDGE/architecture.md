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
- **Tech pay** (`src/pages/tech/pay.astro`): AJAX JSON to `PUBLIC_PAY_FORMSPREE_ENDPOINT` if set, otherwise the contact form endpoint. Formspree **requires** reCAPTCHA v3 with action `submit` (not a custom action). `_cc` does not deliver mail; the Email workflow on that Formspree form is the actual inbox. Intended notify: `freedommobilityllc@outlook.com` — that address must also be the Formspree Email workflow (and a linked/verified email on the Formspree account). Client PIN: `PUBLIC_TECH_PAY_PIN` (convenience gate only; visible in page source). Localhost submits often fail reCAPTCHA; use the live site or Copy/email. Outlook 365 sometimes quarantines Formspree mail.

## Mileage

Browser calls Photon (geocode / autocomplete, biased to Rochester) and public OSRM (driving distance). No API key. Manual mile entry always works if lookup fails.
