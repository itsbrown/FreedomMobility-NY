# Freedom Mobility NY — app knowledge

Marketing site for Freedom Mobility NY (stairlifts, ramps, VPLs, service) serving Rochester, Buffalo, and Syracuse. Live at https://freedommobilityny.com.

## Who uses it

- **Homeowners / caregivers** — public pages and `/contact` lead form
- **Technicians / ops** — unlisted `/admin` hub and `/tech/pay` weekly timesheet
- **Site maintainers** — this Astro repo, deployed to Hostinger via GitHub Actions

## Doc index

- [architecture.md](./architecture.md) — stack, forms, deploy
- [domains/tech-pay.md](./domains/tech-pay.md) — technician pay form
- [domains/blog.md](./domains/blog.md) — guides, live vs draft, SEO
- [CHANGELOG.md](./CHANGELOG.md)

## Agent onboarding

1. Read this hub
2. Read the domain doc for the area you are touching
3. Do the task
4. Update the relevant doc + CHANGELOG (no secrets)

## Non-negotiables

- Do not invent or silently change technician pay rates. Edit `src/data/pay-rates.ts` only with confirmed numbers. `RATES_DRAFT` is `false`; turn the pay-form warning back on from Admin → Pay rates if numbers are estimates.
- Keep `/tech/*` and `/admin/*` out of the sitemap, public nav, and search engines. Blog drafts (`draft: true`) must 404 on `/resources/*`.
- Public contact form and tech pay form both go through Formspree; pay emails should notify `freedommobilityllc@outlook.com`.
