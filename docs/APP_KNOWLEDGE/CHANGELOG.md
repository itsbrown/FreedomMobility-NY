# Knowledge changelog

## 2026-08-27 (blog)

- Guides live at `/resources` from `src/content/blog` Markdown. `draft: true` is admin-preview only (public 404, no sitemap).
- Admin **Blog** lists live vs repo draft vs device draft. Device drafts are localStorage; publish by downloading Markdown and pushing `main`.
- Public header includes Guides. Articles emit BlogPosting / FAQ JSON-LD, article Open Graph, and breadcrumbs.

## 2026-08-27 (draft rates)

- Saving pay rates did not hide `[DRAFT RATES]` because confirm was a separate checkbox (default off) and Hostinger has no shared rates API. Built-in `RATES_DRAFT` is now `false`. v1 localStorage saves are migrated off draft. Confirm checkbox sits next to Save.

## 2026-08-27 (stale pay recipient)

- Saved admin/localStorage rates that still had `freedommobilityvllc@outlook.com` or Brian's VA inbox are rewritten to `freedommobilityllc@outlook.com` on load. Formspree **Workflow → Email** must also use that address; the Submissions `email` column is Reply-To, not the inbox.

## 2026-08-27 (pay form recipient typo)

- Corrected `PAY_FORM_RECIPIENT` from `freedommobilityvllc@outlook.com` to `freedommobilityllc@outlook.com`.

## 2026-08-21 (pay form recipient)

- Pay form display / Reply-To / fallback copy now uses `freedommobilityvllc@outlook.com` (`PAY_FORM_RECIPIENT`). Formspree Email workflow on form `mnpaloyd` must use the same address or mail still goes to the previous inbox.

## 2026-08-19 (pay form email)

- Pay submit was posting to Formspree with recaptcha action `tech_pay`. Formspree requires action `submit` (same as contact) or it returns `Please complete the reCAPTCHA` and no email is sent.
- `_cc` does not deliver to Brian. Actual inbox is the Formspree form's Email workflow. Optional `PUBLIC_PAY_FORMSPREE_ENDPOINT` for a dedicated pay form.

## 2026-08-18 (hostinger deploy)

- Live site is Hostinger, not Netlify. `main` → GitHub Action → `hostinger-deploy` branch.
- Deploy workflow now also bakes in `PUBLIC_TECH_PAY_PIN` when that GitHub secret exists.

## 2026-08-18 (admin rates)

- Admin can open **Pay rates** at `/admin/rates` from the dashboard card or header.
- Saved rates feed `/tech/pay`. Shared store is Netlify Blobs at `/api/pay-rates`; localStorage is the offline fallback.

## 2026-08-18 (admin nav)

- Added `/admin` shop hub with a card linking to the weekly pay form.
- Internal header logo goes to `/admin`; nav includes Dashboard and Pay form.

## 2026-08-18

- Added unlisted technician weekly pay form at `/tech/pay` (Astro, not the Replit Express app).
- Piece rates live in `src/data/pay-rates.ts` and are still draft (`RATES_DRAFT = true`).
- Pay submissions target `brian.parmele@freedommobilityva.com` via Formspree `_cc` + notification config.
- Mileage uses Photon + OSRM driving distance instead of Nominatim haversine × 1.3.
