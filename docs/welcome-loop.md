# Freedom GA4 and Welcome Loop

This adapts the Rochester HealthTech (RHTS) analytics and Welcome Loop for the Freedom Mobility NY Astro site. Plausible stays. Nothing in this change deploys the site, creates a Supabase project, sends email, or turns personalization on.

## What was inspected

`https://github.com/itsbrown/rochester-healthtech-site` is not accessible from this environment (`repository not found` for git and the GitHub API). These files were therefore not read from git: `src/lib/welcome.ts`, `public/api/visit.php`, `public/api/variants.php`, `docs/welcome-loop.md`.

The live site at `rochesterhealthtechsolutions.com` is public. Its homepage HTML and `/assets/index-B6RRmaAW.js` were read, and `GET /api/variants.php?slot=hero&rh_c=not-a-real-campaign` was called once. That response was `{"ok":true,"personalization":true,"variants":[]}`. `POST /api/visit.php` was not called. The PHP source and the RHTS Supabase project URL are not in the public bundle. Hostinger reports `PHP/8.3.36` for that site. Freedom's own workflow also publishes a static `dist/` to the `hostinger-deploy` branch, so PHP files placed in `public/api/` are copied to the document root on the next production deploy. This repo does not trigger that deploy.

The Freedom measurement ID is `G-GD5R53T6FM`, taken from the request text. No screenshot file was in the workspace, so the characters were not re-read from an image. The RHTS ID `G-E42WXVRWT2` is not used.

## Implemented

- Plausible remains on public pages. GA4 loads only on `freedommobilityny.com` and `www.freedommobilityny.com`.
- One GA4 page view per full page load, via `gtag('config')` with `send_page_view: true`. History changes update the page dimensions and do not send a second page view. Internal `/admin` and `/tech` pages send neither Plausible nor GA4.
- Campaign parameters on that page view are sanitized. Values containing `@`, or otherwise outside a short token, are dropped. A `preview-…` token is stored as `preview`.
- `referrer` sent to GA4 is the external origin, or the same-site origin plus path. Query strings are not included.
- `generate_lead` fires once on `/success` after a contact or stairs-guide Formspree submit, with `form` set to `contact` or `stairs_guide`. The marker lives in `sessionStorage` for 30 minutes and is removed on read. It does not contain the form fields.
- `phone_click` and `click_contact` fire from link clicks. The phone number and email address are not event parameters.
- `guide_start` and `guide_complete` fire for the stairs guide. `result` is one of `assessment`, `ramp-or-vpl`, `vpl`, `ramp-or-stairlift`, `stairlift`. The answers are not sent.
- `personalization_view` is allowed only after the server says personalization is on, `profile.holdout` is a boolean, and the paint timeout has not expired. Parameters are `slot`, `variant_id`, `rule`, and `holdout`. The visitor id and campaign key are not included.
- Welcome Loop endpoints: `POST /api/visit.php` and `GET /api/variants.php`. Without credentials and `FM_WELCOME_ENABLED=true` they return `personalization: false`, set no visitor cookie, and write nothing.
- When enabled, the cookie is `fm_vid`, `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS. Lifetime defaults to 30 days and is capped at 90. Holdout is assigned once per visitor (default 10 percent) and then read back, not recomputed.
- Only `status=approved`, `slot=hero` variants with an allowlisted CTA path and plain text can be returned or applied. The homepage copy does not change until that happens. Drafts are not served. There is no preview route and no mailer. `followup` is only an `utm_medium` value.
- Opt-out: footer control, `?fm_optout=1`, or `?rh_optout=1`. Do Not Track and Global Privacy Control also skip personalization and clear the cookie. Opt-out does not insert a visit row.
- Homepage hero is the only personalized surface. A 2.5s timeout reveals the authored headline if the request stalls, and a late response cannot swap it.

## Differences from the observed RHTS client

These are intentional. The RHTS PHP source was not available to compare.

- The visit request does not append the raw page query. Only `utm_*`, `rh_c`, and `fm_c` tokens are forwarded, and the server sanitizes them again.
- Copy checks do not use the RHTS denylist that rejects the letters `llc` and `copilot`. Freedom copy may say LLC. HTML, URLs, and `@` are still rejected.
- CTA targets are Freedom paths (`/contact`, `/stairs-where-to-start`, `/stairlifts`, `/ramps`, `/vertical-platform-lifts`, `/resources`), not `#contact`, `#quote`, `#sprint`, or `/book`.
- `profile.holdout` must be a boolean. A missing flag does not show a variant.
- `visit.php` accepts POST only. The live RHTS response advertised `Allow: GET, POST`.
- There is no Cal.com linker and no booking event. Freedom leads are the Formspree success redirect.
- The paint class is removed if the request does not finish. The RHTS class can leave `[data-welcome-copy]` hidden if the script fails.
- The cookie name is `fm_vid`, not `rh_vid`. `rh_c` is still accepted so the loop's campaign parameter works, and `fm_c` is the Freedom alias.
- Visit storage collapses `preview-…` tokens. The public client does that for GA4; applying it to the visit row avoids storing a raw preview secret.
- Holdout events use `variant_id=default`, which is what the public client sends. The suppressed variant id is not added.

