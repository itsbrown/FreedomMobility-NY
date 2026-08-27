# Blog and guides

Public URL: `/resources` (and `/blog` 301s there). Admin: `/admin/blog`. Content: `src/content/blog/*.md`.

## Live vs draft

| State | Where | Google |
| --- | --- | --- |
| `draft: false` in Markdown | `/resources/[slug]`, Guides index, sitemap | Indexed |
| `draft: true` in Markdown | PIN preview `/admin/blog/[slug]` only | `noindex`, not in sitemap, public URL 404s |
| Device draft | `localStorage` `fm-blog-drafts`, `/admin/blog/edit` | This browser only |

Hostinger is static. **Publishing** means adding the `.md` file and pushing `main`. Admin **Download .md** is the handoff. Do not expect Save on the live admin to change Google.

## SEO rules

- Evergreen slugs (`stairlift-cost-guide`), never `/blog/2026/08/…`
- Unique `title` (~60 chars) and `description` (≤170) with a city or region
- `headline` is the H1; `title` is the document title
- `BlogPosting` + breadcrumbs on every live article; `FAQPage` when `faqs` is set
- `og:type=article`, canonical, `datePublished` / `dateModified`
- Internal links to `/stairlifts`, `/ramps`, `/contact`
- Guides in the public header

## Files

- `src/content.config.ts` — collection schema
- `src/content/blog/` — posts
- `src/lib/blog.ts` — live/draft helpers
- `src/lib/blog-admin-client.ts` — device drafts
- `src/components/BlogArticle.astro`
- `src/pages/resources/[slug].astro` — live only
- `src/pages/admin/blog/` — list, preview, editor