## Blocked until you do these steps

Personalization and visit storage stay off until every step below is done. GA4 and Plausible do not wait on them. GA4 still sends only after a production deploy of this branch to the real domain.

1. Create a new Supabase project for Freedom. Do not reuse the RHTS project or its keys.
2. In that project's SQL editor, run `supabase/welcome-loop.sql` yourself. This repository does not connect to Supabase.
3. Approve variant copy out of band. Insert rows only when the text is approved. `status` must be `approved` or the API will not return the row. Example shape:

   ```json
   {
     "id": "uuid",
     "slot": "hero",
     "segment": "spring-stairs",
     "status": "approved",
     "copy": {
       "eyebrow": "Rochester, Buffalo, and Syracuse",
       "headline": "Approved headline",
       "subhead": "Approved supporting line.",
       "cta": "Schedule a free consultation",
       "cta_href": "/contact"
     }
   }
   ```

   `segment` must match the campaign slug (`fm_c`, `rh_c`, or `utm_campaign`). `cta_href` must be one of the allowlisted paths. There is no UI here to approve copy.

4. Put credentials outside the document root. Copy `docs/welcome-config.example.php` to an absolute path Hostinger will not publish, mode `600`, and keep `enabled` false until the rows exist. Alternatively set the environment in hPanel if PHP can see it:

   - `FM_SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `FM_SUPABASE_SERVICE_ROLE_KEY` = server-only service role
   - `FM_WELCOME_CONFIG` = absolute path of the file above, if you use a file
   - `FM_WELCOME_HOLDOUT_PERCENT` = `10` (optional, 0–100)
   - `FM_WELCOME_COOKIE_DAYS` = `30` (optional, 1–90)
   - `FM_WELCOME_ENABLED` = `true` only when the project, migration, and approved rows are ready

   The Git deploy replaces the document root with `dist/`. A secret file inside `public/` or `dist/` would be wiped or published. The loader refuses a config path inside `public/api/`.

5. Deploy is still a separate action. Merging to `main` runs `.github/workflows/deploy-to-hostinger.yml`, which force-pushes `dist/` to `hostinger-deploy`. Do not merge until you want that. The workflow's `.htaccess` now denies `welcome-config*.php` and `*.local.php` in case a secret file is ever copied into the root.
6. Confirm the GA4 property is exactly `G-GD5R53T6FM` in the Google UI before expecting data. Local and preview hosts do not load the tag.
7. Campaign links that should be eligible for a headline look like `/?utm_medium=email&fm_c=spring-stairs` (medium `email`, `outreach`, or `followup`). Anyone in the holdout, or anyone who opted out, keeps the authored homepage text.
8. Delete old visit rows yourself when you want a shorter window. A commented statement is in the SQL file. No purge job is installed.
9. Outreach messages are not sent by this site. Do not automate them from `welcome_visits`; it has no email address.

## Checks already run here

`npm test` covers the GA4 boot script (one config hit, no manual `page_view`, sanitized events) and the welcome decisions (approved copy only, holdout, opt-out, privacy signals). `php e2e/welcome-php-test.php` covers the fail-closed endpoint, cookie flags, and the visit row shape. `npm run build` confirms the PHP files land in `dist/api/` and the RHTS measurement ID is absent.
